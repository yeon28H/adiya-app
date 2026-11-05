import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import GroupCard from '@/components/GroupCard'
import { listMyMeetings } from '@/lib/api'
import type { Meeting } from '@/types'

export default function GroupList() {
  const [meetings, setMeetings] = useState<Meeting[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listMyMeetings()
      .then(setMeetings)
      .catch((e: Error) => setError(e.message))
  }, [])

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-bold">내 귀가 모임</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!error && !meetings && <p className="text-sm text-neutral-500">불러오는 중...</p>}
      {meetings?.length === 0 && (
        <p className="text-sm text-neutral-500">
          아직 참여한 모임이 없어요. <Link to="/groups/new" className="underline">만들기</Link> 또는{' '}
          <Link to="/join" className="underline">코드로 참여</Link>해 보세요.
        </p>
      )}
      {meetings?.map((m) => <GroupCard key={m.id} meeting={m} />)}
    </div>
  )
}
