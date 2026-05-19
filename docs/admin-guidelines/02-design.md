# 디자인 지침 (UI/UX Designer)

## 디자인 원칙

**효율성 우선 (Efficiency First)**
- 한 화면에서 최대한 많은 작업을 완결할 수 있도록 설계. 페이지 이동을 최소화.
- 반복 작업(티켓 지급, 당첨자 처리, 사용자 관리)은 Bulk Action 지원 필수.

**정보 밀도 (Information Density)**
- 어드민은 일반 사용자 앱과 달리 데이터를 압축적으로 표시. 여백은 기능을 방해하지 않는 수준으로 최소화.
- 테이블 행 높이: compact(32px) / default(44px) 두 모드 제공.

**상태 명확성 (State Clarity)**
- 모든 상태(로딩, 에러, 빈 상태, 성공)를 명시적으로 표시. 어드민 조작 실수는 비즈니스 리스크.
- 파괴적 액션(삭제, 취소, 강제 지급)은 반드시 확인 모달 + 이유 입력 요구.

**브랜드와의 분리**
- Lucky Piggy 사용자 앱은 게임적/감성적 UI지만, 어드민은 클린하고 중립적인 비즈니스 툴 톤 유지.
- 브랜드 컬러는 포인트로만 사용.

---

## 레이아웃 구조

```
┌─────────────────────────────────────────┐
│  Header (64px): 로고 | 검색 | 알림 | 유저 │
├──────────┬──────────────────────────────┤
│ Sidebar  │  Content Area                │
│ (240px)  │  ┌──────────────────────┐    │
│          │  │ Page Header (타이틀)  │    │
│ 메뉴 그룹  │  │ Breadcrumb + Actions │    │
│          │  ├──────────────────────┤    │
│          │  │ Main Content         │    │
│          │  │ (테이블/폼/차트)      │    │
│          │  └──────────────────────┘    │
└──────────┴──────────────────────────────┘
```

**사이드바 메뉴 그룹**
- 대시보드
- 사용자 관리 (회원 목록, 신고/제재)
- 미션 관리 (만보기, 광고, 출석, 퀴즈, 룰렛, 사전등록)
- 추첨 관리 (주간 추첨, 당첨자, 상품 설정)
- 게임 관리 (보물캐기, 은돼지, 럭키포켓)
- 티켓 관리 (발행 내역, 수동 지급)
- 콘텐츠 관리 (배너, 공지)
- 설정 (권한, 시스템)

---

## Lucky Piggy 디자인 시스템 토큰

앱 레포의 `ui_kit` 디자인 시스템을 어드민에 동기화하여 적용한다. 모든 토큰은 `src/app/globals.css`에 정의되어 있다.

### 색상 팔레트

**브랜드**
| 토큰 | 값 | 용도 |
|------|-----|------|
| `--primary` | `#FFDD13` (골든 옐로우) | CTA 버튼, 활성 메뉴 배경 |
| `--primary-foreground` | `#1A1A1A` | primary 위 텍스트 |

**Neutral Scale**
| 토큰 | 값 |
|------|----|
| `--neutral-50` | `#FAFAFA` |
| `--neutral-100` | `#F5F5F5` |
| `--neutral-200` | `#E0E0E0` |
| `--neutral-300` | `#CCCCCC` |
| `--neutral-400` | `#AAAAAA` |
| `--neutral-500` | `#888888` |
| `--neutral-600` | `#5C5C5C` |
| `--neutral-700` | `#3D3D3D` |
| `--neutral-800` | `#2A2A2A` |
| `--neutral-900` | `#1A1A1A` |

**Accent Blue** (정보 카드, 링크, 강조 텍스트)
| 토큰 | 값 | 용도 |
|------|-----|------|
| `--accent-blue` | `#1A4FD8` | 텍스트, 아이콘 |
| `--accent-blue-surface` | `#EEF2FF` | 배경 카드 |

**Status Surfaces**
| 토큰 | 값 | 용도 |
|------|-----|------|
| `--success-surface` | `#DCFCE7` | 성공/완료 배경 |
| `--error-surface` | `#FEE2E2` | 에러/위험 배경 |
| `--warning-surface` | `#FEF3C7` | 경고 배경 |
| `--info` | `#3B82F6` | 정보 아이콘/텍스트 |
| `--info-surface` | `#DBEAFE` | 정보 배경 |

**Lottery Ball Colors** (LottoBall 컴포넌트 전용)
| 토큰 | 값 | 번호 범위 |
|------|-----|----------|
| `--lottery-yellow` | `#FBC400` | 1–10 |
| `--lottery-blue` | `#69C8F2` | 11–20 |
| `--lottery-red` | `#FF7272` | 21–30 |
| `--lottery-gray` | `#AAAAAA` | 31–40 |
| `--lottery-green` | `#B0D840` | 41–45 |
| (보너스볼) | `#FE6A86` | 보너스 |

---

## 컬러 / 타이포 가이드

**기반: shadcn/ui CSS Variables + Lucky Piggy 디자인 시스템**

| 역할 | 토큰 | 용도 |
|------|------|------|
| 브랜드 Primary | `--primary` `#FFDD13` | CTA 버튼, 활성 메뉴 |
| Accent Blue | `--accent-blue` `#1A4FD8` | 정보 카드 레이블, 강조 링크 |
| 성공 | `--success-surface` | 당첨, 완료 상태 배경 |
| 경고 | `--warning-surface` | 주의 상태 배경 |
| 위험 | `--destructive` / `--error-surface` | 삭제, 정지, 에러 |

