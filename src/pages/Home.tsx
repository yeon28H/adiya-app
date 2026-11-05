import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">모임 끝, 이제 같이 안전하게 🏠</h1>
      <p className="text-neutral-600">
        같은 방향으로 가는 사람들과 귀가 모임을 만들고, 도착까지 서로 확인해요.
      </p>
      <Link
        to="/groups/new"
        className="block rounded-xl bg-brand-500 py-3 text-center font-semibold active:bg-brand-600"
      >
        귀가 모임 만들기
      </Link>
      <Link
        to="/groups"
        className="block rounded-xl border border-brand-500 py-3 text-center font-semibold"
      >
        모임 둘러보기
      </Link>
    </div>
  )
}
