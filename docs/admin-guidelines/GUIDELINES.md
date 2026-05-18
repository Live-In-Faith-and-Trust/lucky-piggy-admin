# Lucky Piggy Admin — 기술 작업 지침

> **대상**: Next.js 16 (App Router) + React 19 + Tailwind CSS v4 + shadcn/ui (base-nova)  
> **백엔드**: Supabase (DB + Auth + Edge Functions)  
> **패키지 매니저**: yarn  
> **최종 업데이트**: 2026-05-18

---

## 1. 프로젝트 폴더 구조

App Router 기반, feature-first 구조를 따른다.

```
src/
├── app/
│   ├── layout.tsx                  # 루트 레이아웃 (폰트, ThemeProvider)
│   ├── page.tsx                    # / → /dashboard 리다이렉트
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx            # 어드민 로그인 페이지
│   └── (admin)/                    # 인증된 레이아웃 그룹
│       ├── layout.tsx              # 사이드바 + 헤더 공통 레이아웃
│       ├── dashboard/
│       │   └── page.tsx
│       ├── members/
│       │   ├── page.tsx            # 회원 목록
│       │   └── [id]/
│       │       └── page.tsx        # 회원 상세
│       ├── tickets/
│       │   ├── page.tsx            # 티켓 트랜잭션 목록/통계
│       │   └── grant/
│       │       └── page.tsx        # 수동 티켓 지급
│       ├── draws/
│       │   ├── page.tsx            # 추첨 회차 목록
│       │   ├── new/
│       │   │   └── page.tsx        # 회차 생성
│       │   └── [id]/
│       │       ├── page.tsx        # 회차 상세/관리
│       │       └── winners/
│       │           └── page.tsx    # 당첨자 관리
│       ├── missions/
│       │   ├── page.tsx            # 미션 설정 목록
│       │   └── [type]/
│       │       └── page.tsx        # 미션별 상세 설정
│       ├── coupons/
│       │   ├── page.tsx
│       │   └── new/
│       │       └── page.tsx
│       └── notifications/
│           └── page.tsx            # 푸시 알림 발송
│
├── components/
│   ├── ui/                         # shadcn/ui 자동 생성 컴포넌트
│   ├── layout/
│   │   ├── AdminSidebar.tsx
│   │   ├── AdminHeader.tsx
│   │   └── PageHeader.tsx
│   └── shared/                     # 도메인 공통 컴포넌트
│       ├── DataTable.tsx           # 범용 페이지네이션 테이블
│       ├── SearchFilter.tsx
│       ├── StatusBadge.tsx         # DrawStatus, 등 상태 뱃지
│       └── ConfirmDialog.tsx
│
├── features/                       # feature별 서버 액션 + 타입
│   ├── members/
│   │   ├── actions.ts              # Server Actions
│   │   ├── queries.ts              # Supabase 쿼리 함수
│   │   └── types.ts
│   ├── tickets/
│   │   ├── actions.ts
│   │   ├── queries.ts
│   │   └── types.ts
│   ├── draws/
│   │   ├── actions.ts
│   │   ├── queries.ts
│   │   └── types.ts
│   ├── missions/
│   │   ├── actions.ts
│   │   ├── queries.ts
│   │   └── types.ts
│   └── notifications/
│       ├── actions.ts
│       └── types.ts
│
├── lib/
│   ├── supabase/
│   │   ├── server.ts               # 서버 전용 클라이언트 (Service Role)
│   │   ├── client.ts               # 클라이언트용 (Anon Key)
│   │   └── admin-auth.ts           # 어드민 세션 헬퍼
│   └── utils.ts                    # cn(), formatDate(), 등
│
├── hooks/                          # 클라이언트 전용 훅
│   ├── useDebounce.ts
│   └── useToast.ts
│
└── types/
    ├── database.ts                 # Supabase DB 스키마 타입 (자동생성 권장)
    └── index.ts                    # 공통 타입 re-export
```

---

## 2. Supabase 클라이언트 설정

### 서버 전용 클라이언트 (`lib/supabase/server.ts`)

```ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// 절대 클라이언트 컴포넌트에서 import 하지 말 것
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!url || !key) {
    throw new Error('Supabase 환경변수가 설정되지 않았습니다.')
  }

  return createClient<Database>(url, key, {
    auth: { persistSession: false },
  })
}
```

### 클라이언트용 (`lib/supabase/client.ts`)

```ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### 환경변수 (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # 클라이언트 노출 허용
SUPABASE_SERVICE_ROLE_KEY=       # 절대 NEXT_PUBLIC_ 접두사 금지
ADMIN_EMAIL_DOMAIN=              # 허용 어드민 이메일 도메인 (예: company.com)
```

---

## 3. 인증 구현

### 전략: Supabase Auth + 이메일 도메인 화이트리스트

- 별도 어드민 계정 테이블을 두지 않고 **Supabase Auth + 역할(role) 검증**으로 처리한다.
- 로그인 후 `profiles` 테이블에서 `role === 'admin'` 여부를 서버에서 확인한다.
- 인증 상태는 Supabase Session(서버사이드 쿠키)으로 유지한다.

### 로그인 흐름

```
1. /login 페이지에서 이메일+비밀번호 입력
2. Server Action → Supabase signInWithPassword 호출
3. 세션 쿠키 저장
4. profiles.role === 'admin' 검증 (Service Role Key 사용)
5. 통과 시 /dashboard 리다이렉트, 실패 시 에러 반환
```

### 미들웨어 보호 (`middleware.ts`)

```ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // (admin) 라우트 그룹 전체를 세션 쿠키로 보호
  // 세션 없으면 /login으로 리다이렉트
}

export const config = {
  matcher: ['/(admin)/:path*'],
}
```

---

## 4. 데이터 패칭 전략

### 선택: **Server Components (기본) + Server Actions (변경)**

어드민 특성상 실시간 동기화보다 **정확성**이 중요하므로, 클라이언트 상태 관리 라이브러리(React Query, SWR)는 **사용하지 않는다**.

| 상황 | 방법 |
|------|------|
| 목록/상세 조회 | Server Component에서 직접 fetch (createServerClient) |
| 폼 제출, 상태 변경 | Server Actions |
| 낙관적 업데이트 불필요 | Server Action 후 `revalidatePath` |
| 실시간 대시보드 | Next.js `revalidate` + 수동 새로고침 버튼 |

### Server Component 패턴

```ts
// app/(admin)/members/page.tsx
import { createServerClient } from '@/lib/supabase/server'

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string }> }) {
  const { page = '1', q = '' } = await searchParams
  const supabase = createServerClient()

  const { data, count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .ilike('nickname', `%${q}%`)
    .range((+page - 1) * 20, +page * 20 - 1)
    .order('created_at', { ascending: false })

  return <MembersTable data={data} total={count} page={+page} />
}
```

### Server Action 패턴

```ts
// features/tickets/actions.ts
'use server'

import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function grantTickets(userId: string, amount: number, reason: string) {
  const supabase = createServerClient()

  // earn-tickets Edge Function 호출
  const { error } = await supabase.functions.invoke('earn-tickets', {
    body: { userId, amount, type: 'admin_grant', reason },
  })

  if (error) throw new Error(error.message)

  revalidatePath('/tickets')
  revalidatePath(`/members/${userId}`)
}
```

---

## 5. 공통 패턴

### 5-1. 테이블 페이지네이션

- URL searchParams 기반 페이지네이션 (`?page=2&q=keyword`).
- 페이지당 기본 20행. 대용량 쿼리는 50행 이하 유지.
- `DataTable` 컴포넌트: `columns`, `data`, `total`, `page`, `pageSize` props.
- Supabase `.range()` + `count: 'exact'` 로 총 개수 함께 조회.

### 5-2. 검색/필터

- 검색 입력은 URL searchParams에 동기화 (Next.js `useRouter` + `useSearchParams`).
- 디바운스: `useDebounce(value, 300)` 훅 사용.
- 복합 필터(날짜 범위, 상태 등)는 URL 쿼리스트링으로 직렬화.

### 5-3. 폼 Validation

- **zod** 스키마를 `features/{feature}/types.ts`에 정의.
- Server Action 내부에서 `schema.safeParse(formData)` 로 재검증.
- 클라이언트에서도 동일 스키마로 즉각 피드백 제공 (react-hook-form 사용 시).

```ts
// features/draws/types.ts
import { z } from 'zod'

export const CreateDrawSchema = z.object({
  roundNumber: z.number().int().positive(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  ticketsPerEntry: z.number().int().min(1),
  maxEntriesPerUser: z.number().int().min(1),
})

export type CreateDrawInput = z.infer<typeof CreateDrawSchema>
```

---

## 6. 에러 처리 전략

### Server Action 에러

