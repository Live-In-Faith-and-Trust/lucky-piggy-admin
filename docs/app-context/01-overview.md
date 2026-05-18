# 앱 전체 개요

## 앱 정체성

**Lucky Piggy (당첨돼지)** — 추첨권(티켓) 기반 앱테크 리워드 앱

사용자는 걷기·광고 시청·출석체크 등 다양한 미션으로 **티켓**을 획득하고,
매주 진행되는 **로또 스타일 추첨**에 응모해 상품권·현금·물건·포인트를 받는다.

## 기술 스택

### 앱 (Flutter)
- Flutter SDK (Dart 3.11+)
- 상태관리: **Riverpod 3.x** + Freezed
- 라우팅: **GoRouter**
- 모노레포: **Melos** workspace

### 패키지 구조
```
lucky-piggy/
├── apps/lucky_app/       # 앱 본체 (Feature-first 구조)
├── packages/core/        # 도메인 공통 (Auth, Config, 모델)
├── packages/infra/       # 인프라 인터페이스 (Ad, Analytics, Push, Security)
└── packages/ui_kit/      # 디자인 토큰 + 공통 위젯
```

### 백엔드
- **Supabase**: DB, Auth, Edge Functions (핵심 비즈니스 로직)
- **Firebase**: Analytics, Crashlytics, FCM 푸시
- **Google AdMob**: 보상형 광고, 네이티브 광고

### 아키텍처 패턴
- Feature-first + 3계층 (data / domain / presentation)
- Repository 패턴
- Flavor 분리: dev / staging / prod

## 앱 Flavor 환경

| Flavor | 용도 |
|--------|------|
| dev | 개발 (Mock 서비스 사용) |
| staging | QA/스테이징 |
| prod | 프로덕션 |

## 보안
- **freeRASP**: 루팅/탈옥·디버깅·훅 탐지
- Supabase RLS: 본인 데이터만 접근 가능

## 어드민 연동 포인트

어드민은 앱이 사용하는 **Supabase DB**를 직접 조회/수정하여 관리한다.
Edge Functions(`earn-tickets`, `enter-draw`)는 앱에서만 호출되며, 어드민은 DB 테이블을 통해 상태를 관리한다.
