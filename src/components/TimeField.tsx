/** 시간 선택: 오전/오후 · 시 · 분을 각각 고른다.
 *  브라우저 기본 시간 입력칸(type="time")은 폰(특히 iOS Safari)에서 폭이 어긋나 화면 밖으로 튀어나오는 일이 있어 대신 사용한다.
 *  value / onChange 는 24시간제 'HH:MM' 문자열. */
interface Props {
  value: string
  onChange: (value: string) => void
  /** 접근성 라벨 접두어 (예: '해산') */
  label?: string
}

const pad = (n: number) => String(n).padStart(2, '0')

export function parseTime(value: string): { pm: boolean; hour12: number; minute: number } {
  const [h, m] = (value || '00:00').split(':').map((x) => Number(x))
  const h24 = Number.isFinite(h) ? ((h % 24) + 24) % 24 : 0
  return { pm: h24 >= 12, hour12: h24 % 12 === 0 ? 12 : h24 % 12, minute: Number.isFinite(m) ? Math.min(59, Math.max(0, m)) : 0 }
}

export function buildTime(pm: boolean, hour12: number, minute: number): string {
  return `${pad((hour12 % 12) + (pm ? 12 : 0))}:${pad(minute)}`
}

export default function TimeField({ value, onChange, label = '시간' }: Props) {
  const { pm, hour12, minute } = parseTime(value)
  return (
    <div className="time-field">
      <select aria-label={`${label} 오전 오후`} value={pm ? 'pm' : 'am'} onChange={(e) => onChange(buildTime(e.target.value === 'pm', hour12, minute))}>
        <option value="am">오전</option>
        <option value="pm">오후</option>
      </select>
      <select aria-label={`${label} 시`} value={hour12} onChange={(e) => onChange(buildTime(pm, Number(e.target.value), minute))}>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
          <option key={h} value={h}>
            {h}시
          </option>
        ))}
      </select>
      <select aria-label={`${label} 분`} value={minute} onChange={(e) => onChange(buildTime(pm, hour12, Number(e.target.value)))}>
        {Array.from({ length: 60 }, (_, i) => i).map((m) => (
          <option key={m} value={m}>
            {pad(m)}분
          </option>
        ))}
      </select>
    </div>
  )
}
