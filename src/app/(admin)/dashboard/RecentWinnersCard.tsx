import type { DrawWinnerPayoutSummary } from '@/lib/supabase/analytics'
import LottoBall from './LottoBall'

type Props = {
  roundNumber: number
  payout: DrawWinnerPayoutSummary
  winningNumbers?: number[] | null
  bonusNumber?: number | null
}

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`

export default function RecentWinnersCard({ roundNumber, payout, winningNumbers, bonusNumber }: Props) {
  const hasDrawn = !!(winningNumbers && winningNumbers.length > 0)

  return (
    <div className="bg-card rounded-xl border border-border p-5 flex flex-col gap-4">
      <p className="text-xs font-semibold text-muted-foreground tracking-tight uppercase">
        {roundNumber}회 당첨자
      </p>

      {/* 당첨번호 */}
      {hasDrawn && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground tracking-tight">당첨번호</span>
          <div className="flex items-center gap-1.5">
            {winningNumbers!.map((n) => (
              <LottoBall key={n} number={n} />
            ))}
            {bonusNumber != null && (
              <>
                <span className="text-muted-foreground font-bold text-sm">+</span>
                <LottoBall number={bonusNumber} isBonus />
              </>
            )}
          </div>
        </div>
      )}

      {/* 등수별 실제 당첨자 인원수 · 1인당 지급액 */}
      {!hasDrawn ? (
        <p className="text-sm text-muted-foreground tracking-tight">추첨 전</p>
      ) : payout.ranks.length === 0 ? (
        <p className="text-sm text-muted-foreground tracking-tight">지급 대상 당첨자 없음</p>
      ) : (
        <div className="flex flex-col gap-2">
          {payout.ranks.map((r) => (
            <div
              key={r.rank}
              className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground tracking-tight">{r.rank}등</span>
                <span className="text-xs text-muted-foreground tracking-tight tabular-nums">
                  {r.autoCount}명
                </span>
              </div>
              <span className="text-sm font-bold tabular-nums text-foreground">
                {won(r.perWinnerPayout)}
                <span className="text-[11px] font-normal text-muted-foreground ml-1">/ 1인</span>
              </span>
            </div>
          ))}

          {/* 지급액 총합 (수동 포함 1/n 실제 지급 예정액) */}
          <div className="flex items-center justify-between border-t border-border pt-2.5 mt-0.5">
            <span className="text-xs font-medium text-muted-foreground tracking-tight">
              지급액 총합
            </span>
            <span className="text-base font-bold tabular-nums text-foreground">
              {won(payout.totalPayout)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
