import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon from '@/components/Icon'
import StationPicker from '@/components/StationPicker'
import { useToast } from '@/components/Toast'
import { Avatar, Back, MODES, Shell } from '@/components/ui'
import * as api from '@/lib/api'
import { agoText, getCurrentFix, reverseGeocode, type GeoFix } from '@/lib/geo'
import { bearing, fmtTime, nearestStation } from '@/lib/matching'
import { findStation } from '@/lib/stations'

const NICK_KEY = 'eodiya.nick'
const RADII: [number, string][] = [
  [500, '500m'],
  [1000, '1km'],
  [3000, '3km'],
]

const distText = (m: number) => (m < 1000 ? `약 ${m}m` : `약 ${(m / 1000).toFixed(1)}km`)
/** 방향이 비슷하고(40° 이내) 목적지 사이가 가까우면(10km 이내) 같은 방향으로 본다 */
const sameWay = (p: api.NearbyPerson) => p.dirDiff <= 40 && p.destGapKm <= 10

export default function Nearby() {
  const navigate = useNavigate()
  const toast = useToast()

  const [nick, setNick] = useState(() => localStorage.getItem(NICK_KEY) ?? '')
  const [fix, setFix] = useState<(GeoFix & { label: string | null }) | null>(null)
  const [dest, setDest] = useState('')
  const [time, setTime] = useState(() => fmtTime(new Date().getHours() * 60 + new Date().getMinutes() + 10))
  const [mode, setMode] = useState('지하철')
  const [busy, setBusy] = useState(false)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [mine, setMine] = useState<api.NearbyPost | null>(null)
  const [radius, setRadius] = useState(1000)
  const [people, setPeople] = useState<api.NearbyPerson[] | null>(null)
  const [onlySame, setOnlySame] = useState(true)
  const [invites, setInvites] = useState<api.NearbyInvite[]>([])
  const [myMeeting, setMyMeeting] = useState<{ code: string; name: string; members: number } | null>(null)
  const timeRef = useRef(time)
  timeRef.current = time

  /* ---------- 내 게시 / 주변 사람 / 초대 불러오기 ---------- */
  const refresh = useCallback(async () => {
    try {
      const [post, inv, meeting] = await Promise.all([api.fetchMyNearbyPost(), api.fetchMyInvites(), api.fetchMyNearbyMeeting()])
      setMine(post)
      setInvites(inv)
      setMyMeeting(meeting)
      setPeople(post ? await api.findNearby(radius) : null)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [radius])

  useEffect(() => {
    void refresh()
    const t = setInterval(() => void refresh(), 10000)
    const off = api.subscribeInvites(() => void refresh())
    return () => {
      clearInterval(t)
      off()
    }
  }, [refresh])

  /* ---------- 현재 위치 ---------- */
  async function locate() {
    setError(null)
    setLocating(true)
    try {
      const f = await getCurrentFix()
      setFix({ ...f, label: null })
      void reverseGeocode(f.lat, f.lng).then((label) => label && setFix((cur) => (cur ? { ...cur, label } : cur)))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLocating(false)
    }
  }

  /* ---------- 내 정보 올리고 주변 찾기 ---------- */
  async function startSearch(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const station = findStation(dest)
    const near = fix ? nearestStation(fix) : null
    if (!nick.trim()) return setError('닉네임을 입력해 주세요. 주변 사람에게는 닉네임만 보여요.')
    if (!fix || !near) return setError('먼저 현재 위치를 확인해 주세요.')
    if (!station) return setError('가려는 곳(목적지 역)을 선택해 주세요.')
    setBusy(true)
    try {
      localStorage.setItem(NICK_KEY, nick.trim())
      await api.postNearby({
        name: nick.trim(),
        lat: fix.lat,
        lng: fix.lng,
        label: fix.label,
        originKey: near.station.key,
        destKey: station.key,
        destArea: station.d,
        destLat: station.lat,
        destLng: station.lng,
        bearing: bearing(fix, station),
        departTime: time,
        mode,
      })
      toast('주변 사람에게 내가 귀가 동행을 찾는 중이라고 알렸어요')
      await refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function stopSearch() {
    try {
      await api.removeNearby()
      setMine(null)
      setPeople(null)
      toast('내 정보를 내렸어요')
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function invite(p: api.NearbyPerson) {
    try {
      const code = await api.sendNearbyInvite(p.id, timeRef.current)
      toast(`${p.name}님에게 함께 귀가를 제안했어요`)
      setMyMeeting((m) => m ?? { code, name: '내 귀가 모임', members: 1 })
      await refresh()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function respond(inv: api.NearbyInvite, accept: boolean) {
    try {
      const code = await api.respondNearbyInvite(inv.id, accept)
      if (accept && code) {
        toast('모임에 참여했어요')
        navigate(`/m/${code}`)
      } else {
        toast('제안을 거절했어요')
        await refresh()
      }
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const shown = (people ?? []).filter((p) => !onlySame || sameWay(p))
  const hiddenCount = (people?.length ?? 0) - shown.length
  const leftMin = mine ? Math.max(0, Math.round((mine.expiresAt - Date.now()) / 60000)) : 0

  return (
    <Shell>
      <Back to="/">처음으로</Back>
      <div className="page-head">
        <h2>주변에서 같이 갈 사람 찾기</h2>
        <p>
          지금 가까이 있고 같은 방향으로 귀가하려는 사람을 찾아요. 서로에게는 <b>닉네임과 대략적인 거리</b>만 보이고, 제안을 수락해야 모임이 만들어져요.
        </p>
      </div>

      {error && (
        <div className="banner warn" style={{ marginBottom: 16 }}>
          <span className="ico"><Icon name="alert" /></span>
          <div className="grow small">{error}</div>
        </div>
      )}

      {/* 받은 제안 */}
      {invites.map((inv) => (
        <div key={inv.id} className="card yellow stack" style={{ marginBottom: 16 }}>
          <div className="card-title" style={{ margin: 0 }}><Icon name="users" size={22} /><h3>{inv.fromName}님이 함께 귀가를 제안했어요</h3></div>
          <p className="small">수락하면 {inv.fromName}님의 귀가 모임에 참여하고, 내 목적지·출발 시간이 자동으로 등록돼요.</p>
          <div className="row wrap">
            <button className="btn btn-primary" onClick={() => void respond(inv, true)}><Icon name="check" size={18} />수락하고 모임 들어가기</button>
            <button className="btn btn-ghost" onClick={() => void respond(inv, false)}>거절</button>
          </div>
        </div>
      ))}

      {/* 내가 만든 모임 */}
      {myMeeting && (
        <div className="card green stack" style={{ marginBottom: 16 }}>
          <div className="card-title" style={{ margin: 0 }}><Icon name="users" size={22} /><h3>{myMeeting.name}</h3><span className="tag">{myMeeting.members}명</span></div>
          <p className="small">제안을 수락한 사람이 모임에 들어와요. 모임에서 채팅과 실시간 위치를 쓸 수 있어요.</p>
          <Link className="btn btn-primary" to={`/m/${myMeeting.code}`}>내 모임 열기 <Icon name="arrow" size={18} /></Link>
        </div>
      )}

      {!mine ? (
        /* 1) 내 위치·목적지 입력 */
        <form className="card" onSubmit={(e) => void startSearch(e)} noValidate>
          <label className="field">
            <span className="label">닉네임</span>
            <input type="text" maxLength={12} placeholder="주변 사람에게 보여요 (예: 지은)" value={nick} onChange={(e) => setNick(e.target.value)} autoComplete="nickname" />
          </label>

          <div className="field">
            <span className="label">현재 내 위치</span>
            <button type="button" className="btn btn-primary btn-block" onClick={() => void locate()} disabled={locating}>
              <Icon name="pin" size={18} />
              {locating ? '위치 확인 중...' : fix ? '현재 위치 다시 확인' : '현재 위치 확인 (GPS)'}
            </button>
            {fix && (
              <div className="card cream" style={{ marginTop: 10, padding: 14 }}>
                <div style={{ fontWeight: 700 }}><Icon name="pin" size={16} /> {fix.label ?? `${fix.lat.toFixed(5)}, ${fix.lng.toFixed(5)}`}</div>
                <div className="small muted">정확도 약 ±{Math.round(fix.accuracy)}m · 다른 사람에게는 대략적인 거리만 보여요</div>
              </div>
            )}
          </div>

          <div className="field">
            <span className="label">가려는 곳 (목적지 역)</span>
            <StationPicker value={dest} onChange={setDest} />
            <div className="hint"><Icon name="lock" size={13} /> 다른 사람에게는 "○○구 방면"까지만 보여요.</div>
          </div>

          <label className="field">
            <span className="label">출발 예정 시간</span>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>

          <div className="field">
            <span className="label">이용 예정 교통수단</span>
            <div className="choice-grid">
              {MODES.map(([m, ic]) => (
                <label key={m} className="choice">
                  <input type="radio" name="mode" value={m} checked={m === mode} onChange={() => setMode(m)} />
                  <span className="box"><Icon name={ic} size={18} />{m}</span>
                </label>
              ))}
            </div>
          </div>

          <button className="btn btn-primary btn-lg btn-block" style={{ marginTop: 20 }} type="submit" disabled={busy}>
            {busy ? '올리는 중...' : '주변 사람 찾기'}
          </button>
          <p className="small muted" style={{ marginTop: 10 }}>
            찾는 동안 내 정보는 주변 사람에게 최대 1시간 보여요. 언제든 내릴 수 있어요.
          </p>
        </form>
      ) : (
        <>
          {/* 2) 내 상태 + 주변 목록 */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="row between wrap">
              <div>
                <div className="small muted" style={{ fontWeight: 700 }}>내가 올려 둔 정보 · {leftMin}분 남음</div>
                <div style={{ fontWeight: 700 }}>{mine.displayName} → {mine.destKey} · {mine.departTime} 출발 · {mine.mode}</div>
                <div className="small muted"><Icon name="pin" size={13} /> {mine.label ?? mine.originKey}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => void stopSearch()}>내리기</button>
            </div>
          </div>

          <div className="row between wrap" style={{ marginBottom: 12 }}>
            <div className="row wrap">
              {RADII.map(([r, label]) => (
                <button key={r} className={`btn btn-sm ${radius === r ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setRadius(r)}>
                  {label}
                </button>
              ))}
            </div>
            <label className="small row" style={{ gap: 6, fontWeight: 700 }}>
              <input type="checkbox" checked={onlySame} onChange={(e) => setOnlySame(e.target.checked)} />
              같은 방향만 보기
            </label>
          </div>

          {people === null && <div className="card center"><p className="muted">주변을 찾는 중...</p></div>}
          {people && shown.length === 0 && (
            <div className="card empty">
              <p>
                {people.length === 0
                  ? `반경 ${RADII.find(([r]) => r === radius)?.[1]} 안에 귀가를 찾는 사람이 아직 없어요.`
                  : `같은 방향으로 가는 사람이 없어요. (다른 방향 ${hiddenCount}명)`}
              </p>
              <p className="small muted" style={{ marginTop: 6 }}>10초마다 자동으로 다시 찾아요. 반경을 넓히거나 잠시 기다려 보세요.</p>
            </div>
          )}
          {shown.map((p) => (
            <article key={p.id} className="card group-card" style={{ marginBottom: 12 }}>
              <div className="member" style={{ borderTop: 0, padding: 0 }}>
                <Avatar name={p.name} />
                <div className="grow">
                  <div className="nm">
                    {p.name} {sameWay(p) ? <span className="tag y">같은 방향</span> : <span className="tag">방향 다름</span>}
                  </div>
                  <div className="sub">
                    {distText(p.distanceM)} 거리 · {p.destArea || '방면 비공개'} 방면 · {p.departTime} 출발 · {p.mode}
                  </div>
                  <div className="small muted">{agoText(p.updatedAt)} 업데이트</div>
                </div>
              </div>
              <div className="row wrap" style={{ marginTop: 12 }}>
                {p.invited ? (
                  <span className="badge st-ready plain">제안 보냄 · 수락을 기다리는 중</span>
                ) : (
                  <button className="btn btn-primary" onClick={() => void invite(p)}>
                    <Icon name="users" size={18} />함께 귀가 제안
                  </button>
                )}
              </div>
            </article>
          ))}
          {hiddenCount > 0 && shown.length > 0 && (
            <p className="small muted center">방향이 다른 {hiddenCount}명은 숨겨져 있어요.</p>
          )}
        </>
      )}
    </Shell>
  )
}
