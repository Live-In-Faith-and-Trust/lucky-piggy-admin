import { getSupabaseClient } from '@/lib/supabase/server'

// ─── 타입 ────────────────────────────────────────────────────────────────────

export interface DrawTierStat {
  rank: number
  matchCombinations: number
  pExistsAtLeastOne: number  // 1 - e^(-lambda)
  prizeAmount: number
  expectedPayout: number
}

export interface DrawExpectedValueData {
  heldTickets: number         // 사용자 보유 응모권 합계 (ticket_balances)
  enteredTickets: number      // 현재 회차 실제 응모 응모권 (draw_entries)
  heldTiers: DrawTierStat[]   // 보유 기준 등수별 통계
  enteredTiers: DrawTierStat[] // 응모 기준 등수별 통계
  heldExpectedPayout: number
  enteredExpectedPayout: number
  heldPerTicket: number       // 보유 기준 1장 기댓값
  enteredPerTicket: number    // 응모 기준 1장 기댓값
}

export interface DrawWinnerSummary {
  id: string
  prize_rank: number
  real_name: string | null
  payment_status: 'pending' | 'paid' | 'cancelled'
  account_verified: boolean
  prize_amount: number | null
}

// ─── 상수 ────────────────────────────────────────────────────────────────────

const TOTAL_COMBO = 8_145_060 // C(45,6)

const MATCH_COMBOS: Record<number, number> = { 1: 1, 2: 6, 3: 228 }

const DEFAULT_PRIZE: Record<number, number> = {
  1: 10_000_000,
  2: 1_000_000,
  3: 1_000_000,
}

// ─── 헬퍼 ────────────────────────────────────────────────────────────────────

function computeTiers(n: number, prizeMap: Record<number, number>): DrawTierStat[] {
  return [1, 2, 3].map((rank) => {
    const matchCombinations = MATCH_COMBOS[rank]
    const lambda = n * (matchCombinations / TOTAL_COMBO)
    const pExistsAtLeastOne = 1 - Math.exp(-lambda)
    const prizeAmount = prizeMap[rank] ?? DEFAULT_PRIZE[rank]
    return { rank, matchCombinations, pExistsAtLeastOne, prizeAmount, expectedPayout: prizeAmount * pExistsAtLeastOne }
  })
}

// ─── 함수 ────────────────────────────────────────────────────────────────────

/**
 * 보유 응모권(ticket_balances)과 실제 응모 응모권(draw_entries)을 각각 집계해
 * 로또 6/45 포아송 근사로 기댓값을 계산한다.
 */
export async function getDrawExpectedValue(drawId: string): Promise<DrawExpectedValueData | null> {
  try {
    const supabase = await getSupabaseClient()

    const [statsResult, prizeResult] = await Promise.all([
      // DB 집계 함수로 SUM — PostgREST max_rows 제한 우회
      supabase.rpc('get_draw_ticket_stats', { p_draw_id: drawId }),
      // 해당 회차 상금 구조
      supabase
        .from('draw_prizes')
        .select('prize_rank, amount')
        .eq('draw_id', drawId)
        .order('prize_rank', { ascending: true }),
    ])

    if (statsResult.error) throw statsResult.error
    if (prizeResult.error) throw prizeResult.error

    const stats = statsResult.data as { held_tickets: number; entered_tickets: number }
    const heldTickets = stats?.held_tickets ?? 0
    const enteredTickets = stats?.entered_tickets ?? 0

    const prizeMap: Record<number, number> = Object.fromEntries(
      (prizeResult.data ?? []).map((r: { prize_rank: number; amount: number }) => [r.prize_rank, r.amount]),
    )

    const heldTiers = computeTiers(heldTickets, prizeMap)
    const enteredTiers = computeTiers(enteredTickets, prizeMap)

    const heldExpectedPayout = heldTiers.reduce((s, t) => s + t.expectedPayout, 0)
    const enteredExpectedPayout = enteredTiers.reduce((s, t) => s + t.expectedPayout, 0)

    return {
      heldTickets,
      enteredTickets,
      heldTiers,
      enteredTiers,
      heldExpectedPayout,
      enteredExpectedPayout,
      heldPerTicket: heldTickets > 0 ? heldExpectedPayout / heldTickets : 0,
      enteredPerTicket: enteredTickets > 0 ? enteredExpectedPayout / enteredTickets : 0,
    }
  } catch {
    return null
  }
}

/**
 * 직전 회차 1~3등 당첨자 조회
 */
export async function getPreviousDrawWinners(drawId: string): Promise<DrawWinnerSummary[]> {
  try {
    const supabase = await getSupabaseClient()

    const [winnersResult, prizesResult] = await Promise.all([
      supabase
        .from('draw_winners')
        .select('id, prize_rank, real_name, payment_status, account_verified')
        .eq('draw_id', drawId)
        .in('prize_rank', [1, 2, 3])
        .order('prize_rank', { ascending: true }),
      supabase
        .from('draw_prizes')
        .select('prize_rank, amount')
        .eq('draw_id', drawId)
        .in('prize_rank', [1, 2, 3]),
    ])

    if (winnersResult.error) throw winnersResult.error
    if (prizesResult.error) throw prizesResult.error

    const prizeMap: Record<number, number> = Object.fromEntries(
      (prizesResult.data ?? []).map(
        (r: { prize_rank: number; amount: number }) => [r.prize_rank, r.amount],
      ),
    )

    return (winnersResult.data ?? []).map(
      (w: {
        id: string
        prize_rank: number
        real_name: string | null
        payment_status: 'pending' | 'paid' | 'cancelled'
        account_verified: boolean
      }): DrawWinnerSummary => ({
        id: w.id,
        prize_rank: w.prize_rank,
        real_name: w.real_name,
        payment_status: w.payment_status,
        account_verified: w.account_verified,
        prize_amount: prizeMap[w.prize_rank] ?? null,
      }),
    )
  } catch {
    return []
  }
}
