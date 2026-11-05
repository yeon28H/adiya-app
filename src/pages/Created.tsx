import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Icon from '@/components/Icon'
import { useToast } from '@/components/Toast'
import { Loading, NotFound, Shell } from '@/components/ui'
import { fetchMeeting, prettyCode, type MeetingState } from '@/lib/api'

export default function Created() {
  const { code = '' } = useParams()
  const toast = useToast()
  const [st, setSt] = useState<MeetingState | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMeeting(code)
      .then(setSt)
      .catch((e: Error) => setError(e.message))
  }, [code])

  if (error) return <Loading error={error} />
  if (st === undefined) return <Loading />
  if (!st) return <NotFound />
  const { mt } = st

  const link = `${location.origin}${location.pathname}#/join/${mt.code}`
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast('복사했어요')
    } catch {
      toast('복사하지 못했어요. 직접 선택해서 복사해 주세요.')
    }
  }

  return (
    <Shell>
      <div className="card center stack" style={{ padding: '32px 24px' }}>
        <div
          style={{
            width: 56, height: 56, borderRadius: '50%', background: 'var(--green-100)', color: 'var(--green-700)',
            display: 'grid', placeItems: 'center', margin: '0 auto',
          }}
        >
          <Icon name="check" size={30} />
        </div>
        <h2>모임이 만들어졌어요!</h2>
        <p className="muted">
          아래 초대 코드를 친구들에게 보내 주세요.
          <br />
          <b>{mt.name}</b> · {mt.place} · {mt.endTime} 해산 · 최대 {mt.capacity}명 {mt.capacity === 2 ? '(2인 동행)' : ''}
        </p>
        <div className="code-box">
          <div className="small muted" style={{ fontWeight: 700 }}>초대 코드</div>
          <div className="code">{prettyCode(mt.code)}</div>
        </div>
        <div className="row wrap" style={{ justifyContent: 'center' }}>
          <button className="btn btn-soft" onClick={() => void copy(prettyCode(mt.code))}>
            <Icon name="copy" size={18} />코드 복사
          </button>
          <button className="btn btn-ghost" onClick={() => void copy(link)}>
            <Icon name="copy" size={18} />초대 링크 복사
          </button>
        </div>
        <hr className="divider" />
        <Link className="btn btn-primary btn-lg btn-block" to={`/m/${mt.code}/register`}>
          내 귀가 정보 등록하기 <Icon name="arrow" size={18} />
        </Link>
        <Link className="btn btn-ghost btn-block" to={`/m/${mt.code}`}>
          모임 현황 보기
        </Link>
      </div>
    </Shell>
  )
}
