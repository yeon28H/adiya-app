import { useParams } from 'react-router-dom'
import StatusBadge from '@/components/StatusBadge'
import { useGeolocation } from '@/hooks/useGeolocation'
import { mockGroups } from '@/lib/mockData'

export default function GroupDetail() {
  const { id } = useParams()
  const group = mockGroups.find((g) => g.id === id)
  const { position, error } = useGeolocation(true)

  if (!group) return <p>모임을 찾을 수 없어요.</p>

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">{group.title}</h1>
      <p className="text-sm text-neutral-600">{group.meetingPlace}</p>

      <section className="rounded-2xl bg-brand-50 p-3 text-sm">
        <div className="font-semibold">내 위치</div>
        {position ? (
          <div>
            {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
          </div>
        ) : (
          <div className="text-neutral-500">{error ?? '위치 확인 중...'}</div>
        )}
      </section>

      <ul className="space-y-2">
        {group.members.map((m) => (
          <li
            key={m.id}
            className="flex items-center justify-between rounded-xl border border-neutral-200 p-3"
          >
            <span>{m.name}</span>
            <StatusBadge status={m.status} />
          </li>
        ))}
      </ul>

      <button className="w-full rounded-xl bg-brand-500 py-3 font-semibold active:bg-brand-600">
        무사히 도착했어요
      </button>
    </div>
  )
}
