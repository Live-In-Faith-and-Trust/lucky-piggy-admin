# 게임화 요소: 보물캐기 · 은돼지 · 럭키포켓 · 출석

## 보물 캐기 (Treasure Dig)

### 흐름
```
ready → stoneReady → stoneWaiting → rewardWaiting → rewardReady → restartWaiting → (처음으로)
```

### 규칙
- 돌멩이 4개를 순차적으로 제거 (돌 사이 제거 시간 간격 제한)
- 보물상자 열기 → 보상 획득
- **30분 보상 대기** 후 보상 수령 가능
- **1시간 재시작 대기** 후 다음 라운드 시작
- Pig A / Pig B 두 슬롯 독립 운영

### PigDigPhase enum
```dart
enum PigDigPhase {
  ready, stoneReady, stoneWaiting,
  rewardWaiting, rewardReady, restartWaiting
}
```

---

## 은돼지 (Silver Pig)

- 홈화면에 랜덤으로 돼지 캐릭터 등장
- 방향: top / bottom / left / right
- 제한 시간 내 탭하면 티켓 획득

```dart
class SilverPigState {
  bool isVisible;
  SilverPigDirection direction; // top/bottom/left/right
}
```

---

## 럭키포켓 (Lucky Pocket)

### 지급 경로
```dart
enum LuckyPocketSource {
  adCycleBonus,  // 광고 사이클 보너스
  randomDrop,    // 랜덤 드랍
  eventReward,   // 이벤트 보상
}
```

### 상태
```dart
enum LuckyPocketStatus {
  available,  // 열 수 있음
  opened,     // 이미 열었음
  expired,    // 만료됨
}
```

- 봉투 형태의 리워드 아이템
- 열면 티켓 지급

---

## 출석체크 (Attendance)

```dart
class AttendanceState {
  int currentStreak;     // 0~7 (7일 사이클)
  bool checkedInToday;
  int adViewsToday;      // 0~2 (하루 광고 추가 보상 최대 2회)
}
```

### 보상 구조
- 매일 체크인: 기본 티켓
- 광고 추가 시청: 1일 최대 2번 추가 티켓
- 7일 완주: **나무상자** 특별 보상

---

## 어드민 관련 기능

- **럭키포켓 수동 지급**: 특정 유저 또는 전체 유저에게 이벤트성 지급
- **은돼지 등장 빈도 설정**: 랜덤 등장 인터벌 조정
- **보물캐기 보상 설정**: 슬롯별 보상량 조정
- **출석 보상 설정**: 7일 완주 보상 내용 변경
- **이상 패턴 탐지**: 비정상적 반복 수행 감지