```ts
// 성공/실패를 타입으로 명확히 반환
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

export async function someAction(): Promise<ActionResult<void>> {
  try {
    // ...
    return { success: true, data: undefined }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : '알 수 없는 오류' }
  }
}
```

### 페이지 레벨 에러

- `error.tsx` 파일로 라우트 세그먼트별 에러 바운더리 설정.
- 404는 `not-found.tsx` 파일로 처리.

### Supabase 에러 처리

```ts
const { data, error } = await supabase.from('draws').select('*')
if (error) {
  // 운영 에러 로깅 (console.error → 추후 Sentry 연동)
  console.error('[Supabase] draws 조회 실패:', error.message)
  throw new Error('데이터 조회에 실패했습니다.')
}
```

---

## 7. 코딩 컨벤션

### 네이밍

| 대상 | 규칙 | 예시 |
|------|------|------|
| 컴포넌트 | PascalCase | `MembersTable`, `DrawStatusBadge` |
| Server Actions | camelCase, 동사 시작 | `grantTickets`, `updateDrawStatus` |
| Supabase 쿼리 함수 | camelCase, `get`/`fetch` 접두사 | `getMembers`, `fetchDrawById` |
| 훅 | camelCase, `use` 접두사 | `useDebounce`, `useToast` |
| 타입/인터페이스 | PascalCase | `DrawStatus`, `MemberRow` |
| 환경변수 | SCREAMING_SNAKE_CASE | `SUPABASE_SERVICE_ROLE_KEY` |
| 파일명 | kebab-case (컴포넌트 제외) | `admin-auth.ts`, `DataTable.tsx` |

### 파일 구조 원칙

- **Server Components는 async** 함수로 선언, 상단에 `'use server'` 불필요.
- **Client Components**는 파일 상단에 `'use client'` 명시.
- Server Actions 파일은 반드시 `'use server'` 디렉티브.
- 한 파일에 컴포넌트 하나 원칙 (shadcn/ui 내부 파일 제외).

### TypeScript

- `any` 타입 금지. 불가피한 경우 `// eslint-disable-next-line @typescript-eslint/no-explicit-any` + 사유 주석.
- Supabase 타입은 `types/database.ts`에서 중앙 관리. `supabase gen types` CLI로 자동 생성 권장.
- 도메인 타입은 DB 타입을 직접 쓰지 않고 feature별 타입으로 래핑.

```ts
// types/database.ts (자동 생성)
export type Database = { ... }

// features/draws/types.ts (도메인 타입)
import type { Database } from '@/types/database'
export type DrawRow = Database['public']['Tables']['draws']['Row']
export type DrawStatus = 'upcoming' | 'active' | 'closed' | 'drawn' | 'completed'
```

---

## 8. 서버 부하 경고 의무

> **Claude Code 필수 준수 사항**: 아래 패턴이 코드에 포함될 경우, 구현 전후로 반드시 사용자에게 명시적으로 경고해야 한다.

어드민 페이지 작업 중 다음 케이스가 발생하면 **"⚠️ 서버 부하 주의"** 문구와 함께 이유와 대안을 즉시 안내한다.

### 반드시 경고해야 하는 케이스

| 케이스 | 위험 이유 | 권장 대안 |
|--------|-----------|-----------|
| `.select('*')` + `.limit()` 없는 쿼리 | 테이블 전체 행을 메모리로 로드 | `.range()` 페이지네이션 또는 `{ count: 'exact', head: true }` |
| 루프 안에서 Supabase 쿼리 (N+1) | 요청 수 = 행 수, 커넥션 폭증 | `in()` 필터 또는 조인 쿼리로 통합 |
| 인덱스 없는 컬럼으로 필터/정렬 | Full Table Scan → DB CPU 급등 | Supabase 대시보드에서 인덱스 추가 요청 |
| `force-dynamic` + 무거운 집계 쿼리 | 매 요청마다 집계 실행 | `revalidate` 캐시 적용 또는 RPC 위임 |
| `Promise.all`로 5개 이상 동시 쿼리 | DB 커넥션 풀 고갈 가능 | 쿼리 분리 또는 단일 RPC로 통합 |
| 대용량 테이블에 `count: 'exact'` 남발 | PostgreSQL `COUNT(*)` 비용 높음 | 별도 카운터 테이블 또는 RPC 활용 |
| 실시간 구독(`channel`) + 대형 테이블 | 지속 커넥션 + 대량 이벤트 | 필터 조건 필수, 구독 범위 최소화 |
| Server Component에서 직렬 `await` | 총 응답 시간 = 각 쿼리 합산 | `Promise.all` 병렬화 |

