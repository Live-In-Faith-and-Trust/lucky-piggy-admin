import { unstable_cache } from 'next/cache'
import { createServerClient, type AdminEnv } from './server'

// ── Types ───────────────────────────────────────────────────────────────────

export type DrawStatus = 'upcoming' | 'active' | 'closed' | 'drawn' | 'completed'
export type PaymentStatus = 'pending' | 'paid' | 'cancelled'
export type WinnerSource = 'auto' | 'manual'

export interface Draw {
  id: string
  round_number: number
  status: DrawStatus
  winning_numbers: number[] | null
  bonus_number: number | null
  start_date: string
  end_date: string
  draw_date: string
  created_at: string
}

export interface DrawWinner {
  id: string
  draw_id: string
  user_id: string | null
  draw_entry_id: string | null
  source: WinnerSource
  prize_rank: number
  match_count: number | null
  prize_id: string | null
  real_name: string | null
  bank_name: string | null
  account_number: string | null
  account_holder: string | null
  account_submitted_at: string | null
  account_verified: boolean
  winner_comment: string | null
  payment_status: PaymentStatus
  paid_at: string | null
  admin_memo: string | null
  created_at: string
  updated_at: string
  profiles?: { nickname: string | null; referral_code: string | null } | null
  manual_referral_code: string | null
  manual_entry_count: number | null
  email: string | null
  phone: string | null
  resident_id: string | null
  _auto_entry_count?: number | null
}

export interface WinnerRankSummary {
  prize_rank: number
  count: number
  amount: number | null
  per_winner_amount: number | null
}

export interface DrawEntryStats {
  entrant_count: number  // 응모 인원 (distinct user)
  entry_count: number    // 응모 수 (총 응모권)
}

// ── Cache tags (static) ─────────────────────────────────────────────────────
// revalidateTag('draws-list') — 회차 목록 새로고침
// revalidateTag('draw-winners') — 당첨자 데이터 새로고침

// ── Cached queries ──────────────────────────────────────────────────────────

export const getDrawList = unstable_cache(
  async (env: AdminEnv): Promise<Draw[]> => {
    const supabase = createServerClient(env)
    const { data, error } = await supabase
      .from('draws')
      .select('id, round_number, status, winning_numbers, bonus_number, start_date, end_date, draw_date, created_at')
      .order('round_number', { ascending: false })
      .limit(50)
    if (error) throw error
    return data ?? []
  },
  ['draws-list'],
  { revalidate: 300, tags: ['draws-list'] }
)

export const getEntryStats = unstable_cache(
  async (env: AdminEnv, drawId: string): Promise<DrawEntryStats> => {
    const supabase = createServerClient(env)
    const { data, error } = await supabase
      .from('draw_entries')
      .select('user_id')
      .eq('draw_id', drawId)
    if (error) throw error
    const rows = data ?? []
    const entrant_count = new Set(rows.map((r) => r.user_id)).size
    const entry_count = rows.length
    return { entrant_count, entry_count }
  },
  ['draw-entry-stats'],
  { revalidate: 300, tags: ['draw-winners'] }
)

export const getWinnerSummary = unstable_cache(
  async (env: AdminEnv, drawId: string): Promise<WinnerRankSummary[]> => {
    const supabase = createServerClient(env)

    const [{ data: winnerRows, error: wErr }, { data: prizeRows, error: pErr }] = await Promise.all([
      supabase.from('draw_winners').select('prize_rank').eq('draw_id', drawId),
      supabase.from('draw_prizes').select('prize_rank, amount').eq('draw_id', drawId),
    ])
    if (wErr) throw wErr
    if (pErr) throw pErr

    const countMap: Record<number, number> = {}
    for (const w of winnerRows ?? []) {
      countMap[w.prize_rank] = (countMap[w.prize_rank] ?? 0) + 1
    }
    const prizeMap: Record<number, number | null> = {}
    for (const p of prizeRows ?? []) {
      prizeMap[p.prize_rank] = p.amount
    }

    const hasPrizeData = Object.keys(prizeMap).length > 0
    return [1, 2, 3, 4, 5].map((rank) => {
      const count = countMap[rank] ?? 0
      const amount = prizeMap[rank] ?? (hasPrizeData ? null : (DEFAULT_PRIZE_AMOUNTS[rank] ?? null))
      return {
        prize_rank: rank,
        count,
        amount,
        per_winner_amount: amount !== null && count > 0 ? Math.floor(amount / count) : null,
      }
    })
  },
  ['draw-winners-summary'],
  { revalidate: 300, tags: ['draw-winners'] }
)

