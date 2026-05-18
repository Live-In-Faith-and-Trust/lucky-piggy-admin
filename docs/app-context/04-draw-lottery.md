# 주간 추첨 (Draw) 시스템

## 개요

매주 진행되는 로또 스타일 추첨. 사용자가 티켓으로 번호를 선택해 응모하고, 당첨 시 상품을 받는다.

## Draw 모델

```dart
class Draw {
  String id;
  int roundNumber;          // 회차 번호
  DrawStatus status;        // upcoming / active / closed / drawn / completed
  DateTime startDate;
  DateTime endDate;
  DateTime drawDate;        // 추첨 실행 날짜
  int ticketsPerEntry;      // 응모 1회당 필요 티켓 수
  int maxEntriesPerUser;    // 유저당 최대 응모 횟수
  List<int>? winningNumbers; // 당첨 번호 (1~45)
  int? bonusNumber;          // 보너스 번호
  List<DrawPrize> prizes;
}

enum DrawStatus {
  upcoming,   // 아직 시작 전
  active,     // 응모 가능 기간
  closed,     // 응모 마감 (추첨 대기)
  drawn,      // 추첨 완료 (결과 공개 중)
  completed,  // 완전 종료
}
```

## DrawEntry 모델

```dart
class DrawEntry {
  String userId;
  String drawId;
  List<int> lotteryNumbers; // 유저가 선택한 번호 (1~45 중 N개)
  DrawEntryStatus status;    // pending / won / lost
}
```

## DrawPrize 모델

```dart
class DrawPrize {
  PrizeType type;   // giftCard / cash / product / point
  int winnerCount;
  // 상품 상세 (금액, 상품명 등)
}

enum PrizeType {
  giftCard,   // 상품권
  cash,       // 현금
  product,    // 물건
  point,      // 포인트
}
```

## 추첨 흐름

```
upcoming → active (응모 시작)
         → closed (응모 마감)
         → drawn (당첨번호 공개)
         → completed (배송/지급 완료)
```

## Supabase 테이블

- `draws`: 추첨 회차 정보
- `draw_entries`: 유저별 응모 내역 — `status`: pending / won / lost
- `draw_prizes`: 회차별 상품 정의
  - `prize_rank` INTEGER: 등수 (1=1등, 2=2등 …)
  - `amount` BIGINT: 해당 등수 총 상금 풀 (원). null = 현금 아닌 현물 상품
  - 1인당 당첨금 = `amount` ÷ 실제 `draw_winners` 당첨자 수 (쿼리 시점 계산)
- `draw_winners`: 회차별 당첨자 (자동 등록 + 어드민 수동 등록 통합 테이블)
  - `source` TEXT: `'auto'` (judge_draw_winners RPC 자동) / `'manual'` (어드민 직접 입력)
  - `prize_rank` INTEGER (1–5): 등수
  - `match_count` INTEGER: 일치 번호 수 (auto 시 세팅, manual 시 null)
  - `prize_id` UUID: draw_prizes FK (등수별 당첨금 조회용)
  - `real_name` TEXT: 실명
  - `bank_name` / `account_number` / `account_holder`: 계좌 정보 (plain text, RLS로 service_role만 접근)
  - `account_verified` BOOLEAN: 어드민 계좌 사실확인 여부
  - `winner_comment` TEXT: 당첨 소감 (최대 50자, 앱에서 입력)
  - `payment_status` TEXT: `'pending'` / `'paid'` / `'cancelled'`
  - unique 제약: `(draw_id, user_id)` — 한 회차에 유저당 1개 당첨 행만 허용
  - RLS: `service_role` 전용 (anon/authenticated 모두 차단)
- Edge Function: `enter-draw` (응모 처리)

## 추첨 자동화 흐름 (pg_cron)

```
토 20:00 KST  close-draw         → active → closed, 다음 upcoming 회차 생성
토 22:00 KST  fetch-draw-result  → winning_numbers 세팅 후 judge_draw_winners RPC 호출
                                    → draw_entries.status 업데이트 + draw_winners 자동 INSERT
일 10:00 KST  publish-and-open   → drawn → completed, 당첨자 푸시 발송, upcoming → active
```

`judge_draw_winners(draw_id)` RPC:
- 등수 판정: 6개 일치→1등, 5개+보너스→2등, 5개→3등, 4개→4등, 3개→5등
- draw_winners에 `source='auto'`로 INSERT (ON CONFLICT DO NOTHING, 멱등)
- draw_prizes에 prize_rank 매핑된 상품이 있으면 prize_id 연결

## 어드민 관련 기능

- **추첨 회차 생성/관리**: 시작일, 종료일, 티켓 단가, 상품 설정
- **추첨 상태 변경**: 회차 상태 수동 전환
- **당첨번호 입력**: drawn 상태 전환 시 당첨번호/보너스번호 입력
- **응모 현황 모니터링**: 회차별 총 응모 수, 유저별 응모 수
- **당첨자 관리**: draw_winners 테이블 기반. 자동(RPC) + 수동(어드민 직접 등록) 통합 관리
  - 등수별 당첨자 수 × draw_prizes.amount로 1인당 당첨금 실시간 계산
  - 계좌 정보 수신 여부, 사실확인 여부, 지급 처리 상태 추적
- **상품 관리**: draw_prizes.prize_rank + amount 설정 (등수별 총 상금 풀)
