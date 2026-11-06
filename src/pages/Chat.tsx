import { useEffect, useRef, useState } from 'react'
import Icon from '@/components/Icon'
import { useToast } from '@/components/Toast'
import { Back, fmtClock, Shell } from '@/components/ui'
import { useMeeting } from '@/hooks/useMeeting'

export default function Chat() {
  const { mt, me, messages, sendChat, markChatRead } = useMeeting()
  const toast = useToast()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const bottom = useRef<HTMLDivElement>(null)

  // 열려 있는 동안 새 메시지가 오면 읽음 처리하고 맨 아래로 스크롤
  useEffect(() => {
    markChatRead()
    bottom.current?.scrollIntoView({ block: 'end' })
  }, [messages.length, markChatRead])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const body = text.trim()
    if (!body || busy) return
    setBusy(true)
    try {
      await sendChat(body)
      setText('')
    } catch (err) {
      toast((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  let lastDay = ''
  return (
    <Shell>
      <Back to={`/m/${mt.code}`}>{mt.name}</Back>
      <div className="chat">
        <div className="chat-list" role="log" aria-live="polite">
          {messages.length === 0 && <p className="small muted center" style={{ margin: 'auto' }}>아직 메시지가 없어요. 첫 인사를 남겨 보세요 👋</p>}
          {messages.map((m) => {
            const day = new Date(m.ts).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
            const showDay = day !== lastDay
            lastDay = day
            const mine = m.userId === me.userId
            return (
              <div key={m.id}>
                {showDay && <div className="chat-day">{day}</div>}
                <div className={`chat-row${mine ? ' mine' : ''}`}>
                  {!mine && <span className="chat-name">{m.name}</span>}
                  <div className="chat-bubble-wrap">
                    <div className="chat-bubble">{m.body}</div>
                    <time>{fmtClock(m.ts)}</time>
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={bottom} />
        </div>
        <form className="chat-input" onSubmit={(e) => void onSubmit(e)}>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="메시지를 입력하세요"
            maxLength={500}
            autoComplete="off"
            aria-label="메시지 입력"
          />
          <button className="btn btn-primary chat-send" type="submit" disabled={busy || !text.trim()} aria-label="보내기" title="보내기">
            <Icon name="send" size={20} />
          </button>
        </form>
      </div>
    </Shell>
  )
}
