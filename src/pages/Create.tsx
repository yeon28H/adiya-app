import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StationPicker from '@/components/StationPicker'
import { Back, Shell } from '@/components/ui'
import { createMeeting } from '@/lib/api'
import { findStation } from '@/lib/stations'

export default function Create() {
  const navigate = useNavigate()
  const [host, setHost] = useState('')
  const [name, setName] = useState('')
  const [place, setPlace] = useState('')
  const [end, setEnd] = useState('22:00')
  const [cap, setCap] = useState(5)
  const [errs, setErrs] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const er: Record<string, string> = {}
    if (!host.trim()) er.host = '이름을 입력해 주세요.'
    if (!name.trim()) er.name = '모임 이름을 입력해 주세요.'
    if (!findStation(place)) er.place = '호선과 역을 선택해 주세요.'
    if (!end) er.end = '해산 시간을 선택해 주세요.'
    setErrs(er)
    if (Object.keys(er).length) return
    setBusy(true)
    try {
      const code = await createMeeting({
        name: name.trim(),
        place: place.trim(),
        endTime: end,
        capacity: cap,
        hostName: host.trim(),
      })
      navigate(`/created/${code}`)
    } catch (err) {
      setErrs({ form: (err as Error).message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Shell>
      <Back to="/">처음으로</Back>
      <div className="page-head">
        <h2>모임 만들기</h2>
        <p>모임 정보를 입력하면 친구들에게 보낼 초대 코드가 만들어져요.</p>
      </div>
      <form className="card" onSubmit={onSubmit} noValidate>
        <label className="field">
          <span className="label">내 이름 (주최자)</span>
          <input type="text" maxLength={12} placeholder="예: 지은" autoComplete="nickname" value={host} onChange={(e) => setHost(e.target.value)} />
          <div className="err">{errs.host}</div>
        </label>
        <label className="field">
          <span className="label">모임 이름</span>
          <input type="text" maxLength={24} placeholder="예: 금요일 동기 모임" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="err">{errs.name}</div>
        </label>
        <div className="field">
          <span className="label">모임 장소 (가까운 역)</span>
          <StationPicker value={place} onChange={setPlace} />
          <div className="hint">호선을 고른 뒤 가까운 역을 선택해 주세요. 모든 귀가 방향 계산의 출발점이 돼요.</div>
          <div className="err">{errs.place}</div>
        </div>
        <div className="grid2">
          <label className="field">
            <span className="label">예상 해산 시간</span>
            <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
            <div className="err">{errs.end}</div>
          </label>
          <div className="field">
            <span className="label">참여 인원</span>
            <div className="stepper">
              <button type="button" aria-label="인원 줄이기" onClick={() => setCap((c) => Math.max(2, c - 1))}>−</button>
              <output>{cap}</output>
              <button type="button" aria-label="인원 늘리기" onClick={() => setCap((c) => Math.min(12, c + 1))}>+</button>
            </div>
            <div className="hint">2명이면 2인 동행, 3명 이상이면 그룹 매칭으로 진행돼요.</div>
          </div>
        </div>
        {errs.form && <div className="err">{errs.form}</div>}
        <button className="btn btn-primary btn-lg btn-block" style={{ marginTop: 26 }} type="submit" disabled={busy}>
          {busy ? '만드는 중...' : '초대 코드 만들기'}
        </button>
      </form>
    </Shell>
  )
}
