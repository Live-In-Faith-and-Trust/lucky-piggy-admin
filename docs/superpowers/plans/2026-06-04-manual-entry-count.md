# Manual Entry Count Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 수동 당첨자에게 응모 횟수를 입력·표시하고, 어드민 당첨자 목록에서 자동·수동 모두 응모 횟수를 확인할 수 있게 한다.

**Architecture:** `draw_winners` 테이블에 `manual_entry_count` 컬럼 추가 → 어드민에서 AddWinnerDialog(필수 입력)·인라인 편집 지원 → 앱 RPC에서 source='manual'이면 `manual_entry_count`를 `entry_count`로 반환.

**Tech Stack:** PostgreSQL (Supabase), Next.js 15 App Router (Server Actions), Flutter (Riverpod), TypeScript

---

## 파일 맵

| 파일 | 역할 |
|------|------|
| `supabase/migrations/20260604000001_draw_winners_manual_entry_count.sql` (어드민 repo) | DDL: 컬럼 추가 |
| `lucky-piggy/supabase/migrations/20260604000001_draw_winners_manual_entry_count.sql` (앱 repo) | DDL + RPC 수정 (동일 SQL) |
| `src/lib/supabase/draws.ts` | DrawWinner 인터페이스, addManualWinner, updateManualEntryCount, getWinners1to3 |
| `src/app/(admin)/draws/actions.ts` | addManualWinnerAction, updateManualEntryCountAction |
| `src/app/(admin)/draws/_components/AddWinnerDialog.tsx` | 응모 횟수 필수 입력 필드 추가 |
| `src/app/(admin)/draws/_components/ManualEntryCountInput.tsx` | 신규: 인라인 편집 컴포넌트 |
| `src/app/(admin)/draws/WinnerList.tsx` | 응모수 컬럼 추가 |

---

## Task 1: DB Migration — manual_entry_count 컬럼 추가 + RPC 수정

**⚠️ 사용자에게 SQL을 먼저 보여주고 승인받은 후 실행한다.**

**Files:**
- Create: `lucky-piggy/supabase/migrations/20260604000001_draw_winners_manual_entry_count.sql`

- [ ] **Step 1: Migration SQL 작성**

```sql
-- draw_winners에 수동 당첨자용 응모 횟수 컬럼 추가
alter table public.draw_winners
  add column if not exists manual_entry_count integer;

-- get_draw_winners_list RPC 수정: source='manual'이면 manual_entry_count 우선
create or replace function public.get_draw_winners_list(p_draw_id uuid)
returns setof jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select jsonb_build_object(
    'prize_rank',        dw.prize_rank,
    'display_name',      case
                           when dw.real_name is not null
                             then _anonymize_name(dw.real_name)
                           when dw.real_name is null and dw.manual_referral_code is not null
                             then _anonymize_name(dw.manual_referral_code)
                           else _anonymize_name(p.referral_code)
                         end,
    'per_winner_amount', case
                           when dp.amount is not null and rc.cnt > 0
                             then (dp.amount / rc.cnt)::bigint
                           else null
                         end,
    'entry_count',       case
                           when dw.source = 'manual' then dw.manual_entry_count
                           else ec.cnt::integer
                         end
  )
  from draw_winners dw
  left join profiles p on p.id = dw.user_id
  left join draw_prizes dp on dp.draw_id = dw.draw_id and dp.prize_rank = dw.prize_rank
  left join lateral (
    select count(*) as cnt
    from draw_winners dw2
    where dw2.draw_id = p_draw_id
      and dw2.prize_rank = dw.prize_rank
  ) rc on true
  left join lateral (
    select count(*) as cnt
    from draw_entries de
    where de.draw_id = p_draw_id
      and de.user_id = dw.user_id
  ) ec on true
  where dw.draw_id = p_draw_id
  order by dw.prize_rank asc, dw.created_at asc;
end;
$$;

revoke execute on function public.get_draw_winners_list(uuid) from public;
revoke execute on function public.get_draw_winners_list(uuid) from anon;
revoke execute on function public.get_draw_winners_list(uuid) from authenticated;
grant execute on function public.get_draw_winners_list(uuid) to anon;
grant execute on function public.get_draw_winners_list(uuid) to authenticated;
```

