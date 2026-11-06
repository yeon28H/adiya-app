import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, Outlet, useParams } from 'react-router-dom'
import * as api from '@/lib/api'
import { lastTrainInfo, runMatching, travelMin } from '@/lib/matching'
import { findStation } from '@/lib/stations'
import { setLastMeeting } from '@/lib/session'
import { distanceMeters } from '@/lib/geo'
import type { ChatMessage, GroupView, MeetingView, MemberView, Privacy } from '@/types'
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
  /** "아직 도착 안 했어요" — 목적지 근처 도착 알림을 잠시 끈다 */
  dismissNear: () => Promise<void>
  register: (info: RegisterInfo) => Promise<void>
  applyRecommendedTime: () => Promise<void>
  rematch: () => Promise<void>
  decide: (join: boolean) => Promise<void>
  setSetting: (patch: api.MePatch) => Promise<void>
  nudge: () => Promise<number>
  requestCheck: (memberId: string) => Promise<void>
  resolveCheck: (memberId: string, action: 'ok' | 'arrived') => Promise<void>
  /** 내 위치를 지금 한 번 공유(갱신)한다. 주소 설명은 가능하면 함께 저장. */
  shareLocation: (loc: { lat: number; lng: number; accuracy?: number | null; label?: string | null }) => Promise<void>
  /** 채팅 */
  messages: ChatMessage[]
  unread: number
  sendChat: (body: string) => Promise<void>
  markChatRead: () => void
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

  /* ---------- 채팅 ---------- */
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const readKey = meetingId ? `eodiya.chatread.${meetingId}` : ''
  const [lastRead, setLastRead] = useState(0)
  useEffect(() => {
    setLastRead(readKey ? Number(localStorage.getItem(readKey) ?? 0) : 0)
  }, [readKey])

  useEffect(() => {
    if (!meetingId) return
    let alive = true
    setMessages([])
    void api
      .fetchMessages(meetingId)
      .then((list) => alive && setMessages((cur) => mergeMessages(list, cur)))
      .catch(() => {})
    const off = api.subscribeMessages(meetingId, (m) => setMessages((cur) => mergeMessages(cur, [m])))
    return () => {
      alive = false
      off()
    }
  }, [meetingId])

  const markChatRead = useCallback(() => {
    const now = Date.now()
    setLastRead(now)
    if (readKey) localStorage.setItem(readKey, String(now))
  }, [readKey])

  const myUserId = state?.myUserId
  const unread = messages.filter((m) => m.ts > lastRead && m.userId !== myUserId).length

  /* ---------- 이동 중 실시간 위치 공유 ---------- */
  const sharing = !!me && ['started', 'together', 'check'].includes(me.status) && !me.shareStopped
  const lastSent = useRef<{ lat: number; lng: number; at: number } | null>(null)
  const wasSharing = useRef(false)
  useEffect(() => {
    if (!meetingId) return
    if (!sharing) {
      // 도착했거나 공유를 중단했으면 남아 있는 내 위치를 지운다
      if (wasSharing.current) {
        wasSharing.current = false
        lastSent.current = null
        void api.clearMyLocation(meetingId).then(() => reload())
      }
      return
    }
    if (!('geolocation' in navigator)) return
    wasSharing.current = true
    const watch = navigator.geolocation.watchPosition(
      (pos) => {
        const cur = { lat: pos.coords.latitude, lng: pos.coords.longitude, at: Date.now() }
        const prev = lastSent.current
        const moved = prev ? distanceMeters(prev, cur) : Infinity
        const age = prev ? cur.at - prev.at : Infinity
        // 15m 이상 움직였고 12초가 지났거나, 1분이 지났으면 전송
        if (!((moved >= 15 && age >= 12000) || age >= 60000)) return
        lastSent.current = cur
        void api.setMyLocation(meetingId, { lat: cur.lat, lng: cur.lng, accuracy: pos.coords.accuracy })
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    )
    return () => navigator.geolocation.clearWatch(watch)
  }, [meetingId, sharing, reload])

  /* ---------- 내가 설정한 목적지에 도착하면 알림 ("도착 완료로 처리할까요?") ---------- */
  const nearDismissedAt = useRef(0)
  const moving = !!me && (me.status === 'started' || me.status === 'together')
  const destKey = me?.dest ?? ''
  const nearAlready = !!me?.nearDest
  const myName = me?.name ?? ''
  useEffect(() => {
    if (!meetingId || !moving || nearAlready || !('geolocation' in navigator)) return
    const dest = findStation(destKey)
    if (!dest) return
    let fired = false
    const watch = navigator.geolocation.watchPosition(
      (pos) => {
        if (fired || Date.now() - nearDismissedAt.current < 10 * 60000) return
        const d = distanceMeters({ lat: pos.coords.latitude, lng: pos.coords.longitude }, dest)
        // 역 좌표 오차와 GPS 오차를 감안해 300m 이내면 도착으로 본다
        if (d > 300) return
        fired = true
        void api
          .updateMe(meetingId, { nearDest: true })
          .then(() => api.addNotice(meetingId, `${myName}님이 목적지(${dest.key}) 근처에 도착한 것 같아요. 본인 확인을 기다리고 있어요.`))
          .then(() => reload())
          .catch(() => {
            fired = false
          })
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    )
    return () => navigator.geolocation.clearWatch(watch)
  }, [meetingId, moving, nearAlready, destKey, myName, reload])

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
      dismissNear: () =>
        done(async () => {
          nearDismissedAt.current = Date.now()
          await api.updateMe(mt.id, { nearDest: false })
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
      nudge: async () => {
        const names = mt.members.filter((x) => !x.registered).map((x) => x.name)
        if (names.length) await notice(`${names.join(', ')}님, 귀가 정보를 등록하면 동행을 찾아드려요. (주최자 요청)`)
        await reload()
        return names.length
      },
      requestCheck: (id) => done(() => api.requestCheck(id)),
      resolveCheck: (id, action) => done(() => api.resolveCheck(id, action)),
      shareLocation: (loc) => done(() => api.setMyLocation(mt.id, loc)),
      messages,
      unread,
      sendChat: (body) => api.sendMessage(mt.id, body),
      markChatRead,
    }
  }, [state, me, reload, messages, unread, markChatRead])

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
          ? `${me.name}님은 출발 예정(${me.departTime})이 막차(${info.last})보다 늦어요. 지금 바로 출발하는 걸 권장해요.`
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


/** 메시지 목록 병합 (id 중복 제거, 시간순) */
function mergeMessages(a: ChatMessage[], b: ChatMessage[]): ChatMessage[] {
  const map = new Map<string, ChatMessage>()
  for (const m of [...a, ...b]) map.set(m.id, m)
  return [...map.values()].sort((x, y) => x.ts - y.ts)
}
