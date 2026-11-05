import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Back, Shell } from '@/components/ui'
import { fetchMeeting, joinMeeting, normCode, prettyCode } from '@/lib/api'
import { getLastMeeting } from '@/lib/session'

const hyphen = (v: string) => {
  const c = normCode(v).slice(0, 6)
  return c.length > 3 ? c.slice(0, 3) + '-' + c.slice(3) : c
}

export default function Join() {
  const { code: prefill = '' } = useParams()
  const navigate = useNavigate()
  const [code, setCode] = useState(prefill ? prettyCode(normCode(prefill)) : '')
  const [name, setName] = useState('')
  const [errs, setErrs] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const last = getLastMeeting()

  // 이미 참여 중인 모임 코드로 들어오면 바로 모임 홈으로 보낸다.
  useEffect(() => {
    if (!prefill) return
    fetchMeeting(prefill)
      .then((s) => {
        if (s && s.mt.members.some((x) => x.userId === s.myUserId)) navigate(`/m/${s.mt.code}`, { replace: true })
      })
      .catch(() => {})
  }, [prefill, navigate])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const er: Record<string, string> = {}
    if (!name.trim()) er.name = '이름을 입력해 주세요.'
    if (normCode(code).length !== 6) er.code = '6자리 초대 코드를 입력해 주세요.'
    setErrs(er)
    if (Object.keys(er).length) return
    setBusy(true)
    try {
      const c = await joinMeeting(code, name.trim())
      const st = await fetchMeeting(c)
      const me = st?.mt.members.find((x) => x.userId === st.myUserId)
      navigate(me?.registered ? `/m/${c}` : `/m/${c}/register`)
    } catch (err) {
      setErrs({ code: (err as Error).message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Shell>
      <Back to="/">처음으로</Back>
      <div className="page-head">
        <h2>모임 참여하기</h2>
        <p>친구에게 받은 초대 코드와 내 이름을 입력해 주세요.</p>
      </div>
      <form className="card" onSubmit={onSubmit} noValidate>
        <label className="field">
          <span className="label">초대 코드</span>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(hyphen(e.target.value))}
            placeholder="예: AB3-K7Q"
            maxLength={7}
            autoComplete="off"
            style={{ textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 700 }}
          />
          <div className="err">{errs.code}</div>
        </label>
        <label className="field">
          <span className="label">내 이름</span>
          <input type="text" maxLength={12} placeholder="예: 민준" autoComplete="nickname" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="err">{errs.name}</div>
        </label>
        <button className="btn btn-primary btn-lg btn-block" style={{ marginTop: 26 }} type="submit" disabled={busy}>
          {busy ? '들어가는 중...' : '모임 들어가기'}
        </button>
      </form>
      {last && (
        <p className="center small muted" style={{ marginTop: 18 }}>
          진행 중인 모임:{' '}
          <Link to={`/m/${last.code}`} style={{ fontWeight: 700 }}>
            {last.name}
          </Link>
        </p>
      )}
    </Shell>
  )
}
