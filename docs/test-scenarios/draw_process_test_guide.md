# Lucky Piggy 추첨 프로세스 테스트 가이드

> **대상 독자:** 기획자 · QA 테스터 · 개발자  
> **목적:** 추첨 전 단계가 의도대로 동작하는지 역할별 관점에서 확인하는 실무 가이드  
> **환경:** 스테이징 (staging.lucky-piggy-admin.vercel.app)  
> **최종 업데이트:** 2026-05-19

---

## 읽는 방법

이 문서는 각 단계마다 세 관점으로 나누어 작성했습니다.

- 🟢 **기획자 / 테스터 관점** — 어떤 버튼을 누르고 무엇이 눈에 보여야 하는지
- 🔵 **개발자 관점** — DB 상태, 함수 호출, 에러 메시지 등 기술적 확인 사항
- 🔴 **공통 주의 사항** — 양쪽 모두가 알아야 할 경고

---

## 전체 프로세스 흐름

```
① 테스트 환경 준비
        ↓
② 앱에서 응모 (사용자가 번호 선택 후 응모권 소모)
        ↓
③ 응모 마감     ← 어드민 패널 [Step 1] 버튼 (실운영: 토요일 20:00 KST 자동)
        ↓
④ 당첨자 판정  ← 어드민 패널 [Step 2] 버튼 + 번호 입력
        ↓
⑤ 당첨자 발표  ← 어드민 패널 [Step 3] 버튼 (실운영: 일요일 10:00 KST 자동)
        ↓
⑥ 당첨자 계좌 제출 (앱에서 7일 이내)
        ↓
⑦ 어드민에서 확인 · 지급 처리
        ↓
⑧ 미제출 당첨자 자동 만료 (매일 10:00 KST)
        ↓
⑨ 초기화 후 재테스트 (필요 시 반복)
```

---

## Step 0 — 테스트 환경 준비

### 🟢 기획자 / 테스터 관점

**시작 전 확인 사항:**

1. **어드민 접속 후 환경 배지 확인**  
   당첨자 관리 메뉴 → 테스트 컨트롤 패널 상단에 환경 배지가 보입니다.  
   - `STAGING` 또는 `LOCAL/DEV`: 테스트 진행 가능  
   - `⚠️ PRODUCTION` (빨간색): 테스트 절대 금지. 즉시 창을 닫으세요.

2. **회차 상태 확인**  
   패널 안의 상태 배지가 `응모 진행중 (파란색)`이면 준비 완료입니다.  
   다른 상태라면 아래 [초기화] 버튼을 눌러 리셋하세요.

3. **앱 테스트 계정 준비**  
   응모에 사용할 테스트 계정이 있어야 합니다. 계정이 없거나 티켓이 0장이면 개발팀에 충전을 요청하세요.

**[초기화] 버튼 실행 (이전 테스트 데이터 정리):**

버튼을 누르면 확인 팝업이 나옵니다. OK를 누르면 화면이 새로고침되고 상태 배지가 `응모 진행중`으로 바뀝니다.

초기화 후 테스트 패널 상태 배지가 파란색 `응모 진행중`으로 바뀌었는지, 당첨자 목록이 비어 있는지 눈으로 확인하세요.

> ⚠️ 발표가 완료된(`발표 완료`) 회차는 초기화 버튼이 비활성화됩니다. 이 경우 개발팀에 새 테스트 회차 생성을 요청하세요.

---

### 🔵 개발자 관점

**초기화 버튼이 실행하는 DB 작업:**

```sql
-- 1. 당첨자 전체 삭제
DELETE FROM draw_winners WHERE draw_id = '<현재 회차 ID>';

-- 2. 응모 상태 롤백 (won/lost → entered)
UPDATE draw_entries
SET status = 'entered'
WHERE draw_id = '<현재 회차 ID>'
  AND status IN ('won', 'lost');

-- 3. 회차 상태 초기화
UPDATE draws
SET status = 'active',
    winning_numbers = null,
    bonus_number = null
WHERE id = '<현재 회차 ID>';
```

**초기화 후 검증 쿼리:**

```sql
-- 회차 상태 확인
SELECT id, round_number, status, winning_numbers, bonus_number
FROM draws WHERE id = '<draw_id>';

-- 당첨자 삭제 확인
SELECT count(*) FROM draw_winners WHERE draw_id = '<draw_id>';
-- 예상 결과: 0

-- 응모 상태 롤백 확인
SELECT status, count(*) FROM draw_entries
WHERE draw_id = '<draw_id>'
GROUP BY status;
-- 예상 결과: entered만 남아야 함 (won, lost 행 없음)
```

