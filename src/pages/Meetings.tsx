import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon from '@/components/Icon'
import { useToast } from '@/components/Toast'
import { Back, routeText, Shell } from '@/components/ui'
import * as api from '@/lib/api'
import { agoText, distanceMeters, getCurrentFix, type GeoFix } from '@/lib/geo'
import { nearestStation } from '@/lib/matching'
import { findStation } from '@/lib/stations'

const NICK_KEY = 'eodiya.nick'
/** 내 위치에서 이 거리 안에 출발역이 있는 모임을 "근처 모임"으로 본다 */
const NEAR_RADIUS_M = 2000

const distText = (m: number) => (m < 1000 ? `약 ${Math.max(50, Math.round(m / 50) * 50)}m` : `약 ${(m / 1000).toFixed(1)}km`)

export default function Meetings() {
  const navigate = useNavigate()
  const toast = useToast()
  const [list, setList] = useState<api.OpenMeeting[] | null>(null)
  const [nick, setNick] = useState(() => localStorage.getItem(NICK_KEY) ?? '')
  const [error, setError] = useState<string | null>(null)
  const [joining, setJoining] = useState<string | null>(null)

  // 내 위치 기준으로 출발역이 가까운 모임만 보기
  const [fix, setFix] = useState<GeoFix | null>(null)
  const [locating, setLocating] = useState(false)
  const [nearOnly, setNearOnly] = useState(false)

  const load = useCallback(async () => {
    try {
      setList(await api.listOpenMeetings())
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  useEffect(() => {
    void load()
    const t = setInterval(() => void load(), 8000)
    return () => clearInterval(t)
  }, [load])

  async function locate() {
    setError(null)
    setLocating(true)
    try {
      setFix(await getCurrentFix())
      setNearOnly(true)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLocating(false)
    }
  }

  const nearStation = useMemo(() => (fix ? nearestStation(fix) : null), [fix])

  // 모임마다 내 위치에서 출발역까지의 거리
  const items = useMemo(() => {
    const all = (list ?? []).map((m) => {
      const st = findStation(m.place)
      return { m, dist: fix && st ? distanceMeters(fix, st) : null }
    })
    if (!fix || !nearOnly) return all
    return all
      .filter((x) => x.dist !== null && x.dist <= NEAR_RADIUS_M)
      .sort((a, b) => (a.dist ?? 0) - (b.dist ?? 0))
  }, [list, fix, nearOnly])

  async function join(m: api.OpenMeeting) {
    setError(null)
    if (!m.joined && !nick.trim()) {
      setError('참여하려면 먼저 위에서 닉네임을 입력해 주세요.')
      document.getElementById('nick')?.focus()
      return
    }
    setJoining(m.id)
    try {
      if (nick.trim()) localStorage.setItem(NICK_KEY, nick.trim())
      // 이미 참여 중이면 같은 호출이 코드만 돌려준다(중복 참여 없음)
      const code = await api.joinPublicMeeting(m.id, nick.trim() || '참여자')
      if (m.joined) navigate(`/m/${code}`)
      else {
        toast(`"${m.name}" 모임에 참여했어요`)
        navigate(`/m/${code}/register`)
      }
    } catch (e) {
      setError((e as Error).message)
      void load()
    } finally {
      setJoining(null)
    }
  }

  return (
    <Shell>
      <Back to="/">처음으로</Back>
      <div className="page-head row between wrap">
        <div>
          <h2>모집 중인 모임{list ? ` ${list.length}개` : ''}</h2>
          <p>같은 방향으로 귀가하려는 모임을 골라 누르면 바로 참여돼요. 원하는 모임이 없으면 직접 만들어 보세요.</p>
        </div>
        <Link className="btn btn-primary btn-sm" to="/create">
          <Icon name="plus" size={16} />모임 만들기
        </Link>
      </div>

      <label className="field" style={{ marginBottom: 28 }}>
        <span className="label">내 닉네임 (모임 사람들에게 보여요)</span>
        <input id="nick" type="text" maxLength={12} placeholder="예: 지은" autoComplete="nickname" value={nick} onChange={(e) => setNick(e.target.value)} />
      </label>

      {/* 내 위치 확인 → 출발역이 가까운 모임 */}
      <div className="card cream stack" style={{ marginBottom: 36 }}>
        <div className="card-title" style={{ margin: 0 }}><Icon name="pin" size={20} /><h3>내 주변 모임 찾기</h3></div>
        <button className="btn btn-primary btn-block" onClick={() => void locate()} disabled={locating}>
          <Icon name="pin" size={18} />
          {locating ? '위치 확인 중...' : fix ? '내 위치 다시 확인' : '내 위치 확인'}
        </button>
        {fix && nearStation && (
          <div className="small">
            <b>내 위치에서 가장 가까운 역: {nearStation.station.key}</b>{' '}
            <span className="muted">(약 {nearStation.km < 1 ? `${Math.round(nearStation.km * 1000)}m` : `${nearStation.km.toFixed(1)}km`})</span>
            <div className="muted" style={{ marginTop: 4 }}>
              {nearOnly
                ? `출발역이 내 위치 반경 ${NEAR_RADIUS_M / 1000}km 안에 있는 모임 ${items.length}개를 보여줘요.`
                : '지금은 모든 모임을 보여줘요.'}{' '}
              <button type="button" className="leave-btn" style={{ padding: 0 }} onClick={() => setNearOnly((v) => !v)}>
                {nearOnly ? '전체 모임 보기' : '내 주변 모임만 보기'}
              </button>
            </div>
          </div>
        )}
        {!fix && <div className="small muted">내 위치를 확인하면 출발역이 가까운 모임만 골라서 보여줘요. 위치는 저장되지 않아요.</div>}
      </div>

      {error && (
        <div className="banner warn" style={{ marginBottom: 16 }}>
          <span className="ico"><Icon name="alert" /></span>
          <div className="grow small">{error}</div>
        </div>
      )}

      {list === null && !error && <div className="card center"><p className="muted">모집 중인 모임을 불러오는 중...</p></div>}
      {list && items.length === 0 && (
        <div className="card empty">
          <p>
            {list.length === 0
              ? '지금 모집 중인 모임이 없어요.'
              : `내 위치 근처(반경 ${NEAR_RADIUS_M / 1000}km)에 출발역이 있는 모임이 없어요.`}
          </p>
          <div className="row wrap" style={{ marginTop: 12, justifyContent: 'center' }}>
            {list.length > 0 && (
              <button className="btn btn-soft" onClick={() => setNearOnly(false)}>전체 모임 보기</button>
            )}
            <Link className="btn btn-primary" to="/create">
              <Icon name="plus" size={18} />내가 모임 만들기
            </Link>
          </div>
        </div>
      )}

      {items.map(({ m, dist }) => (
        <button
          key={m.id}
          type="button"
          className="card meeting-card"
          onClick={() => void join(m)}
          disabled={joining === m.id}
        >
          <div className="row between wrap" style={{ alignItems: 'flex-start' }}>
            <div>
              <div className="meeting-name">{m.name}</div>
              <div className="meeting-route">
                <Icon name="train" size={16} />
                {routeText(m)}
              </div>
            </div>
            <span className="tag y">{m.memberCount}/{m.capacity}명</span>
          </div>
          <div className="small muted" style={{ marginTop: 8 }}>
            {m.place} 출발{dist !== null ? ` (내 위치에서 ${distText(dist)})` : ''}
            {m.destArea ? ` · ${m.destArea} 방면` : ''}
            {m.endTime ? ` · ${m.endTime} 해산` : ''} · {m.hostName ?? '주최자'} 님 · {agoText(m.createdAt)} 개설
          </div>
          <div className="meeting-join">
            {m.joined ? (
              <span className="badge st-arrived plain"><Icon name="check" size={14} /> 참여 중 · 눌러서 열기</span>
            ) : (
              <span className="btn btn-primary btn-sm">{joining === m.id ? '참여 중...' : '눌러서 바로 참여'}</span>
            )}
          </div>
        </button>
      ))}
    </Shell>
  )
}
