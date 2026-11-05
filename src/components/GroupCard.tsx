import { Link } from 'react-router-dom'
import type { Meeting } from '@/types'

export default function GroupCard({ meeting }: { meeting: Meeting }) {
  return (
    <Link
      to={`/groups/${meeting.id}`}
      className="block rounded-2xl border border-brand-200 bg-brand-50 p-4 active:bg-brand-100"
    >
      <div className="font-semibold">{meeting.name}</div>
      <div className="mt-1 text-sm text-neutral-600">{meeting.place}</div>
      <div className="mt-2 text-xs text-neutral-500">초대 코드 {meeting.code}</div>
    </Link>
  )
}
