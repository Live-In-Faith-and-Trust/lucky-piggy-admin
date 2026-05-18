import { getSupabaseClient } from '@/lib/supabase/server'
import CurrentRoundCard from './CurrentRoundCard'
import PreviousRoundCard from './PreviousRoundCard'

type DrawRow = {
  round_number: number
  draw_date: string
  winning_numbers: number[] | null
  bonus_number: number | null
}

async function getDrawData(): Promise<{ current: DrawRow | null; previous: DrawRow | null }> {
  try {
    const supabase = await getSupabaseClient()
    const now = new Date().toISOString()
    const [currentResult, previousResult] = await Promise.all([
      supabase
        .from('draws')
        .select('round_number, draw_date, winning_numbers, bonus_number')
        .gte('draw_date', now)
        .order('draw_date', { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('draws')
        .select('round_number, draw_date, winning_numbers, bonus_number')
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

export default async function DrawSection() {
  const { current, previous } = await getDrawData()

  if (!current && !previous) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {current ? (
        <CurrentRoundCard
          roundNumber={current.round_number}
          drawDate={current.draw_date}
        />
      ) : (
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">진행 중인 회차 없음</p>
        </div>
      )}
      {previous ? (
        <PreviousRoundCard
          roundNumber={previous.round_number}
          drawDate={previous.draw_date}
          winningNumbers={previous.winning_numbers}
          bonusNumber={previous.bonus_number}
        />
      ) : (
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">이전 회차 없음</p>
        </div>
      )}
    </div>
  )
}