### 경고 메시지 형식

코드 작성 또는 리뷰 시 해당 케이스 발견 즉시:

```
⚠️ 서버 부하 주의
이유: [구체적인 문제 설명]
영향: [예상 영향 — "회원 10만 명 기준 응답 5초 이상" 등]
대안: [권장 해결 방법]
```

---

## 9. 성능 고려사항

### 대용량 데이터 처리

- **페이지네이션 필수**: 목록은 항상 서버에서 페이지네이션. `select *` + `.limit()` 없는 쿼리 금지.
- **select 컬럼 명시**: `select('id, nickname, created_at')` — 필요한 컬럼만 조회.
- **인덱스 활용**: `created_at`, `user_id`, `status` 등 자주 필터링하는 컬럼에 Supabase 인덱스 설정 필요.
- **집계 쿼리**: 대시보드 통계는 DB 함수(RPC) 또는 Supabase Edge Function으로 위임.

### Next.js 캐싱

```ts
// 페이지별 캐싱 전략
export const revalidate = 60  // 1분 ISR (대시보드 통계)
export const dynamic = 'force-dynamic'  // 항상 최신 (회원 관리 등)
```

- 목록 페이지: `force-dynamic` (실시간 정확성 필요)
- 대시보드 집계: `revalidate = 300` (5분 캐시)

### 이미지/정적 자산

- 어드민 특성상 이미지 최적화보다 데이터 패칭 최적화 우선.
- 테이블 내 이미지는 lazy loading 적용.

---

## 9. Supabase CLI 개발 규칙

### 접속 정보
- `supabase/.env.staging` — 스테이징 환경
- `supabase/.env.production` — 프로덕션 환경

### 규칙 (Claude Code 포함 개발 중 전체 적용)

| 작업 | 허용 여부 |
|------|-----------|
| `supabase db execute` (SELECT 조회) | 허용 |
| `supabase inspect`, `supabase db diff` 등 읽기 전용 CLI | 허용 |
| INSERT / UPDATE / DELETE / DDL (테이블 생성·변경·삭제) | **반드시 사용자 확인 후 진행** |
| Edge Function 배포 (`supabase functions deploy`) | **반드시 사용자 확인 후 진행** |
| 마이그레이션 적용 (`supabase db push`) | **반드시 사용자 확인 후 진행** |

**데이터 수정/삽입/삭제가 필요한 경우**: 실행 전 쿼리와 예상 영향 범위를 사용자에게 먼저 보여주고 승인을 받을 것.

---

## 10. 보안 체크리스트

### Supabase 키 관리

- [ ] `SUPABASE_SERVICE_ROLE_KEY`는 절대 `NEXT_PUBLIC_` 접두사 사용 금지
- [ ] Service Role Client는 `lib/supabase/server.ts`에서만 생성
- [ ] 클라이언트 컴포넌트에서 `createServerClient()` import 금지
- [ ] `.env.local`은 `.gitignore`에 포함되어 있음을 확인

### 인증/권한

- [ ] 모든 `(admin)` 라우트는 미들웨어로 세션 검증
- [ ] Server Action마다 세션 + 어드민 역할 재검증 (토큰 탈취 대비)
- [ ] `profiles.role` 검증은 Service Role Client로 (RLS 우회 보장)
- [ ] 로그인 실패 횟수 제한 (Supabase Auth 기본 제공)

### 데이터 변경 보호

- [ ] 상태 전환(Draw Status 변경 등) 시 유효한 전환인지 서버에서 검증
- [ ] 티켓 수동 지급은 반드시 `earn-tickets` Edge Function을 통해서만 처리 (DB 직접 쓰기 금지)
- [ ] 파괴적 작업(회원 삭제, 회차 삭제 등)에는 `ConfirmDialog` 필수

### 입력 검증

- [ ] Server Action의 모든 입력은 zod로 검증
- [ ] Supabase 쿼리에 사용자 입력 직접 삽입 금지 (parameterized query 사용)
- [ ] 숫자형 입력(티켓 지급량 등) 상한값 검증

### 기타

- [ ] 어드민 UI의 민감 데이터(전화번호 등)는 마스킹 처리 표시
- [ ] 주요 어드민 액션은 로그 테이블(`admin_audit_logs`)에 기록 권장
- [ ] CSP(Content Security Policy) 헤더 설정 (`next.config.ts`)
