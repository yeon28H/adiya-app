// 사용하는 부분만 최소로 선언한 카카오맵 SDK 타입
declare namespace kakao.maps {
  function load(callback: () => void): void

  class LatLng {
    constructor(lat: number, lng: number)
  }

  class Map {
    constructor(container: HTMLElement, options: { center: LatLng; level?: number })
    setCenter(latlng: LatLng): void
  }

  class Marker {
    constructor(options: { position: LatLng; map?: Map | null })
    setMap(map: Map | null): void
  }
}

interface Window {
  kakao?: typeof kakao
}
