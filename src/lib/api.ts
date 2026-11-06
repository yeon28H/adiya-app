import type {
  GroupView,
  MeetingView,
  MemberStatus,
  MemberView,
  NoticeKind,
  NoticeView,
  ChatMessage,
  LocView,
  PlanB,
  Privacy,
} from '@/types'
import { findStation } from './stations'
import type { GroupDraft } from './matching'
import { supabase } from './supabase'

/* ---------- 인증 ---------- */

/** 로그인된 세션이 없으면 익명 로그인한다. (Supabase 에서 Anonymous sign-ins 를 켜야 함) */
export async function ensureSession(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  if (data.session) return data.session.user.id
  const { data: anon, error } = await supabase.auth.signInAnonymously()
  if (error || !anon.user) {
    throw new Error(
      error?.message === 'Anonymous sign-ins are disabled'
        ? 'Supabase 에서 Anonymous sign-ins 가 꺼져 있어요. 대시보드에서 켜 주세요.'
        : (error?.message ?? '로그인에 실패했어요.'),
    )
  }
  return anon.user.id
}

const ERRORS: Record<string, string> = {
  meeting_not_found: '초대 코드를 찾을 수 없어요. 코드를 다시 확인해 주세요.',
  meeting_full: '이 모임은 정원이 가득 찼어요.',
  forbidden: '권한이 없어요.',
}
const fail = (message: string) => new Error(ERRORS[message] ?? message)

/* ---------- 코드 유틸 ---------- */

export const normCode = (c: string) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
export const prettyCode = (c: string) => c.slice(0, 3) + '-' + c.slice(3)

/* ---------- DB 행 → 화면 모델 ---------- */

type Row = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

const ms = (v: string | null | undefined) => (v ? new Date(v).getTime() : null)
const hhmm = (v: string | null | undefined) => (v ? String(v).slice(0, 5) : '')

function toMember(r: Row): MemberView {
  return {
    id: r.id,
    userId: r.user_id,
    name: r.name,
    registered: r.registered,
    status: r.status,
    origin: r.origin,
    dest: r.dest,
    departTime: hhmm(r.depart_time),
    mode: r.mode,
    privacy: r.privacy,
    shareStopped: r.share_stopped,
    arrivalNotice: r.arrival_notice,
    buddy: r.buddy,
    groupDecision: r.group_decision,
    startedAt: ms(r.started_at),
    arrivedAt: ms(r.arrived_at),
    etaAt: ms(r.eta_at),
    checkStage: r.check_stage,
    nearDest: r.near_dest,
    prevStatus: r.prev_status,
    planB: r.plan_b,
    riskKey: r.risk_key,
  }
}

/* ---------- 모임 만들기 / 참여 ---------- */

export async function createMeeting(input: {
  name: string
  place: string
  endTime: string
  capacity: number
  hostName: string
}): Promise<string> {
  await ensureSession()
  const station = findStation(input.place)
  const { data, error } = await supabase.rpc('create_meeting', {
    p_name: input.name,
    p_place: input.place,
    p_place_station: station?.key ?? '',
    p_end_time: input.endTime,
    p_capacity: input.capacity,
    p_host_name: input.hostName,
  })
  if (error) throw fail(error.message)
  return data as string // 초대 코드
}

export async function joinMeeting(code: string, name: string): Promise<string> {
  await ensureSession()
  const { error } = await supabase.rpc('join_meeting', { p_code: code, p_name: name })
  if (error) throw fail(error.message)
  return normCode(code)
}

/* ---------- 모임 상태 조회 ---------- */

export interface MeetingState {
  mt: MeetingView
  myUserId: string
}

