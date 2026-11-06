import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '@/components/Icon'
import StationPicker from '@/components/StationPicker'
import { useToast } from '@/components/Toast'
import { Back, MODES, PRIVACY, Shell, Stepper } from '@/components/ui'
import { useMeeting } from '@/hooks/useMeeting'
import { getCurrentFix, reverseGeocode, type GeoFix } from '@/lib/geo'
import { fmtTime, nearestStation, toMin } from '@/lib/matching'
import { findStation } from '@/lib/stations'
import type { Privacy } from '@/types'

export default function Register() {
  const { mt, me, register, shareLocation } = useMeeting()
  const navigate = useNavigate()
  const toast = useToast()
  const [origin, setOrigin] = useState(me.origin || mt.placeStation || mt.place)
  const [dest, setDest] = useState(me.dest)
  const [time, setTime] = useState(
    me.departTime || fmtTime(mt.endTime ? toMin(mt.endTime) + 5 : new Date().getHours() * 60 + new Date().getMinutes() + 5),
  )
  const [mode, setMode] = useState(me.mode || '지하철')
  const [privacy, setPrivacy] = useState<Privacy>(me.registered ? me.privacy : 'exact')
  const [errs, setErrs] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locNote, setLocNote] = useState('')
  const [gps, setGps] = useState<(GeoFix & { label: string | null }) | null>(null)

  /** 실제 GPS 위치를 내 현재 위치로 설정한다. 매칭 계산용 출발역은 가장 가까운 역으로 자동 선택한다. */
  async function locateMe() {
    setErrs((e) => ({ ...e, origin: '' }))
    setLocNote('')
    setLocating(true)
    try {
      const fix = await getCurrentFix()
      setGps({ ...fix, label: null })
      const near = nearestStation(fix)
      if (near && near.km <= 20) {
        setOrigin(near.station.key)
        setLocNote(`매칭 계산용 출발역: 가장 가까운 ${near.station.key} (약 ${near.km.toFixed(1)}km)`)
      } else {
        setLocNote('근처에 서비스 중인 역이 없어서 출발역은 직접 선택해 주세요.')
      }
      // 주소 설명은 나중에 채운다 (실패해도 좌표로 표시)
      void reverseGeocode(fix.lat, fix.lng).then((label) => label && setGps((g) => (g ? { ...g, label } : g)))
    } catch (err) {
      setErrs((e) => ({ ...e, origin: (err as Error).message }))
    } finally {
      setLocating(false)
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const er: Record<string, string> = {}
    const o = findStation(origin)
    const d = findStation(dest)
    if (!o) er.origin = '현재 위치를 설정하거나 출발역을 직접 선택해 주세요.'
    if (!d) er.dest = '호선과 목적지 역을 선택해 주세요.'
    if (!time) er.time = '출발 시간을 선택해 주세요.'
    setErrs(er)
    if (Object.keys(er).length || !o || !d) return
    setBusy(true)
    try {
      await register({ origin: o.key, dest: d.key, departTime: time, mode, privacy })
      if (gps) await shareLocation({ lat: gps.lat, lng: gps.lng, accuracy: gps.accuracy, label: gps.label })
      toast('귀가 정보를 등록했어요')
      navigate(`/m/${mt.code}/match`)
    } catch (err) {
      setErrs({ form: (err as Error).message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Shell>
      <Back to={`/m/${mt.code}`}>{mt.name}</Back>
      <Stepper n={2} />
      <div className="page-head">
        <h2>{me.registered ? '귀가 정보 수정' : '귀가 정보 등록'}</h2>
        <p>
          비슷한 방향으로 가는 사람을 찾는 데 사용돼요. 집 주소 대신 <b>가까운 역·정류장</b>만 입력하면 충분해요.
        </p>
      </div>
      <form className="card" onSubmit={onSubmit} noValidate>
        <div className="field">
          <span className="label">현재 내 위치</span>
          <button type="button" className="btn btn-primary btn-block" onClick={() => void locateMe()} disabled={locating}>
            <Icon name="pin" size={18} />
            {locating ? '위치 확인 중...' : gps ? '현재 위치 다시 가져오기' : '지금 내 위치로 설정 (GPS)'}
          </button>
          {gps && (
            <div className="card cream" style={{ marginTop: 10, padding: 14 }}>
              <div style={{ fontWeight: 700 }}>
                <Icon name="pin" size={16} /> {gps.label ?? `${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}`}
              </div>
              <div className="small muted">
                정확도 약 ±{Math.round(gps.accuracy)}m · 모임 사람들에게는 아래 공개 범위에 따라 보여요
              </div>
              <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => setGps(null)}>
                위치 설정 취소
              </button>
            </div>
          )}
          {locNote && <div className="hint">{locNote}</div>}
          <div className="err">{errs.origin}</div>
        </div>

        <details className="field">
          <summary className="small" style={{ cursor: 'pointer', fontWeight: 700 }}>
            GPS를 쓸 수 없나요? 출발역을 직접 선택
          </summary>
          <div style={{ marginTop: 10 }}>
            <StationPicker
              value={origin}
              onChange={(k) => {
                setOrigin(k)
                setLocNote('')
              }}
            />
            <div className="hint">
              위치를 설정하면 가장 가까운 역이 출발역으로 자동 선택돼요. 같은 방향 사람을 찾는 계산에만 쓰여요.
            </div>
          </div>
        </details>

        <div className="field">
          <span className="label">귀가 목적지 (가까운 역)</span>
          <StationPicker value={dest} onChange={setDest} />
          <div className="hint">
            <Icon name="lock" size={13} /> 정확한 목적지는 본인만 볼 수 있어요. 다른 사람에게는 아래 공개 범위만큼만 보여요.
          </div>
          <div className="err">{errs.dest}</div>
        </div>

        <label className="field">
          <span className="label">예상 출발 시간</span>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          {mt.endTime && <div className="hint">모임 해산 예정 시간은 {mt.endTime}이에요.</div>}
          <div className="err">{errs.time}</div>
        </label>

        <div className="field">
          <span className="label">이용 예정 교통수단</span>
          <div className="choice-grid">
            {MODES.map(([m, ic]) => (
              <label key={m} className="choice">
                <input type="radio" name="mode" value={m} checked={m === mode} onChange={() => setMode(m)} />
                <span className="box">
                  <Icon name={ic} size={18} />
                  {m}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="label">위치 공개 범위</span>
          <div className="choice-list">
            {(Object.entries(PRIVACY) as [Privacy, { t: string; d: string }][]).map(([k, v]) => (
              <label key={k} className="choice">
                <input type="radio" name="privacy" value={k} checked={k === privacy} onChange={() => setPrivacy(k)} />
                <span className="box">
                  <span className="t">{v.t}</span>
                  <span className="d">{v.d}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {errs.form && <div className="err">{errs.form}</div>}
        <button className="btn btn-primary btn-lg btn-block" style={{ marginTop: 26 }} type="submit" disabled={busy}>
          귀가 정보 {me.registered ? '저장' : '등록'}하기
        </button>
      </form>
    </Shell>
  )
}
