import type { Meeting, Member, MemberStatus } from '@/types'
import { supabase } from './supabase'

/** 로그인된 세션이 없으면 익명 로그인한다. (Supabase 에서 Anonymous sign-ins 를 켜야 함) */
export async function ensureSession(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  if (data.session) return data.session.user.id
  const { data: anon, error } = await supabase.auth.signInAnonymously()
  if (error || !anon.user) throw new Error(error?.message ?? '로그인에 실패했어요.')
  return anon.user.id
}

const ERRORS: Record<string, string> = {
  meeting_not_found: '초대 코드를 찾을 수 없어요. 코드를 다시 확인해 주세요.',
  meeting_full: '정원이 가득 찬 모임이에요.',
}
const toError = (message: string) => new Error(ERRORS[message] ?? message)

export async function createMeeting(input: {
  name: string
  place: string
  endTime: string | null
  capacity: number
  hostName: string
}): Promise<string> {
  await ensureSession()
  const { data, error } = await supabase.rpc('create_meeting', {
    p_name: input.name,
    p_place: input.place,
    p_end_time: input.endTime,
    p_capacity: input.capacity,
    p_host_name: input.hostName,
  })
  if (error) throw toError(error.message)
  return data as string // 초대 코드
}

export async function joinMeeting(code: string, name: string): Promise<string> {
  await ensureSession()
  const { data, error } = await supabase.rpc('join_meeting', { p_code: code, p_name: name })
  if (error) throw toError(error.message)
  return data as string // meeting id
}

export async function listMyMeetings(): Promise<Meeting[]> {
  await ensureSession()
  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Meeting[]
}

export async function getMeeting(id: string): Promise<{ meeting: Meeting; members: Member[]; myId: string }> {
  const myId = await ensureSession()
  const [m, mem] = await Promise.all([
    supabase.from('meetings').select('*').eq('id', id).single(),
    supabase.from('members').select('*').eq('meeting_id', id).order('updated_at'),
  ])
  if (m.error) throw m.error
  if (mem.error) throw mem.error
  return { meeting: m.data as Meeting, members: mem.data as Member[], myId }
}

export async function updateMyMember(
  meetingId: string,
  patch: Partial<Pick<Member, 'status' | 'lat' | 'lng' | 'arrived_at' | 'started_at'>> & { status?: MemberStatus },
): Promise<void> {
  const userId = await ensureSession()
  const { error } = await supabase
    .from('members')
    .update(patch)
    .eq('meeting_id', meetingId)
    .eq('user_id', userId)
  if (error) throw error
}

/** 같은 모임 멤버 변경을 실시간으로 받는다. 반환값은 구독 해제 함수. */
export function subscribeMembers(meetingId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`members:${meetingId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'members', filter: `meeting_id=eq.${meetingId}` }, onChange)
    .subscribe()
  return () => {
    void supabase.removeChannel(channel)
  }
}
