import type { MapProps } from './types'

/** API 키가 없을 때 보여주는 가짜 지도 (레이아웃 확인용) */
export default function MockMap({ center, markers = [], className = '' }: MapProps & { notice?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-brand-200 bg-brand-50 ${className}`}
      style={{
        backgroundImage:
          'linear-gradient(#ffe08255 1px, transparent 1px), linear-gradient(90deg, #ffe08255 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }}
    >
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl">📍</div>
      <div className="absolute left-2 top-2 rounded-md bg-white/80 px-2 py-1 text-xs text-neutral-600">
        Mock 지도 · .env 에 VITE_KAKAO_MAP_KEY 를 넣으면 실제 지도가 표시돼요
      </div>
      <div className="absolute bottom-2 left-2 rounded-md bg-white/80 px-2 py-1 text-xs text-neutral-600">
        {center.lat.toFixed(4)}, {center.lng.toFixed(4)} · 마커 {markers.length}개
      </div>
    </div>
  )
}
