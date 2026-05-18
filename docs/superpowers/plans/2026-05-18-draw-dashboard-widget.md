# Draw 대시보드 위젯 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈 대시보드에 이번 주 추첨 회차(카운트다운)와 이전 회차 당첨번호를 나란히 표시하는 위젯 추가.

**Architecture:** Server RSC가 Supabase에서 current/previous 회차 데이터를 조회하고, 카운트다운만 Client Component(`DrawCountdown`)로 분리해 1초 갱신. 나머지는 전부 Server Component.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS v4, Supabase JS (`@/lib/supabase/server`)

---

## 파일 맵

| 파일 | 역할 | 신규/수정 |
|------|------|----------|
| `src/app/(admin)/dashboard/LottoBall.tsx` | 번호 하나를 색칠된 원으로 렌더 | 신규 |
| `src/app/(admin)/dashboard/DrawCountdown.tsx` | draw_date 받아 남은 시간 1초 갱신 | 신규 |
| `src/app/(admin)/dashboard/CurrentRoundCard.tsx` | 현재 회차 카드 (회차번호 + 예정일 + countdown) | 신규 |
| `src/app/(admin)/dashboard/PreviousRoundCard.tsx` | 이전 회차 카드 (회차번호 + 추첨일 + 번호볼) | 신규 |
| `src/app/(admin)/dashboard/DrawSection.tsx` | Supabase 조회 후 두 카드 배치 | 신규 |
| `src/app/(admin)/dashboard/page.tsx` | DrawSection import 추가 | 수정 |

---

## Task 1: LottoBall 컴포넌트

**Files:**
- Create: `src/app/(admin)/dashboard/LottoBall.tsx`

- [ ] **Step 1: 파일 생성**

```tsx
// src/app/(admin)/dashboard/LottoBall.tsx

function getBallColor(n: number): string {
  if (n <= 9) return '#FBC400'
  if (n <= 19) return '#69C8F2'
  if (n <= 29) return '#FF7272'
  if (n <= 39) return '#AAAAAA'
  return '#B0D840'
}

export default function LottoBall({ number }: { number: number }) {
  const bg = getBallColor(number)
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm"
      style={{ backgroundColor: bg }}
    >
      {number}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript 타입 확인**

```bash
yarn tsc --noEmit 2>&1 | head -20
```

Expected: 에러 없음 (또는 이 파일 관련 에러 없음)

- [ ] **Step 3: 커밋**

```bash
git add src/app/(admin)/dashboard/LottoBall.tsx
git commit -m "feat: LottoBall 컴포넌트 추가"
```

---

## Task 2: DrawCountdown 클라이언트 컴포넌트

**Files:**
- Create: `src/app/(admin)/dashboard/DrawCountdown.tsx`

- [ ] **Step 1: 파일 생성**

```tsx
// src/app/(admin)/dashboard/DrawCountdown.tsx
'use client'

import { useEffect, useState } from 'react'

type TimeLeft = { days: number; hours: number; minutes: number; seconds: number }

function getTimeLeft(drawDate: string): TimeLeft | null {
  const diff = new Date(drawDate).getTime() - Date.now()
  if (diff <= 0) return null
  const total = Math.floor(diff / 1000)
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  }
}

