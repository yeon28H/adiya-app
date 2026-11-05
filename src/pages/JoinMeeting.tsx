import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { joinMeeting } from '@/lib/api'

const input =
  'w-full rounded-xl border border-neutral-300 px-3 py-2 focus:border-brand-500 focus:outline-none'

export default function JoinMeeting() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const meetingId = await joinMeeting(code, name)
      navigate(`/groups/${meetingId}`)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <h1 className="text-lg font-bold">초대 코드로 참여</h1>
      <input className={`${input} uppercase tracking-widest`} placeholder="초대 코드 6자리" value={code} onChange={(e) => setCode(e.target.value)} maxLength={7} required />
      <input className={input} placeholder="내 이름" value={name} onChange={(e) => setName(e.target.value)} maxLength={20} required />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={busy} className="w-full rounded-xl bg-brand-500 py-3 font-semibold active:bg-brand-600 disabled:opacity-50">
        {busy ? '참여 중...' : '참여하기'}
      </button>
    </form>
  )
}
