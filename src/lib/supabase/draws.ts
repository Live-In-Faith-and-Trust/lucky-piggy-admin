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
}

export interface WinnerRankSummary {
  prize_rank: number
  count: number
  amount: number | null
  per_winner_amount: number | null
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

    return [1, 2, 3, 4, 5].map((rank) => {
      const count = countMap[rank] ?? 0
      const amount = prizeMap[rank] ?? null
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
    return (data ?? []) as DrawWinner[]
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
