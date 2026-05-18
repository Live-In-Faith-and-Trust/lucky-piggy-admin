# Draw 대시보드 위젯 설계

**날짜:** 2026-05-18  
**상태:** 승인됨

## 개요

홈 대시보드에 이번 주 추첨 회차 정보와 이전 회차 당첨 결과를 나란히 표시하는 위젯.

## 데이터 소스

Supabase `draws` 테이블 (staging: `amajodnsxkarvmggdoxq.supabase.co`)

**현재 회차 쿼리:**
```sql
SELECT round_number, draw_date, status
FROM draws
WHERE status IN ('upcoming', 'active')
ORDER BY round_number DESC
LIMIT 1
```

**이전 회차 쿼리:**
```sql
SELECT round_number, draw_date, winning_numbers, bonus_number
FROM draws
WHERE status IN ('drawn', 'completed')
ORDER BY round_number DESC
LIMIT 1
```

## 컴포넌트 구조

```
DashboardPage (Server RSC)
  └─ DrawSection (Server RSC) — DB 조회, props 전달
       ├─ CurrentRoundCard (Server RSC)
       │    └─ DrawCountdown (Client Component) — draw_date 받아 1초 갱신
       └─ PreviousRoundCard (Server RSC)
            └─ LottoBall (Server RSC) — 번호별 색상 렌더
```

## UI 상세

### 현재 회차 카드 (왼쪽)
- 제N회
- 추첨 예정일: `YYYY-MM-DD HH:mm` (KST, UTC+9)
- 카운트다운: `DD일 HH시 MM분 SS초` (1초마다 갱신)
- 데이터 없으면 "진행 중인 회차 없음" 표시

### 이전 회차 카드 (오른쪽)
- 최근 추첨 결과
- 제N회 / 추첨일 (KST)
- 당첨번호 볼 6개 + `+` + 보너스볼 1개
- `winning_numbers = null`이면 "결과 대기중" 안내

### 번호 볼 색상 (한국 로또 표준)
| 범위 | 색상 |
|------|------|
| 1–9   | `#FBC400` (황금) |
| 10–19 | `#69C8F2` (파랑) |
| 20–29 | `#FF7272` (빨강) |
| 30–39 | `#AAAAAA` (회색) |
| 40–45 | `#B0D840` (초록) |

## 레이아웃

기존 대시보드 구조 아래에 추가:
```
[전체 회원수] [오늘 가입자]   ← 기존
[SignupChart]                 ← 기존
[현재 회차 카드] [이전 회차 카드]  ← 신규
```

- 모바일: `grid-cols-1` (세로 스택)
- 태블릿↑: `grid-cols-2`

## 파일 위치

```
src/app/(admin)/dashboard/
  ├─ page.tsx                  (기존, DrawSection import 추가)
  ├─ SignupChart.tsx            (기존)
  ├─ DrawSection.tsx            (신규 — server, DB 조회)
  ├─ CurrentRoundCard.tsx       (신규 — server)
  ├─ DrawCountdown.tsx          (신규 — client, 'use client')
  ├─ PreviousRoundCard.tsx      (신규 — server)
  └─ LottoBall.tsx              (신규 — server)
```

## 타임존

모든 날짜/시간 표시는 KST (UTC+9). 서버사이드에서 `Intl.DateTimeFormat` 또는 수동 오프셋(+9h) 적용.

## 에러 처리

- Supabase 조회 실패 시 각 카드에 빈 상태(`—`) 표시, 전체 페이지 크래시 없음
- `winning_numbers` 배열 길이가 6 미만이면 있는 번호만 렌더

## 범위 제외

- 1등 당첨금 미표시
- 실시간 상태 폴링 (새로고침 시 반영)
- 회차 클릭 → 상세 페이지 이동 (추후)
