# 어드민 푸시 관리 — 검토·설계 레퍼런스

> **문서 성격:** 구현 착수 전 **타당성 검토 + 제약 정리 + 데이터 모델 스케치**. 나중에 실제 작업 시작할 때 이 문서에서 스키마/API 계약을 확정하고 태스크 플랜으로 전개한다.
> **작성:** 2026-07-01, 팀 검토(아키텍처 조사 + 기획/제약) 통합.
> **범위:** 앱 레포 = `/Users/naklee/repo/lift/lucky-piggy` (Edge Functions·마이그레이션·pg_cron), 어드민 레포 = `lucky-piggy-admin` (UI·호출 레이어).

---

## 0. 한 줄 결론

메시지를 DB에서 관리하고 발송 시 읽어 보내는 형태는 **가능하고, 수신자·수신설정·멱등·발송이력 인프라는 이미 DB에 존재해 재사용 가능**하다. 단 **현재 모든 푸시 문구가 코드 하드코딩**이라 "메시지 DB화"는 앱 레포(Edge Function + 마이그레이션) 변경이 전제. 가장 무거운 건 **스케줄 조정/신규 정기 등록**(pg_cron이 정적).

---

## 1. 현재 아키텍처 (검증된 팩트)

앱 레포 기준. 파일:라인은 조사 시점 기준.

### 1.1 발송 함수
| 함수 | 위치 | 요약 |
|---|---|---|
| `send-push` | `supabase/functions/send-push/index.ts` | **단일 user_id** 기준 발송. 두 입력 경로: (A) `notifications` 테이블 INSERT DB Webhook `{record:{user_id,title,body,...}}`, (B) `{notificationId}` → DB에서 행 SELECT. FCM **v1 API**, 기기별 **단건** 발송(`Promise.all`, multicast 미사용). 무효 토큰 정리 **없음**. 함수 레벨 **인증 검증 없음**. |
| `send-daily-reminder` | `.../send-daily-reminder/{index,handler,logic}.ts` | 정기 리마인더. 문구는 `logic.ts`의 `CAMPAIGNS` 상수 **하드코딩**. 발송 후 성공 토큰 `last_active_at` 갱신, 무효(UNREGISTERED/NOT_FOUND) 토큰 DELETE. DB 후처리 `DB_CHUNK=200`. |
| `_shared/fcm.ts` | | FCM v1 (`.../v1/projects/{projectId}/messages:send`), `google-auth-library` JWT OAuth. |
| 이벤트 인라인 | `publish-and-open`(당첨), `submit-referral`(초대) | 문구 하드코딩. |

### 1.2 재사용 가능한 DB 인프라 (이미 존재) ✅
| 테이블/함수 | 용도 |
|---|---|
| `devices` (schema.sql ~450) | FCM 토큰. `user_id, push_token, platform, last_active_at`, `unique(user_id, push_token)` |
| `notification_preferences` (~396) | `push_enabled`(기본 true), `draw_result_enabled`, `mission_reminder_enabled`, `marketing_enabled`(기본 false) |
| `push_campaign_runs` (mig 20260603113345) | 발송 **이력 + 멱등 잠금** `UNIQUE(campaign, run_date_kst)`, 집계(target/sent/failed/invalid_removed) |
| `notifications` | 유저별 1:1 이벤트 알림 row. `send-push`가 여기서 title/body 읽음 |
| `broadcast_targets()` / `daily_reminder_targets()` RPC | 필터된 수신 토큰 반환. **긴급 전체발송에 그대로 사용 가능** |

### 1.3 스케줄 (pg_cron) — 정적 ❌
| Job | UTC | KST | 대상 | body |
|---|---|---|---|---|
| daily-reminder-attendance | `0 23 * * *` | 매일 08:00 | send-daily-reminder | `{"campaign":"attendance"}` |
| daily-reminder-pedometer | `0 7 * * *` | 매일 16:00 | send-daily-reminder | `{"campaign":"pedometer"}` |
| draws-close | `0 11 * * 6` | 토 20:00 | close-draw | |
| draws-fetch-result | `0 13 * * 6` | 토 22:00 | fetch-draw-result | |
| draws-publish | `0 1 * * 0` | 일 10:00 | publish-and-open | |

cron → Edge Function 호출은 `net.http_post()` + vault의 `service_role_key`. **스케줄 시각·body가 마이그레이션 SQL에 고정** → 변경 시 새 마이그레이션 배포. DB에서 cron 설정을 읽는 구조 없음.

### 1.4 메시지 출처 = 전부 코드 하드코딩
- 정기: `send-daily-reminder/logic.ts`의 `CAMPAIGNS`(attendance/pedometer/grand_open).
- 당첨: `publish-and-open/index.ts` (`"축하해요! 응모권이 당첨됐어요"` 등).
- 초대: `submit-referral/index.ts`. → `notifications` INSERT → Webhook → send-push 경로.
- **DB 테이블에서 동적으로 읽는 메시지 없음.**

