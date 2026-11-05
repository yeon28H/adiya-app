import type { LatLng } from '@/types'

export interface MapMarker {
  id: string
  position: LatLng
  label?: string
}

export interface MapProps {
  center: LatLng
  markers?: MapMarker[]
  className?: string
}

// 위치를 아직 못 받았을 때 쓰는 기본 중심 (서울 시청)
export const DEFAULT_CENTER: LatLng = { lat: 37.5665, lng: 126.978 }
