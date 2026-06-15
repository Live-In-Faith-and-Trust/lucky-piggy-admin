import type { DrawExpectedValueData, DrawTierStat } from '@/lib/supabase/analytics'
import AnimatedNumber from './AnimatedNumber'

type Props = {
  roundNumber: number
  data: DrawExpectedValueData | null
}

const RANK_LABEL: Record<number, string> = { 1: '1등', 2: '2등', 3: '3등' }

function TierTable({ tiers, totalPayout }: { tiers: DrawTierStat[]; totalPayout: number }) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-border">
          <th className="text-left py-1.5 pr-3 font-medium text-muted-foreground tracking-tight">등수</th>
          <th className="text-right py-1.5 px-2 font-medium text-muted-foreground tracking-tight">당첨 확률</th>
          <th className="text-right py-1.5 pl-2 font-medium text-muted-foreground tracking-tight">기대지급액</th>
        </tr>
      </thead>
      <tbody>
        {tiers.map((tier) => {
          const pct = tier.pExistsAtLeastOne * 100
          return (
            <tr key={tier.rank} className="border-b border-border/40">
              <td className="py-1.5 pr-3 font-medium text-foreground tracking-tight">
                {RANK_LABEL[tier.rank] ?? `${tier.rank}등`}
              </td>
              <td className="py-1.5 px-2 text-right tabular-nums text-foreground tracking-tight">
                {pct >= 99.5 ? '≈100%' : <><AnimatedNumber value={pct} decimals={2} />%</>}
              </td>
              <td className="py-1.5 pl-2 text-right tabular-nums text-foreground tracking-tight">
                <AnimatedNumber value={Math.round(tier.expectedPayout)} />원
              </td>
            </tr>
          )
        })}
        <tr>
          <td className="pt-2 pr-3 font-semibold text-foreground tracking-tight">합계</td>
          <td className="pt-2 px-2 text-right text-muted-foreground">—</td>
          <td className="pt-2 pl-2 text-right tabular-nums font-semibold text-foreground tracking-tight">
            <AnimatedNumber value={Math.round(totalPayout)} />원
          </td>
        </tr>
      </tbody>
    </table>
  )
}

export default function ExpectedValueCard({ roundNumber, data }: Props) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 flex flex-col gap-5">
      <p className="text-xs font-semibold text-muted-foreground tracking-tight uppercase">
        {roundNumber}회 응모권 기댓값
      </p>

      {data === null ? (
        <p className="text-sm text-muted-foreground tracking-tight">데이터 없음</p>
      ) : (
        <>
          {(() => {
            const entryRate = data.heldTickets > 0
              ? (data.enteredTickets / data.heldTickets) * 100
              : 0
            return (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-[11px] font-medium text-muted-foreground tracking-tight mb-1.5">
                    현재 보유 응모권
                  </p>
                  <p className="text-xl font-bold tabular-nums tracking-tight text-foreground">
                    <AnimatedNumber value={data.heldTickets} />
                    <span className="text-xs font-normal text-muted-foreground ml-1">장</span>
                  </p>
                  <p className="text-xs tabular-nums text-muted-foreground tracking-tight mt-1">
                    기댓값{' '}
                    <span className="text-foreground font-semibold">
                      <AnimatedNumber value={data.heldPerTicket} decimals={2} />원
                    </span>
                    /장
                  </p>
                  <p className="text-xs tabular-nums text-muted-foreground tracking-tight mt-0.5">
                    총 <AnimatedNumber value={Math.round(data.heldExpectedPayout)} />원
                  </p>
                </div>

                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-[11px] font-medium text-muted-foreground tracking-tight mb-1.5">
                    실제 응모 응모권
                  </p>
                  <p className="text-xl font-bold tabular-nums tracking-tight text-foreground">
                    <AnimatedNumber value={data.enteredTickets} />
                    <span className="text-xs font-normal text-muted-foreground ml-1">장</span>
                  </p>
                  <p className="text-xs tabular-nums text-muted-foreground tracking-tight mt-1">
                    기댓값{' '}
                    <span className="text-foreground font-semibold">
                      <AnimatedNumber value={data.enteredPerTicket} decimals={2} />원
                    </span>
                    /장
                  </p>
                  <p className="text-xs tabular-nums text-muted-foreground tracking-tight mt-0.5">
                    총 <AnimatedNumber value={Math.round(data.enteredExpectedPayout)} />원
                  </p>
                  <p className="text-[11px] tabular-nums font-medium tracking-tight mt-1.5">
                    <span className="text-foreground">
                      <AnimatedNumber value={entryRate} decimals={1} />%
                    </span>
                    <span className="text-muted-foreground"> 응모</span>
                  </p>
                </div>
              </div>
            )
          })()}

          <div>
            <p className="text-[11px] text-muted-foreground tracking-tight mb-2">
              등수별 확률 (응모 기준)
            </p>
            <TierTable tiers={data.enteredTiers} totalPayout={data.enteredExpectedPayout} />
          </div>
        </>
      )}
    </div>
  )
}