**타이포그래피 (한국어 지원)**
- Font: `Pretendard` (fallback: `system-ui`)
- 모든 heading(`h1`–`h6`): `font-semibold tracking-tight`
- 모든 body text(`p`, `span`, `label`, `td`, `th`): `tracking-tight`
- Page Title: 18px / `font-semibold` / `text-foreground`
- Section Title: 14px / `font-semibold`
- Table Header: 12px / `font-medium` / `text-muted-foreground`
- Body: 14px / normal
- Caption / 보조 정보: 12px / `text-muted-foreground`
- 숫자 (금액, 카운트): `tabular-nums tracking-tight`

### Border Radius 스케일

앱 디자인 시스템 기준으로 고정. Tailwind `rounded-*` 유틸리티와 1:1 매핑된다.

| 토큰 | 값 | Tailwind | 용도 |
|------|----|----------|------|
| `--radius-sm` | `4px` | `rounded-sm` | 태그, 뱃지 |
| `--radius-md` / `--radius` | `8px` | `rounded-md` | 버튼, 입력, 카드 |
| `--radius-lg` | `16px` | `rounded-lg` | 모달, 패널 |
| `--radius-xl` | `24px` | `rounded-xl` | 요약 카드 |
| `--radius-2xl` | `32px` | `rounded-2xl` | 대형 카드 |
| `--radius-3xl` | `50px` | `rounded-3xl` | 복권 번호 볼 |
| `--radius-4xl` | `100px` | `rounded-4xl` | 로또볼(앱 전용) |

> 버튼·입력은 `rounded-md`, 요약/정보 카드는 `rounded-xl` 사용 권장.

---

## 공통 컴포넌트 목록

**데이터 표시**
- `DataTable` — 정렬/필터/페이지네이션/선택/벌크액션 내장, shadcn Table 기반
- `KPICard` — 수치 + 증감률 + 스파크라인 (대시보드용)
- `StatusBadge` — 상태별 색상 토큰 매핑 (활성/정지/대기/완료/실패)
- `EmptyState` — 아이콘 + 메시지 + CTA

**입력 / 폼**
- `SearchBar` — 디바운스 300ms, 초기화 버튼 포함
- `FilterBar` — 날짜 범위 피커 + 다중 셀렉트 + 초기화. 활성 필터 수 뱃지 표시
- `FormModal` — shadcn Dialog 기반, 필드 유효성 + 제출 로딩 상태
- `ConfirmDialog` — 파괴적 액션용. 액션명 타이핑 확인 옵션
- `DateRangePicker` — 단축키(오늘/이번주/이번달) 제공

**피드백**
- `Toast` — 성공/에러/정보 (shadcn Sonner)
- `InlineAlert` — 폼 내 경고 메시지
- `LoadingSkeleton` — 테이블/카드 로딩 상태

---

## 데이터 시각화 가이드

**라이브러리**: `recharts` (shadcn Charts와 통합)

| 데이터 성격 | 차트 타입 |
|-------------|-----------|
| 시간별 추이 (DAU, 티켓 발행) | Line Chart |
| 카테고리 비교 (미션별 완료 수) | Bar Chart |
| 비율/구성 (당첨 타입 분포) | Pie / Donut |
| 누적 추이 | Area Chart (stacked) |

**KPI 카드 구조**
```
┌─────────────────────────────┐
│ 라벨 (12px muted)           │
│ 수치 (32px bold)            │
│ ▲ +12.3% vs 지난주 (12px)  │
│ ▓▓▓▓▓░░  스파크라인         │
└─────────────────────────────┘
```

---

## 반응형 전략

**기본 타겟: 데스크탑 (1280px+)**

| 브레이크포인트 | 동작 |
|--------------|------|
| `>= 1280px` | 사이드바 고정 (240px) + 풀 레이아웃 |
| `1024–1279px` | 사이드바 좁힘 (64px, 아이콘만) |
| `768–1023px` | 사이드바 오버레이 드로어로 전환 |
| `< 768px` | 테이블 수평 스크롤, 핵심 컬럼만 표시, 복잡한 필터 숨김 |

---

## 디자인 검수 체크리스트

### 레이아웃
- [ ] 사이드바 활성 메뉴가 현재 페이지와 일치하는가
- [ ] Breadcrumb이 실제 페이지 계층을 반영하는가
- [ ] 페이지 타이틀과 CTA 버튼이 Page Header에 배치되었는가

### 데이터 테이블
- [ ] 빈 상태(Empty State) UI가 존재하는가
- [ ] 로딩 중 Skeleton이 표시되는가
- [ ] 페이지네이션이 총 건수와 현재 범위를 표시하는가 (예: "1-20 / 총 342건")
- [ ] 행 선택 시 벌크 액션 바가 나타나는가

### 폼 & 입력
- [ ] 필수 필드에 `*` 표시가 있는가
- [ ] 유효성 에러 메시지가 필드 바로 아래 인라인으로 표시되는가
- [ ] 제출 중 버튼이 로딩 스피너로 전환되고 비활성화되는가
- [ ] 파괴적 액션은 반드시 ConfirmDialog를 거치는가

### 접근성
- [ ] 컬러만으로 상태를 구분하지 않는가 (아이콘/텍스트 병행)
- [ ] 포커스 링이 모든 인터랙티브 요소에 표시되는가

### 브랜드 & 톤
- [ ] Primary 골든 옐로우(`#FFDD13`)가 포인트 용도로만 사용되었는가 (배경 도배 금지)
- [ ] 정보 카드에 `accent-blue` / `accent-blue-surface` 토큰이 사용되었는가
- [ ] 숫자·금액 표시에 `tabular-nums tracking-tight` 클래스가 적용되었는가
- [ ] 한국어 텍스트에 Pretendard 폰트가 적용되었는가
- [ ] 어드민 전체 톤이 비즈니스 툴 톤을 유지하는가
- [ ] 버튼·입력에 `rounded-md`, 요약 카드에 `rounded-xl`이 사용되었는가
