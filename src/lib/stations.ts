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

const collator = new Intl.Collator('ko')

/** 'N호선' 또는 '부산 N호선'처럼 번호로 구분하는 노선이면 N, 아니면 null ('인천1호선'은 이름 노선으로 취급) */
const lineNumber = (name: string): number | null => {
  const m = name.match(/^(?:\S+ )?(\d+)호선$/)
  return m ? Number(m[1]) : null
}

/** 호선 정렬: 1호선, 2호선, … 숫자 순이 먼저, 그다음 이름(가나다) 순 */
const compareLines = (a: string, b: string) => {
  const na = lineNumber(a)
  const nb = lineNumber(b)
  if (na !== null && nb !== null) return na - nb
  if (na !== null) return -1
  if (nb !== null) return 1
  return collator.compare(a, b)
}

/** 노선 목록은 지역 순서 → 호선 번호 순, 각 노선의 역은 이름(가나다) 순으로 정렬한다. */
export const LINES: LineInfo[] = RAW_LINES.map(([name, region, keys]) => ({
  name,
  region,
  stations: keys
    .map((k) => byKey.get(k))
    .filter((s): s is Station => !!s)
    .sort((a, b) => collator.compare(a.n, b.n) || collator.compare(a.key, b.key)),
})).sort((a, b) => REGION_ORDER.indexOf(a.region) - REGION_ORDER.indexOf(b.region) || compareLines(a.name, b.name))

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
