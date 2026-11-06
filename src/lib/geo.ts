import type { LatLng } from '@/types'

/** 두 좌표 사이 거리(m) - Haversine */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export interface GeoFix extends LatLng {
  accuracy: number
}

/** 브라우저 GPS 로 현재 위치를 한 번 가져온다. (HTTPS 또는 localhost 필요) */
export function getCurrentFix(): Promise<GeoFix> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('이 기기는 위치 기능을 지원하지 않아요.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      (err) =>
        reject(
          new Error(
            err.code === err.PERMISSION_DENIED
              ? '위치 권한이 거부됐어요. 브라우저(또는 휴대폰) 설정에서 위치를 허용해 주세요.'
              : '현재 위치를 가져오지 못했어요. 잠시 후 다시 시도해 주세요.',
          ),
        ),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    )
  })
}

/** 좌표 → 주소 설명 (OpenStreetMap Nominatim, 키 불필요). 실패하면 null. */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&accept-language=ko&lat=${lat}&lon=${lng}`,
    )
    if (!r.ok) return null
    const j = (await r.json()) as { display_name?: string; address?: Record<string, string> }
    const a = j.address ?? {}
    const parts = [
      a.city || a.county || a.state,
      a.borough || a.city_district || a.suburb,
      a.quarter || a.neighbourhood,
      a.road,
      a.house_number,
    ].filter(Boolean)
    const text = parts.length >= 2 ? parts.join(' ') : (j.display_name ?? '')
    return text ? text.slice(0, 120) : null
  } catch {
    return null
  }
}

/** "3분 전" 같은 상대 시간 */
export function agoText(ts: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - ts) / 1000))
  if (s < 30) return '방금'
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}분 전`
  return `${Math.round(s / 3600)}시간 전`
}
