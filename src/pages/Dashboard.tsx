import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Icon from '@/components/Icon'
import { useToast } from '@/components/Toast'
import { Avatar, Badge, destView, fmtClock, Shell, STATUS } from '@/components/ui'
import { buddyOf, groupOf, isHost, useMeeting } from '@/hooks/useMeeting'
import { prettyCode } from '@/lib/api'
import { lastTrainInfo, travelMin } from '@/lib/matching'
import type { MeetingView, MemberView } from '@/types'

const LEVEL = {
  ok: ['st-arrived', '여유 있음'],
  warn: ['st-check', '막차 임박'],
  danger: ['st-check', '막차 놓칠 수 있음'],
} as const

/** 이동 중인 참여자의 도착 예정 (실시간 위치 대신 ETA만 공유) */
function etaText(x: MemberView) {
  if (!['started', 'together'].includes(x.status) || !x.etaAt) return ''
  const left = Math.round((x.etaAt - Date.now()) / 60000)
  return left > 0 ? ` · 도착까지 약 ${left}분` : ' · 도착 예정 시간 경과'
}

export default function Dashboard() {
  const ctx = useMeeting()
  const { mt, me } = ctx
  const toast = useToast()
  const act = (fn: () => Promise<unknown>, msg?: string) => () => void fn().then(() => msg && toast(msg))

  const byId = (id: string) => mt.members.find((x) => x.id === id)
  const regd = mt.members.filter((x) => x.registered)
  const unreg = mt.members.filter((x) => !x.registered)
  const arrived = regd.filter((x) => x.status === 'arrived')
  const onWay = regd.filter((x) => ['started', 'together', 'check'].includes(x.status))
  const before = mt.members.length - arrived.length - onWay.length
  const needCheck = regd.filter((x) => x.status === 'check')
  const allDone = mt.members.length >= 2 && mt.members.every((x) => x.registered && x.status === 'arrived')
  const soloList = mt.groups ? regd.filter((x) => !groupOf(mt, x.id) || x.groupDecision === 'declined') : null
  const host = isHost(mt, me)
  const mine = groupOf(mt, me.id)
  const pct = mt.members.length ? Math.round((arrived.length / mt.members.length) * 100) : 0
  const step = !me.registered ? 2 : !mt.groups || (mine && !me.groupDecision) ? 3 : 4

  /* ---------- 내 카드 ---------- */
  let mineCard: ReactNode
  if (!me.registered) {
    mineCard = (
      <div className="card yellow stack">
        <div className="card-title" style={{ margin: 0 }}><Icon name="route" size={24} /><h3>귀가 정보를 등록해 주세요</h3></div>
        <p className="small">목적지와 출발 시간을 알려주시면 비슷한 방향의 동행을 찾아드려요.</p>
        <Link className="btn btn-primary btn-lg" to={`/m/${mt.code}/register`}>귀가 정보 등록 <Icon name="arrow" size={18} /></Link>
      </div>
    )
  } else if (me.status === 'arrived') {
    mineCard = (
      <div className="card green stack">
        <div className="card-title" style={{ margin: 0 }}><Icon name="home" size={24} /><h3>도착 완료! 오늘도 수고했어요</h3></div>
        <p className="small">
          {me.arrivedAt ? fmtClock(me.arrivedAt) + '에 ' : ''}도착을 확인했어요.{' '}
          {allDone ? '' : '아직 도착하지 않은 사람이 있어요. 끝까지 함께 확인해요.'}
        </p>
      </div>
    )
  } else if (me.status === 'check') {
    mineCard = (
      <div className="card orange stack">
        <div className="card-title" style={{ margin: 0 }}><Icon name="bell" size={24} /><h3>잘 가고 계신가요?</h3></div>
        <p className="small">도착 확인이 필요하다는 요청이 왔어요. 괜찮다면 아래 버튼을 눌러 알려주세요.</p>
        <div className="row wrap">
          <button className="btn btn-ok btn-lg" onClick={act(ctx.respond, '응답해 주셔서 고마워요')}><Icon name="check" size={18} />잘 가고 있어요</button>
          <button className="btn btn-soft btn-lg" onClick={act(ctx.arrive, '도착을 확인했어요')}>도착했어요</button>
        </div>
      </div>
    )
  } else if (me.status === 'ready') {
    const needMatch = !mt.groups || mt.matchStale || (mine && !me.groupDecision)
    mineCard = (
      <div className="card yellow stack">
        <div className="card-title" style={{ margin: 0 }}>
          <Icon name="route" size={24} />
          <h3>{needMatch ? '동행 그룹부터 확인해 볼까요?' : '귀가 준비가 끝났어요'}</h3>
        </div>
        <p className="small">
          {mine && me.groupDecision !== 'declined'
            ? `동행 그룹 ${mine.n}에서 ${mine.splitStation}역까지 함께 이동할 수 있어요.`
            : '출발할 준비가 되면 귀가 시작을 눌러 주세요.'}
        </p>
        <div className="row wrap">
          {needMatch ? (
            <>
              <Link className="btn btn-primary btn-lg" to={`/m/${mt.code}/match`}>
                {mt.groups && !mt.matchStale ? '내 동행 그룹 확인' : '동행 매칭 보기'} <Icon name="arrow" size={18} />
              </Link>
              <button className="btn btn-ghost" onClick={act(ctx.start, '귀가를 시작했어요. 조심히 가요!')}>그냥 귀가 시작</button>
            </>
          ) : (
            <button className="btn btn-primary btn-lg" onClick={act(ctx.start, '귀가를 시작했어요. 조심히 가요!')}>
              <Icon name="flag" size={18} />귀가 시작
            </button>
          )}
        </div>
      </div>
    )
  } else {
    mineCard = (
      <div className="card yellow stack">
        <div className="row between wrap">
          <div className="card-title" style={{ margin: 0 }}><Icon name="route" size={24} /><h3>{STATUS[me.status]}</h3></div>
          <Badge x={me} />
        </div>
        <p className="small">
          {mine && me.status === 'together'
            ? `${mine.splitStation}역 부근까지 함께 이동하고, 안전한 곳에서 헤어지는 걸 추천해요.`
            : '목적지에 도착하면 도착 완료를 눌러 알려주세요.'}
        </p>
        <div className="row wrap">
          <button className="btn btn-ok btn-lg" onClick={act(ctx.arrive, '도착을 확인했어요')}><Icon name="check" size={18} />도착 완료</button>
          <Link className="btn btn-soft btn-lg" to={`/m/${mt.code}/planb`}><Icon name="swap" size={18} />귀가 플랜 B</Link>
        </div>
        <div className="row wrap">
          <span className="tag">시연</span>
          <button className="btn btn-ghost btn-sm" onClick={act(() => ctx.setNear(true))}>목적지 근처 자동 감지</button>
          <button className="btn btn-ghost btn-sm" onClick={act(ctx.simulateOverdue)}>예상 도착 시간 지난 상황</button>
        </div>
      </div>
    )
  }

  /* ---------- 단계별 안부 확인 · 자동 도착 감지 배너 ---------- */
  const moving = ['started', 'together'].includes(me.status)
  const banners: ReactNode[] = []
  if (moving && me.nearDest) {
    banners.push(
      <div key="near" className="banner warn" style={{ background: 'var(--yellow-100)', borderColor: 'var(--yellow-300)' }}>
        <span className="ico" style={{ color: '#9A6B00' }}><Icon name="pin" size={22} /></span>
        <div className="grow">
          <b>목적지 근처에 도착한 것 같아요</b>
          <div className="small">위치를 자동으로 감지했어요. 도착 완료로 처리할까요?</div>
          <div className="row wrap" style={{ marginTop: 10 }}>
            <button className="btn btn-ok btn-sm" onClick={act(ctx.arrive, '도착을 확인했어요')}>네, 도착했어요</button>
            <button className="btn btn-ghost btn-sm" onClick={act(() => ctx.setNear(false), '계속 귀가 중으로 유지할게요')}>아직이에요</button>
          </div>
        </div>
      </div>,
    )
  }
  if (moving && me.checkStage === 1) {
    banners.push(
      <div key="stage1" className="banner warn">
        <span className="ico"><Icon name="bell" size={22} /></span>
        <div className="grow">
          <b>예상 도착 시간이 지났어요. 괜찮으신가요?</b>
          <div className="small">
            응답이 없으면 곧 {buddyOf(mt, me)?.name}님에게 안부 확인을 요청해요. 도착이 조금 늦는 것일 수도 있으니 걱정하지 마세요.
          </div>
          <div className="row wrap" style={{ marginTop: 10 }}>
            <button className="btn btn-ok btn-sm" onClick={act(ctx.respond, '응답해 주셔서 고마워요')}>잘 가고 있어요</button>
            <button className="btn btn-soft btn-sm" onClick={act(ctx.arrive, '도착을 확인했어요')}>도착했어요</button>
          </div>
        </div>
      </div>,
    )
  }
  mt.members
    .filter((x) => x.status === 'check' && x.id !== me.id && buddyOf(mt, x)?.id === me.id)
    .forEach((x) =>
      banners.push(
        <div key={`buddy-${x.id}`} className="banner warn">
          <span className="ico"><Icon name="bell" size={22} /></span>
          <div className="grow">
            <b>{x.name}님의 안부를 확인해 주세요</b>
            <div className="small">{x.name}님이 확인 알림에 응답하지 않았어요. 연락해 보고 결과를 알려 주세요.</div>
            <div className="row wrap" style={{ marginTop: 10 }}>
              <button className="btn btn-ok btn-sm" onClick={act(() => ctx.resolveCheck(x.id, 'ok'), '확인 결과를 반영했어요')}>연락했어요, 잘 가고 있대요</button>
              <button className="btn btn-soft btn-sm" onClick={act(() => ctx.resolveCheck(x.id, 'arrived'), '도착으로 업데이트했어요')}>도착했대요</button>
            </div>
          </div>
        </div>,
      ),
    )

  /* ---------- 멤버 행 ---------- */
  const memberRow = (m: MeetingView, x: MemberView) => {
    const canCheck = host && x.id !== me.id && ['started', 'together'].includes(x.status)
    return (
      <div key={x.id} className="member">
        <Avatar name={x.name} />
        <div className="grow">
          <div className="nm">
            {x.name}
            {x.id === me.id && <> <span className="tag y">나</span></>}
            {x.userId === m.hostUserId && <> <span className="tag">주최자</span></>}
            {x.shareStopped && <> <span className="tag o">공유 중단</span></>}
            {x.groupDecision === 'declined' && <> <span className="tag">혼자 귀가</span></>}
            {x.planB && <span className="tag o">플랜 B · {x.planB.title}</span>}
          </div>
          <div className="sub">
            {destView(me, x)}
            {x.registered ? ` · ${x.departTime} 출발` : ''}
            {etaText(x)}
          </div>
        </div>
        <div style={{ textAlign: 'right', display: 'grid', gap: 6, justifyItems: 'end' }}>
          <Badge x={x} />
          {canCheck && (
            <button className="btn btn-soft btn-sm" onClick={act(() => ctx.requestCheck(x.id), '안부 확인을 요청했어요')}>안부 확인 요청</button>
          )}
        </div>
      </div>
    )
  }

  /* ---------- 그룹 카드 ---------- */
  const groupsHtml = (mt.groups ?? []).map((gr) => {
    const gm = gr.memberIds.map(byId).filter((x): x is MemberView => !!x)
    const left = gm.filter((x) => x.status !== 'arrived')
    const done = left.length === 0
    const someArrived = left.length < gm.length
    const isMine = !!mine && mine.id === gr.id
    return (
      <article key={gr.id} className={`card group-card ${isMine ? 'mine' : ''}`}>
        <div className="group-head">
          <div>
            <div className="row wrap"><h3>동행 그룹 {gr.n}</h3>{isMine && <span className="tag y">내 그룹</span>}</div>
            <div className="small muted">{gm.length}명 · 함께 이동 약 {gr.sharedMin}분 · 분기 지점 {gr.splitStation}역</div>
          </div>
          {done ? (
            <span className="badge st-arrived">그룹 귀가 완료</span>
          ) : (
            <span className="badge st-started plain">{gm.length - left.length}/{gm.length} 도착</span>
          )}
        </div>
        <div className="progress" aria-hidden="true"><i style={{ width: `${Math.round(((gm.length - left.length) / gm.length) * 100)}%` }} /></div>
        <div style={{ marginTop: 8 }}>{gm.map((x) => memberRow(mt, x))}</div>
        {!done && someArrived && (
          <p className="small" style={{ marginTop: 8, color: 'var(--orange-600)', fontWeight: 700 }}>
            <Icon name="flag" size={14} /> 마지막 미도착: {left.map((x) => x.name).join(', ')}
          </p>
        )}
      </article>
    )
  })

  const notices = mt.notices.filter((n) => !n.groupId || (mine && n.groupId === mine.id) || host).slice(0, 8)
  const lastArrived = mt.members.slice().sort((a, b) => (b.arrivedAt ?? 0) - (a.arrivedAt ?? 0))[0]

  return (
    <Shell narrow={false}>
      <div className="page-head row between wrap">
        <div>
          <div className="muted small" style={{ fontWeight: 700 }}>{step === 4 ? '귀가 현황' : '모임 홈'}</div>
          <h2>{mt.name}</h2>
          <div className="meta">
            <span className="chip"><Icon name="pin" size={16} />{mt.place}</span>
            <span className="chip"><Icon name="clock" size={16} />{mt.endTime} 해산</span>
            <span className="chip"><Icon name="users" size={16} />{mt.members.length}/{mt.capacity}명</span>
            <span className="chip"><Icon name="key" size={16} />{prettyCode(mt.code)}</span>
          </div>
        </div>
        <button
          className="btn btn-soft btn-sm"
          onClick={() => void navigator.clipboard.writeText(prettyCode(mt.code)).then(() => toast('복사했어요'))}
        >
          <Icon name="copy" size={16} />초대 코드 복사
        </button>
      </div>

      {allDone && (
        <div className="card green done" style={{ marginBottom: 20 }}>
          <div className="medal"><Icon name="check" size={40} /></div>
          <h2>모두 무사히 도착했어요 🎉</h2>
          <p className="muted" style={{ marginTop: 8 }}>
            {mt.members.length}명 전원이 귀가를 마쳤어요.
            <br />
            마지막 도착: <b>{lastArrived.name}</b>님 · {lastArrived.arrivedAt ? fmtClock(lastArrived.arrivedAt) : ''}
          </p>
        </div>
      )}
      {mt.matchStale && (
        <div className="banner warn" style={{ marginBottom: 16 }}>
          <span className="ico"><Icon name="refresh" size={20} /></span>
          <div className="grow small">새로 등록·수정된 귀가 정보가 있어요. 다시 매칭하면 그룹이 갱신돼요.</div>
          <Link className="btn btn-soft btn-sm" to={`/m/${mt.code}/match`}>다시 매칭</Link>
        </div>
      )}
      {banners.length > 0 && <div className="stack" style={{ marginBottom: 20 }}>{banners}</div>}

      <div className="layout-2">
        <div className="stack">
          {mineCard}
          {!mt.groups && (
            <div className="card empty">
              <p>아직 동행 매칭 전이에요.</p>
              <Link className="btn btn-primary" style={{ marginTop: 12 }} to={`/m/${mt.code}/match`}>
                <Icon name="users" size={18} />동행 매칭하기
              </Link>
            </div>
          )}
          {groupsHtml}
          {soloList && soloList.length > 0 && (
            <article className="card cream group-card">
              <div className="card-title"><Icon name="alert" size={20} /><h3>혼자 귀가하는 참여자</h3><span className="tag o">{soloList.length}명</span></div>
              {soloList.map((x) => memberRow(mt, x))}
            </article>
          )}
          {unreg.length > 0 && (
            <article className="card cream group-card">
              <div className="card-title"><Icon name="clock" size={20} /><h3>아직 귀가 정보를 등록하지 않았어요</h3><span className="tag">{unreg.length}명</span></div>
              {unreg.map((x) => memberRow(mt, x))}
            </article>
          )}
        </div>

        <aside className="side">
          <div className="card">
            <div className="row between"><h3>전체 귀가 현황</h3><b>{arrived.length}/{mt.members.length}</b></div>
            <div className="progress" style={{ margin: '12px 0 16px' }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <i style={{ width: `${pct}%` }} />
            </div>
            <div className="stats" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="stat"><div className="n">{before}</div><div className="l">아직 귀가 전</div></div>
              <div className="stat y"><div className="n">{onWay.length}</div><div className="l">귀가 중</div></div>
              <div className="stat ok"><div className="n">{arrived.length}</div><div className="l">도착 완료</div></div>
              <div className="stat warn"><div className="n">{soloList ? soloList.length : '–'}</div><div className="l">혼자 귀가</div></div>
            </div>
            {needCheck.length > 0 && (
              <p className="small" style={{ marginTop: 12, color: 'var(--orange-600)', fontWeight: 700 }}>
                <Icon name="bell" size={14} /> 확인 필요: {needCheck.map((x) => x.name).join(', ')}
              </p>
            )}
            {unreg.length > 0 && <p className="small muted" style={{ marginTop: 10 }}>정보 미등록 {unreg.length}명</p>}
          </div>

          <LastTrainCard me={me} onApply={act(ctx.applyRecommendedTime)} />

          <div className="card">
            <div className="card-title"><Icon name="bell" size={20} /><h3>그룹 알림</h3></div>
            {notices.length ? (
              notices.map((n) => (
                <div key={n.id} className={`notice ${n.kind}`}>
                  <span className="dot" />
                  <div><span>{n.text}</span><time>{fmtClock(n.ts)}</time></div>
                </div>
              ))
            ) : (
              <p className="small muted">아직 알림이 없어요.</p>
            )}
          </div>

          <div className="card yellow stack">
            <div className="card-title" style={{ margin: 0 }}><Icon name="pin" size={20} /><h3>어디까지 왔는지 확인</h3></div>
            <p className="small">귀가 중인 사람의 실시간 위치를 지도로 보고, 채팅으로 바로 물어볼 수 있어요.</p>
            <Link className="btn btn-primary btn-block" to={`/m/${mt.code}/live`}><Icon name="pin" size={18} />실시간 위치 지도</Link>
            <Link className="btn btn-soft btn-block" to={`/m/${mt.code}/chat`}>
              <Icon name="bell" size={18} />모임 채팅{ctx.unread > 0 && <span className="tag o" style={{ marginLeft: 6 }}>{ctx.unread > 99 ? "99+" : ctx.unread}</span>}
            </Link>
          </div>

          <div className="card">
            <div className="card-title"><Icon name="shield" size={20} /><h3>내 설정</h3></div>
            <div className="stack">
              <Link className="btn btn-ghost btn-block" to={`/m/${mt.code}/settings`}>위치 공개·도착 알림 설정</Link>
              <Link className="btn btn-soft btn-block" to={`/m/${mt.code}/planb`}>귀가 플랜 B</Link>
              {me.registered && <Link className="btn btn-ghost btn-block" to={`/m/${mt.code}/register`}>귀가 정보 수정</Link>}
            </div>
          </div>

          {host && (
            <HostManager
              mt={mt}
              regd={regd}
              arrived={arrived}
              onWay={onWay}
              needCheck={needCheck}
              unreg={unreg}
              soloList={soloList}
              onNudge={() => void ctx.nudge().then((c) => toast(`${c}명에게 등록을 요청했어요`))}
            />
          )}
        </aside>
      </div>
    </Shell>
  )
}

function LastTrainCard({ me, onApply }: { me: MemberView; onApply: () => void }) {
  if (!me.registered) return null
  const info = lastTrainInfo(me)
  if (!info) {
    return (
      <div className="card">
        <div className="card-title"><Icon name="clock" size={20} /><h3>막차·출발 권장 시간</h3></div>
        <p className="small muted">{me.mode}은(는) 막차 제한이 없어요. 이동 시간은 약 {travelMin(me.origin, me.dest)}분으로 예상해요.</p>
      </div>
    )
  }
  const [cls, label] = LEVEL[info.level]
  const msg =
    info.level === 'danger'
      ? `출발 예정(${me.departTime})이 막차보다 늦어요. 지금 출발하거나 플랜 B를 확인하세요.`
      : info.level === 'warn'
        ? `막차까지 ${info.slack}분 남았어요. 서두르는 걸 권장해요.`
        : `막차까지 ${info.slack}분 여유가 있어요.`
  return (
    <div className={`card ${info.level === 'ok' ? '' : 'orange'}`}>
      <div className="row between">
        <div className="card-title" style={{ margin: 0 }}><Icon name="clock" size={20} /><h3>막차·출발 권장 시간</h3></div>
        <span className={`badge ${cls}`}>{label}</span>
      </div>
      <div className="grid2" style={{ marginTop: 14, gap: 10 }}>
        <div className="stat"><div className="n" style={{ fontSize: 22 }}>{info.last}</div><div className="l">{me.mode} 막차 (시연 기준)</div></div>
        <div className="stat"><div className="n" style={{ fontSize: 22 }}>{info.recommended}</div><div className="l">출발 권장 시간</div></div>
      </div>
      <p className="small" style={{ marginTop: 12 }}>{msg} 예상 이동 시간은 약 {info.travel}분이에요.</p>
      {info.level !== 'ok' && me.status === 'ready' && (
        <button className="btn btn-warn btn-sm btn-block" style={{ marginTop: 10 }} onClick={onApply}>
          <Icon name="clock" size={16} />출발 시간을 {info.recommended}로 변경
        </button>
      )}
      <p className="small muted" style={{ marginTop: 8 }}>※ 실제 서비스에서는 대중교통 API로 막차 시간을 가져와요.</p>
    </div>
  )
}


function HostManager(props: {
  mt: MeetingView
  regd: MemberView[]
  arrived: MemberView[]
  onWay: MemberView[]
  needCheck: MemberView[]
  unreg: MemberView[]
  soloList: MemberView[] | null
  onNudge: () => void
}) {
  const { regd, arrived, onWay, needCheck, unreg, soloList, onNudge } = props
  const risky = regd
    .filter((x) => x.status === 'ready')
    .map((x) => ({ x, i: lastTrainInfo(x) }))
    .filter((o) => o.i && o.i.level !== 'ok')
  const lastLeft = regd.filter((x) => x.status !== 'arrived' && arrived.length > 0)
  const names = (l: MemberView[]) => l.map((x) => x.name).join(', ')
  const row = (label: string, content: ReactNode, cls = '') => (
    <div className="row between" style={{ padding: '9px 0', borderTop: '1px solid var(--line)', alignItems: 'flex-start' }}>
      <span className="small" style={{ fontWeight: 700 }}>{label}</span>
      <span className={`small ${cls}`} style={{ textAlign: 'right' }}>{content || <span className="muted">없음</span>}</span>
    </div>
  )
  return (
    <div className="card cream">
      <div className="card-title"><Icon name="flag" size={20} /><h3>해산 매니저</h3><span className="tag y">주최자</span></div>
      <p className="small muted" style={{ marginBottom: 12 }}>참여자 현황을 확인하고 마지막 한 사람까지 챙겨요.</p>
      <div style={{ marginBottom: 14 }}>
        {row('귀가 시작', names(onWay))}
        {row('도착 완료', names(arrived))}
        {row('혼자 귀가', soloList ? names(soloList) : <span className="muted">매칭 전</span>)}
        {row('도착 확인 필요', names(needCheck), needCheck.length ? 'orange-t' : '')}
        {row(
          '막차 위험',
          risky.map((o) => `${o.x.name}(${o.i!.slack < 0 ? '놓침' : o.i!.slack + '분'})`).join(', '),
          risky.length ? 'orange-t' : '',
        )}
        {row('마지막 미도착', arrived.length && lastLeft.length ? names(lastLeft) : '', lastLeft.length && arrived.length ? 'orange-t' : '')}
        {row('정보 미등록', names(unreg))}
      </div>
      <div className="stack">
        {unreg.length > 0 && (
          <button className="btn btn-warn btn-block" onClick={onNudge}>
            <Icon name="bell" size={18} />미등록 {unreg.length}명에게 등록 요청
          </button>
        )}
      </div>
    </div>
  )
}
