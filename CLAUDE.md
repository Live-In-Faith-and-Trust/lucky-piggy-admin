@AGENTS.md
@docs/app-context/README.md
@docs/admin-guidelines/README.md

## 패키지 매니저

- **yarn** 사용. `npm` / `pnpm` 명령어 사용 금지.

## Supabase CLI 안전 규칙

- `supabase/.env.staging`, `supabase/.env.production`에 접속 정보가 있다.
- **조회(SELECT)만 자유롭게 실행**한다.
- **INSERT / UPDATE / DELETE / DDL / 마이그레이션 / Edge Function 배포**는 실행 전 반드시 사용자에게 쿼리와 영향 범위를 보여주고 승인을 받는다.