/** 코드로 모임 전체 상태를 가져온다. 내가 멤버가 아니면 null. */
export async function fetchMeeting(code: string): Promise<MeetingState | null> {
  const myUserId = await ensureSession()
  const { data: m, error } = await supabase.from('meetings').select('*').eq('code', normCode(code)).maybeSingle()
  if (error) throw error
  if (!m) return null

  const [mem, grp, notice, loc] = await Promise.all([
    supabase.from('members').select('*').eq('meeting_id', m.id).order('created_at', { ascending: true }),
    supabase.from('match_groups').select('*, match_group_members(member_id)').eq('meeting_id', m.id).order('n'),
    supabase.from('notices').select('*').eq('meeting_id', m.id).order('created_at', { ascending: false }).limit(40),
    supabase.from('member_locations').select('*').eq('meeting_id', m.id),
  ])
  if (mem.error) throw mem.error
  if (grp.error) throw grp.error
  if (notice.error) throw notice.error
  if (loc.error) throw loc.error
  const locations: Record<string, LocView> = {}
  for (const r of loc.data ?? []) {
    locations[r.member_id] = {
      lat: r.lat,
      lng: r.lng,
      accuracy: r.accuracy,
      label: r.label,
      updatedAt: new Date(r.updated_at).getTime(),
    }
  }

  const members = (mem.data ?? []).map(toMember)
  const groups: GroupView[] | null = m.matched_at
    ? (grp.data ?? []).map((g: Row) => ({
        id: g.id,
        n: g.n,
        memberIds: (g.match_group_members ?? []).map((x: Row) => x.member_id),
        score: g.score,
        sharedMin: g.shared_min,
        spread: g.spread,
        splitStation: g.split_station,
        splitDistrict: g.split_district,
        reasons: g.reasons ?? [],
        pairMode: g.pair_mode,
      }))
    : null
  const grouped = new Set((groups ?? []).flatMap((g) => g.memberIds))
  const soloIds = groups ? members.filter((x) => x.registered && !grouped.has(x.id)).map((x) => x.id) : []
  const notices: NoticeView[] = (notice.data ?? []).map((n: Row) => ({
    id: n.id,
    ts: new Date(n.created_at).getTime(),
    text: n.text,
    groupId: n.group_id,
    kind: n.kind as NoticeKind,
  }))

  const mt: MeetingView = {
    id: m.id,
    code: m.code,
    name: m.name,
    place: m.place,
    placeStation: m.place_station,
    endTime: hhmm(m.end_time),
    capacity: m.capacity,
    hostUserId: m.host_user_id,
    matchedAt: ms(m.matched_at),
    matchStale: m.match_stale,
    members,
    groups,
    soloIds,
    notices,
    locations,
  }
  return { mt, myUserId }
}

/* ---------- 변경 ---------- */

export async function registerInfo(
  meetingId: string,
  info: { origin: string; dest: string; departTime: string; mode: string; privacy: Privacy },
): Promise<void> {
  const { error } = await supabase.rpc('register_info', {
    p_meeting_id: meetingId,
    p_origin: info.origin,
    p_dest: info.dest,
    p_depart_time: info.departTime,
    p_mode: info.mode,
    p_privacy: info.privacy,
  })
  if (error) throw fail(error.message)
}

export async function saveMatch(meetingId: string, groups: GroupDraft[]): Promise<void> {
  const { error } = await supabase.rpc('save_match', { p_meeting_id: meetingId, p_groups: groups })
  if (error) throw fail(error.message)
}

export async function addNotice(
  meetingId: string,
  text: string,
  groupId: string | null = null,
  kind: NoticeKind = 'info',
): Promise<void> {
  const { error } = await supabase.rpc('add_notice', {
    p_meeting_id: meetingId,
    p_text: text,
    p_group_id: groupId,
    p_kind: kind,
  })
  if (error) throw fail(error.message)
}

/** 내 멤버 행만 수정 (RLS 로 본인 행만 허용) */
export interface MePatch {
  status?: MemberStatus
  startedAt?: number | null
  arrivedAt?: number | null
  etaAt?: number | null
  checkStage?: number
  nearDest?: boolean
  prevStatus?: MemberStatus | null
  planB?: PlanB | null
  shareStopped?: boolean
  arrivalNotice?: boolean
  buddy?: string
  privacy?: Privacy
  groupDecision?: 'joined' | 'declined' | null
  riskKey?: string | null
}

const iso = (v: number | null) => (v === null ? null : new Date(v).toISOString())

export async function updateMe(meetingId: string, patch: MePatch): Promise<void> {
  const userId = await ensureSession()
  const row: Row = {}
  if ('status' in patch) row.status = patch.status
  if ('startedAt' in patch) row.started_at = iso(patch.startedAt ?? null)
  if ('arrivedAt' in patch) row.arrived_at = iso(patch.arrivedAt ?? null)
  if ('etaAt' in patch) row.eta_at = iso(patch.etaAt ?? null)
  if ('checkStage' in patch) row.check_stage = patch.checkStage
  if ('nearDest' in patch) row.near_dest = patch.nearDest
  if ('prevStatus' in patch) row.prev_status = patch.prevStatus
  if ('planB' in patch) row.plan_b = patch.planB
  if ('shareStopped' in patch) row.share_stopped = patch.shareStopped
  if ('arrivalNotice' in patch) row.arrival_notice = patch.arrivalNotice
  if ('buddy' in patch) row.buddy = patch.buddy
  if ('groupDecision' in patch) row.group_decision = patch.groupDecision
  if ('riskKey' in patch) row.risk_key = patch.riskKey
  if ('privacy' in patch) row.privacy = patch.privacy
  const { error } = await supabase.from('members').update(row).eq('meeting_id', meetingId).eq('user_id', userId)
  if (error) throw fail(error.message)
}

