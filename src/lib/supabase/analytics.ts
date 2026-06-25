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

/** 직전 회차 등수별 당첨자/지급액 요약 */
export interface DrawWinnerRankPayout {
  rank: number
  autoCount: number       // 실제(자동) 당첨자 수 — 우리가 실제 지급하는 대상
  totalCount: number      // auto+manual — 1인당 금액 분모(수동 포함 희석)
  prizeAmount: number     // 해당 등수 총 상금 풀
  perWinnerPayout: number // amount ÷ totalCount (수동 포함 1/n)
  rankPayout: number      // 실제 지급액 = perWinnerPayout × autoCount (수동 미지급)
}

export interface DrawWinnerPayoutSummary {
  ranks: DrawWinnerRankPayout[]
  totalPayout: number     // 실제 지급 예정액 총합 (Σ rankPayout)
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
 * 직전 회차 등수별 당첨자 수 + 실제 지급 예정액.
 * - 표시 인원수: source='auto' (수동 제외) count
 * - 1인당 지급액: draw_prizes.amount(총 상금 풀) ÷ 전체 당첨자 수(auto+manual) — 수동 포함 희석
 * - 실제 지급액: 1인당 × auto 수 (수동 당첨자는 미지급) → auto 0명이면 0원
 * - 상금 풀(amount)이 있는 현금 등수만 반환.
 * 행 데이터를 전송하지 않는 count-only(head) 쿼리로 응모자 많은 등수도 안전하게 집계.
 */
export async function getPreviousDrawWinnerPayout(drawId: string): Promise<DrawWinnerPayoutSummary> {
  const ranks = [1, 2, 3, 4, 5]
  try {
    const supabase = await getSupabaseClient()

    const [prizeResult, ...countResults] = await Promise.all([
      supabase.from('draw_prizes').select('prize_rank, amount').eq('draw_id', drawId),
      // 등수별 [auto count, total count] — 모두 head(count-only)
      ...ranks.flatMap((rank) => [
        supabase.from('draw_winners').select('*', { count: 'exact', head: true })
          .eq('draw_id', drawId).eq('prize_rank', rank).eq('source', 'auto'),
        supabase.from('draw_winners').select('*', { count: 'exact', head: true })
          .eq('draw_id', drawId).eq('prize_rank', rank),
      ]),
    ])

    const prizeMap: Record<number, number> = Object.fromEntries(
      (prizeResult.data ?? [])
        .filter((r: { amount: number | null }) => r.amount != null)
        .map((r: { prize_rank: number; amount: number }) => [r.prize_rank, r.amount]),
    )

    const payoutRanks: DrawWinnerRankPayout[] = ranks
      .filter((rank) => prizeMap[rank] != null)
      .map((rank) => {
        const i = ranks.indexOf(rank)
        const autoCount = countResults[i * 2].count ?? 0
        const totalCount = countResults[i * 2 + 1].count ?? 0
        const prizeAmount = prizeMap[rank]
        const perWinnerPayout = totalCount > 0 ? Math.floor(prizeAmount / totalCount) : 0
        return {
          rank,
          autoCount,
          totalCount,
          prizeAmount,
          perWinnerPayout,
          rankPayout: perWinnerPayout * autoCount,
        }
      })

    const totalPayout = payoutRanks.reduce((s, r) => s + r.rankPayout, 0)
    return { ranks: payoutRanks, totalPayout }
  } catch {
    return { ranks: [], totalPayout: 0 }
  }
}