**테스트 데이터 준비 (회차가 없을 때):**

```sql
INSERT INTO draws (round_number, status, start_date, end_date, draw_date)
VALUES (9999, 'active', now(), now() + interval '7 days', now() + interval '7 days');
```

---

## Step 1 — 앱에서 응모 넣기

### 🟢 기획자 / 테스터 관점

**정상 응모 흐름:**

앱을 열고 추첨 화면으로 이동합니다. 번호 6개를 선택하고 응모하기를 탭합니다. "응모 완료" 메시지가 나오면 성공입니다. 추가로 2~3장 더 응모해서 다양한 응모 케이스를 만들어두세요.

응모 직후 확인해야 할 것:
- 응모 전 티켓 N장 → 응모 후 N-1장으로 줄었는지 앱 화면에서 확인
- 같은 회차에 여러 번 응모할 수 있는지 (여러 번호 조합 가능해야 함)

**거부되어야 하는 케이스 (오류 메시지 확인):**

| 시도 | 기대 결과 |
|------|-----------|
| 티켓이 0장인데 응모 시도 | "티켓이 부족합니다" 오류 |
| `응모 마감` 상태 회차에 응모 | "응모가 마감되었습니다" 오류 |
| 번호 6개 중 하나를 1~45 밖으로 설정 | 입력 자체가 막혀야 함 (UI 제한) |
| 한 세트에 같은 번호 두 번 선택 | 선택이 막혀야 함 (UI 제한) |
| 번호를 5개만 선택하고 응모 시도 | 응모 버튼 비활성화 or 오류 메시지 |

---

### 🔵 개발자 관점

응모는 `enter_draw` RPC로 처리됩니다. 실행 시 다음 순서로 진행됩니다:

1. `ticket_balances FOR UPDATE` 잠금 → 동시 응모로 인한 잔액 초과를 방지합니다 (Race Condition 방지)
2. 잔액 검증 (`total - spent >= 요청 장수`)
3. `draw_entries` 행 삽입
4. `ticket_balances.spent` 증가
5. `ticket_transactions` 차감 기록 삽입
6. `draws.total_entries` 업데이트

**응모 후 검증 쿼리:**

```sql
-- 응모 내역 확인
SELECT id, lottery_numbers, status, entered_at
FROM draw_entries
WHERE draw_id = '<draw_id>' AND user_id = '<uid>'
ORDER BY entered_at DESC;
-- status = 'entered' 여야 함

-- 티켓 차감 확인
SELECT total, spent, total - spent AS available
FROM ticket_balances
WHERE user_id = '<uid>';

-- 차감 트랜잭션 기록 확인
SELECT type, amount, reference_id, created_at
FROM ticket_transactions
WHERE user_id = '<uid>'
ORDER BY created_at DESC LIMIT 5;
-- type='draw_entry', amount=-N
```

**동시 응모 Race Condition 테스트 방법:**

```bash
# 잔액이 1장인 상태에서 동시 요청 2개 전송
curl -X POST ... &
curl -X POST ... &
wait
# 두 번째 요청이 'insufficient_tickets' 오류를 반환해야 함
```

---

## Step 2 — 응모 마감

### 🟢 기획자 / 테스터 관점

**실행 방법:**  
당첨자 관리 → 테스트 컨트롤 패널 → **[Step 1] 응모 마감** 버튼 클릭

버튼이 눌리지 않는다면: 현재 회차 상태 배지를 확인하세요. `응모 진행중`일 때만 버튼이 활성화됩니다.

**버튼 클릭 후 확인 사항:**

1. 패널의 상태 배지가 `응모 마감 (노란색)`으로 바뀌어야 합니다
2. 앱에서 해당 회차에 새로 응모를 시도하면 "응모가 마감되었습니다" 오류가 나와야 합니다
3. 기존에 응모한 내역은 그대로 유지되어야 합니다 (삭제되면 안 됨)

**Step 2 버튼 비활성화 확인:**  
이미 마감된 상태에서 [Step 1] 버튼은 흐리게 표시되고 클릭해도 아무 반응이 없어야 합니다.

---

### 🔵 개발자 관점

어드민 버튼은 `closeDrawForTest()` 함수를 호출합니다. `draws.status='active'` 조건을 명시적으로 걸어 이미 마감된 회차를 다시 마감하지 않습니다.