- [ ] **Step 2: 사용자에게 위 SQL 보여주고 승인 확인**

승인 전에는 어떤 DB 변경도 실행하지 않는다.

- [ ] **Step 3: 로컬 DB에 migration 적용**

```bash
# Supabase REST API로 직접 실행 (로컬)
curl -s -X POST "http://127.0.0.1:54421/rest/v1/rpc/query" ... # 불가
# 대신: psql 또는 Supabase Studio에서 실행 안내
```

로컬 Supabase Studio (http://127.0.0.1:54423) → SQL Editor에서 Step 1 SQL 실행을 사용자에게 안내한다.

- [ ] **Step 4: 적용 확인**

```bash
curl -s "http://127.0.0.1:54421/rest/v1/draw_winners?select=manual_entry_count&limit=1" \
  -H "apikey: <LOCAL_SUPABASE_SERVICE_KEY>" \
  -H "Authorization: Bearer <LOCAL_SUPABASE_SERVICE_KEY>"
```

`manual_entry_count` 필드가 응답에 포함되면 성공.

---

## Task 2: draws.ts — 인터페이스·함수 확장

**Files:**
- Modify: `src/lib/supabase/draws.ts`

- [ ] **Step 1: DrawWinner 인터페이스에 manual_entry_count 추가**

`DrawWinner` 인터페이스(22번째 줄 근처)에 다음을 추가:

```typescript
export interface DrawWinner {
  // ... 기존 필드 ...
  manual_entry_count: number | null   // ← 추가 (source='manual'일 때만 사용)
  // ...
}
```

- [ ] **Step 2: getWinners1to3에 자동 당첨자 응모 횟수 집계 추가**

현재 `getWinners1to3` 함수(132~147번째 줄)를 아래와 같이 교체:

```typescript
export const getWinners1to3 = unstable_cache(
  async (env: AdminEnv, drawId: string): Promise<DrawWinner[]> => {
    const supabase = createServerClient(env)
    const { data, error } = await supabase
      .from('draw_winners')
      .select('*, profiles(nickname, referral_code)')
      .eq('draw_id', drawId)
      .in('prize_rank', [1, 2, 3])
      .order('prize_rank', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) throw error

    const winners = (data ?? []) as DrawWinner[]

    // 자동 당첨자의 응모 횟수: draw_entries에서 user_id별 count 집계
    const autoUserIds = winners
      .filter((w) => w.source === 'auto' && w.user_id)
      .map((w) => w.user_id as string)

    let entryCountByUserId: Record<string, number> = {}
    if (autoUserIds.length > 0) {
      const { data: entries } = await supabase
        .from('draw_entries')
        .select('user_id')
        .eq('draw_id', drawId)
        .in('user_id', autoUserIds)
      for (const e of entries ?? []) {
        if (e.user_id) {
          entryCountByUserId[e.user_id] = (entryCountByUserId[e.user_id] ?? 0) + 1
        }
      }
    }

    return winners.map((w) => ({
      ...w,
      // auto_entry_count를 manual_entry_count 슬롯에 넣지 않고 별도 필드로 관리하기 위해
      // WinnerList에서 source 분기로 표시
      _auto_entry_count: w.source === 'auto' && w.user_id
        ? (entryCountByUserId[w.user_id] ?? 0)
        : null,
    })) as DrawWinner[]
  },
  ['draw-winners-1to3'],
  { revalidate: 300, tags: ['draw-winners'] }
)
```

> **Note:** `_auto_entry_count`는 DrawWinner 인터페이스에 임시 필드로 추가. WinnerList가 이를 읽어서 auto winner에 표시.

DrawWinner 인터페이스에 `_auto_entry_count?: number | null` 추가.

- [ ] **Step 3: addManualWinner payload에 manual_entry_count 추가**

`addManualWinner` 함수 (171번째 줄 근처) payload 타입과 insert에 추가:

```typescript
export async function addManualWinner(
  env: AdminEnv,
  payload: {
    draw_id: string
    user_id?: string
    prize_rank: number
    real_name?: string
    bank_name?: string
    account_number?: string
    account_holder?: string
    winner_comment?: string
    admin_memo?: string
    manual_entry_count: number   // ← 필수
  }
): Promise<void> {
  // ... 기존 draw_prizes upsert 로직 ...

  const manual_referral_code = await generateUniqueReferralCode(supabase)

  const { error } = await supabase.from('draw_winners').insert({
    ...payload,
    source: 'manual' as WinnerSource,
    payment_status: 'pending' as PaymentStatus,
    manual_referral_code,
  })
  if (error) throw error
}
```

- [ ] **Step 4: updateManualEntryCount 함수 추가**

`saveAdminMemo` 함수 뒤에 추가:

```typescript
export async function updateManualEntryCount(
  env: AdminEnv,
  winnerId: string,
  count: number,
): Promise<void> {
  const supabase = createServerClient(env)
  const { error } = await supabase
    .from('draw_winners')
    .update({ manual_entry_count: count })
    .eq('id', winnerId)
  if (error) throw error
}
```

- [ ] **Step 5: 타입 체크**

```bash
cd /Users/naklee/repo/lift/lucky-piggy-admin && yarn tsc --noEmit
```

에러 없어야 함.

---

## Task 3: actions.ts — updateManualEntryCountAction 추가

**Files:**
- Modify: `src/app/(admin)/draws/actions.ts`

- [ ] **Step 1: import에 updateManualEntryCount 추가**

파일 상단 import 블록에 `updateManualEntryCount` 추가:

```typescript
import {
  // ... 기존 imports ...
  updateManualEntryCount,
  type PaymentStatus,
} from '@/lib/supabase/draws'
```

- [ ] **Step 2: addManualWinnerAction payload 타입에 manual_entry_count 추가**

```typescript
export async function addManualWinnerAction(payload: {
  draw_id: string
  user_id?: string
  prize_rank: number
  real_name?: string
  bank_name?: string
  account_number?: string
  account_holder?: string
  winner_comment?: string
  admin_memo?: string
  manual_entry_count: number   // ← 추가 (필수)
}): Promise<{ error?: string }> {
  // 기존 로직 그대로
}
```

- [ ] **Step 3: updateManualEntryCountAction 추가**

파일 끝에 추가:

```typescript
export async function updateManualEntryCountAction(
  winnerId: string,
  count: number,
): Promise<{ error?: string }> {
  const env = await getAdminEnv()
  try {
    await updateManualEntryCount(env, winnerId, count)
    revalidatePath('/draws')
    return {}
  } catch (e) {
    return { error: extractError(e) }
  }
}
```

- [ ] **Step 4: 타입 체크**

```bash
yarn tsc --noEmit
```

---

## Task 4: ManualEntryCountInput.tsx — 신규 인라인 편집 컴포넌트

**Files:**
- Create: `src/app/(admin)/draws/_components/ManualEntryCountInput.tsx`

- [ ] **Step 1: 컴포넌트 작성**

`AdminMemoInput.tsx`와 동일한 blur-on-save 패턴:

```typescript
'use client'

import { useEffect, useRef, useState } from 'react'
import { updateManualEntryCountAction } from '@/app/(admin)/draws/actions'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface Props {
  winnerId: string
  count: number | null
}

export default function ManualEntryCountInput({ winnerId, count }: Props) {
  const [value, setValue] = useState(count?.toString() ?? '')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  const handleBlur = async () => {
    const num = parseInt(value, 10)
    if (!value || isNaN(num) || num < 1) {
      setValue(count?.toString() ?? '')
      return
    }
    if (num === count) return
    setSaveStatus('saving')
    const result = await updateManualEntryCountAction(winnerId, num)
    if (result?.error) {
      setSaveStatus('error')
      setValue(count?.toString() ?? '')
    } else {
      setSaveStatus('saved')
    }
    timerRef.current = setTimeout(() => setSaveStatus('idle'), 1500)
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        min={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        placeholder="0"
        className="text-xs w-14 border-0 border-b border-transparent hover:border-border focus:border-border focus:outline-none bg-transparent py-0.5 px-1 tabular-nums"
      />
      <span className="text-xs text-muted-foreground">장</span>
      {saveStatus === 'saving' && (
        <span className="text-xs text-muted-foreground whitespace-nowrap">저장 중</span>
      )}
      {saveStatus === 'saved' && (
        <span className="text-xs text-emerald-600 whitespace-nowrap">저장됨</span>
      )}
      {saveStatus === 'error' && (
        <span className="text-xs text-red-500 whitespace-nowrap">실패</span>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 타입 체크**

```bash
yarn tsc --noEmit
```

---

## Task 5: AddWinnerDialog.tsx — 응모 횟수 필수 입력 추가

**Files:**
- Modify: `src/app/(admin)/draws/_components/AddWinnerDialog.tsx`

- [ ] **Step 1: entryCount state 추가**

`useState` 선언 목록에 추가:

```typescript
const [entryCount, setEntryCount] = useState('')
```

`handleClose` 리셋 목록에 추가:

```typescript
setEntryCount('')
```

- [ ] **Step 2: 유효성 검사 추가**

`handleSubmit` 안, `startTransition` 호출 전에:

```typescript
const entryCountNum = parseInt(entryCount, 10)
if (!entryCount || isNaN(entryCountNum) || entryCountNum < 1) {
  setError('응모 횟수를 1 이상 입력하세요.')
  return
}
```

- [ ] **Step 3: addManualWinnerAction 호출에 manual_entry_count 추가**

```typescript
const result = await addManualWinnerAction({
  draw_id: drawId,
  user_id: userId || undefined,
  prize_rank: Number(prizeRank),
  real_name: realName || undefined,
  bank_name: selectedBank?.name || undefined,
  account_number: accountNumber || undefined,
  account_holder: accountHolder || undefined,
  admin_memo: adminMemo || undefined,
  manual_entry_count: entryCountNum,   // ← 추가
})
```

- [ ] **Step 4: 폼에 응모 횟수 입력 필드 추가**

"등수" 필드 바로 다음(구분선 전)에 추가:

```tsx
{/* 응모 횟수 */}
<div className="space-y-1">
  <label htmlFor="aw-entry-count" className={labelClass}>
    응모 횟수 <span className="text-red-500">*</span>
  </label>
  <input
    id="aw-entry-count"
    type="number"
    min={1}
    required
    value={entryCount}
    onChange={(e) => setEntryCount(e.target.value)}
    placeholder="예: 15"
    className={inputClass}
  />
</div>
```

- [ ] **Step 5: router.refresh() → revalidatePath 이미 actions에서 처리하므로 router.refresh() 제거**

현재 `handleSubmit`에 `router.refresh()`가 있다. actions.ts에서 이미 `revalidatePath('/draws')`를 호출하므로 제거:

```typescript
// 변경 전
if (result.error) {
  setError(result.error)
} else {
  handleClose()
  router.refresh()   // ← 제거
}

// 변경 후
if (result.error) {
  setError(result.error)
} else {
  handleClose()
}
```

`useRouter` import도 제거.

- [ ] **Step 6: 타입 체크**

```bash
yarn tsc --noEmit
```

---

## Task 6: WinnerList.tsx — 응모수 컬럼 추가

**Files:**
- Modify: `src/app/(admin)/draws/WinnerList.tsx`

- [ ] **Step 1: ManualEntryCountInput import 추가**

```typescript
import ManualEntryCountInput from './_components/ManualEntryCountInput'
```

- [ ] **Step 2: 테이블 헤더에 응모수 컬럼 추가**

"1인당 상금" 헤더 다음에 추가:

```tsx
<th className="text-left px-3 py-2.5 text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">응모수</th>
```

- [ ] **Step 3: 테이블 바디에 응모수 셀 추가**

"1인당 상금" 셀(`amount` 표시) 다음에 추가:

```tsx
<td className="px-3 py-2.5">
  {winner.source === 'manual' ? (
    <ManualEntryCountInput
      winnerId={winner.id}
      count={winner.manual_entry_count}
    />
  ) : (
    <span className="text-xs tabular-nums text-foreground">
      {winner._auto_entry_count != null && winner._auto_entry_count > 0
        ? `${winner._auto_entry_count}장`
        : '—'}
    </span>
  )}
</td>
```

- [ ] **Step 4: 타입 체크**

```bash
yarn tsc --noEmit
```

- [ ] **Step 5: 커밋**

```bash
cd /Users/naklee/repo/lift/lucky-piggy-admin
git add src/lib/supabase/draws.ts \
        src/app/\(admin\)/draws/actions.ts \
        src/app/\(admin\)/draws/_components/AddWinnerDialog.tsx \
        src/app/\(admin\)/draws/_components/ManualEntryCountInput.tsx \
        src/app/\(admin\)/draws/WinnerList.tsx
git commit -m "feat: 수동 당첨자 응모 횟수 입력·표시 (어드민)"
```

---

## Task 7: Flutter Repo — Migration 파일 추가

**Files:**
- Create: `lucky-piggy/supabase/migrations/20260604000001_draw_winners_manual_entry_count.sql`

- [ ] **Step 1: Migration 파일 생성**

Task 1 Step 1의 SQL을 그대로 저장:

```bash
cp /Users/naklee/repo/lift/lucky-piggy-admin/supabase/migrations/20260604000001_draw_winners_manual_entry_count.sql \
   /Users/naklee/repo/lift/lucky-piggy/supabase/migrations/20260604000001_draw_winners_manual_entry_count.sql
```

또는 동일 내용으로 직접 작성.

- [ ] **Step 2: Flutter 앱 코드 변경 없음 확인**

`draw_winner_screen.dart`에서 `entry_count`를 그대로 사용하므로 Flutter 코드 변경 불필요. RPC가 manual winner에게도 `entry_count`를 올바르게 반환하므로 자동 처리됨.

- [ ] **Step 3: 커밋**

```bash
cd /Users/naklee/repo/lift/lucky-piggy
git add supabase/migrations/20260604000001_draw_winners_manual_entry_count.sql
git commit -m "feat: draw_winners.manual_entry_count 컬럼 추가 + RPC 수정"
```

---

## Self-Review

**Spec coverage 확인:**
- ✅ DB `manual_entry_count` 컬럼 추가 → Task 1
- ✅ RPC source='manual' 분기 → Task 1 Step 1
- ✅ AddWinnerDialog 필수 입력 → Task 5
- ✅ WinnerList 자동 당첨자 응모수 표시 → Task 2 Step 2 + Task 6
- ✅ WinnerList 수동 당첨자 인라인 편집 → Task 4 + Task 6
- ✅ updateManualEntryCountAction → Task 3 Step 3
- ✅ Flutter RPC 수정 → Task 1 (SQL) + Task 7
- ✅ Flutter 코드 변경 없음 확인 → Task 7 Step 2

**Placeholder 없음 확인:** 모든 step에 실제 코드 포함.

**타입 일관성:**
- `manual_entry_count: number | null` — DrawWinner 인터페이스, addManualWinner payload(필수), updateManualEntryCount 파라미터 모두 일치
- `_auto_entry_count?: number | null` — getWinners1to3 반환값과 WinnerList 읽기 일치
- `updateManualEntryCountAction(winnerId: string, count: number)` — actions.ts 정의와 ManualEntryCountInput 호출 일치
