# 아디야 (adiya-app)

모임 후 같은 지역(동선)으로 귀가하는 사람들을 위한 **안심귀가 서비스**.

- 귀가 모임 생성/참여
- GPS 기반 실시간 도착 상태 확인 및 안심 알림

## 기술 스택

React 19 · Vite · TypeScript · React Router(HashRouter) · Supabase(Auth·Postgres·Realtime) · Vercel

## 시작하기

```bash
npm install
npm run dev        # React 앱 개발 서버 (Supabase 연결 필요: .env)
npm run dev:proto  # 정적 프로토타입(prototype/) 서버
npm run build    # 프로덕션 빌드
```

## 폴더 구조

```
src/
  pages/       화면 (Landing, Create, Created, Join, Register, Match, Dashboard, Settings, PlanB)
  components/  Layout, Icon, Toast, 공용 UI
  hooks/       useMeeting (모임 데이터 로딩·실시간 구독·자동 점검·액션)
  lib/         api(Supabase), matching(매칭 엔진), stations, session
  styles/      app.css (프로토타입 디자인 시스템)
supabase/      마이그레이션 (스키마·RLS·RPC)
prototype/     정적 프로토타입 (참고용)
```

## 설정

1. `.env.example` 을 `.env` 로 복사해 Supabase URL/publishable 키를 넣습니다.
2. Supabase 대시보드 → Authentication → Sign In / Providers 에서 **Anonymous sign-ins** 를 켭니다.
