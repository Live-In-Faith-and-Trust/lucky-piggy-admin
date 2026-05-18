import { getSupabaseClient } from '@/lib/supabase/server'
import CurrentRoundCard from './CurrentRoundCard'
import PreviousRoundCard from './PreviousRoundCard'

type DrawRow = {
  round_number: number
  draw_date: string
  winning_numbers: number[] | null
  bonus_number: number | null
}

// DB의 draw_date는 실제 추첨 처리 시각이 다를 수 있으므로
// 날짜만 유지하고 시간을 매주 토요일 20:30 KST(11:30 UTC)로 정규화
function normalizeToDrawTime(drawDate: string): string {
  const d = new Date(drawDate)
  d.setUTCHours(11, 30, 0, 0)
  return d.toISOString()
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
          drawDate={normalizeToDrawTime(current.draw_date)}
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
