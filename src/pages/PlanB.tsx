import { useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '@/components/Icon'
import { useToast } from '@/components/Toast'
import { Back, Shell } from '@/components/ui'
import { groupOf, useMeeting } from '@/hooks/useMeeting'
import { fmtTime, km, toMin, travelMin } from '@/lib/matching'
import { findStation } from '@/lib/stations'
import type { MeetingView, MemberView } from '@/types'

const SITUATIONS: [string, string, string][] = [
  ['lastTrain', '막차를 놓쳤어요', 'train'],
  ['busEnd', '버스 운행이 끝났어요', 'bus'],
  ['transfer', '환승을 놓쳤어요', 'swap'],
  ['buddyLeft', '동행자가 중간에 이탈했어요', 'users'],
  ['late', '출발이 늦어졌어요', 'clock'],
]

interface Option {
  icon: string
  title: string
  min: number | null
  note: string
}

function planOptions(mt: MeetingView, me: MemberView, sit: string): Option[] {
  const o = findStation(me.origin) ?? findStation(mt.placeStation)
  const d = findStation(me.dest)
  const dist = o && d ? km(o, d) : 10
  const base = travelMin(me.origin, me.dest)
  const taxiMin = Math.round(6 + dist / 0.6)
  const fare = Math.round((4800 + Math.max(0, dist - 1.6) * 1000) / 100) * 100
  const g = groupOf(mt, me.id)
  const mates = (g?.memberIds ?? [])
    .map((i) => mt.members.find((x) => x.id === i))
    .filter((x): x is MemberView => !!x && x.id !== me.id && x.status !== 'arrived')
  const split = g?.splitStation
  const won = (n: number) => n.toLocaleString('ko-KR') + '원'
  const taxi: Option = {
    icon: 'taxi',
    title: '택시로 이동',
    min: taxiMin,
    note: `예상 요금 약 ${won(fare)}${
      mates.length
        ? ` · 동행자 ${mates.length}명과 합승하면 1인당 약 ${won(Math.round(fare / (mates.length + 1) / 100) * 100)}`
        : ''
    }`,
  }
  const night: Option = {
    icon: 'bus',
    title: '심야버스(N버스) 이용',
    min: base + 25,
    note: '배차 간격 약 20~30분을 포함한 시연용 추정치예요. 실제 운행 여부는 교통 앱에서 확인하세요.',
  }
  const wait: Option = {
    icon: 'clock',
    title: '안전한 곳에서 대기 후 첫차',
    min: null,
    note: '24시간 편의점·카페 등 밝고 사람이 많은 곳에서 기다리는 방법이에요. 혼자라면 안부 확인 대상에게 알려 두세요.',
  }
  switch (sit) {
    case 'lastTrain':
      return [taxi, night, wait]
    case 'busEnd':
      return [
        { icon: 'walk', title: '가까운 지하철역으로 이동 후 환승', min: base + 12, note: '운행 중인 지하철이 남아 있는지 먼저 확인하세요.' },
        taxi,
        night,
      ]
    case 'transfer':
      return [
        { icon: 'train', title: '다음 열차 기다리기', min: base + 8, note: '배차 간격 약 5~10분 기준이에요.' },
        { icon: 'swap', title: '다른 노선으로 우회', min: base + 15, note: '환승 횟수가 늘 수 있어요.' },
        taxi,
      ]
    case 'buddyLeft':
      return [
        {
          icon: 'users',
          title: `남은 동행자와 ${split || '분기 지점'}역까지 함께 이동`,
          min: null,
          note: mates.length ? `남은 동행자: ${mates.map((x) => x.name).join(', ')}` : '남은 동행자가 없다면 아래 방법을 이용하세요.',
        },
        { icon: 'bell', title: '안부 확인 대상에게 귀가 시작 알리기', min: null, note: '도착 예정 시간을 공유하고 도착 후 완료를 눌러 주세요.' },
        taxi,
      ]
    default:
      return []
  }
}

export default function PlanB() {
  const { mt, me, applyPlanB, register } = useMeeting()
  const toast = useToast()
  const [sit, setSit] = useState<string | null>(null)
  const [time, setTime] = useState(fmtTime(toMin(me.departTime || mt.endTime) + 20))
  const g = groupOf(mt, me.id)

  if (!me.registered) {
    return (
      <Shell>
        <Back to={`/m/${mt.code}`}>귀가 현황</Back>
        <div className="card center stack">
          <p>귀가 정보를 먼저 등록하면 상황에 맞는 대체 계획을 추천해요.</p>
          <Link className="btn btn-primary" to={`/m/${mt.code}/register`}>귀가 정보 등록</Link>
        </div>
      </Shell>
    )
  }

  const opts = sit ? planOptions(mt, me, sit) : []
  const sitLabel = SITUATIONS.find((s) => s[0] === sit)?.[1]

  async function apply(opt: Option) {
    if (!sit || !sitLabel) return
    await applyPlanB(
      { title: opt.title, situation: sitLabel },
      `${me.name}님이 "${sitLabel}" 상황이라 "${opt.title}"(으)로 귀가 계획을 바꿨어요.`,
      g?.id ?? null,
    )
    toast('귀가 계획을 변경하고 그룹에 알렸어요')
  }

  async function applyLate(e: React.FormEvent) {
    e.preventDefault()
    await register({ origin: me.origin, dest: me.dest, departTime: time, mode: me.mode, privacy: me.privacy })
    await applyPlanB(
      { title: `${time} 출발로 변경`, situation: '출발이 늦어졌어요' },
      `${me.name}님의 출발 시간이 ${time}으로 늦어졌어요.`,
      g?.id ?? null,
    )
    toast('출발 시간을 변경하고 그룹에 알렸어요')
  }

  return (
    <Shell>
      <Back to={`/m/${mt.code}`}>귀가 현황</Back>
      <div className="page-head">
        <h2>귀가 플랜 B</h2>
        <p>계획이 바뀌었나요? 지금 상황을 고르면 대체 방법을 추천해 드려요.</p>
      </div>
      <div className="card">
        <div className="card-title"><Icon name="alert" size={20} /><h3>현재 발생한 문제</h3></div>
        <div className="choice-list">
          {SITUATIONS.map(([k, l, ic]) => (
            <label key={k} className="choice">
              <input type="radio" name="sit" value={k} checked={k === sit} onChange={() => setSit(k)} />
              <span className="box" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Icon name={ic} size={20} />
                <span className="t">{l}</span>
              </span>
            </label>
          ))}
        </div>
      </div>
      {me.planB && (
        <div className="card green" style={{ marginTop: 16 }}>
          <div className="row">
            <span style={{ color: 'var(--green-700)' }}><Icon name="check" size={22} /></span>
            <div>
              <b>적용 중인 계획: {me.planB.title}</b>
              <div className="small muted">{me.planB.situation}</div>
            </div>
          </div>
        </div>
      )}
      {sit === 'late' && (
        <form className="card" style={{ marginTop: 16 }} onSubmit={(e) => void applyLate(e)}>
          <div className="card-title"><Icon name="clock" size={20} /><h3>새 출발 시간</h3></div>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="새 출발 시간" />
          <p className="small muted" style={{ margin: '10px 0 14px' }}>
            {g ? '변경하면 그룹에 알리고, 동행 매칭을 다시 확인하도록 안내해요.' : '변경한 시간으로 동행 매칭을 다시 할 수 있어요.'}
          </p>
          <button className="btn btn-primary btn-block" type="submit">변경하고 그룹에 알리기</button>
        </form>
      )}
      {sit && sit !== 'late' && (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 12 }}>추천 대체 방법 · {sitLabel}</h3>
          {opts.map((p) => (
            <div key={p.title} className={`plan-card ${me.planB?.title === p.title ? 'sel' : ''}`}>
              <div className="row between wrap">
                <div className="row">
                  <span style={{ color: 'var(--orange-600)' }}><Icon name={p.icon} size={22} /></span>
                  <b>{p.title}</b>
                </div>
                {p.min !== null && <span className="time">약 {p.min}분</span>}
              </div>
              <p className="small muted" style={{ margin: '8px 0 12px' }}>{p.note}</p>
              <button className="btn btn-soft btn-sm" onClick={() => void apply(p)}>
                <Icon name="bell" size={16} />이 방법으로 변경하고 그룹에 알리기
              </button>
            </div>
          ))}
          <p className="small muted" style={{ marginTop: 12 }}>
            ※ 시간·요금은 거리 기반 시연용 추정치예요. 실제 서비스에서는 대중교통 API와 연동돼요.
          </p>
        </div>
      )}
      {!sit && <div className="card empty" style={{ marginTop: 16 }}>상황을 선택하면 대체 이동 방법이 나타나요.</div>}
    </Shell>
  )
}