export const getWinners1to3 = unstable_cache(
  async (env: AdminEnv, drawId: string): Promise<DrawWinner[]> => {
    const supabase = createServerClient(env)
    const { data, error } = await supabase
      .from('draw_winners')
      .select('*, profiles(nickname, referral_code)')
      .eq('draw_id', drawId)
      .in('prize_rank', [1, 2, 3])
      .order('prize_rank', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) throw error

    const winners = (data ?? []) as DrawWinner[]

    const autoUserIds = winners
      .filter((w) => w.source === 'auto' && w.user_id)
      .map((w) => w.user_id as string)

    let entryCountByUserId: Record<string, number> = {}
    if (autoUserIds.length > 0) {
      const { data: entries } = await supabase
        .from('draw_entries')
        .select('user_id')
        .eq('draw_id', drawId)
        .in('user_id', autoUserIds)
      for (const e of entries ?? []) {
        if (e.user_id) {
          entryCountByUserId[e.user_id] = (entryCountByUserId[e.user_id] ?? 0) + 1
        }
      }
    }

    return winners.map((w) => ({
      ...w,
      _auto_entry_count: w.source === 'auto' && w.user_id
        ? (entryCountByUserId[w.user_id] ?? 0)
        : null,
    }))
  },
  ['draw-winners-1to3'],
  { revalidate: 300, tags: ['draw-winners'] }
)

// ── Write functions (no cache — called from Server Actions) ─────────────────

async function generateUniqueReferralCode(supabase: ReturnType<typeof createServerClient>): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * 36)]).join('')
    const { count: profileCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('referral_code', code)
    if (profileCount && profileCount > 0) continue
    const { count: winnerCount } = await supabase.from('draw_winners').select('*', { count: 'exact', head: true }).eq('manual_referral_code', code)
    if (winnerCount && winnerCount > 0) continue
    return code
  }
  throw new Error('초대코드 생성에 실패했습니다')
}

const DEFAULT_PRIZE_AMOUNTS: Record<number, number> = {
  1: 10_000_000,
  2: 1_000_000,
  3: 1_000_000,
}

export async function addManualWinner(
  env: AdminEnv,
  payload: {
    draw_id: string
    user_id?: string
    prize_rank: number
    real_name?: string
    bank_name?: string
    account_number?: string
    account_holder?: string
    winner_comment?: string
    admin_memo?: string
    manual_entry_count: number
    email?: string
    phone?: string
    resident_id?: string
  }
): Promise<void> {
  const supabase = createServerClient(env)

  // draw_prizes가 없는 회차에 수동 당첨자를 추가할 때 표준 금액으로 자동 생성
  const prizesToUpsert = [1, 2, 3].map((rank) => ({
    draw_id: payload.draw_id,
    prize_rank: rank,
    name: `${rank}등`,
    description: `${rank}등 상금`,
    type: 'cash',
    amount: DEFAULT_PRIZE_AMOUNTS[rank],
  }))
  const { error: prizeError } = await supabase
    .from('draw_prizes')
    .upsert(prizesToUpsert, { onConflict: 'draw_id,prize_rank', ignoreDuplicates: true })
  if (prizeError) throw prizeError

  const manual_referral_code = await generateUniqueReferralCode(supabase)

  const { error } = await supabase.from('draw_winners').insert({
    ...payload,
    source: 'manual' as WinnerSource,
    payment_status: 'pending' as PaymentStatus,
    manual_referral_code,
  })
  if (error) throw error
}