---

## 2. 푸시 타입 분류 (설계 기준)

권장: 모든 푸시 = **(발송 계기 1개) + (콘텐츠 카테고리 1개 태그)**. 계기가 관리 UI를 가르고, 카테고리가 수신설정 필터 + 법적 제약을 강제한다.

### 축 A — 발송 계기
| 타입 | 정의 | 예시 | 어드민 관리 |
|---|---|---|---|
| 정기(Scheduled) | cron 반복 | 출석·만보기 | 문구 수정 + 스케줄 |
| 이벤트(Triggered) | 행동·시스템 이벤트 | 당첨·초대·마감 | 템플릿 문구만 수정 |
| 수동 즉시(Manual) | 어드민 작성·즉시발송 | 긴급공지(신규) | 자유 작성 → 발송 |
| 예약 1회성(One-off) | 특정 시각 1회 | grand_open | 등록·예약·취소 |

### 축 B — 대상
전체(broadcast) / 세그먼트(조건) / 개인 1:1.

### 축 C — 콘텐츠 카테고리 (★수신설정·법적 직결)
| 카테고리 | 수신설정 게이트 | 법적 |
|---|---|---|
| 당첨/추첨 | `draw_result_enabled` | 정보성 |
| 미션/리마인더 | `mission_reminder_enabled` | 정보성 |
| 마케팅/프로모션 | `marketing_enabled` | **광고성 — 야간(21~08) 금지·동의 필수** |
| 시스템/긴급 | `push_enabled`만 | 정보성(장애·점검) |

### 축 D — 메시지 출처
고정 템플릿 / 변수치환 템플릿(걸음수·회차) / 자유 작성.

### 현재 푸시 매핑
| 푸시 | 계기 | 대상 | 카테고리 | 출처 |
|---|---|---|---|---|
| 출석 리마인더 | 정기 | 전체(미션동의) | 미션 | 템플릿 |
| 만보기 리마인더 | 정기 | 전체 | 미션 | 변수치환 |
| 당첨 발표 | 이벤트 | 개인 1:1 | 당첨 | 변수치환 |
| 초대 성공 | 이벤트 | 개인 1:1 | (현재 무필터) | 변수치환 |
| grand_open | 1회성 | 전체 | 마케팅 | 템플릿 |
| 긴급공지(신규) | 수동즉시 | 전체/세그 | 시스템 | 자유작성 |
| 프로모션(신규) | 수동/예약 | 전체/세그 | 마케팅 | 자유작성 |

---

## 3. 요청 기능별 타당성 + 작업 규모

| 기능 | 가능 | 규모 | 핵심 |
|---|---|---|---|
| ① 긴급 전체 푸시 | ✅ | 중 | `broadcast_targets()` 재사용. **동기 호출 시 대량 타임아웃 재발** → 비동기 워커 필수 |
| ② 정기 **문구** 수정 | ✅ | **하** | 템플릿 테이블 1 + 함수가 DB 읽게 변경. 스케줄 불변 → 배포 없이 문구 수정 |
| ③ 스케줄 조정(시각/주기) | △ | **상** | pg_cron 정적 → 간접 레이어(제어 테이블 + 범용 디스패처 cron) 신규 구축 + 기존 cron 이전 |
| ④-a 신규 1회성 예약 | ✅ | 중 | `send_at + sent` + 범용 폴러 1개. ③ 인프라와 공유 시 저렴 |
| ④-b 신규 정기 등록 | △ | **상** | ③와 동일 인프라 의존 |

**무거운 부분의 단일 원인:** pg_cron 스케줄이 마이그레이션에 고정 → 웹에서 못 바꿈. 어드민에서 하려면 "스케줄링 엔진"을 새로 깔아야 함:
1. `push_schedules` 제어 테이블(다음발송시각·주기·활성·연결템플릿)
2. cron을 자주(예 10분) 도는 **범용 디스패처 1개**로 교체
3. 디스패처가 테이블 읽어 발송 판단
4. 기존 출석/만보기 cron을 이 구조로 리팩터

> 대안: `cron.schedule()/cron.unschedule()`을 SECURITY DEFINER RPC로 감싸 어드민이 직접 재등록 — 기술적으론 가능하나 **웹에서 임의 cron 조작 = 보안/안정성 리스크**. 제어 테이블 방식 권장.

---

## 4. 제약사항

