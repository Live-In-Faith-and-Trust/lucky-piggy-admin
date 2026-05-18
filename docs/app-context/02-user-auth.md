# 회원 시스템 · 인증 · 온보딩

## 인증 방식

- **카카오 로그인만 지원** (소셜 단일 로그인)
- Supabase Auth + 카카오 OAuth 연동
- `AuthProvider.kakao` 단일 enum

## User 모델

```dart
class User {
  String id;               // Supabase UUID
  String nickname;
  AuthProvider authProvider; // kakao
  String? profileImageUrl;
  String referralCode;     // 본인의 레퍼럴 코드 (공유용)
  String? referredBy;      // 초대한 사람의 referralCode
}
```

## 온보딩 단계 (신규 가입)

| 단계 | 내용 |
|------|------|
| StepIntro | 앱 소개 |
| StepLogin | 카카오 로그인 |
| StepInviteCode | 초대코드 입력 (선택) |
| StepNotification | 푸시 알림 권한 |
| StepStepPermission | 만보기(걸음수) 권한 |
| StepAdIntro | 광고 안내 |
| StepAdVideo | 광고 영상 시청 |
| StepGoldenPig | 황금돼지 소개 |
| StepPigIntro | 돼지 캐릭터 소개 |
| StepTicketReceive | 온보딩 보상 티켓 수령 |
| StepNoReward | (보상 없을 때) |

## 어드민 관련 기능

- **회원 목록/검색**: id, 닉네임, 가입일, 레퍼럴 코드
- **회원 상세**: 티켓 잔액, 추첨 참여 내역, 미션 현황
- **레퍼럴 추적**: 누가 누구를 초대했는지
- **계정 상태 관리**: 정지/활성화 처리

## Supabase 테이블

- `users` 또는 `profiles`: 유저 프로필 정보
- Supabase Auth `auth.users`: 인증 계정
