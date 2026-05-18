# Flutter → 웹 개발자 핸드오프 지침

Flutter 앱 개발자가 웹 어드민 개발자에게 전달하는 앱 기술 컨텍스트.

---

## 1. Supabase 스키마 주의사항

### RLS (Row Level Security)
- 모든 테이블에 RLS 활성화. 어드민은 **`SUPABASE_SERVICE_ROLE_KEY`** 사용 필수.
- `auth.users`는 Supabase Auth 내부 테이블이므로 직접 SELECT/UPDATE 금지. `profiles` 테이블 경유.
- Service Role Key는 Next.js API Route / Server Action에서만 사용, 클라이언트 노출 절대 금지.

### 테이블 관계 및 중요 컬럼
| 테이블 | 주의 컬럼 | 설명 |
|--------|-----------|------|
| `profiles` | `ticket_balance` | **직접 수정 금지** — `ticket_transactions` 합산값과 항상 일치해야 함 |
| `draws` | `status` | 상태 흐름 순서 강제 필요 (단방향) |
| `draw_entries` | (전체) | 직접 INSERT 금지 — `enter-draw` Edge Function 사용 |
| `missions` | `is_active`, `start_at`, `end_at` | 앱이 실시간으로 읽으므로 변경 즉시 반영 |
| `ticket_transactions` | `amount`, `type`, `user_id` | INSERT 후 수정/삭제 금지 — 불변 이벤트 로그 |
| `draw_prizes` | `prize_rank`, `amount` | `prize_rank`: 등수(1–5), `amount`: 등수 총 상금 풀(원). 1인당 = amount ÷ 실제 당첨자 수 |
| `draw_winners` | `source`, `(draw_id, user_id)` | `source='auto'`는 judge_draw_winners RPC가 등록. 어드민 수동 추가는 `source='manual'`. 한 회차에 유저당 1행 unique 제약. RLS: service_role 전용 |

---

## 2. 비즈니스 로직 제약 (어드민도 반드시 준수)

- **티켓 타입별 부호**: `draw_entry`는 항상 음수 `amount`. 어드민 수동 지급 시 양수로 INSERT.
- **Draw 상태는 단방향**: `upcoming → active → closed → drawn → completed`. 역방향 전이 금지.
- **미션 중복 참여 방지**: `mission_progress`에 `(user_id, mission_id)` unique 제약. 초기화 시 delete 후 재생성.

---

## 3. 어드민에서 직접 수정하면 안 되는 것 (Edge Function 경유 필수)

| 작업 | 이유 |
|------|------|
| 티켓 지급/차감 | `earn-tickets` Edge Function이 잔액 동기화 + 트랜잭션 로그 동시 처리 |
| 추첨 응모 처리 | `enter-draw` Edge Function이 잔액 확인, 중복 방지, 차감을 원자적으로 처리 |
| 회원 삭제/정지 | Supabase Admin Auth API(`supabase.auth.admin.deleteUser`) 사용 |

**어드민 수동 티켓 지급**: `earn-tickets` Edge Function을 어드민 전용 type으로 호출.

---

## 4. 어드민에서 직접 수정 가능한 것 (DB 직접 조작 안전)

- `missions`: `title`, `description`, `reward_tickets`, `is_active`, `start_at`, `end_at`
- `draws`: `title`, `description`, `image_url`, `max_entries`, `ticket_cost`, `scheduled_at` (status는 흐름 규칙 준수 전제)
- `profiles`: `display_name`, `avatar_url`, 알림 설정 필드 (단, `ticket_balance` 제외)

---

## 5. 데이터 일관성 주의사항

### 티켓 잔액 계산 방식
```
profiles.ticket_balance = SUM(ticket_transactions.amount WHERE user_id = ?)
```
- `ticket_transactions`이 원장(source of truth). `profiles.ticket_balance`는 캐시.
- 불일치 발견 시: `ticket_transactions` 합산값이 정답. `profiles.ticket_balance` 업데이트로 정합성 복구.
- 잔액이 음수가 되는 수정은 방어 로직으로 차단 필요.

### Draw 집계
- `draw_entries` count()가 실제 응모 수. `draws.entry_count`가 있다면 캐시값이므로 실제값과 다를 수 있음.

---

## 6. Flavor/환경별 주의사항

| 환경 | 주의사항 |
|------|----------|
| dev | 테스트 데이터 오염 무관 |
| staging | QA 테스트 데이터. 스토어 심사 빌드가 바라보는 환경 |
| prod | 실 유저 데이터. 어드민 조작 시 실서비스 즉시 영향 |

- 어드민은 환경별 분리 배포 권장 (`admin-staging.xxx.com`, `admin.xxx.com`).
- Edge Functions도 환경별로 배포되므로 어드민에서 Edge Function 호출 시 해당 환경 URL로 호출.

---

## 7. 앱 릴리즈와 어드민 설정의 관계

### 즉시 반영 (앱 업데이트 불필요)
- 미션 활성화/비활성화 (`missions.is_active`)
- 미션 기간 변경 (`start_at`, `end_at`)
- Draw 상태 변경
- 티켓 보상량 변경 (진행 중인 미션에 소급 적용 안 됨)

### 앱 업데이트 필요
- 새로운 `ticket_transactions.type` 추가 → 앱에 처리 로직 없으면 UI 깨짐. **어드민에서 새 타입 먼저 만들지 말 것.**
- 새로운 미션 카테고리/타입 추가 → 앱 미션 렌더링 로직과 사전 협의 필요
- Draw 상태 추가 → 앱 라우팅 로직과 연동 확인 필요

### 스키마 변경 배포 순서
```
1. Supabase 마이그레이션 (staging → prod)
2. Edge Function 배포
3. 앱 릴리즈 (필요한 경우)
4. 어드민 기능 활성화
```