1. **메시지 하드코딩 = 앱레포 작업 필수.** 어드민 UI만으론 동작 안 함(템플릿 테이블 + 함수 수정 선행).
2. **크로스레포 경계** — 테이블·Edge Function·cron = **앱 레포 develop**, 어드민 UI·호출 레이어 = 어드민 레포. 스키마/API 계약 선합의.
3. **대량 발송 타임아웃** — 기기별 단건 발송이라 전체발송은 동기 불가. **비동기 워커 + 발송로그**로 결과 확인(일괄 당첨자 추가에서 겪은 교훈과 동일).
4. **스케줄(pg_cron)** — 웹에서 직접 못 고침. 제어 테이블 간접 구조가 현실적 해법.
5. **오발송 방지** — 미리보기 → 테스트발송(본인) → 대상 수 명시 확인 → 발송, + append-only **감사 로그**. 전체발송 권한은 슈퍼어드민 한정.
6. **법적/수신설정** — 광고성은 야간(21~08) 금지·`marketing_enabled` 필터 필수. 카테고리 게이팅이 현재 발송 경로마다 제각각(§5 참고)이라 일관화 필요.
7. **환경 분리·멱등성** — staging/prod FCM 키 분리, 발송작업 `idempotency_key`(또는 `push_campaign_runs` UNIQUE 재사용)로 중복 발송 차단.
8. **무효 토큰 정리** — `send-daily-reminder`엔 있으나 `send-push`엔 없음. 어드민 발송 경로도 실패 토큰 정리 필요.

---

## 5. 검토 중 발견한 별도 이슈 (요청과 무관, 확인 권장)

- **`send-push` 페이로드 불일치:** `publish-and-open`이 `{user_ids, title, body}`로 호출하는데 `send-push`엔 그 경로 처리 코드가 없음(단일 user_id/notificationId만). → **당첨 푸시가 실제로 나가는지 운영 로그 확인 필요.**
- **`send-push` 함수 레벨 인증 없음:** Authorization 검증 부재. 어드민/외부 직접 호출 가능 → 발송 권한 통제 설계 시 함께 차단.
- **수신설정 게이팅 불일치:** 경로별로 체크 컬럼이 다름 — `send-push`는 `push_enabled`만, `daily_reminder_targets()`는 `push_enabled AND mission_reminder_enabled`, 이벤트 푸시(당첨·초대)는 `draw_result_enabled` 미체크. 카테고리별 일관 게이팅 규칙 정립 필요.

---

## 6. MVP 권고

**1차 = ① 긴급 전체 푸시 + ② 정기 문구 수정.** 앱레포 변경 최소(템플릿 테이블 1 + 발송로그 1 + 함수 수정), 가치 최대. **비동기 처리·감사로그는 MVP에서도 생략 불가.**
**2차 = ③ 스케줄 조정 + ④-b 신규 정기** — 스케줄링 엔진 신규 구축이라 분리. ④-a(1회성 예약)는 폴러 하나로 ①②에 끼워 넣는 절충 가능.

---

## 7. 데이터 모델 스케치 (미확정 — 착수 시 확정)

```
push_templates          -- 메시지 정의(어드민이 수정)
  id, key(고유), category('draw'|'mission'|'marketing'|'system'),
  trigger('scheduled'|'event'|'manual'|'oneoff'),
  title, body, deep_link, variables(jsonb), enabled, updated_by, updated_at

push_schedules          -- 2차: 스케줄 제어(디스패처가 읽음)
  id, template_id FK, cron_or_interval, next_send_at, target_query, enabled

push_jobs               -- 발송 인스턴스(즉시/예약) + 상태
  id, template_id FK?, title, body, audience('all'|'segment'|'user'),
  segment(jsonb), scheduled_at, status('queued'|'sending'|'done'|'failed'|'cancelled'),
  idempotency_key(unique), created_by

push_send_logs          -- 발송 결과(기존 push_campaign_runs 확장 또는 신규)
  id, job_id FK, target_count, sent_count, failed_count, invalid_removed, started_at, completed_at
```

- 발송 경로: 어드민 → `push_jobs` INSERT(queued) → 비동기 워커/디스패처가 `broadcast_targets()`(또는 segment 쿼리)로 토큰 조회 → FCM 배치 발송 → `push_send_logs` 기록, 무효 토큰 정리.
- 기존 `push_campaign_runs`의 멱등 UNIQUE 패턴을 `push_jobs.idempotency_key`로 계승.

---

## 8. 착수 시 첫 단계

1. **선검증:** §5의 당첨 푸시 동작·send-push 인증을 운영 로그로 확인.
2. **계약 합의:** 앱 레포 담당과 `push_templates`/발송 API 스키마 확정(앱 레포 develop).
3. **MVP 구현:** ②(문구 DB화) → ①(긴급 발송, 비동기+로그) 순. 어드민 UI는 그 위에.
