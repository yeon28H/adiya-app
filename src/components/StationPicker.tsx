import { useEffect, useMemo, useState } from 'react'
import { findStation, LINES, REGIONS, STATIONS } from '@/lib/stations'

interface Props {
  /** 선택된 역의 key (예: '강남역'). 비어 있으면 미선택 */
  value: string
  onChange: (key: string) => void
}

/** 1) 호선을 먼저 고르고 2) 그 호선의 역 목록에서 정확한 역을 고른다. 이름으로 바로 찾기도 가능. */
export default function StationPicker({ value, onChange }: Props) {
  const current = useMemo(() => findStation(value), [value])
  const [line, setLine] = useState(current?.lines[0] ?? '')
  const [query, setQuery] = useState('')

  // 값이 바깥(현재 위치, 이름 검색)에서 바뀌면 호선도 맞춰 준다. 이미 그 역을 지나는 호선이면 유지.
  useEffect(() => {
    if (current && !current.lines.includes(line)) setLine(current.lines[0])
  }, [current, line])

  const lineInfo = LINES.find((l) => l.name === line)

  function search(v: string) {
    setQuery(v)
    const s = findStation(v)
    if (s) {
      onChange(s.key)
      setQuery('')
    }
  }

  return (
    <div className="stack" style={{ gap: 8 }}>
      <select aria-label="호선 선택" value={line} onChange={(e) => { setLine(e.target.value); onChange('') }}>
        <option value="" disabled>
          ① 호선을 먼저 선택하세요
        </option>
        {REGIONS.map((r) => (
          <optgroup key={r} label={r}>
            {LINES.filter((l) => l.region === r).map((l) => (
              <option key={l.name} value={l.name}>
                {l.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <select
        aria-label="역 선택"
        value={lineInfo?.stations.some((s) => s.key === value) ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={!lineInfo}
      >
        <option value="" disabled>
          {lineInfo ? `② ${lineInfo.name}의 역을 선택하세요` : '② 호선을 먼저 선택해 주세요'}
        </option>
        {lineInfo?.stations.map((s) => (
          <option key={s.key} value={s.key}>
            {s.key}
            {s.lines.length > 1 ? ` · 환승 ${s.lines.filter((l) => l !== line).join('·')}` : ''}
          </option>
        ))}
      </select>
      <input
        type="text"
        list="stations"
        value={query}
        onChange={(e) => search(e.target.value)}
        placeholder="역 이름으로 바로 찾기 (예: 잠실)"
        autoComplete="off"
        aria-label="역 이름으로 검색"
      />
      {current && (
        <div className="small" style={{ fontWeight: 700 }}>
          선택한 역: {current.key} <span className="muted">· {current.lines.join(' · ')}</span>
        </div>
      )}
    </div>
  )
}

const SORTED_STATIONS = [...STATIONS].sort((a, b) => new Intl.Collator('ko').compare(a.key, b.key))

/** 이름 검색용 datalist (페이지에 한 번만 렌더링) */
export function StationDatalist() {
  return (
    <datalist id="stations">
      {SORTED_STATIONS.map((s) => (
        <option key={s.key} value={s.key} />
      ))}
    </datalist>
  )
}
