import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '@/components/Icon'
import StationPicker from '@/components/StationPicker'
import { useToast } from '@/components/Toast'
import { Back, MODES, PRIVACY, Shell, Stepper } from '@/components/ui'
import { isHost, useMeeting } from '@/hooks/useMeeting'
import { fmtTime, toMin } from '@/lib/matching'
import { findStation } from '@/lib/stations'
import type { Privacy } from '@/types'

export default function Register() {
  const { mt, me, register } = useMeeting()
  const navigate = useNavigate()
  const toast = useToast()
  // 모임장이 모임을 만들 때 정한 출발지가 기본값. 따로 출발하는 사람만 직접 고른다.
  const hostStation = findStation(mt.placeStation) ?? findStation(mt.place)
  const hostOrigin = hostStation?.key ?? ""
  const [custom, setCustom] = useState(() => !hostStation || (me.registered && !!me.origin && me.origin !== hostOrigin))
  const [origin, setOrigin] = useState(() => (me.registered && me.origin) || hostOrigin)
  const [dest, setDest] = useState(me.dest)
  const [time, setTime] = useState(
    me.departTime || fmtTime(mt.endTime ? toMin(mt.endTime) + 5 : new Date().getHours() * 60 + new Date().getMinutes() + 5),
  )
  const [mode, setMode] = useState(me.mode || '지하철')
  const [privacy, setPrivacy] = useState<Privacy>(me.registered ? me.privacy : 'exact')
  const [errs, setErrs] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const er: Record<string, string> = {}
    const o = findStation(custom ? origin : hostOrigin)
    const d = findStation(dest)
    if (!o) er.origin = '호선과 출발역을 선택해 주세요.'
    if (!d) er.dest = '호선과 목적지 역을 선택해 주세요.'
    if (!time) er.time = '출발 시간을 선택해 주세요.'
    setErrs(er)
    if (Object.keys(er).length || !o || !d) return
    setBusy(true)
    try {
      await register({ origin: o.key, dest: d.key, departTime: time, mode, privacy })
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
          <span className="label">출발지</span>
          {!custom ? (
            <div className="card cream row between wrap" style={{ padding: 14 }}>
              <div>
                <div className="small muted" style={{ fontWeight: 700 }}>{isHost(mt, me) ? "모임 출발지" : "파티장이 정한 출발지"}</div>
                <div style={{ fontWeight: 800, fontSize: 18 }}>
                  <Icon name="pin" size={16} /> {hostOrigin}
                </div>
              </div>
              <button type="button" className="btn btn-soft btn-sm" onClick={() => setCustom(true)}>
                내 출발지 따로 선택하기
              </button>
            </div>
          ) : (
            <>
              <StationPicker value={origin} onChange={setOrigin} />
              {hostStation && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ marginTop: 10 }}
                  onClick={() => {
                    setCustom(false)
                    setOrigin(hostOrigin)
                  }}
                >
                  {isHost(mt, me) ? "모임 출발지로 되돌리기" : "파티장이 정한 출발지로 되돌리기"} ({hostOrigin})
                </button>
              )}
            </>
          )}
          <div className="err">{errs.origin}</div>
        </div>

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
