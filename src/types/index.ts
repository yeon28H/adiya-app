export interface LatLng {
  lat: number
  lng: number
}

export type MemberStatus = 'ready' | 'started' | 'together' | 'check' | 'arrived'

export interface Meeting {
  id: string
  code: string
  name: string
  place: string
  end_time: string | null
  capacity: number
  host_user_id: string
  created_at: string
}

export interface Member {
  id: string
  meeting_id: string
  user_id: string
  name: string
  registered: boolean
  status: MemberStatus
  origin: string
  dest: string
  lat: number | null
  lng: number | null
  started_at: string | null
  arrived_at: string | null
  updated_at: string
}