```sql
-- 버튼 실행 내용 (실제 쿼리)
UPDATE draws
SET status = 'closed'
WHERE id = '<draw_id>'
  AND status = 'active';
-- 영향 행 0이면 이미 마감된 것
```

**실제 cron close-draw Edge Function 동작과의 차이:**

| 항목 | 어드민 버튼 (테스트) | 실제 close-draw EF |
|------|-------------------|--------------------|
| end_date 조건 | 무시 (즉시 마감) | `end_date <= now()` 만 마감 |
| 다음 회차 upcoming 생성 | 없음 | 있음 (round+1 upcoming 자동 생성) |
| 인증 | Supabase 서비스 클라이언트 | CRON_SECRET 헤더 |

**마감 후 검증 쿼리:**

```sql
SELECT id, round_number, status, end_date
FROM draws WHERE id = '<draw_id>';
-- status = 'closed'

-- 마감 후 응모 시도 거부 확인 (enter_draw 에러 메시지)
-- SQLSTATE: 'PGRST' / message: 'draw_not_active'
```

**실제 Edge Function 테스트 (CRON_SECRET 필요):**

```bash
curl -X POST https://<project>.supabase.co/functions/v1/close-draw \
  -H "Authorization: Bearer <CRON_SECRET>"
# 응답: {"closed":1, "upcomingCreated":1}
```

---

## Step 3 — 당첨자 판정

### 🟢 기획자 / 테스터 관점

**실행 방법:**  
테스트 패널 → **[Step 2] 당첨자 판정** 버튼 클릭 → 입력 폼 펼쳐짐

폼 상단에 **응모자 수: N명**이 표시됩니다. Step 1에서 응모한 수와 맞는지 먼저 확인하세요. 숫자가 맞지 않으면 응모 데이터에 문제가 있는 것입니다.

**번호 입력:**

당첨번호 6개 칸에 각각 1~45 사이 숫자를 입력하고, 보너스번호도 1개 입력합니다.

> 💡 **팁:** 테스트 계정이 응모한 번호를 그대로 당첨번호로 입력하면 반드시 1등이 나옵니다. 이렇게 해서 당첨자 데이터가 생기는지 먼저 확인하세요.

**판정 실행 버튼 클릭 후 확인 사항:**

- 상태 배지가 `판정 완료 (보라색)`으로 바뀌어야 합니다
- 당첨자 관리 테이블에 당첨자 목록이 나타나야 합니다
- 당첨자 없는 경우도 정상 (모든 응모가 미당첨이면 테이블이 비어 있음)

**등수별 1인당 상금 확인:**

| 등수 | 총 상금 | 1인당 상금 계산 |
|------|---------|----------------|
| 1등 | 1,000만원 | 1,000만원 ÷ 1등 당첨자 수 |
| 2등 | 100만원 | 100만원 ÷ 2등 당첨자 수 |
| 3등 | 100만원 | 100만원 ÷ 3등 당첨자 수 |

WinnerSummary 영역에서 등수별 당첨자 수와 1인당 상금이 올바르게 계산되어 표시되는지 확인하세요.

**차단되어야 하는 케이스:**

| 시도 | 기대 결과 |
|------|-----------|
| 번호 6개 중 하나를 비우고 판정 실행 | "당첨번호 6개와 보너스번호를 1~45 사이로 입력하세요" 에러 |
| 번호에 0 또는 46 입력 | 동일 에러 메시지 |
| `응모 마감` 이전에 [Step 2] 버튼 클릭 | 버튼 비활성화 (클릭 불가) |

---

### 🔵 개발자 관점

어드민 버튼은 다음 순서로 3단계 작업을 실행합니다:

```
1. UPDATE draws SET winning_numbers = [:numbers], bonus_number = [:bonus] WHERE id = ':drawId'
   ↓
2. SELECT judge_draw_winners(':drawId')  ← RPC
   ↓
3. UPDATE draws SET status = 'drawn' WHERE id = ':drawId'
```

`judge_draw_winners` RPC는 step 2에서만 status를 바꾸지 않습니다. 반드시 step 3에서 직접 업데이트해야 합니다. (이 순서가 틀리면 상태는 'closed'로 남음)

**RPC 실행 전 사전 조건 (RPC 내부 로직):**

