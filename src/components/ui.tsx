import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { MemberView, Privacy } from '@/types'
import { findStation } from '@/lib/stations'
import Icon from './Icon'

export const STATUS: Record<string, string> = {
  unregistered: '정보 미등록',
  ready: '귀가 준비 중',
  started: '귀가 시작',
  together: '동행 중',
  arrived: '목적지 도착',
  check: '귀가 확인 필요',
}

export const statusOf = (x: MemberView) => (x.registered ? x.status : 'unregistered')

export function Badge({ x, plain = false }: { x: MemberView; plain?: boolean }) {
  const s = statusOf(x)
  return <span className={`badge st-${s}${plain ? ' plain' : ''}`}>{STATUS[s]}</span>
}

const AV = ['#FFD966', '#FFC9A0', '#F9E4A8', '#FFDDB8', '#EBD9B4', '#F7C873']
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const h = [...name].reduce((a, c) => a + c.charCodeAt(0), 0)
  return (
    <span className="avatar" style={{ background: AV[h % AV.length], width: size, height: size }}>
      {name.slice(0, 1)}
    </span>
  )
}

export const PRIVACY: Record<Privacy, { t: string; d: string }> = {
  exact: { t: '정확한 위치 공개', d: '모임 사람들이 지도에서 내 실시간 위치(귀가 중)와 목적지 역을 볼 수 있어요. 집 주소는 입력하지 않아요.' },
  area: { t: '대략적인 지역만 공개', d: '"○○구 방면"처럼 지역만 보여줘요. 지도에는 내 위치가 표시되지 않아요.' },
  status: { t: '귀가 상태만 공개', d: '목적지와 위치는 숨기고 귀가 시작·도착 상태만 보여줘요.' },
}

export const MODES: [string, string][] = [
  ['지하철', 'train'],
  ['버스', 'bus'],
  ['택시', 'taxi'],
  ['도보', 'walk'],
]

/** 다른 참여자에게 보이는 목적지 (위치 공개 범위 적용) */
export function destView(viewer: MemberView | null, x: MemberView): string {
  if (!x.registered) return '귀가 정보 미등록'
  if (viewer && viewer.id === x.id) return `${x.dest} (나만 정확히 볼 수 있어요)`
  const eff = x.shareStopped ? 'status' : x.privacy
  if (eff === 'exact') return x.dest
  if (eff === 'area') {
    const s = findStation(x.dest)
    return s ? `${s.d} 방면` : '지역 비공개'
  }
  return '목적지 비공개'
}

export const fmtClock = (ts: number) =>
  new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })

export function Shell({ children, narrow = true }: { children: ReactNode; narrow?: boolean }) {
  return <div className={`container ${narrow ? 'narrow' : ''} page`}>{children}</div>
}

export function Back({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link className="crumb" to={to}>
      <Icon name="back" size={16} />
      {children}
    </Link>
  )
}

export function Stepper({ n }: { n: number }) {
  const L = ['모임', '귀가 정보', '동행 매칭', '귀가 현황']
  return (
    <div className="steps" aria-label="진행 단계">
      {L.map((l, i) => (
        <div key={l} className={`s ${i + 1 < n ? 'pass' : i + 1 === n ? 'on' : ''}`}>
          {l}
        </div>
      ))}
    </div>
  )
}

export function NotFound() {
  return (
    <Shell>
      <div className="card center stack">
        <h2>모임을 찾을 수 없어요</h2>
        <p className="muted">초대 코드가 올바른지 확인하거나 새 모임을 만들어 보세요.</p>
        <div className="row wrap" style={{ justifyContent: 'center' }}>
          <Link className="btn btn-primary" to="/join">
            초대 코드 입력
          </Link>
          <Link className="btn btn-ghost" to="/create">
            모임 만들기
          </Link>
        </div>
      </div>
    </Shell>
  )
}

export function Loading({ error }: { error?: string | null }) {
  return (
    <Shell>
      <div className="card center">
        {error ? <p style={{ color: 'var(--orange-600)', fontWeight: 700 }}>{error}</p> : <p className="muted">불러오는 중...</p>}
      </div>
    </Shell>
  )
}
