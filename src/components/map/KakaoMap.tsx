import { useEffect, useRef, useState } from 'react'
import { loadKakaoMaps } from '@/lib/kakaoLoader'
import MockMap from './MockMap'
import type { MapProps } from './types'

export default function KakaoMap({ center, markers = [], className = '' }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<kakao.maps.Map | null>(null)
  const markerObjs = useRef<kakao.maps.Marker[]>([])
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  // SDK 로드 + 지도 생성 (최초 1회)
  useEffect(() => {
    let cancelled = false
    loadKakaoMaps()
      .then(() => {
        if (cancelled || !containerRef.current) return
        mapRef.current = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(center.lat, center.lng),
          level: 4,
        })
        setReady(true)
      })
      .catch((e) => {
        console.error(e)
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 중심 이동
  useEffect(() => {
    if (!ready) return
    mapRef.current?.setCenter(new kakao.maps.LatLng(center.lat, center.lng))
  }, [ready, center.lat, center.lng])

  // 마커 갱신
  useEffect(() => {
    if (!ready || !mapRef.current) return
    markerObjs.current.forEach((m) => m.setMap(null))
    markerObjs.current = markers.map(
      (m) =>
        new kakao.maps.Marker({
          position: new kakao.maps.LatLng(m.position.lat, m.position.lng),
          map: mapRef.current,
        }),
    )
  }, [ready, markers])

  if (failed) return <MockMap center={center} markers={markers} className={className} />

  return <div ref={containerRef} className={`overflow-hidden rounded-2xl ${className}`} />
}