```sql
-- RPC 시작 시 winning_numbers 검증
IF (SELECT winning_numbers FROM draws WHERE id = p_draw_id) IS NULL THEN
  RAISE EXCEPTION 'winning_numbers_not_set';
END IF;
-- 6개가 아니면 'invalid_winning_numbers_count' 예외
```

**판정 후 검증 쿼리:**

```sql
-- 회차 상태 및 당첨번호 확인
SELECT round_number, status, winning_numbers, bonus_number
FROM draws WHERE id = '<draw_id>';
-- status = 'drawn', winning_numbers IS NOT NULL

-- 응모 상태 분포 확인
SELECT status, count(*)
FROM draw_entries WHERE draw_id = '<draw_id>'
GROUP BY status;
-- 예: entered 0, won 3, lost 1247

-- 당첨자 내역 확인
SELECT dw.prize_rank, dw.match_count, dw.source, dw.payment_status,
       p.nickname, dp.amount
FROM draw_winners dw
LEFT JOIN profiles p ON p.id = dw.user_id
LEFT JOIN draw_prizes dp ON dp.draw_id = dw.draw_id AND dp.prize_rank = dw.prize_rank
WHERE dw.draw_id = '<draw_id>'
ORDER BY dw.prize_rank, dw.created_at;

-- draw_prizes 자동 생성 확인
SELECT prize_rank, name, amount FROM draw_prizes
WHERE draw_id = '<draw_id>' ORDER BY prize_rank;
-- 1등: 10000000, 2등: 1000000, 3등: 1000000
```

**RPC 멱등성 확인 (동일 drawId 재실행):**

```sql
-- 두 번째 실행 시 중복 삽입 없어야 함
-- draw_winners에 draw_entry_id UNIQUE index (partial) 로 보장
SELECT count(*) FROM draw_winners WHERE draw_id = '<draw_id>';
-- 두 번 실행해도 같은 수 유지
```

---

## Step 4 — 당첨자 발표

### 🟢 기획자 / 테스터 관점

**실행 방법:**  
테스트 패널 → **[Step 3] 당첨자 발표** 버튼 클릭 → 확인 팝업 OK

**버튼 클릭 후 확인 사항:**

1. 현재 회차 상태 배지가 `발표 완료 (초록색)`로 바뀌어야 합니다
2. 회차 선택 드롭다운에 다음 회차가 `응모 진행중` 상태로 생겼는지 확인합니다
3. (선택) 앱에서 테스트 계정으로 로그인하면 당첨 알림 또는 당첨 내역이 보여야 합니다

> **테스트 주의:** 발표 버튼은 실제 cron 함수와 달리 푸시 알림을 발송하지 않습니다. 앱에서 알림을 받으려면 실제 Edge Function을 직접 호출해야 합니다.

**차단되어야 하는 케이스:**

| 시도 | 기대 결과 |
|------|-----------|
| `판정 완료` 이전에 [Step 3] 버튼 클릭 | 버튼 비활성화 |
| `발표 완료` 상태에서 [Step 3] 버튼 클릭 | 버튼 비활성화 |

---

### 🔵 개발자 관점

어드민 버튼은 `publishDrawForTest()` 함수를 호출하며 다음 작업을 합니다:

```sql
-- 1. 현재 회차 완료 처리
UPDATE draws SET status = 'completed' WHERE id = '<draw_id>';

-- 2. 다음 회차(round_number + 1) 활성화
UPDATE draws SET status = 'active'
WHERE round_number = (현재 round_number + 1);

-- 다음 회차가 없으면 새로 생성 (폴백)
INSERT INTO draws (round_number, status, start_date, end_date, draw_date)
VALUES (현재+1, 'active', now(), now()+7d, now()+7d);
```

**실제 publish-and-open Edge Function과의 차이:**

| 항목 | 어드민 버튼 (테스트) | 실제 publish-and-open EF |
|------|-------------------|-----------------------------|
| 푸시 알림 발송 | 생략 | send-push invoke 호출 |
| upcoming 회차 → active | round+1만 활성화 | 모든 upcoming 회차 활성화 |
| drawn → completed | 있음 | 있음 |

**발표 후 검증 쿼리:**

```sql
-- 현재 회차 상태
SELECT round_number, status FROM draws WHERE id = '<draw_id>';
-- status = 'completed'

-- 다음 회차 활성화 확인
SELECT round_number, status FROM draws
WHERE round_number = (SELECT round_number FROM draws WHERE id='<draw_id>') + 1;
-- status = 'active'

-- 공개 배너용 데이터 조회 확인 (anon 접근 가능)
SELECT * FROM public.get_recent_winners_for_banner();
-- 발표 완료된 최근 3회차 1등 당첨자 반환

-- 공개 통계 조회 (anon 접근 가능)
SELECT public.get_draw_public_stats('<draw_id>');
-- rank_summary: 등수별 당첨자 수, winner_cards: 익명화 이름+코멘트
```

