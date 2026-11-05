import type { MemberStatus } from '@/types'

const map: Record<MemberStatus, { label: string; cls: string }> = {
  waiting: { label: '출발 전', cls: 'bg-neutral-200 text-neutral-700' },
  moving: { label: '귀가 중', cls: 'bg-brand-200 text-neutral-900' },
  arrived: { label: '도착 완료', cls: 'bg-green-200 text-green-900' },
}

export default function StatusBadge({ status }: { status: MemberStatus }) {
  const { label, cls } = map[status]
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>
}
