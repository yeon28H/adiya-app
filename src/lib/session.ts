/** 마지막으로 들어간 모임을 기억해 상단 메뉴에 보여준다. (인증과는 별개) */
const KEY = 'eodiya.session'

export interface LastMeeting {
  code: string
  name: string
}

export function getLastMeeting(): LastMeeting | null {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? 'null') as LastMeeting | null
  } catch {
    return null
  }
}

export function setLastMeeting(m: LastMeeting | null): void {
  if (m) localStorage.setItem(KEY, JSON.stringify(m))
  else localStorage.removeItem(KEY)
  window.dispatchEvent(new Event('eodiya-session'))
}
