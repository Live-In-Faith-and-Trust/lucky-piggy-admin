import { getSupabaseClient } from '@/lib/supabase/server'
import { getDrawExpectedValue, getPreviousDrawWinnerPayout } from '@/lib/supabase/analytics'
import type { DrawExpectedValueData, DrawWinnerPayoutSummary } from '@/lib/supabase/analytics'
import ExpectedValueCard from './ExpectedValueCard'
import RecentWinnersCard from './RecentWinnersCard'

type DrawRow = {
  id: string
  round_number: number
  end_date: string
  draw_date: string
  winning_numbers: number[] | null
  bonus_number: number | null
}

async function getAnalyticsDrawData(): Promise<{
  current: DrawRow | null
  previous: DrawRow | null
}> {
  try {
    const supabase = await getSupabaseClient()
    const now = new Date().toISOString()
    const [currentResult, previousResult] = await Promise.all([
      supabase
        .from('draws')
        .select('id, round_number, end_date, draw_date, winning_numbers, bonus_number')
        .gte('draw_date', now)
        .order('draw_date', { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('draws')
        .select('id, round_number, end_date, draw_date, winning_numbers, bonus_number')
        .lt('draw_date', now)
        .order('draw_date', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])
    return {
      current: (currentResult.data as DrawRow) ?? null,
      previous: (previousResult.data as DrawRow) ?? null,
    }
  } catch {
    return { current: null, previous: null }
  }
}

export default async function DrawAnalyticsSection() {
  const { current, previous } = await getAnalyticsDrawData()

  const [expectedValueData, payout]: [DrawExpectedValueData | null, DrawWinnerPayoutSummary] =
    await Promise.all([
      current ? getDrawExpectedValue(current.id) : Promise.resolve(null),
      previous ? getPreviousDrawWinnerPayout(previous.id) : Promise.resolve({ ranks: [], totalPayout: 0 }),
    ])

  if (!current && !previous) return null

  return (
    <div>
      <p className="text-sm font-semibold text-foreground tracking-tight mb-4">추첨 분석</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {current ? (
          <ExpectedValueCard roundNumber={current.round_number} data={expectedValueData} />
        ) : (
          <div className="bg-card rounded-xl border border-border p-5">
            <p className="text-sm text-muted-foreground tracking-tight">진행 중인 회차 없음</p>
          </div>
        )}
        {previous ? (
          <RecentWinnersCard
            roundNumber={previous.round_number}
            payout={payout}
            winningNumbers={previous.winning_numbers}
            bonusNumber={previous.bonus_number}
          />
        ) : (
          <div className="bg-card rounded-xl border border-border p-5">
            <p className="text-sm text-muted-foreground tracking-tight">이전 회차 없음</p>
          </div>
        )}
      </div>
    </div>
  )
}
