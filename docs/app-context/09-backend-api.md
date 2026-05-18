# 백엔드 · API 구조

## Supabase (주 백엔드)

### DB 테이블 (확인된 것)
| 테이블 | 내용 |
|--------|------|
| `auth.users` | Supabase Auth 계정 |
| `profiles` / `users` | 유저 프로필 (nickname, referralCode 등) |
| `draws` | 추첨 회차 정보 |
| `draw_entries` | 유저별 응모 내역 |
| `missions` | 미션 설정 |
| `mission_progress` | 유저별 미션 진행 상태 |
| `ticket_transactions` | 모든 티켓 지급/소비 이력 |

### Edge Functions
| 함수명 | 역할 |
|--------|------|
| `earn-tickets` | 티켓 지급 단일 진입점. `type` 파라미터로 미션 종류 지정 |
| `enter-draw` | 추첨 응모 처리 |

### 보안
- **RLS (Row Level Security)**: 기본적으로 본인 데이터만 접근 가능
- 어드민은 **Service Role Key**를 사용해 RLS bypass

---

## Firebase

| 서비스 | 용도 |
|--------|------|
| Firebase Analytics | 이벤트 트래킹 (화면 조회, 미션 완료 등) |
| Firebase Crashlytics | 크래시 리포트 수집 |
| Firebase Messaging (FCM) | 푸시 알림 발송 |

---

## 어드민 연동 방식

```
어드민 (Next.js)
  └─ Supabase Client (Service Role Key)
       ├─ DB 직접 조회/수정 (reads & writes)
       ├─ Admin Auth API (회원 관리)
       └─ Edge Functions 호출 (필요 시)
```

### 주의사항
- **Service Role Key는 서버사이드에서만** 사용 (Next.js API Routes / Server Actions)
- 클라이언트 컴포넌트에 노출 절대 금지
- RLS bypass이므로 어드민 액션에는 반드시 권한 검증 추가

---

## 환경 변수 (어드민)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # 공개용 (읽기 전용 데이터)
SUPABASE_SERVICE_ROLE_KEY=        # 서버사이드 전용 (RLS bypass)
```
