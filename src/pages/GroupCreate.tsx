import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createMeeting } from '@/lib/api'

const input =
  'w-full rounded-xl border border-neutral-300 px-3 py-2 focus:border-brand-500 focus:outline-none'

export default function GroupCreate() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [place, setPlace] = useState('')
  const [endTime, setEndTime] = useState('')
  const [capacity, setCapacity] = useState(6)
  const [hostName, setHostName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await createMeeting({ name, place, endTime: endTime || null, capacity, hostName })
      navigate('/groups')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <h1 className="text-lg font-bold">귀가 모임 만들기</h1>
      <input className={input} placeholder="모임 이름 (예: 금요일 동기 모임)" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required />
      <input className={input} placeholder="모임 장소 (예: 강남역)" value={place} onChange={(e) => setPlace(e.target.value)} required />
      <input className={input} type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} aria-label="종료 예정 시각" />
      <input className={input} type="number" min={2} max={30} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} aria-label="정원" />
      <input className={input} placeholder="내 이름" value={hostName} onChange={(e) => setHostName(e.target.value)} maxLength={20} required />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={busy} className="w-full rounded-xl bg-brand-500 py-3 font-semibold active:bg-brand-600 disabled:opacity-50">
        {busy ? '만드는 중...' : '만들기'}
      </button>
    </form>
  )
}
