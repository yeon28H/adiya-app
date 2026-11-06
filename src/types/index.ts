export interface LatLng {
  lat: number
  lng: number
}

export type MemberStatus ='ready' | 'started' | 'together' | 'check' | 'arrived'
export type Privacy = 'exact' | 'area' | 'status'
export type NoticeKind = 'info' | 'ok' | 'warn'

export interface PlanB {
  title: string
  situation: string
}

/** 화면에서 쓰는 멤버 (DB 행을 camelCase / 밀리초 타임스탬프로 변환한 것) */
export interface MemberView {
  id: string
  userId: string
  name: string
  registered: boolean
  status: MemberStatus
  origin: string
  dest: string
  departTime: string // 'HH:MM'
  mode: string
  privacy: Privacy
  shareStopped: boolean
  arrivalNotice: boolean
  buddy: string // 'host' 또는 member id
  groupDecision: 'joined' | 'declined' | null
  startedAt: number | null
  arrivedAt: number | null
  etaAt: number | null
  checkStage: number
  nearDest: boolean
  prevStatus: MemberStatus | null
  planB: PlanB | null
  riskKey: string | null
}

export interface GroupView {
  id: string
  n: number
  memberIds: string[]
  score: number
  sharedMin: number
  spread: number
  splitStation: string
  splitDistrict: string
  reasons: string[]
  pairMode: boolean
}

export interface NoticeView {
  id: string
  ts: number
  text: string
  groupId: string | null
  kind: NoticeKind
}

export interface LocView {
  lat: number
  lng: number
  accuracy: number | null
  label: string | null
  updatedAt: number
}

export interface ChatMessage {
  id: string
  userId: string
  name: string
  body: string
  ts: number
}

export interface MeetingView {
  id: string
  code: string
  name: string
  place: string
  placeStation: string
  endTime: string // 'HH:MM'
  capacity: number
  hostUserId: string
  matchedAt: number | null
  matchStale: boolean
  members: MemberView[]
  groups: GroupView[] | null // 매칭 전이면 null
  soloIds: string[]
  notices: NoticeView[]
  /** 멤버 id → 현재 위치 (내가 볼 수 있는 것만: 내 위치 + 정확한 위치를 공개한 사람) */
  locations: Record<string, LocView>
}
