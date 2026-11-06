import { useEffect, useMemo, useState } from 'react'
import { findStation, LINES, REGIONS, STATIONS, type Station } from '@/lib/stations'

interface Props {
  /** 선택된 역의 key (예: '강남역'). 비어 있으면 미선택 */
  value: string
  onChange: (key: string) => void
  /** 선택된 호선이 바뀔 때 알려준다 (예: 모임의 출발·도착 호선 표시용) */
  onLineChange?: (line: string) => void
  /** 좁은 열(출발→도착 나란히 배치)에서 안내 문구를 짧게 */
  compact?: boolean
}

const collator = new Intl.Collator('ko')

/** 입력한 글자가 들어간 역을 찾는다. 이름이 입력으로 시작하는 역을 먼저, 나머지는 가나다순. */
function searchStations(query: string): Station[] {
  const q = query.trim().replace(/\s+/g, '')
  if (!q) return []
  const name = q.replace(/역$/, '') || q
  const hit = STATIONS.filter((s) => s.key.includes(q) || s.n.includes(name))
  return hit
    .sort((a, b) => Number(b.n.startsWith(name)) - Number(a.n.startsWith(name)) || collator.compare(a.key, b.key))
    .slice(0, 8)
}

/** 1) 호선을 먼저 고르고 2) 그 호선의 역 목록에서 정확한 역을 고른다. 이름으로 직접 찾기도 가능. */
export default function StationPicker({ value, onChange, onLineChange, compact = false }: Props) {
  const current = useMemo(() => findStation(value), [value])
  const [line, setLine] = useState(current?.lines[0] ?? '')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  // 값이 바깥(현재 위치, 이름 검색)에서 바뀌면 호선도 맞춰 준다. 이미 그 역을 지나는 호선이면 유지.
  useEffect(() => {
    if (current && !current.lines.includes(line)) setLine(current.lines[0])
  }, [current, line])

  // 위쪽 선택칸 등 다른 곳에서 역이 바뀌면 검색칸은 비운다 (검색으로 고른 경우는 입력이 그대로 남는다)
  useEffect(() => {
    setQuery((q) => (q && q !== value ? '' : q))
  }, [value])

  const lineInfo = LINES.find((l) => l.name === line)

  useEffect(() => {
    onLineChange?.(line)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [line])

  const results = useMemo(() => searchStations(query), [query])
  const showList = open && query.trim() !== '' && query !== value

  function pick(s: Station) {
    setQuery(s.key)
    setOpen(false)
    onChange(s.key)
  }

  return (
    <div className="stack" style={{ gap: 8 }}>
      <select
        aria-label="호선 선택"
        value={line}
        onChange={(e) => {
          setLine(e.target.value)
          onChange('')
        }}
      >
        <option value="" disabled>
          {compact ? '① 호선 선택' : '① 호선을 먼저 선택하세요'}
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
          {lineInfo ? (compact ? '② 역 선택' : `② ${lineInfo.name}의 역을 선택하세요`) : compact ? '② 역 선택' : '② 호선을 먼저 선택해 주세요'}
        </option>
        {lineInfo?.stations.map((s) => (
          <option key={s.key} value={s.key}>
            {s.key}
            {s.lines.length > 1 ? ` · 환승 ${s.lines.filter((l) => l !== line).join('·')}` : ''}
          </option>
        ))}
      </select>

      <div className="station-search">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            // 폼 제출 대신, 첫 번째 검색 결과를 선택한다
            if (e.key === 'Enter') {
              e.preventDefault()
              if (results[0]) pick(results[0])
            }
          }}
          placeholder={compact ? '역 이름 검색' : '역 이름으로 바로 찾기 (예: 잠실)'}
          autoComplete="off"
          aria-label="역 이름으로 검색"
        />
        {showList && (
          <ul className="suggest" role="listbox">
            {results.length === 0 && <li className="suggest-empty">일치하는 역이 없어요</li>}
            {results.map((s) => (
              <li key={s.key} role="option" aria-selected={s.key === value}>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(s)}>
                  <b>{s.key}</b>
                  <span className="muted small">{s.lines.join(' · ')}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {current && (
        <div className="small" style={{ fontWeight: 700 }}>
          선택한 역: {current.key} <span className="muted">· {current.lines.join(' · ')}</span>
        </div>
      )}
    </div>
  )
}