export async function requestCheck(memberId: string): Promise<void> {
  const { error } = await supabase.rpc('request_check', { p_member_id: memberId })
  if (error) throw fail(error.message)
}

export async function resolveCheck(memberId: string, action: 'ok' | 'arrived'): Promise<void> {
  const { error } = await supabase.rpc('resolve_check', { p_member_id: memberId, p_action: action })
  if (error) throw fail(error.message)
}

/** 모임 데이터 변경을 실시간으로 받는다. 반환값은 구독 해제 함수. */
export function subscribeMeeting(meetingId: string, onChange: () => void): () => void {
  const channel = supabase.channel(`meeting:${meetingId}`)
  const tables: [string, string][] = [
    ['members', `meeting_id=eq.${meetingId}`],
    ['notices', `meeting_id=eq.${meetingId}`],
    ['match_groups', `meeting_id=eq.${meetingId}`],
    ['meetings', `id=eq.${meetingId}`],
    ['member_locations', `meeting_id=eq.${meetingId}`],
  ]
  for (const [table, filter] of tables) {
    channel.on('postgres_changes', { event: '*', schema: 'public', table, filter }, onChange)
  }
  channel.subscribe()
  return () => {
    void supabase.removeChannel(channel)
  }
}

/* ---------- 위치 공유 ---------- */

export async function setMyLocation(
  meetingId: string,
  loc: { lat: number; lng: number; accuracy?: number | null; label?: string | null },
): Promise<void> {
  const { error } = await supabase.rpc("set_my_location", {
    p_meeting_id: meetingId,
    p_lat: loc.lat,
    p_lng: loc.lng,
    p_accuracy: loc.accuracy ?? null,
    p_label: loc.label ?? null,
  })
  if (error) throw fail(error.message)
}

export async function clearMyLocation(meetingId: string): Promise<void> {
  const { error } = await supabase.rpc("clear_my_location", { p_meeting_id: meetingId })
  if (error) throw fail(error.message)
}

/* ---------- 채팅 ---------- */

const toMessage = (r: Row): ChatMessage => ({
  id: r.id,
  userId: r.user_id,
  name: r.sender_name,
  body: r.body,
  ts: new Date(r.created_at).getTime(),
})

/** 최근 메시지 (오래된 순) */
export async function fetchMessages(meetingId: string, limit = 100): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("meeting_id", meetingId)
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []).map(toMessage).reverse()
}

export async function sendMessage(meetingId: string, body: string): Promise<void> {
  const userId = await ensureSession()
  const { error } = await supabase.from("messages").insert({ meeting_id: meetingId, user_id: userId, body: body.trim() })
  if (error) throw fail(error.message)
}

