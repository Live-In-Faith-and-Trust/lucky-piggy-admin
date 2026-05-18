# 티켓 시스템

## 티켓이란

앱의 핵심 재화. 미션 수행으로 획득, 추첨 응모 시 소비.

## TicketBalance 모델

```dart
class TicketBalance {
  int total;    // 총 누적 획득
  int spent;    // 소비량
  int available; // 잔여 = total - spent (computed)
}
```

## 티켓 지급 타입 (TicketTransactionType)

모든 티켓 지급은 Supabase Edge Function `earn-tickets`를 통해 처리.
`type` 파라미터로 종류 구분.

| 타입 | 발생 시점 |
|------|-----------|
| `pre_registration` | 사전등록 미션 |
| `pedometer` | 만보기 티어 달성 |
| `ad_reward` | 보상형 광고 시청 |
| `lucky_pocket` | 럭키포켓 열기 |
| `referral` | 친구초대 성공 |
| `attendance` | 출석체크 |
| `quiz` | 퀴즈 미션 |
| `roulette` | 룰렛 미션 |
| `silver_pig` | 은돼지 잡기 |
| `attendance_ad` | 출석 + 광고 추가 보상 |
| `onboarding` | 온보딩 완료 보상 |
| `treasure_dig` | 보물캐기 |
| `coupon` | 쿠폰 코드 사용 |
| `draw_entry` | 추첨 응모 (소비, 음수) |

## TicketTransaction 모델

```dart
class TicketTransaction {
  String id;
  String userId;
  TicketTransactionType type;
  int amount;      // 양수: 지급, 음수: 소비
  DateTime createdAt;
}
```

## Supabase 테이블

- `ticket_transactions`: 모든 티켓 지급/소비 이력

## 어드민 관련 기능

- **전체 티켓 통계**: 총 지급량, 총 소비량, 유형별 분포
- **유저별 티켓 내역**: 특정 유저의 획득/소비 히스토리
- **수동 티켓 지급**: 오류 보상, 이벤트 지급 (관리자 직접 지급)
- **이상 감지**: 비정상적으로 많은 티켓 획득 유저 감지
