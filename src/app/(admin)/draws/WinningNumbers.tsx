import LottoBall from '@/app/(admin)/dashboard/LottoBall'
import { type Draw } from '@/lib/supabase/draws'

interface Props {
  draw: Draw
}

export default function WinningNumbers({ draw }: Props) {
  const { winning_numbers, bonus_number, status } = draw

  if (!winning_numbers || winning_numbers.length === 0) {
    const label =
      status === 'upcoming' || status === 'active'
        ? '추첨 전'
        : status === 'closed'
        ? '당첨번호 집계 중'
        : '당첨번호 없음'

    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-border bg-card">
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    )
  }

  const sorted = [...winning_numbers].sort((a, b) => a - b)

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card">
      <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground shrink-0">
        당첨번호
      </span>
      <div className="flex items-center gap-1.5">
        {sorted.map((n) => (
          <LottoBall key={n} number={n} />
        ))}
        {bonus_number !== null && (
          <>
            <span className="text-muted-foreground text-sm mx-0.5">+</span>
            <LottoBall number={bonus_number} isBonus />
          </>
        )}
      </div>
    </div>
  )
}
