import { useEffect, useRef } from 'react'
import { Link, Navigate } from 'react-router-dom'
import Icon from '@/components/Icon'
import { useToast } from '@/components/Toast'
import { Avatar, Back, destView, Shell, Stepper } from '@/components/ui'
import { groupOf, useMeeting } from '@/hooks/useMeeting'
import { prettyCode } from '@/lib/api'
import type { GroupView, MemberView } from '@/types'

export default function Match() {
  const { mt, me, rematch, decide } = useMeeting()
  const toast = useToast()
  const ran = useRef(false)

  const regCount = mt.members.filter((x) => x.registered).length
  const needRun = me.registered && regCount >= 2 && (!mt.groups || mt.matchStale)

  // 처음 들어왔거나 등록 정보가 바뀌었으면 자동으로 매칭한다.
  useEffect(() => {
    if (needRun && !ran.current) {
      ran.current = true
      void rematch().catch(() => {
        ran.current = false
      })
    }
  }, [needRun, rematch])
  useEffect(() => {
    if (!needRun) ran.current = false
  }, [needRun])

  if (!me.registered) return <Navigate to={`/m/${mt.code}/register`} replace />

  const byId = (id: string) => mt.members.find((x) => x.id === id)
  const mine = groupOf(mt, me.id)
  const started = mt.members.some((x) => x.status !== 'ready')

  if (regCount < 2) {
    return (
      <Shell>
        <Back to={`/m/${mt.code}`}>{mt.name}</Back>
        <Stepper n={3} />
        <div className="card center stack">
          <h3>함께 귀가할 참여자를 기다리고 있어요</h3>
          <p className="muted">
            귀가 정보를 등록한 참여자가 2명 이상이어야 매칭할 수 있어요. 초대 코드 <b>{prettyCode(mt.code)}</b>를 친구에게 보내 주세요.
          </p>
          <button
            className="btn btn-ghost"
            onClick={() => {
              void navigator.clipboard.writeText(prettyCode(mt.code)).then(() => toast('복사했어요'))
            }}
          >
            <Icon name="copy" size={18} />초대 코드 복사
          </button>
        </div>
      </Shell>
    )
  }

  if (needRun || !mt.groups) {
    return (
      <Shell>
        <Back to={`/m/${mt.code}`}>{mt.name}</Back>
        <Stepper n={3} />
        <div className="card center"><p className="muted">동행 그룹을 계산하고 있어요...</p></div>
      </Shell>
    )
  }

  const groups = mt.groups
  const solo = mt.soloIds.map(byId).filter((x): x is MemberView => !!x)
  const iAmSolo = solo.some((x) => x.id === me.id)
  const ordered = [...groups].sort((a, b) => Number(mine && b.id === mine.id) - Number(mine && a.id === mine.id))

  const groupCard = (g: GroupView) => {
    const isMine = !!mine && mine.id === g.id
    const gm = g.memberIds.map(byId).filter((x): x is MemberView => !!x)
    const decided = me.groupDecision
    return (
      <article key={g.id} className={`card group-card ${isMine ? 'mine' : ''}`}>
        <div className="group-head">
          <div>
            <div className="row wrap">
              <h3>동행 그룹 {g.n}</h3>
              {isMine && <span className="tag y">내 추천 그룹</span>}
              {g.pairMode && <span className="tag">2인 동행</span>}
            </div>
            <div className="small muted">{gm.length}명이 함께 귀가해요</div>
          </div>
        </div>
        <div className="meta">
          <span className="chip"><Icon name="users" size={16} />{gm.length}명</span>
          <span className="chip"><Icon name="route" size={16} />함께 이동 약 {g.sharedMin}분</span>
          <span className="chip"><Icon name="clock" size={16} />출발 시간 차 {g.spread}분</span>
          <span className="chip"><Icon name="pin" size={16} />추천 분기 지점 {g.splitStation}역</span>
        </div>
        <ul className="reasons">
          {g.reasons.map((r) => (
            <li key={r}>
              <Icon name="check" size={16} />
              <span>{r}</span>
            </li>
          ))}
        </ul>
        <hr className="divider" />
        {gm.map((x) => (
          <div key={x.id} className="member">
            <Avatar name={x.name} />
            <div className="grow">
              <div className="nm">
                {x.name}
                {x.id === me.id && <> <span className="tag y">나</span></>}
                {x.userId === mt.hostUserId && <> <span className="tag">주최자</span></>}
              </div>
              <div className="sub">{destView(me, x)} · {x.departTime} 출발 · {x.mode}</div>
            </div>
          </div>
        ))}
        {isMine && (
          <div className="row wrap" style={{ marginTop: 14 }}>
            {decided === 'joined' ? (
              <>
                <span className="badge st-arrived plain"><Icon name="check" size={14} /> 이 그룹에 참여 중</span>
                <button className="btn btn-ghost btn-sm" onClick={() => void decide(false).then(() => toast('혼자 귀가로 변경했어요'))}>혼자 갈래요</button>
              </>
            ) : decided === 'declined' ? (
              <>
                <span className="badge st-ready plain">혼자 귀가하기로 했어요</span>
                <button className="btn btn-primary btn-sm" onClick={() => void decide(true).then(() => toast('그룹에 참여했어요'))}>그룹 참여하기</button>
              </>
            ) : (
              <>
                <button className="btn btn-primary" onClick={() => void decide(true).then(() => toast('그룹에 참여했어요'))}>
                  <Icon name="users" size={18} />그룹 참여하기
                </button>
                <button className="btn btn-ghost" onClick={() => void decide(false).then(() => toast('혼자 귀가로 변경했어요'))}>혼자 갈래요</button>
              </>
            )}
          </div>
        )}
      </article>
    )
  }

  return (
    <Shell>
      <Back to={`/m/${mt.code}`}>{mt.name}</Back>
      <Stepper n={3} />
      <div className="page-head row between wrap">
        <div>
          <h2>동행 매칭 결과</h2>
          <p>방향·출발 시간·함께 이동할 수 있는 구간을 비교해 추천했어요.</p>
        </div>
      </div>
      {started && (
        <div className="banner warn" style={{ marginBottom: 16 }}>
          <span className="ico"><Icon name="alert" /></span>
          <div className="small">이미 귀가를 시작한 참여자가 있어요. 다시 매칭하면 그룹이 바뀔 수 있어요.</div>
        </div>
      )}
      {iAmSolo && (
        <div className="card orange" style={{ marginBottom: 16 }}>
          <div className="card-title"><Icon name="alert" size={22} /><h3>비슷한 방향의 동행을 찾지 못했어요</h3></div>
          <p className="small">출발 시간이나 이동 수단을 조정하면 매칭될 수도 있어요. 혼자 귀가하더라도 도착 완료와 안부 확인으로 챙겨드릴게요.</p>
          <div className="row wrap" style={{ marginTop: 12 }}>
            <Link className="btn btn-soft btn-sm" to={`/m/${mt.code}/register`}>귀가 정보 수정하기</Link>
          </div>
        </div>
      )}
      {ordered.length ? ordered.map(groupCard) : <div className="card empty">추천할 수 있는 동행 그룹이 아직 없어요.</div>}
      {solo.length > 0 && (
        <article className="card cream group-card" style={{ marginTop: 14 }}>
          <div className="card-title"><Icon name="alert" size={20} /><h3>혼자 귀가하게 되는 참여자</h3><span className="tag o">{solo.length}명</span></div>
          {solo.map((x) => (
            <div key={x.id} className="member">
              <Avatar name={x.name} />
              <div className="grow">
                <div className="nm">{x.name}{x.id === me.id && <> <span className="tag y">나</span></>}</div>
                <div className="sub">{destView(me, x)} · {x.departTime} 출발</div>
              </div>
            </div>
          ))}
        </article>
      )}
      <div className="row wrap" style={{ marginTop: 20 }}>
        <Link className="btn btn-primary btn-lg grow" to={`/m/${mt.code}`}>
          귀가 현황 보러 가기 <Icon name="arrow" size={18} />
        </Link>
        <button className="btn btn-ghost" onClick={() => void rematch().then(() => toast('다시 매칭했어요'))}>
          <Icon name="refresh" size={18} />다시 매칭
        </button>
      </div>
    </Shell>
  )
}
