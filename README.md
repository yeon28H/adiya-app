# 어디야 (adiya-app)

모임 후 같은 지역(동선)으로 귀가하는 사람들을 위한 **안심귀가 서비스**.

- 귀가 모임 생성/참여
- GPS 기반 실시간 도착 상태 확인 및 안심 알림

## 기술 스택

React 19 · Vite · TypeScript · Tailwind CSS v4 · React Router

## 시작하기

```bash
npm install
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드
```

## 폴더 구조

```
src/
  components/  재사용 UI (Layout, GroupCard, StatusBadge)
  pages/       화면 (Home, GroupList, GroupCreate, GroupDetail)
  hooks/       커스텀 훅 (useGeolocation)
  lib/         유틸/임시 데이터 (geo, mockData)
  types/       공용 타입
  assets/      이미지 등 정적 리소스
```

테마 컬러는 `src/index.css`의 `brand-*` (기준 `#FFC107`).