---

## Step 5 — 계좌 제출 (앱 사용자 시점)

### 🟢 기획자 / 테스터 관점

당첨자는 발표 후 **7일 이내**에 앱에서 계좌를 제출해야 합니다.

**정상 제출 흐름:**

앱 → 당첨 내역 → 계좌 제출 화면에서 다음을 입력합니다:
- **실명:** 한글 이름 (2~10자, 예: 홍길동)
- **은행명:** 드롭다운 선택
- **계좌번호:** 숫자만, 10~14자리 (예: 01012345678)
- **예금주:** 이름

제출 완료 후 어드민으로 돌아와서 당첨자 테이블의 **계좌 제출** 열에 날짜와 시각이 표시되는지 확인하세요.

**오류 케이스 확인:**

| 시도 | 기대 결과 |
|------|-----------|
| 영문 이름 입력 (예: John) | "올바른 이름 형식이 아닙니다" 오류 |
| 한 글자만 입력 | 동일 오류 |
| 계좌번호 9자리 이하 | "올바른 계좌번호 형식이 아닙니다" 오류 |
| 계좌번호에 하이픈(12-3456) 포함 | 동일 오류 |
| 이미 제출한 당첨자가 재제출 | "이미 제출하셨습니다" 오류 |
| 7일 지난 후 제출 시도 | "제출 기한이 지났습니다" 오류 |
| 당첨자가 아닌 계정으로 제출 시도 | "당첨 내역을 찾을 수 없습니다" 오류 |

**winner_comment 입력도 확인합니다:**
- 50자 이내 자유 코멘트를 입력할 수 있어야 합니다
- 51자 이상 입력 시 제출이 거부되어야 합니다
- 이 코멘트는 발표 페이지에 익명화 이름과 함께 노출됩니다

---

### 🔵 개발자 관점

계좌 제출은 `submit-bank-account` Edge Function으로 처리됩니다. 인증된 사용자(JWT)만 호출 가능합니다.

**유효성 검사 규칙:**

```typescript
// real_name: 한글 2~10자
/^[가-힣]{2,10}$/.test(real_name)

// account_number: 숫자만 10~14자리
/^\d{10,14}$/.test(account_number)

// winner_comment: 50자 이내
winner_comment.length <= 50
```

**Edge Function 실행 조건 (DB 레벨):**

```sql
SELECT id FROM draw_winners
WHERE draw_id = p_draw_id
  AND user_id = auth.uid()
  AND payment_status = 'pending'       -- 이미 지급된 경우 제외
  AND account_submitted_at IS NULL;    -- 이미 제출한 경우 제외

-- 마감 기한 확인
SELECT draw_date + interval '7 days' AS deadline
FROM draws WHERE id = p_draw_id;
-- deadline > now() 여야 제출 가능
```

**제출 후 검증 쿼리:**

```sql
-- 계좌 제출 확인
SELECT account_submitted_at, bank_name, account_holder, winner_comment
FROM draw_winners
WHERE draw_id = '<draw_id>' AND user_id = '<uid>';
-- account_submitted_at IS NOT NULL

-- get_pending_win RPC: 제출 후 0행 반환 확인
-- (authenticated 유저로 실행)
SELECT * FROM public.get_pending_win();
-- 0행 반환 예상 (account_submitted_at 있으면 제외됨)
```

---

## Step 6 — 어드민에서 당첨자 확인 및 지급 처리

### 🟢 기획자 / 테스터 관점

**당첨자 목록 보기:**

어드민 → 당첨자 관리 → 해당 회차 선택. 1~3등 당첨자가 표시됩니다.

각 행에서 볼 수 있는 정보:
- **등수**: 1등 / 2등 / 3등
- **이름**: 실명 (어드민 내부용, 앱에는 익명으로 노출)
- **초대코드**: 자동 당첨자는 앱 가입 시 받은 코드, 수동 당첨자는 자동 생성된 코드
- **1인당 상금**: 총 상금 ÷ 당첨자 수
- **계좌 제출**: 제출 날짜 또는 "미제출"
- **확인**: 계좌 검토 완료 여부 토글
- **지급 상태**: 미지급 / 지급완료 / 취소 (드롭다운)
- **메모**: 어드민 내부 메모

