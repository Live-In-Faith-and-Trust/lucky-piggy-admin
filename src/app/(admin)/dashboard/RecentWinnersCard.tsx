import type { DrawWinnerSummary } from '@/lib/supabase/analytics'
import LottoBall from './LottoBall'

type Props = {
  roundNumber: number
  winners: DrawWinnerSummary[]
  winningNumbers?: number[] | null
  bonusNumber?: number | null
}

const RANK_EMOJI: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }
const RANK_LABEL: Record<number, string> = { 1: '1등', 2: '2등', 3: '3등' }

type PaymentStatus = 'pending' | 'paid' | 'cancelled'

function PaymentBadge({ status }: { status: PaymentStatus }) {
  if (status === 'paid') {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
        지급완료
      </span>
    )
  }
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
        대기중
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
      취소
    </span>
  )
}

export default function RecentWinnersCard({ roundNumber, winners, winningNumbers, bonusNumber }: Props) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 flex flex-col gap-4">
      <p className="text-xs font-semibold text-muted-foreground tracking-tight uppercase">
        {roundNumber}회 당첨자
      </p>

      {/* 당첨번호 */}
      {winningNumbers && winningNumbers.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground tracking-tight">당첨번호</span>
          <div className="flex items-center gap-1.5">
            {winningNumbers.map((n) => (
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

      {/* 당첨자 리스트 */}
      {winners.length === 0 ? (
        <p className="text-sm text-muted-foreground tracking-tight">
          {winningNumbers && winningNumbers.length > 0 ? '당첨자 없음' : '추첨 전'}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {winners.map((w) => (
            <div key={w.id} className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 min-w-0">
                <span className="text-base leading-none mt-0.5" aria-hidden>
                  {RANK_EMOJI[w.prize_rank] ?? '🏅'}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-foreground tracking-tight">
                      {RANK_LABEL[w.prize_rank] ?? `${w.prize_rank}등`}
                    </span>
                    <span className="text-xs text-muted-foreground tracking-tight truncate">
                      {w.real_name ?? '(이름 미제출)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {w.prize_amount != null && (
                      <span className="text-[11px] tabular-nums text-muted-foreground tracking-tight">
                        {w.prize_amount.toLocaleString('ko-KR')}원
                      </span>
                    )}
                    {!w.account_verified && (
                      <span className="text-[10px] text-orange-500 dark:text-orange-400">계좌미확인</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="shrink-0">
                <PaymentBadge status={w.payment_status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
