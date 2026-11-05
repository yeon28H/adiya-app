import { useEffect, useState } from 'react'
import type { LatLng } from '@/types'

interface State {
  position: LatLng | null
  error: string | null
}

/** 브라우저 GPS 실시간 추적 (HTTPS 또는 localhost 에서만 동작) */
export function useGeolocation(enabled = true): State {
  const [state, setState] = useState<State>({ position: null, error: null })

  useEffect(() => {
    if (!enabled) return
    if (!('geolocation' in navigator)) {
      setState({ position: null, error: '이 기기는 위치 기능을 지원하지 않아요.' })
      return
    }
    const id = navigator.geolocation.watchPosition(
      (p) => setState({ position: { lat: p.coords.latitude, lng: p.coords.longitude }, error: null }),
      (e) => setState({ position: null, error: e.message }),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [enabled])

  return state
}
