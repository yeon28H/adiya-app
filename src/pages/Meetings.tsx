import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon from '@/components/Icon'
import { useToast } from '@/components/Toast'
import { Back, routeText, Shell } from '@/components/ui'
import * as api from '@/lib/api'
import { agoText } from '@/lib/geo'

const NICK_KEY = 'eodiya.nick'

export default function Meetings() {
  const navigate = useNavigate()
  const toast = useToast()
  const [list, setList] = useState<api.OpenMeeting[] | null>(null)
  const [nick, setNick] = useState(() => localStorage.getItem(NICK_KEY) ?? '')
  const [error, setError] = useState<string | null>(null)
  const [joining, setJoining] = useState<string | null>(null)

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
      const code = await api.joinPublicMeeting(m.id, nick.trim() || "참여자")
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

      <label className="field" style={{ marginBottom: 36 }}>
        <span className="label">내 닉네임 (모임 사람들에게 보여요)</span>
        <input id="nick" type="text" maxLength={12} placeholder="예: 지은" autoComplete="nickname" value={nick} onChange={(e) => setNick(e.target.value)} />
      </label>

      {error && (
        <div className="banner warn" style={{ marginBottom: 16 }}>
          <span className="ico"><Icon name="alert" /></span>
          <div className="grow small">{error}</div>
        </div>
      )}

      {list === null && !error && <div className="card center"><p className="muted">모집 중인 모임을 불러오는 중...</p></div>}
      {list?.length === 0 && (
        <div className="card empty">
          <p>지금 모집 중인 모임이 없어요.</p>
          <Link className="btn btn-primary" style={{ marginTop: 12 }} to="/create">
            <Icon name="plus" size={18} />내가 모임 만들기
          </Link>
        </div>
      )}

      {list?.map((m) => (
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
            {m.place} 출발{m.destArea ? ` · ${m.destArea} 방면` : ''}
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

