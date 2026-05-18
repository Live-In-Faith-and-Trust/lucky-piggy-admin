# 미션 시스템

## 개요

사용자가 미션을 수행해 티켓을 획득하는 핵심 루프.
6가지 미션 타입이 있으며 각각 다른 완료 조건과 보상을 가진다.

## MissionType enum

```dart
enum MissionType {
  pedometer,        // 만보기
  adReward,         // 광고 시청
  attendance,       // 출석체크
  quiz,             // 퀴즈
  roulette,         // 룰렛
  preRegistration,  // 사전등록
}
```

## 미션별 상세

### 1. 만보기 (Pedometer)
- 기기 Health/Pedometer 센서로 걸음수 측정
- 걸음수 티어별 티켓 지급
- 티어 예: 1,000보 / 3,000보 / 5,000보 / 10,000보
- 하루 1회 지급

### 2. 광고 시청 (Ad Reward)
- 보상형 AdMob 광고 시청 완료 시 티켓 지급
- 하루 지급 횟수 제한 있음

### 3. 출석체크 (Attendance)
- 7일 사이클 체크인
- 하루 체크인 + 광고 2회 추가 보상
- 7일 완주 시 나무상자 특별 보상

### 4. 퀴즈 (Quiz)
- 정답 맞추면 티켓 지급
- 하루 1회

### 5. 룰렛 (Roulette)
- 룰렛 돌려 랜덤 티켓 지급
- 하루 1회

### 6. 사전등록 (Pre-Registration)
- 1회성 미션 (이미 완료한 사용자는 다시 수행 불가)
- 앱 사전등록 기념 보상

## Mission 모델

```dart
class Mission {
  MissionType type;
  int rewardTickets;         // 기본 보상 티켓 수
  MissionConfig config;      // 타입별 설정 (제한 횟수 등)
  MissionProgress progress;  // 유저별 진행 상태
}
```

## Supabase 테이블

- `missions`: 미션 설정 (보상량, 제한 등)
- `mission_progress`: 유저별 미션 진행 상태
- Edge Function: `earn-tickets` (type으로 미션 종류 지정)

## 어드민 관련 기능

- **미션 보상량 조정**: 각 미션 타입별 티켓 보상 수 변경
- **미션 활성화/비활성화**: 특정 미션 on/off
- **미션 통계**: 미션 타입별 완료 횟수, 지급된 티켓 총량
- **퀴즈 관리**: 퀴즈 문제/정답 등록, 수정, 삭제
- **사용자별 미션 현황**: 특정 유저의 미션 이력 조회