**계좌 확인 처리:**

계좌 제출 후 실제 계좌번호가 올바른지 육안 확인했다면 "확인" 열의 토글을 켜세요. 토글이 켜지면 파란색으로 바뀝니다. 이 토글은 내부 확인 표시일 뿐, 지급 처리와는 별개입니다.

**지급 처리:**

1. "지급 상태" 드롭다운을 클릭합니다
2. **지급완료**를 선택하면 "지급 완료 처리하시겠습니까?" 팝업이 나옵니다
3. OK를 누르면 상태가 초록색 배지로 바뀝니다
4. 잘못 처리했다면 다시 **미지급**으로 되돌릴 수 있습니다

**주의:** **취소**를 선택하면 "당첨을 취소하시겠습니까?" 팝업이 나옵니다. 취소 처리 후에도 다시 **미지급**으로 되돌릴 수 있습니다.

**어드민 메모 활용:**

각 행 우측 메모 칸에 내부 메모를 남길 수 있습니다 (예: "1차 이체 완료 / 연락 불가 2회 시도").

**전체 엑셀 다운로드:**

당첨자 목록 우측 상단의 **전체 당첨자 엑셀 다운로드** 버튼을 누르면 해당 회차 CSV 파일이 다운됩니다. 한글 깨짐 없이 엑셀에서 바로 열립니다.

---

### 🔵 개발자 관점

**계좌 확인 토글:**

```sql
UPDATE draw_winners
SET account_verified = TRUE  -- 또는 FALSE
WHERE id = '<winner_id>';
```

**지급 상태 변경:**

```sql
UPDATE draw_winners
SET payment_status = 'paid',
    paid_at = now()   -- paid로 변경 시에만 설정, 다른 상태로 변경 시 null
WHERE id = '<winner_id>';
```

**지급 상태 검증 쿼리:**

```sql
SELECT payment_status, paid_at, account_verified
FROM draw_winners WHERE id = '<winner_id>';

-- 등수별 요약 (WinnerSummary 컴포넌트 데이터)
SELECT dw.prize_rank,
       count(*) AS winner_count,
       dp.amount,
       dp.amount / count(*) AS per_winner_amount
FROM draw_winners dw
LEFT JOIN draw_prizes dp
  ON dp.draw_id = dw.draw_id AND dp.prize_rank = dw.prize_rank
WHERE dw.draw_id = '<draw_id>'
GROUP BY dw.prize_rank, dp.amount
ORDER BY dw.prize_rank;
```

**RLS 보안 확인:**

```sql
-- draw_winners는 RLS로 직접 SELECT 불가 (service_role 전용)
-- 앱 클라이언트가 직접 draw_winners를 조회하면 0행 반환되어야 함
-- 반드시 RPC(get_my_draw_winner, get_pending_win) 또는 서버 클라이언트를 통해야 함

-- 익명화 이름 노출 확인 (공개 API)
SELECT public.get_draw_public_stats('<draw_id>');
-- winner_cards[].display_name = "홍*동" (홍길동 기준)

SELECT public._anonymize_name('홍길동');  -- 홍*동
SELECT public._anonymize_name('김이');    -- 김*
SELECT public._anonymize_name('이');      -- 이 (1자 그대로)
```

---

## Step 7 — 수동 당첨자 추가

### 🟢 기획자 / 테스터 관점

앱에 가입하지 않은 외부 인물을 당첨자로 직접 추가할 수 있습니다. 또는 판정 오류를 수동으로 보정할 때도 사용합니다.

**실행 방법:**

당첨자 관리 테이블 좌측 상단 **+ 수동 당첨자 추가** 버튼 클릭

다이얼로그에서:
- **유저 ID:** 앱 회원이면 UUID 입력. 외부 인물이면 비워두세요.
- **등수:** 1 / 2 / 3등 선택
- **실명:** (선택) 내부 확인용. 앱 공개 화면에는 익명화되어 표시됩니다.
- **어드민 메모:** (선택)

**추가** 클릭 후 확인 사항:
- 당첨자 목록에 즉시 반영됩니다 (새로고침 없이)
- **초대코드** 열에 6자리 코드가 자동 생성됩니다 (예: AB3K9Z)
- 처음 수동 추가 시 해당 회차에 상금 정보(draw_prizes)가 없으면 자동 생성됩니다

