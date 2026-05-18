import { type WinnerRankSummary } from '@/lib/supabase/draws'
import { formatKRW } from '@/lib/format'

const RANK_LABELS: Record<number, string> = {
  1: '1등',
  2: '2등',
  3: '3등',
  4: '4등',
  5: '5등',
}

interface Props {
  summary: WinnerRankSummary[]
}

export default function WinnerSummary({ summary }: Props) {
  return (
    <div className="flex flex-wrap gap-3">
      {summary.map((s) => (
        <div
          key={s.prize_rank}
          className={`rounded-lg border border-border bg-card px-4 py-3 ${s.count === 0 ? 'opacity-50' : ''}`}
        >
          <p className="text-xs font-medium text-muted-foreground">{RANK_LABELS[s.prize_rank]}</p>
          <p className="text-lg font-bold text-foreground tabular-nums">
            {s.count.toLocaleString('ko-KR')}명
          </p>
          {s.prize_rank <= 3 && s.per_winner_amount !== null && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatKRW(s.per_winner_amount)}/인
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
