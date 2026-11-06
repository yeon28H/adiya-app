/* 전국 도시철도·광역철도 역 데이터 (OpenStreetMap, 지도 API 없이 거리·방향 계산에 사용) */
import { RAW_LINES, RAW_STATIONS, REGION_ORDER } from './stations.data'

export interface Station {
  /** 저장·표시용 고유 이름. 예: '강남역', 동명이역은 '중앙역(부산)' */
  key: string
  /** 역 이름 ('역' 제외) */
  n: string
  /** 행정구역 (공개 범위 '지역만'에서 사용) */
  d: string
  /** 지역: 수도권 / 부산 / 대구 / 대전 / 광주 */
  r: string
  lat: number
  lng: number
  /** 지나는 노선들 */
  lines: string[]
}

export interface LineInfo {
  name: string
  region: string
  /** 노선 순서대로 정렬된 역 */
  stations: Station[]
}

export const STATIONS: Station[] = RAW_STATIONS.map(([key, n, d, r, lat, lng, lines]) => ({
  key,
  n,
  d,
  r,
  lat,
  lng,
  lines,
}))

const byKey = new Map(STATIONS.map((s) => [s.key, s]))
const byName = new Map<string, Station[]>()
for (const s of STATIONS) byName.set(s.n, [...(byName.get(s.n) ?? []), s])

export const REGIONS: string[] = REGION_ORDER

export const LINES: LineInfo[] = RAW_LINES.map(([name, region, keys]) => ({
  name,
  region,
  stations: keys.map((k) => byKey.get(k)).filter((s): s is Station => !!s),
}))

export const linesByRegion = (region: string) => LINES.filter((l) => l.region === region)

/** 역 이름(‘강남’, ‘강남역’, ‘중앙역(부산)’)으로 역을 찾는다. 이름이 모호하면 null. */
export function findStation(input: string | null | undefined): Station | null {
  if (!input) return null
  const q = String(input).trim().replace(/\s+/g, ' ')
  if (!q) return null
  const exact = byKey.get(q)
  if (exact) return exact
  const base = q.replace(/역$/, '')
  const list = byName.get(base)
  return list && list.length === 1 ? list[0] : null
}
