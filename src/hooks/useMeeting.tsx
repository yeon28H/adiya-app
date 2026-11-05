import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, Outlet, useParams } from 'react-router-dom'
import * as api from '@/lib/api'
import { lastTrainInfo, runMatching, travelMin } from '@/lib/matching'
import { setLastMeeting } from '@/lib/session'
import type { GroupView, MeetingView, MemberView, PlanB, Privacy } from '@/types'
import { Loading, NotFound } from '@/components/ui'

const GRACE_MIN = 5

export const groupOf = (mt: MeetingView, memberId: string): GroupView | null =>
  (mt.groups ?? []).find((g) => g.memberIds.includes(memberId)) ?? null

export const buddyOf = (mt: MeetingView, me: MemberView): MemberView | undefined =>
  (me.buddy && me.buddy !== 'host' ? mt.members.find((x) => x.id === me.buddy) : undefined) ??
  mt.members.find((x) => x.userId === mt.hostUserId)

export const isHost = (mt: MeetingView, me: MemberView) => me.userId === mt.hostUserId

interface RegisterInfo {
  origin: string
  dest: string
  departTime: string
  mode: string
  privacy: Privacy
}

export interface MeetingCtx {
  mt: MeetingView
  me: MemberView
  reload: () => Promise<void>
  /** 귀가 시작 */
  start: () => Promise<void>
  /** 도착 완료 (본인) */
  arrive: () => Promise<void>
  /** "잘 가고 있어요" 응답 (본인) */
  respond: () => Promise<void>
  setNear: (near: boolean) => Promise<void>
  simulateOverdue: () => Promise<void>
  register: (info: RegisterInfo) => Promise<void>
  applyRecommendedTime: () => Promise<void>
  rematch: () => Promise<void>
  decide: (join: boolean) => Promise<void>
  setSetting: (patch: api.MePatch) => Promise<void>
  applyPlanB: (plan: PlanB | null, text: string, groupId: string | null) => Promise<void>
  nudge: () => Promise<number>
  requestCheck: (memberId: string) => Promise<void>
  resolveCheck: (memberId: string, action: 'ok' | 'arrived') => Promise<void>
}

const Ctx = createContext<MeetingCtx | null>(null)

export function useMeeting(): MeetingCtx {
  const v = useContext(Ctx)
  if (!v) throw new Error('useMeeting 은 /m/:code 아래에서만 사용할 수 있어요.')
  return v
}

