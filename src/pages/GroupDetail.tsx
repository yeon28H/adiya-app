import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import StatusBadge from '@/components/StatusBadge'
import { useGeolocation } from '@/hooks/useGeolocation'
import { getMeeting, subscribeMembers, updateMyMember } from '@/lib/api'
import type { Meeting, Member } from '@/types'

export default function GroupDetail() {
  const { id } = useParams()
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [myId, setMyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const me = members.find((m) => m.user_id === myId)
  const sharing = me?.status === 'started' || me?.status === 'together'
  const { position, error: geoError } = useGeolocation(sharing)

  const load = useCallback(async () => {
    if (!id) return
    try {
      const r = await getMeeting(id)
      setMeeting(r.meeting)
      setMembers(r.members)
      setMyId(r.myId)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [id])

  useEffect(() => {
    void load()
    if (!id) return
    return subscribeMembers(id, () => void load())
  }, [id, load])

  // 귀가 중일 때 내 위치를 DB 에 반영
  useEffect(() => {
    if (!id || !sharing || !position) return
    void updateMyMember(id, { lat: position.lat, lng: position.lng })
  }, [id, sharing, position])

  async function setStatus(status: Member['status']) {
    if (!id) return
    const now = new Date().toISOString()
    await updateMyMember(id, {
      status,
      ...(status === 'started' ? { started_at: now } : {}),
      ...(status === 'arrived' ? { arrived_at: now } : {}),
    })
    void load()
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (!meeting) return <p className="text-sm text-neutral-500">불러오는 중...</p>

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold">{meeting.name}</h1>
        <p className="text-sm text-neutral-600">{meeting.place}</p>
      </div>

      <section className="rounded-2xl bg-brand-50 p-3 text-sm">
        <div className="font-semibold">초대 코드</div>
        <div className="text-xl font-bold tracking-widest">{meeting.code}</div>
        <div className="mt-1 text-xs text-neutral-500">
          {members.length}/{meeting.capacity}명 참여 중
        </div>
      </section>

      {sharing && (
        <section className="rounded-2xl border border-brand-200 p-3 text-sm">
          <div className="font-semibold">내 위치 공유 중</div>
          {position ? (
            <div>
              {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
            </div>
          ) : (
            <div className="text-neutral-500">{geoError ?? '위치 확인 중...'}</div>
          )}
        </section>
      )}

      <ul className="space-y-2">
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between rounded-xl border border-neutral-200 p-3">
            <span>
              {m.name}
              {m.user_id === myId && ' (나)'}
            </span>
            <StatusBadge status={m.status} />
          </li>
        ))}
      </ul>

      {me && me.status === 'ready' && (
        <button
          onClick={() => void setStatus('started')}
          className="w-full rounded-xl bg-brand-500 py-3 font-semibold active:bg-brand-600"
        >
          귀가 시작
        </button>
      )}
      {me && me.status !== 'ready' && me.status !== 'arrived' && (
        <button
          onClick={() => void setStatus('arrived')}
          className="w-full rounded-xl bg-brand-500 py-3 font-semibold active:bg-brand-600"
        >
          무사히 도착했어요
        </button>
      )}
    </div>
  )
}
