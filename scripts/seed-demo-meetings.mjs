// 시연용 모집 중인 모임을 만든다. (실제 사용자가 아닌 임시 익명 계정이 주최자/참여자 역할)
// 사용: node scripts/seed-demo-meetings.mjs   (프로젝트 루트의 .env 필요)
// 모집 목록은 개설 후 12시간이 지나면 사라지므로, 필요하면 다시 실행하세요.
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  fs.readFileSync(new URL('../.env', import.meta.url), 'utf8').split(/\r?\n/).filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
)
const client = async () => {
  const c = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } })
  const { error } = await c.auth.signInAnonymously()
  if (error) throw error
  return c
}

const DEMOS = [
  { name: '금요일 강남 → 건대 귀가팟', place: '강남역', from: '2호선', to: '7호선', dest: '건대입구역', area: '광진구', end: '22:30', cap: 5, host: '지은', extras: ['민준'] },
  { name: '홍대 → 신림 막차 동행', place: '홍대입구역', from: '2호선', to: '2호선', dest: '신림역', area: '관악구', end: '23:10', cap: 4, host: '서연', extras: ['도윤', '하은'] },
  { name: '사당 → 수원 귀가', place: '사당역', from: '4호선', to: '1호선', dest: '수원역', area: '수원시', end: '23:00', cap: 6, host: '현우', extras: [] },
  { name: '서울역 → 부평 귀가', place: '서울역', from: '1호선', to: '1호선', dest: '부평역', area: '인천 부평구', end: '22:50', cap: 4, host: '수아', extras: ['지호'] },
  { name: '잠실 → 판교 퇴근길 동행', place: '잠실역', from: '2호선', to: '신분당선', dest: '판교역', area: '성남시', end: '22:40', cap: 4, host: '태윤', extras: ['아린', '서진'] },
  { name: '서면 → 해운대 귀가', place: '서면역', from: '부산 2호선', to: '부산 2호선', dest: '해운대역', area: '부산 해운대구', end: '23:00', cap: 4, host: '다온', extras: [] },
]

const lister = await client()
for (const d of DEMOS) {
  const host = await client()
  const { data: code, error } = await host.rpc('create_meeting', {
    p_name: d.name, p_place: d.place, p_place_station: d.place, p_end_time: d.end, p_capacity: d.cap,
    p_host_name: d.host, p_is_public: true, p_from_line: d.from, p_to_line: d.to, p_dest_station: d.dest, p_dest_area: d.area,
  })
  if (error) throw error
  const { data: list } = await lister.rpc('list_open_meetings')
  const m = list.find((x) => x.name === d.name && x.host_name === d.host)
  for (const nick of d.extras) {
    const u = await client()
    const { error: e2 } = await u.rpc('join_public_meeting', { p_meeting_id: m.id, p_name: nick })
    if (e2) throw e2
  }
  console.log(`${d.name} (${code}) — ${1 + d.extras.length}/${d.cap}명`)
}
