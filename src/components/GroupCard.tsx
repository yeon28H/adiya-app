import { Link } from 'react-router-dom'
import type { HomeGroup } from '@/types'

export default function GroupCard({ group }: { group: HomeGroup }) {
  return (
    <Link
      to={`/groups/${group.id}`}
      className="block rounded-2xl border border-brand-200 bg-brand-50 p-4 active:bg-brand-100"
    >
      <div className="font-semibold">{group.title}</div>
      <div className="mt-1 text-sm text-neutral-600">{group.meetingPlace}</div>
      <div className="mt-2 text-xs text-neutral-500">
        {group.members.length}/{group.maxMembers}명 참여 중
      </div>
    </Link>
  )
}