export async function toggleAccountVerified(
  env: AdminEnv,
  winnerId: string,
  verified: boolean
): Promise<void> {
  const supabase = createServerClient(env)
  const { error } = await supabase
    .from('draw_winners')
    .update({ account_verified: verified })
    .eq('id', winnerId)
  if (error) throw error
}

export async function updatePaymentStatus(
  env: AdminEnv,
  winnerId: string,
  status: PaymentStatus
): Promise<void> {
  const supabase = createServerClient(env)
  const { error } = await supabase
    .from('draw_winners')
    .update({
      payment_status: status,
      paid_at: status === 'paid' ? new Date().toISOString() : null,
    })
    .eq('id', winnerId)
  if (error) throw error
}

export async function saveAdminMemo(
  env: AdminEnv,
  winnerId: string,
  memo: string
): Promise<void> {
  const supabase = createServerClient(env)
  const { error } = await supabase
    .from('draw_winners')
    .update({ admin_memo: memo })
    .eq('id', winnerId)
  if (error) throw error
}

export async function updateManualWinner(
  env: AdminEnv,
  winnerId: string,
  payload: {
    real_name?: string
    bank_name?: string
    account_number?: string
    account_holder?: string
    winner_comment?: string
    admin_memo?: string
    manual_entry_count: number
    email?: string
    phone?: string
    resident_id?: string
  },
): Promise<void> {
  const supabase = createServerClient(env)
  const { error } = await supabase
    .from('draw_winners')
    .update(payload)
    .eq('id', winnerId)
  if (error) throw error
}

export async function updateManualEntryCount(
  env: AdminEnv,
  winnerId: string,
  count: number,
): Promise<void> {
  const supabase = createServerClient(env)
  const { error } = await supabase
    .from('draw_winners')
    .update({ manual_entry_count: count })
    .eq('id', winnerId)
  if (error) throw error
}

export async function deleteManualWinner(
  env: AdminEnv,
  winnerId: string
): Promise<void> {
  const supabase = createServerClient(env)
  // Double-check source='manual' before deleting — safety guard
  const { data, error: fetchErr } = await supabase
    .from('draw_winners')
    .select('source')
    .eq('id', winnerId)
    .single()
  if (fetchErr) throw fetchErr
  if (data.source !== 'manual') throw new Error('자동 당첨자는 삭제할 수 없습니다')
  const { error } = await supabase.from('draw_winners').delete().eq('id', winnerId)
  if (error) throw error
}

// ── Test-only: Draw process simulation ──────────────────────────────────────

export async function getEntryCount(env: AdminEnv, drawId: string): Promise<number> {
  const supabase = createServerClient(env)
  const { count, error } = await supabase
    .from('draw_entries')
    .select('*', { count: 'exact', head: true })
    .eq('draw_id', drawId)
  if (error) throw error
  return count ?? 0
}

export async function closeDrawForTest(env: AdminEnv, drawId: string): Promise<void> {
  const supabase = createServerClient(env)
  const { error } = await supabase
    .from('draws')
    .update({ status: 'closed' })
    .eq('id', drawId)
    .eq('status', 'active')
  if (error) throw error
}

export async function judgeWinnersForTest(
  env: AdminEnv,
  drawId: string,
  winningNumbers: number[],
  bonusNumber: number
): Promise<void> {
  const supabase = createServerClient(env)

  // 1. 당첨번호 저장 (RPC 실행 전 필수)
  const { error: updateErr } = await supabase
    .from('draws')
    .update({ winning_numbers: winningNumbers, bonus_number: bonusNumber })
    .eq('id', drawId)
  if (updateErr) throw updateErr

  // 2. judge_draw_winners RPC 실행 — draw_entries 업데이트 + draw_winners 삽입
  const { error: rpcErr } = await supabase.rpc('judge_draw_winners', { p_draw_id: drawId })
  if (rpcErr) throw rpcErr

  // 3. RPC는 draws.status를 바꾸지 않으므로 직접 업데이트
  const { error: statusErr } = await supabase
    .from('draws')
    .update({ status: 'drawn' })
    .eq('id', drawId)
  if (statusErr) throw statusErr
}

