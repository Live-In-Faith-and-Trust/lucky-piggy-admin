export const dynamic = 'force-dynamic'

import { getAdminEnv } from '@/lib/supabase/server'
import { getDrawList, getWinnerSummary, getWinners1to3, getEntryStats } from '@/lib/supabase/draws'
import DrawSelector from './DrawSelector'
import WinnerSummary from './WinnerSummary'
import WinnerList from './WinnerList'
import WinningNumbers from './WinningNumbers'
import TestControlPanel from './_components/TestControlPanel'

interface SearchParams {
  drawId?: string
}

export default async function DrawsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const env = await getAdminEnv()
  const draws = await getDrawList(env)

  const startedDraws = draws.filter((d) => d.status !== 'upcoming')
  const defaultDraw = startedDraws[0] ?? draws[0]
  const drawId = params.drawId ?? defaultDraw?.id ?? null

  if (!drawId) {
    return (
      <div className="space-y-6">
        <h1 className="text-lg font-semibold text-foreground">당첨자 관리</h1>
        <div className="text-center py-12 text-muted-foreground text-sm">
          회차 데이터가 없습니다
        </div>
      </div>
    )
  }

  const [summary, winners, entryStats] = await Promise.all([
    getWinnerSummary(env, drawId),
    getWinners1to3(env, drawId),
    getEntryStats(env, drawId),
  ])

  const currentDraw = draws.find((d) => d.id === drawId) ?? draws[0]

  const rankAmounts = Object.fromEntries(
    summary.map((s) => [s.prize_rank, s.per_winner_amount])
  ) as Record<number, number | null>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">당첨자 관리</h1>
        <DrawSelector draws={startedDraws} currentDrawId={currentDraw?.id ?? drawId} />
      </div>
      {currentDraw && env !== 'production' && (
        <TestControlPanel
          drawId={currentDraw.id}
          roundNumber={currentDraw.round_number}
          status={currentDraw.status}
        />
      )}
      {currentDraw && <WinningNumbers draw={currentDraw} />}
      <WinnerSummary summary={summary} entryStats={entryStats} />
      <WinnerList
        winners={winners}
        drawId={drawId}
        rankAmounts={rankAmounts}
        roundNumber={currentDraw?.round_number ?? 0}
      />
    </div>
  )
}