/** 새 메시지를 실시간으로 받는다. 반환값은 구독 해제 함수. */
export function subscribeMessages(meetingId: string, onMessage: (m: ChatMessage) => void): () => void {
  const channel = supabase
    .channel(`chat:${meetingId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `meeting_id=eq.${meetingId}` },
      (p) => onMessage(toMessage(p.new as Row)),
    )
    .subscribe()
  return () => {
    void supabase.removeChannel(channel)
  }
}

/* ---------- 주변 귀가 동행 찾기 ---------- */

export interface NearbyPost {
  id: string
  displayName: string
  lat: number
  lng: number
  label: string | null
  originKey: string
  destKey: string
  destArea: string
  departTime: string
  mode: string
  expiresAt: number
}

export interface NearbyPerson {
  id: string
  name: string
  distanceM: number
  destArea: string
  departTime: string
  mode: string
  /** 나와 귀가 방향 차이(도) */
  dirDiff: number
  /** 목적지끼리의 거리(km) */
  destGapKm: number
  invited: boolean
  updatedAt: number
}

export interface NearbyInvite {
  id: string
  fromName: string
  createdAt: number
}

export interface NearbyPostInput {
  name: string
  lat: number
  lng: number
  label: string | null
  originKey: string
  destKey: string
  destArea: string
  destLat: number
  destLng: number
  bearing: number
  departTime: string
  mode: string
  minutes?: number
}

export async function postNearby(p: NearbyPostInput): Promise<void> {
  await ensureSession()
  const { error } = await supabase.rpc('post_nearby', {
    p_name: p.name,
    p_lat: p.lat,
    p_lng: p.lng,
    p_label: p.label,
    p_origin_key: p.originKey,
    p_dest_key: p.destKey,
    p_dest_area: p.destArea,
    p_dest_lat: p.destLat,
    p_dest_lng: p.destLng,
    p_bearing: p.bearing,
    p_depart_time: p.departTime,
    p_mode: p.mode,
    p_minutes: p.minutes ?? 60,
  })
  if (error) throw fail(error.message)
}

export async function removeNearby(): Promise<void> {
  const { error } = await supabase.rpc('remove_nearby')
  if (error) throw fail(error.message)
}

/** 내가 올려 둔(만료 전) 게시. 없으면 null */
export async function fetchMyNearbyPost(): Promise<NearbyPost | null> {
  await ensureSession()
  const { data, error } = await supabase.from('nearby_posts').select('*').maybeSingle()
  if (error) throw error
  if (!data || new Date(data.expires_at).getTime() <= Date.now()) return null
  return {
    id: data.id,
    displayName: data.display_name,
    lat: data.lat,
    lng: data.lng,
    label: data.label,
    originKey: data.origin_key,
    destKey: data.dest_key,
    destArea: data.dest_area,
    departTime: hhmm(data.depart_time),
    mode: data.mode,
    expiresAt: new Date(data.expires_at).getTime(),
  }
}

export async function findNearby(radiusM: number): Promise<NearbyPerson[]> {
  const { data, error } = await supabase.rpc('find_nearby', { p_radius_m: radiusM })
  if (error) throw fail(error.message)
  return ((data ?? []) as Row[]).map((r) => ({
    id: r.id,
    name: r.display_name,
    distanceM: r.distance_m,
    destArea: r.dest_area,
    departTime: hhmm(r.depart_time),
    mode: r.mode,
    dirDiff: r.dir_diff,
    destGapKm: Number(r.dest_gap_km),
    invited: r.invited,
    updatedAt: new Date(r.updated_at).getTime(),
  }))
}

/** 함께 귀가 제안. 반환: 내 모임 코드 */
export async function sendNearbyInvite(postId: string, endTime: string): Promise<string> {
  const { data, error } = await supabase.rpc('send_nearby_invite', { p_post_id: postId, p_end_time: endTime })
  if (error) throw fail(error.message)
  return data as string
}

/** 초대 수락(모임 코드 반환) / 거절(null 반환) */
export async function respondNearbyInvite(inviteId: string, accept: boolean): Promise<string | null> {
  const { data, error } = await supabase.rpc('respond_nearby_invite', { p_invite_id: inviteId, p_accept: accept })
  if (error) throw fail(error.message)
  return (data as string | null) ?? null
}

/** 나에게 온 대기 중 초대 */
export async function fetchMyInvites(): Promise<NearbyInvite[]> {
  const userId = await ensureSession()
  const { data, error } = await supabase
    .from('nearby_invites')
    .select('*')
    .eq('to_user', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((r: Row) => ({ id: r.id, fromName: r.from_name, createdAt: new Date(r.created_at).getTime() }))
}

/** 내가 만든 주변 모임(최근) 중 가장 최근 것의 코드와 참여 인원. 없으면 null */
export async function fetchMyNearbyMeeting(): Promise<{ code: string; name: string; members: number } | null> {
  const userId = await ensureSession()
  const { data, error } = await supabase
    .from('meetings')
    .select('code,name,members(count)')
    .eq('kind', 'nearby')
    .eq('host_user_id', userId)
    .gt('created_at', new Date(Date.now() - 3 * 3600 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
  if (error) throw error
  const m = data?.[0] as Row | undefined
  return m ? { code: m.code, name: m.name, members: m.members?.[0]?.count ?? 1 } : null
}

/** 나에게 오는 초대(와 보낸 초대의 응답) 변화를 실시간으로 받는다. */
export function subscribeInvites(onChange: () => void): () => void {
  const channel = supabase
    .channel(`invites:${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'nearby_invites' }, onChange)
    .subscribe()
  return () => {
    void supabase.removeChannel(channel)
  }
}
