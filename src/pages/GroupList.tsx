import GroupCard from '@/components/GroupCard'
import { mockGroups } from '@/lib/mockData'

export default function GroupList() {
  return (
    <div className="space-y-3">
      <h1 className="text-lg font-bold">같은 동선 귀가 모임</h1>
      {mockGroups.map((g) => (
        <GroupCard key={g.id} group={g} />
      ))}
    </div>
  )
}
