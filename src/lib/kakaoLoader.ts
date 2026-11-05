export const KAKAO_MAP_KEY = import.meta.env.VITE_KAKAO_MAP_KEY as string | undefined

let loadPromise: Promise<void> | null = null

/** 카카오맵 SDK 를 한 번만 로드한다. */
export function loadKakaoMaps(): Promise<void> {
  if (loadPromise) return loadPromise

  loadPromise = new Promise<void>((resolve, reject) => {
    if (!KAKAO_MAP_KEY) {
      reject(new Error('VITE_KAKAO_MAP_KEY 가 설정되지 않았어요.'))
      return
    }
    const script = document.createElement('script')
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_KEY}&autoload=false`
    script.async = true
    script.onload = () => window.kakao!.maps.load(() => resolve())
    script.onerror = () => reject(new Error('카카오맵 SDK 로드에 실패했어요. 키와 등록 도메인을 확인하세요.'))
    document.head.appendChild(script)
  })

  // 실패 시 다음 시도에서 재시도할 수 있게 초기화
  loadPromise.catch(() => {
    loadPromise = null
  })
  return loadPromise
}