**삭제 확인:**

수동 추가한 당첨자만 우측 휴지통 아이콘이 보입니다. 자동 판정으로 올라온 당첨자는 삭제 버튼이 없습니다. 휴지통을 클릭하면 확인 팝업이 나옵니다.

---

### 🔵 개발자 관점

수동 당첨자 추가 시 내부적으로 세 가지 작업이 순서대로 실행됩니다:

```
1. draw_prizes 존재 확인 → 없으면 1~3등 표준 금액으로 upsert
   (1등: 10,000,000 / 2등: 1,000,000 / 3등: 1,000,000)
   ↓
2. manual_referral_code 생성 (6자리, A-Z0-9, 최대 10회 재시도)
   중복 체크: profiles.referral_code + draw_winners.manual_referral_code 모두 확인
   ↓
3. draw_winners INSERT (source='manual', user_id=null 허용)
```

**수동 당첨자 관련 DB 제약:**

```sql
-- user_id가 있는 경우 동일 draw+user 중복 불가 (partial unique index)
-- user_id IS NOT NULL인 행에만 적용
CREATE UNIQUE INDEX draw_winners_draw_user_unique
ON draw_winners(draw_id, user_id)
WHERE user_id IS NOT NULL;

-- user_id=null인 수동 당첨자는 여러 명 허용 (null은 unique index 제외)
-- manual_referral_code는 전체 unique
CREATE UNIQUE INDEX draw_winners_referral_code_unique
ON draw_winners(manual_referral_code)
WHERE manual_referral_code IS NOT NULL;
```

**검증 쿼리:**

```sql
-- 수동 당첨자 확인
SELECT id, source, user_id, prize_rank, real_name,
       manual_referral_code, payment_status
FROM draw_winners
WHERE draw_id = '<draw_id>' AND source = 'manual';

-- 초대코드 중복 확인
SELECT manual_referral_code, count(*)
FROM draw_winners
WHERE manual_referral_code IS NOT NULL
GROUP BY manual_referral_code
HAVING count(*) > 1;
-- 0행이어야 함 (중복 없음)
```

---

## Step 8 — 미제출 당첨자 만료 처리

### 🟢 기획자 / 테스터 관점

발표 후 7일이 지나도 계좌를 제출하지 않은 당첨자는 매일 오전 10시(KST)에 자동으로 `취소` 처리됩니다.

**만료 동작 확인 방법:**

자동 만료는 실시간 테스트가 어렵습니다. 개발팀에 DB 함수를 수동 실행해달라고 요청하거나, 아래 조건을 DB에서 직접 설정 후 함수를 실행합니다:

만료가 실행된 후 어드민에서 확인해야 할 것:
- 기한 초과한 당첨자의 지급 상태가 `취소 (빨간색)`로 바뀌어야 합니다
- 이미 계좌를 제출한 당첨자는 변경되면 안 됩니다
- 이미 지급완료된 당첨자도 변경되면 안 됩니다

**만료 후 앱 동작 확인:**

만료된 당첨자가 앱에서 계좌를 제출하려 하면 "기한이 지났습니다" 오류가 나와야 합니다. 앱의 당첨 내역 화면에도 만료 상태가 표시되어야 합니다.

---

### 🔵 개발자 관점

만료 처리는 `expire_draw_winners()` 함수가 pg_cron으로 매일 01:00 UTC (= 10:00 KST) 실행됩니다.

```sql
-- 수동 실행 (테스트용)
SELECT public.expire_draw_winners();

-- 함수 내부 로직
UPDATE draw_winners dw
SET payment_status = 'cancelled',
    updated_at = now()
FROM draws d
WHERE dw.draw_id = d.id
  AND dw.payment_status = 'pending'           -- 미지급만
  AND dw.account_submitted_at IS NULL          -- 계좌 미제출
  AND (d.draw_date + interval '7 days') < now(); -- 마감 초과
```

**만료 예외 케이스 검증:**

```sql
-- 제출 완료자 만료 제외 확인
SELECT payment_status, account_submitted_at
FROM draw_winners
WHERE draw_id = '<draw_id>'
  AND account_submitted_at IS NOT NULL;
-- payment_status 변경 없음

-- paid 상태 당첨자 만료 제외 확인
SELECT payment_status
FROM draw_winners
WHERE draw_id = '<draw_id>'
  AND payment_status = 'paid';
-- 여전히 'paid'

-- pg_cron 잡 등록 상태 확인
SELECT jobname, schedule, command, active
FROM cron.job
WHERE jobname = 'expire-draw-winners-daily';
-- schedule = '0 1 * * *'
-- command = 'select public.expire_draw_winners()'
```

