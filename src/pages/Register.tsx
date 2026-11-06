import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '@/components/Icon'
import { useToast } from '@/components/Toast'
import { Back, MODES, PRIVACY, Shell, Stepper } from '@/components/ui'
import { useMeeting } from '@/hooks/useMeeting'
import { fmtTime, nearestStation, toMin } from '@/lib/matching'
import { findStation } from '@/lib/stations'
import type { Privacy } from '@/types'

export default function Register() {
  const { mt, me, register } = useMeeting()
  const navigate = useNavigate()
  const toast = useToast()
  const [origin, setOrigin] = useState(me.origin || mt.place)
  const [dest, setDest] = useState(me.dest)
  const [time, setTime] = useState(me.departTime || fmtTime(toMin(mt.endTime) + 5))
  const [mode, setMode] = useState(me.mode || '지하철')
  const [privacy, setPrivacy] = useState<Privacy>(me.privacy || 'area')
  const [errs, setErrs] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locNote, setLocNote] = useState('')

  /** 현재 위치(GPS)에서 가장 가까운 역을 출발 위치로 채운다. 좌표는 저장하지 않고 역 이름만 사용한다. */
  function locateMe() {
    setErrs((e) => ({ ...e, origin: '' }))
    setLocNote('')
    if (!('geolocation' in navigator)) {
      setErrs((e) => ({ ...e, origin: '이 기기는 위치 기능을 지원하지 않아요. 역을 직접 입력해 주세요.' }))
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        const near = nearestStation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        if (!near || near.km > 20) {
          setErrs((e) => ({ ...e, origin: '현재 위치 근처에 서비스 중인 역이 없어요. 역을 직접 입력해 주세요.' }))
          return
        }
        setOrigin(near.station.n + '역')
        setLocNote(`현재 위치에서 가장 가까운 ${near.station.n}역으로 설정했어요 (약 ${near.km.toFixed(1)}km)`)
      },
      (err) => {
        setLocating(false)
        setErrs((e) => ({
          ...e,
          origin:
            err.code === err.PERMISSION_DENIED
              ? '위치 권한이 거부됐어요. 브라우저 설정에서 허용하거나 역을 직접 입력해 주세요.'
              : '현재 위치를 가져오지 못했어요. 잠시 후 다시 시도하거나 역을 직접 입력해 주세요.',
        }))
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    )
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const er: Record<string, string> = {}
    const o = findStation(origin)
    const d = findStation(dest)
    if (!o) er.origin = '목록에 있는 역을 입력해 주세요.'
    if (!d) er.dest = '목록에 있는 역을 입력해 주세요. 예: 잠실역'
    if (!time) er.time = '출발 시간을 선택해 주세요.'
    setErrs(er)
    if (Object.keys(er).length || !o || !d) return
    setBusy(true)
    try {
      await register({ origin: o.n + '역', dest: d.n + '역', departTime: time, mode, privacy })
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
        <label className="field">
          <span className="label">현재 출발 위치</span>
          <input type="text" list="stations" value={origin} onChange={(e) => { setOrigin(e.target.value); setLocNote('') }} autoComplete="off" />
          <button
            type="button"
            className="btn btn-soft btn-sm"
            style={{ marginTop: 8 }}
            onClick={locateMe}
            disabled={locating}
          >
            <Icon name="pin" size={16} />
            {locating ? '위치 확인 중...' : '현재 위치로 설정'}
          </button>
          {locNote && <div className="hint">{locNote}</div>}
          <div className="hint">
            <Icon name="lock" size={13} /> 좌표는 저장하지 않고, 가장 가까운 역 이름만 사용해요.
          </div>
          <div className="err">{errs.origin}</div>
        </label>
        <label className="field">
          <span className="label">귀가 목적지 (가까운 역)</span>
          <input type="text" list="stations" value={dest} onChange={(e) => setDest(e.target.value)} placeholder="예: 잠실역" autoComplete="off" />
          <div className="hint">
            <Icon name="lock" size={13} /> 정확한 목적지는 본인만 볼 수 있어요. 다른 사람에게는 아래 공개 범위만큼만 보여요.
          </div>
          <div className="err">{errs.dest}</div>
        </label>
        <label className="field">
          <span className="label">예상 출발 시간</span>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          <div className="hint">모임 해산 예정 시간은 {mt.endTime}이에요.</div>
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