/** /m/:code 하위 라우트의 공통 레이아웃: 데이터 로딩 + 실시간 구독 + 자동 점검 */
export function MeetingRoute() {
  const { code = '' } = useParams()
  const [state, setState] = useState<api.MeetingState | null | undefined>(undefined) // undefined: 로딩, null: 없음/비멤버
  const [error, setError] = useState<string | null>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  const reload = useCallback(async () => {
    try {
      setState(await api.fetchMeeting(code))
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [code])

  useEffect(() => {
    setState(undefined)
    void reload()
  }, [reload])

  const meetingId = state?.mt.id
  useEffect(() => {
    if (!meetingId) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const off = api.subscribeMeeting(meetingId, () => {
      clearTimeout(timer)
      timer = setTimeout(() => void reload(), 150) // 연속 이벤트 묶기
    })
    return () => {
      clearTimeout(timer)
      off()
    }
  }, [meetingId, reload])

  const me = state ? (state.mt.members.find((x) => x.userId === state.myUserId) ?? null) : null

  // 마지막 모임 기억 (상단 메뉴용)
  useEffect(() => {
    if (state && me) setLastMeeting({ code: state.mt.code, name: state.mt.name })
  }, [state, me])

  const value = useMemo<MeetingCtx | null>(() => {
    if (!state || !me) return null
    const { mt } = state
    const done = async (fn: () => Promise<unknown>) => {
      await fn()
      await reload()
    }
    const notice = (text: string, gid: string | null = null, kind: 'info' | 'ok' | 'warn' = 'info') =>
      api.addNotice(mt.id, text, gid, kind)
    const myGroup = groupOf(mt, me.id)

    const arriveSelf = async () => {
      await api.updateMe(mt.id, { status: 'arrived', arrivedAt: Date.now(), checkStage: 0, nearDest: false })
      if (me.arrivalNotice) await notice(`${me.name}님이 목적지에 도착했어요.`, myGroup?.id ?? null, 'ok')
      if (myGroup) {
        const left = myGroup.memberIds
          .map((i) => mt.members.find((x) => x.id === i))
          .filter((x): x is MemberView => !!x && x.id !== me.id && x.status !== 'arrived')
        if (left.length === 0) await notice(`동행 그룹 ${myGroup.n}의 모든 구성원이 무사히 도착했어요.`, myGroup.id, 'ok')
      }
    }

    return {
      mt,
      me,
      reload,
      start: () =>
        done(async () => {
          const together = myGroup && me.groupDecision !== 'declined' && myGroup.memberIds.length > 1
          const now = Date.now()
          await api.updateMe(mt.id, {
            status: together ? 'together' : 'started',
            startedAt: now,
            etaAt: now + travelMin(me.origin, me.dest) * 60000,
            checkStage: 0,
            nearDest: false,
          })
          await notice(`${me.name}님이 귀가를 시작했어요.`, myGroup?.id ?? null)
        }),
      arrive: () => done(arriveSelf),
      respond: () =>
        done(async () => {
          await api.updateMe(mt.id, {
            status: me.prevStatus && me.prevStatus !== 'ready' ? me.prevStatus : 'started',
            checkStage: 0,
            etaAt: Date.now() + 15 * 60000,
          })
          await notice(`${me.name}님이 "잘 가고 있어요"라고 응답했어요.`, null, 'ok')
        }),
      setNear: (near) =>
        done(async () => {
          await api.updateMe(mt.id, { nearDest: near })
          if (near) await notice(`${me.name}님이 목적지 근처에 도착한 것 같아요. 본인 확인을 기다리고 있어요.`)
        }),
      simulateOverdue: () =>
        done(async () => {
          // 누르는 횟수에 따라 1단계 → 2단계 (시연용)
          const etaAt = me.checkStage < 1 ? Date.now() - 1000 : Date.now() - (GRACE_MIN * 60000 + 1000)
          await api.updateMe(mt.id, { etaAt })
          await tickSelf(mt, { ...me, etaAt })
        }),
      register: (info) => done(() => api.registerInfo(mt.id, info)),
      applyRecommendedTime: () =>
        done(async () => {
          const info = lastTrainInfo(me)
          if (!info) return
          await api.registerInfo(mt.id, {
            origin: me.origin,
            dest: me.dest,
            departTime: info.recommended,
            mode: me.mode,
            privacy: me.privacy,
          })
        }),
      rematch: () =>
        done(async () => {
          await api.saveMatch(mt.id, runMatching(mt.members, mt.placeStation))
        }),
      decide: (join) =>
        done(async () => {
          await api.updateMe(mt.id, { groupDecision: join ? 'joined' : 'declined' })
          if (myGroup) {
            await notice(
              join ? `${me.name}님이 동행 그룹 ${myGroup.n}에 참여했어요.` : `${me.name}님은 혼자 귀가하기로 했어요.`,
              myGroup.id,
            )
          }
        }),
      setSetting: (patch) => done(() => api.updateMe(mt.id, patch)),
      applyPlanB: (plan, text, groupId) =>
        done(async () => {
          if (plan) await api.updateMe(mt.id, { planB: plan })
          if (text) await notice(text, groupId, 'warn')
        }),
      nudge: async () => {
        const names = mt.members.filter((x) => !x.registered).map((x) => x.name)
        if (names.length) await notice(`${names.join(', ')}님, 귀가 정보를 등록하면 동행을 찾아드려요. (주최자 요청)`)
        await reload()
        return names.length
      },
      requestCheck: (id) => done(() => api.requestCheck(id)),
      resolveCheck: (id, action) => done(() => api.resolveCheck(id, action)),
    }
  }, [state, me, reload])

  /** 15초마다 자동 점검 (예상 도착 지연·막차 위험) — 각자 자기 행만 점검한다. */
  useEffect(() => {
    if (!value) return
    const run = () => {
      const s = stateRef.current
      if (!s) return
      const mine = s.mt.members.find((x) => x.userId === s.myUserId)
      if (mine) {
        void tickSelf(s.mt, mine).then((changed) => {
          if (changed) void reload()
        })
      }
    }
    run()
    const t = setInterval(run, 15000)
    return () => clearInterval(t)
  }, [value === null, reload]) // eslint-disable-line react-hooks/exhaustive-deps

  if (error && state === undefined) return <Loading error={error} />
  if (state === undefined) return <Loading />
  if (state === null) return <NotFound />
  if (!me) return <Navigate to={`/join/${state.mt.code}`} replace />
  if (!value) return <Loading />
  return (
    <Ctx.Provider value={value}>
      <Outlet />
    </Ctx.Provider>
  )
}

/** 자기 자신의 막차 위험 알림 / 도착 지연 단계별 안부 확인. 변경이 있으면 true */
async function tickSelf(mt: MeetingView, me: MemberView): Promise<boolean> {
  let changed = false
  // 막차 위험 사전 알림 (귀가 시작 전)
  if (me.registered && me.status === 'ready') {
    const info = lastTrainInfo(me)
    const key = info && info.level !== 'ok' ? info.level + info.last + me.departTime : ''
    if (info && key && me.riskKey !== key) {
      await api.updateMe(mt.id, { riskKey: key })
      await api.addNotice(
        mt.id,
        info.level === 'danger'
          ? `${me.name}님은 출발 예정(${me.departTime})이 막차(${info.last})보다 늦어요. 지금 출발하거나 플랜 B를 확인하세요.`
          : `${me.name}님은 막차(${info.last})까지 여유가 ${info.slack}분뿐이에요. ${info.recommended}까지는 출발하는 걸 권장해요.`,
        null,
        'warn',
      )
      changed = true
    }
  }
  // 단계별 안부 확인: 1) 본인에게 알림 → 2) 응답 없으면 지정 대상/주최자에게 요청
  if ((me.status === 'started' || me.status === 'together') && me.etaAt) {
    const now = Date.now()
    const stage = me.checkStage
    if (now > me.etaAt + GRACE_MIN * 60000 && stage < 2) {
      await api.updateMe(mt.id, { checkStage: 2, prevStatus: me.status, status: 'check' })
      const b = buddyOf(mt, me)
      await api.addNotice(
        mt.id,
        `${me.name}님이 확인 알림에 응답하지 않았어요. ${b?.name ?? '주최자'}님, 안부를 확인해 주세요. (도착이 늦는 것일 뿐일 수 있어요)`,
        null,
        'warn',
      )
      changed = true
    } else if (now > me.etaAt && stage < 1) {
      await api.updateMe(mt.id, { checkStage: 1 })
      await api.addNotice(mt.id, `${me.name}님에게 예상 도착 시간이 지났다는 확인 알림을 보냈어요.`, null, 'info')
      changed = true
    }
  }
  return changed
}

