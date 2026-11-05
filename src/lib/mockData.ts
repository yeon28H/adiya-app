import type { HomeGroup } from '@/types'

// 백엔드 연동 전까지 사용하는 임시 데이터
export const mockGroups: HomeGroup[] = [
  {
    id: '1',
    title: '강남역 → 분당선 귀가팟',
    area: '강남 · 분당선',
    meetingPlace: '강남역 11번 출구',
    departAt: new Date().toISOString(),
    maxMembers: 4,
    members: [
      { id: 'm1', name: '지민', status: 'moving' },
      { id: 'm2', name: '수아', status: 'waiting' },
    ],
  },
  {
    id: '2',
    title: '홍대입구 → 2호선 서쪽',
    area: '홍대 · 2호선',
    meetingPlace: '홍대입구역 9번 출구',
    departAt: new Date().toISOString(),
    maxMembers: 3,
    members: [{ id: 'm3', name: '민준', status: 'arrived' }],
  },
]
