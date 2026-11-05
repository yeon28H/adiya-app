import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const input =
  'w-full rounded-xl border border-neutral-300 px-3 py-2 focus:border-brand-500 focus:outline-none'

export default function GroupCreate() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [place, setPlace] = useState('')

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        // TODO: 백엔드 연동 후 실제 생성 API 호출
        navigate('/groups')
      }}
    >
      <h1 className="text-lg font-bold">귀가 모임 만들기</h1>
      <input
        className={input}
        placeholder="모임 이름 (예: 강남 → 분당선)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <input
        className={input}
        placeholder="모이는 장소"
        value={place}
        onChange={(e) => setPlace(e.target.value)}
        required
      />
      <button className="w-full rounded-xl bg-brand-500 py-3 font-semibold active:bg-brand-600">
        만들기
      </button>
    </form>
  )
}