export default function DrawCountdown({ drawDate }: { drawDate: string }) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(() => getTimeLeft(drawDate))

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(getTimeLeft(drawDate)), 1000)
    return () => clearInterval(id)
  }, [drawDate])

  if (!timeLeft) {
    return <p className="text-sm text-muted-foreground">추첨 완료</p>
  }

  const units: { label: string; value: number }[] = [
    { label: '일', value: timeLeft.days },
    { label: '시', value: timeLeft.hours },
    { label: '분', value: timeLeft.minutes },
    { label: '초', value: timeLeft.seconds },
  ]

  return (
    <div className="flex gap-3">
      {units.map(({ label, value }) => (
        <div key={label} className="flex flex-col items-center">
          <span className="text-2xl font-bold text-primary tabular-nums">
            {String(value).padStart(2, '0')}
          </span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript 타입 확인**

```bash
yarn tsc --noEmit 2>&1 | head -20
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/app/(admin)/dashboard/DrawCountdown.tsx
git commit -m "feat: DrawCountdown 클라이언트 컴포넌트 추가"
```

---

## Task 3: CurrentRoundCard 서버 컴포넌트

**Files:**
- Create: `src/app/(admin)/dashboard/CurrentRoundCard.tsx`
- Depends on: Task 2 (`DrawCountdown`)

- [ ] **Step 1: 파일 생성**

```tsx
// src/app/(admin)/dashboard/CurrentRoundCard.tsx
import DrawCountdown from './DrawCountdown'

type Props = {
  roundNumber: number
  drawDate: string  // ISO 8601 UTC string
}

function formatKSTDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export default function CurrentRoundCard({ roundNumber, drawDate }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
      <p className="text-xs font-medium text-muted-foreground">이번 주 추첨</p>
      <div>
        <p className="text-2xl font-bold text-foreground">제{roundNumber}회</p>
        <p className="text-sm text-primary mt-1">{formatKSTDate(drawDate)} 추첨 예정</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-2">남은 시간</p>
        <DrawCountdown drawDate={drawDate} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript 타입 확인**

```bash
yarn tsc --noEmit 2>&1 | head -20
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/app/(admin)/dashboard/CurrentRoundCard.tsx
git commit -m "feat: CurrentRoundCard 서버 컴포넌트 추가"
```

---

## Task 4: PreviousRoundCard 서버 컴포넌트

**Files:**
- Create: `src/app/(admin)/dashboard/PreviousRoundCard.tsx`
- Depends on: Task 1 (`LottoBall`)

- [ ] **Step 1: 파일 생성**

```tsx
// src/app/(admin)/dashboard/PreviousRoundCard.tsx
import LottoBall from './LottoBall'

type Props = {
  roundNumber: number
  drawDate: string
  winningNumbers: number[] | null
  bonusNumber: number | null
}

function formatKSTDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export default function PreviousRoundCard({ roundNumber, drawDate, winningNumbers, bonusNumber }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
      <p className="text-xs font-medium text-muted-foreground">최근 추첨 결과</p>
      <div>
        <p className="text-2xl font-bold text-foreground">제{roundNumber}회</p>
        <p className="text-sm text-muted-foreground mt-1">{formatKSTDate(drawDate)} 추첨</p>
      </div>
      {winningNumbers && winningNumbers.length > 0 ? (
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {winningNumbers.map((n) => (
              <LottoBall key={n} number={n} />
            ))}
            {bonusNumber != null && (
              <>
                <span className="text-muted-foreground font-bold text-lg">+</span>
                <LottoBall number={bonusNumber} />
              </>
            )}
          </div>
          <div className="flex mt-2 text-xs text-muted-foreground">
            <span>당첨번호</span>
            {bonusNumber != null && <span className="ml-auto">보너스번호</span>}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">결과 대기중</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript 타입 확인**

```bash
yarn tsc --noEmit 2>&1 | head -20
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/app/(admin)/dashboard/PreviousRoundCard.tsx
git commit -m "feat: PreviousRoundCard 서버 컴포넌트 추가"
```

---

## Task 5: DrawSection — 데이터 조회 및 레이아웃

**Files:**
- Create: `src/app/(admin)/dashboard/DrawSection.tsx`
- Depends on: Task 3 (`CurrentRoundCard`), Task 4 (`PreviousRoundCard`)

- [ ] **Step 1: 파일 생성**

```tsx
// src/app/(admin)/dashboard/DrawSection.tsx
import { getSupabaseClient } from '@/lib/supabase/server'
import CurrentRoundCard from './CurrentRoundCard'
import PreviousRoundCard from './PreviousRoundCard'

type DrawRow = {
  round_number: number
  draw_date: string
  winning_numbers: number[] | null
  bonus_number: number | null
}

async function getDrawData(): Promise<{ current: DrawRow | null; previous: DrawRow | null }> {
  try {
    const supabase = await getSupabaseClient()
    const [currentResult, previousResult] = await Promise.all([
      supabase
        .from('draws')
        .select('round_number, draw_date, winning_numbers, bonus_number')
        .in('status', ['upcoming', 'active'])
        .order('round_number', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('draws')
        .select('round_number, draw_date, winning_numbers, bonus_number')
        .in('status', ['drawn', 'completed'])
        .order('round_number', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])
    return {
      current: currentResult.data ?? null,
      previous: previousResult.data ?? null,
    }
  } catch {
    return { current: null, previous: null }
  }
}

export default async function DrawSection() {
  const { current, previous } = await getDrawData()

  if (!current && !previous) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {current ? (
        <CurrentRoundCard
          roundNumber={current.round_number}
          drawDate={current.draw_date}
        />
      ) : (
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">진행 중인 회차 없음</p>
        </div>
      )}
      {previous ? (
        <PreviousRoundCard
          roundNumber={previous.round_number}
          drawDate={previous.draw_date}
          winningNumbers={previous.winning_numbers}
          bonusNumber={previous.bonus_number}
        />
      ) : (
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">이전 회차 없음</p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript 타입 확인**

```bash
yarn tsc --noEmit 2>&1 | head -20
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/app/(admin)/dashboard/DrawSection.tsx
git commit -m "feat: DrawSection 데이터 조회 및 레이아웃 추가"
```

---

## Task 6: DashboardPage에 DrawSection 연결

**Files:**
- Modify: `src/app/(admin)/dashboard/page.tsx`
- Depends on: Task 5 (`DrawSection`)

현재 `page.tsx` 내용 (수정 전):
```tsx
import { getSupabaseClient } from '@/lib/supabase/server'
import SignupChart, { type DayData } from './SignupChart'
// ... getDashboardData, buildDailyStats 함수들 ...

export default async function DashboardPage() {
  const { totalUsers, todaySignups, weeklyData, monthlyData } = await getDashboardData()

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-foreground">대시보드</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 전체 회원수, 오늘 가입자 카드 */}
      </div>

      <SignupChart weeklyData={weeklyData} monthlyData={monthlyData} />
    </div>
  )
}
```

- [ ] **Step 1: `DrawSection` import 추가 및 JSX 삽입**

`src/app/(admin)/dashboard/page.tsx` 파일 상단 import에 추가:
```tsx
import DrawSection from './DrawSection'
```

`<SignupChart ... />` 바로 아래에 추가:
```tsx
<DrawSection />
```

최종 return 블록:
```tsx
return (
  <div className="space-y-4">
    <h1 className="text-lg font-semibold text-foreground">대시보드</h1>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-xs font-medium text-muted-foreground mb-2">전체 회원수</p>
        <p className="text-3xl font-bold text-foreground tabular-nums">
          {totalUsers === null ? '—' : totalUsers.toLocaleString('ko-KR')}
        </p>
        <p className="text-xs text-muted-foreground mt-1">명</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-xs font-medium text-muted-foreground mb-2">오늘 가입자</p>
        <p className="text-3xl font-bold text-foreground tabular-nums">
          {todaySignups === null ? '—' : todaySignups.toLocaleString('ko-KR')}
        </p>
        <p className="text-xs text-muted-foreground mt-1">명</p>
      </div>
    </div>

    <SignupChart weeklyData={weeklyData} monthlyData={monthlyData} />

    <DrawSection />
  </div>
)
```

- [ ] **Step 2: TypeScript 타입 확인**

```bash
yarn tsc --noEmit 2>&1 | head -20
```

Expected: 에러 없음

- [ ] **Step 3: 빌드 확인**

```bash
yarn build 2>&1 | tail -20
```

Expected: `✓ Compiled successfully` 또는 `Route (app)` 목록 출력, 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add src/app/(admin)/dashboard/page.tsx
git commit -m "feat: 대시보드에 추첨 회차 위젯 연결"
```
