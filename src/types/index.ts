export interface LatLng {
  lat: number
  lng: number
}

export type MemberStatus = 'waiting' | 'moving' | 'arrived'

export interface Member {
  id: string
  name: string
  status: MemberStatus
  position?: LatLng
  updatedAt?: string
}

export interface HomeGroup {
  id: string
  title: string
  area: string // 같은 지역(동선) 설명, 예: "강남역 → 분당선"
  meetingPlace: string
  departAt: string // ISO 문자열
  members: Member[]
  maxMembers: number
}
