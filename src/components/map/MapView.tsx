import { KAKAO_MAP_KEY } from '@/lib/kakaoLoader'
import KakaoMap from './KakaoMap'
import MockMap from './MockMap'
import type { MapProps } from './types'

/** 키가 있으면 카카오맵, 없으면 Mock 지도를 보여준다. 화면에서는 이 컴포넌트만 쓰면 됨. */
export default function MapView(props: MapProps) {
  return KAKAO_MAP_KEY ? <KakaoMap {...props} /> : <MockMap {...props} />
}
