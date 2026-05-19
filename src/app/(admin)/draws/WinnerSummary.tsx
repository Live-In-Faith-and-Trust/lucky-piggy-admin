import { type WinnerRankSummary, type DrawEntryStats } from '@/lib/supabase/draws'
import { formatKRW } from '@/lib/format'

const RANK_LABELS: Record<number, string> = {
  1: '1등',
  2: '2등',
  3: '3등',
  4: '4등',
  5: '5등',
}

const RANK_CARD: Record<number, { card: string; label: string; value: string; sub: string }> = {
  1: {
    card: 'bg-[#FFFBEA] border-[#FFDD13]/70',
    label: 'text-[#92400E]',
    value: 'text-[#78350F]',
    sub: 'text-[#92400E]/60',
  },
  2: {
    card: 'bg-slate-50 border-slate-200',
    label: 'text-slate-400',
    value: 'text-slate-700',
    sub: 'text-slate-500/70',
  },
  3: {
    card: 'bg-orange-50 border-orange-200',
    label: 'text-orange-400',
    value: 'text-orange-800',
    sub: 'text-orange-600/60',
  },
}

interface Props {
  summary: WinnerRankSummary[]
  entryStats: DrawEntryStats
}

export default function WinnerSummary({ summary, entryStats }: Props) {
  const avg =
    entryStats.entrant_count > 0
      ? (entryStats.entry_count / entryStats.entrant_count).toFixed(1)
      : null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* 응모 현황 — joined pill */}
      <div className="flex items-stretch divide-x divide-border rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-2.5">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-[#1A4FD8]">응모 인원</p>
          <p className="text-[15px] font-bold tabular-nums tracking-tight text-foreground leading-snug">
            {entryStats.entrant_count.toLocaleString('ko-KR')}
            <span className="text-xs font-medium text-muted-foreground ml-0.5">명</span>
          </p>
        </div>
        <div className="px-4 py-2.5">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-[#1A4FD8]">총 응모 수</p>
          <p className="text-[15px] font-bold tabular-nums tracking-tight text-foreground leading-snug">
            {entryStats.entry_count.toLocaleString('ko-KR')}
            <span className="text-xs font-medium text-muted-foreground ml-0.5">장</span>
          </p>
          {avg && (
            <p className="text-[10px] text-muted-foreground tracking-tight">평균 {avg}장</p>
          )}
        </div>
      </div>

      <span className="h-7 w-px bg-border self-center" />

      {/* 당첨자 현황 */}
      {summary.map((s) => {
        const style = RANK_CARD[s.prize_rank]
        return (
          <div
            key={s.prize_rank}
            className={`px-4 py-2.5 rounded-xl border transition-opacity ${s.count === 0 ? 'opacity-25' : ''} ${style ? style.card : 'bg-card border-border'}`}
          >
            <p className={`text-[10px] font-semibold tracking-widest uppercase ${style ? style.label : 'text-muted-foreground'}`}>
              {RANK_LABELS[s.prize_rank]}
            </p>
            <p className={`text-[15px] font-bold tabular-nums tracking-tight leading-snug ${style ? style.value : 'text-foreground'}`}>
              {s.count.toLocaleString('ko-KR')}
              <span className="text-xs font-medium opacity-50 ml-0.5">명</span>
            </p>
            {s.prize_rank <= 3 && s.per_winner_amount !== null && (
              <p className={`text-[10px] tracking-tight ${style ? style.sub : 'text-muted-foreground'}`}>
                {formatKRW(s.per_winner_amount)}/인
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