---

## 테스트 체크리스트

테스트 사이클마다 아래 항목을 순서대로 체크하세요.

### 환경 준비
```
[ ] 어드민 테스트 패널에 STAGING 배지 확인 (PRODUCTION 아닌지!)
[ ] 회차 상태 '응모 진행중' 확인, 아니면 [초기화] 실행
[ ] 앱 테스트 계정 티켓 잔액 1장 이상 확인
```

### 응모
```
[ ] 앱에서 번호 6개 선택 후 응모 완료
[ ] 앱 화면에서 티켓 잔액 1장 차감 확인
[ ] (선택) 2~3장 추가 응모
[ ] 티켓 0장 상태에서 응모 시도 → 오류 메시지 확인
```

### 응모 마감
```
[ ] 어드민 패널 [Step 1] 응모 마감 버튼 클릭
[ ] 상태 배지 '응모 마감 (노란색)' 확인
[ ] 앱에서 추가 응모 시도 → 오류 메시지 확인
```

### 당첨자 판정
```
[ ] [Step 2] 버튼 클릭 → 응모자 수 N명 확인
[ ] 테스트 계정 응모 번호와 동일하게 당첨번호 입력
[ ] 보너스번호 입력 후 판정 실행
[ ] 상태 배지 '판정 완료 (보라색)' 확인
[ ] 당첨자 목록에 테스트 계정 확인 (1등 당첨)
[ ] WinnerSummary에서 1인당 상금 계산 확인
```

### 당첨자 발표
```
[ ] [Step 3] 버튼 클릭 → 확인 팝업 OK
[ ] 상태 배지 '발표 완료 (초록색)' 확인
[ ] 다음 회차가 '응모 진행중'으로 활성화 확인
[ ] 앱에서 당첨 내역 화면 노출 확인
```

### 계좌 제출 및 어드민 처리
```
[ ] 앱에서 계좌 제출 (실명, 은행명, 계좌번호, 예금주)
[ ] 어드민 당첨자 테이블에서 계좌 제출 날짜 확인
[ ] 계좌 확인 토글 켜기
[ ] 지급 상태 '지급완료'로 변경 → 초록 배지 확인
[ ] 엑셀 다운로드 → 한글 깨짐 없음 확인
```

### 수동 당첨자 테스트
```
[ ] [+ 수동 당첨자 추가] → user_id 없이 추가
[ ] 목록에 즉시 반영 확인
[ ] 초대코드 자동 생성 확인 (6자리)
[ ] 삭제 버튼 클릭 → 삭제 확인
```

### 초기화
```
[ ] [초기화] 클릭 → 확인 팝업 OK
[ ] 상태 배지 '응모 진행중' 복구 확인
[ ] 당첨자 목록 비어 있음 확인
[ ] 다음 사이클 준비 완료
```

---

## 용어 사전

| 용어 | 설명 |
|------|------|
| 응모권 / 티켓 | 응모에 사용하는 포인트. 미션 수행으로 획득. |
| 응모 (draw_entry) | 번호 6개를 선택해 회차에 참여하는 행위 |
| judge_draw_winners | 모든 응모권과 당첨번호를 대조해 등수를 부여하는 DB 함수 (RPC) |
| close-draw | 응모 마감 자동화 작업. 실운영: 토요일 20:00 KST |
| publish-and-open | 당첨자 발표 + 다음 회차 활성화 자동화 작업. 실운영: 일요일 10:00 KST |
| source='auto' | 자동 판정으로 생성된 당첨자 — 삭제 불가 |
| source='manual' | 어드민에서 수동 추가한 당첨자 — 삭제 가능 |
| manual_referral_code | 수동 추가 당첨자에게 자동 발급되는 6자리 초대코드 |
| expire_draw_winners | 7일 초과 미제출 당첨자를 일괄 취소 처리하는 cron 함수 |
| account_verified | 어드민이 계좌를 육안 확인했음을 표시하는 내부 상태 토글 |
| RLS (Row Level Security) | draw_winners 테이블에 설정된 DB 접근 제어. 앱 클라이언트는 직접 조회 불가, RPC 통해서만 접근 가능 |
| CRON_SECRET | close-draw, publish-and-open Edge Function 호출 시 필요한 인증 토큰 |