export async function publishDrawForTest(
  env: AdminEnv,
  drawId: string,
  currentRoundNumber: number
): Promise<void> {
  const supabase = createServerClient(env)

  // 1. 현재 회차 완료 처리
  const { error: completeErr } = await supabase
    .from('draws')
    .update({ status: 'completed' })
    .eq('id', drawId)
  if (completeErr) throw completeErr

  // 2. 다음 회차 활성화 (round_number = current + 1)
  // (4/5등 응모권 자동 지급 제거 — 앱에서 수령하기 버튼으로 직접 수령)
  const { data: nextDraw, error: nextErr } = await supabase
    .from('draws')
    .select('id')
    .eq('round_number', currentRoundNumber + 1)
    .single()
  if (nextErr && nextErr.code !== 'PGRST116') throw nextErr

  if (nextDraw) {
    const { error: activateErr } = await supabase
      .from('draws')
      .update({ status: 'active' })
      .eq('id', nextDraw.id)
    if (activateErr) throw activateErr
  } else {
    // 다음 회차가 없으면 새 active 회차 생성
    const now = new Date()
    const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const { error: createErr } = await supabase.from('draws').insert({
      round_number: currentRoundNumber + 1,
      title: '주간 응모',
      description: '응모권으로 참여하는 주간 추첨',
      status: 'active',
      start_date: now.toISOString(),
      end_date: weekLater.toISOString(),
      draw_date: weekLater.toISOString(),
    })
    if (createErr) throw createErr
  }
}

export async function resetDrawForTest(env: AdminEnv, drawId: string, currentRoundNumber: number): Promise<void> {
  const supabase = createServerClient(env)

  // 1. draw_winners 전체 삭제
  const { error: winnersErr } = await supabase
    .from('draw_winners')
    .delete()
    .eq('draw_id', drawId)
  if (winnersErr) throw winnersErr

  // 2. draw_entries 전체 삭제 (테스트 초기화 — 앱에서 재응모 필요)
  const { error: entriesErr } = await supabase
    .from('draw_entries')
    .delete()
    .eq('draw_id', drawId)
  if (entriesErr) throw entriesErr

  // 3. 다음 회차 cleanup (completed 상태에서 publishDraw로 생성된 다음 회차 삭제)
  //    - draw_entries가 없는 경우에만 삭제 (테스트로 생성된 빈 회차)
  //    - 있으면 upcoming으로 되돌리기
  const { data: nextDraw } = await supabase
    .from('draws')
    .select('id, status')
    .eq('round_number', currentRoundNumber + 1)
    .maybeSingle()

  if (nextDraw) {
    const { count: entryCount } = await supabase
      .from('draw_entries')
      .select('*', { count: 'exact', head: true })
      .eq('draw_id', nextDraw.id)

    if (!entryCount || entryCount === 0) {
      // 응모자 없음 → 삭제
      const { error: deleteNextErr } = await supabase
        .from('draws')
        .delete()
        .eq('id', nextDraw.id)
      if (deleteNextErr) throw deleteNextErr
    } else {
      // 응모자 있음 → upcoming으로 복원
      const { error: revertNextErr } = await supabase
        .from('draws')
        .update({ status: 'upcoming' })
        .eq('id', nextDraw.id)
      if (revertNextErr) throw revertNextErr
    }
  }

  // 4. 현재 draws 상태 롤백
  const { error: drawErr } = await supabase
    .from('draws')
    .update({ status: 'active', winning_numbers: null, bonus_number: null })
    .eq('id', drawId)
  if (drawErr) throw drawErr
}
