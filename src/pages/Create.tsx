import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import StationPicker from '@/components/StationPicker'
import TimeField from '@/components/TimeField'
import { Back, Shell } from '@/components/ui'
import { createMeeting } from '@/lib/api'
import { findStation } from '@/lib/stations'

const NICK_KEY = 'eodiya.nick'

export default function Create() {
  const navigate = useNavigate()
  const [host, setHost] = useState(() => localStorage.getItem(NICK_KEY) ?? '')
  const [name, setName] = useState('')
  const [place, setPlace] = useState('')
  const [fromLine, setFromLine] = useState('')
  const [dest, setDest] = useState('')
  const [toLine, setToLine] = useState('')
  const [end, setEnd] = useState('22:00')
  const [cap, setCap] = useState(5)
  const [isPublic, setIsPublic] = useState(true)
  const [errs, setErrs] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const er: Record<string, string> = {}
    const placeSt = findStation(place)
    const destSt = findStation(dest)
    if (!host.trim()) er.host = '닉네임을 입력해 주세요.'
    if (!name.trim()) er.name = '모임 이름을 입력해 주세요.'
    if (!placeSt) er.place = '호선과 역을 선택해 주세요.'
    if (isPublic && !destSt) er.dest = '다른 사람이 알아볼 수 있게 귀가 방향(목적지 역)을 선택해 주세요.'
    if (!end) er.end = '해산 시간을 선택해 주세요.'
    setErrs(er)
    if (Object.keys(er).length || !placeSt) return
    setBusy(true)
    try {
      localStorage.setItem(NICK_KEY, host.trim())
      const code = await createMeeting({
        name: name.trim(),
        place: place.trim(),
        endTime: end,
        capacity: cap,
        hostName: host.trim(),
        isPublic,
        fromLine: fromLine || placeSt.lines[0],
        toLine: destSt ? toLine || destSt.lines[0] : null,
        destStation: destSt?.key ?? null,
        destArea: destSt?.d ?? null,
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
        <p>
          원하는 모임이 없다면 직접 만들어 보세요. 공개하면 같은 방향으로 귀가하려는 사람이{' '}
          <Link to="/meetings" style={{ fontWeight: 700 }}>모집 중인 모임</Link>에서 바로 참여할 수 있어요.
        </p>
      </div>
      <form className="card" onSubmit={onSubmit} noValidate>
        <label className="field">
          <span className="label">내 닉네임 (주최자)</span>
          <input type="text" maxLength={12} placeholder="예: 지은" autoComplete="nickname" value={host} onChange={(e) => setHost(e.target.value)} />
          <div className="err">{errs.host}</div>
        </label>
        <label className="field">
          <span className="label">모임 이름</span>
          <input type="text" maxLength={24} placeholder="예: 금요일 강남 → 건대 귀가팟" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="err">{errs.name}</div>
        </label>

        <div className="route-pair">
          <span className="label">출발 (모임 장소)</span>
          <span />
          <span className="label">도착 (귀가 방향)</span>
          <div>
            <StationPicker compact value={place} onChange={setPlace} onLineChange={setFromLine} />
            <div className="err">{errs.place}</div>
          </div>
          <span className="route-arrow" aria-hidden="true">→</span>
          <div>
            <StationPicker compact value={dest} onChange={setDest} onLineChange={setToLine} />
            <div className="err">{errs.dest}</div>
          </div>
          <div className="hint route-note">모집 목록에 "{fromLine || "2호선"} → {toLine || "7호선"} 방향"처럼 보여요.</div>
        </div>

        <div className="grid2">
          <label className="field">
            <span className="label">예상 해산 시간</span>
            <TimeField value={end} onChange={setEnd} label="해산 시간" />
            <div className="err">{errs.end}</div>
          </label>
          <div className="field">
            <span className="label">참여 인원</span>
            <div className="stepper">
              <button type="button" aria-label="인원 줄이기" onClick={() => setCap((c) => Math.max(2, c - 1))}>−</button>
              <output>{cap}</output>
              <button type="button" aria-label="인원 늘리기" onClick={() => setCap((c) => Math.min(12, c + 1))}>+</button>
            </div>
          </div>
        </div>

        <label className="switch" style={{ marginTop: 6 }}>
          <span>
            <span className="t">모집 중인 모임으로 공개</span>
            <br />
            <span className="small muted">켜면 모르는 사람도 목록에서 보고 바로 참여할 수 있어요. 끄면 초대 코드로만 참여해요.</span>
          </span>
          <span className="toggle">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
            <i />
          </span>
        </label>

        {errs.form && <div className="err">{errs.form}</div>}
        <button className="btn btn-primary btn-lg btn-block" style={{ marginTop: 26 }} type="submit" disabled={busy}>
          {busy ? '만드는 중...' : isPublic ? '모집 시작하기' : '모임 만들기'}
        </button>
      </form>
    </Shell>
  )
}
