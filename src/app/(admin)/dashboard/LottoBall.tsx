// src/app/(admin)/dashboard/LottoBall.tsx

type BallStyle = { bg: string; text: string }

function getBallStyle(n: number): BallStyle {
  if (n <= 10) return { bg: '#FBC400', text: '#1A1A1A' }
  if (n <= 20) return { bg: '#69C8F2', text: '#1A1A1A' }
  if (n <= 30) return { bg: '#FF7272', text: '#FFFFFF' }
  if (n <= 40) return { bg: '#AAAAAA', text: '#FFFFFF' }
  return { bg: '#B0D840', text: '#1A1A1A' }
}

const BONUS_STYLE: BallStyle = { bg: '#FE6A86', text: '#FFFFFF' }

export default function LottoBall({ number, isBonus = false }: { number: number; isBonus?: boolean }) {
  const { bg, text } = isBonus ? BONUS_STYLE : getBallStyle(number)
  return (
    <div
      className="size-8 rounded-full flex items-center justify-center text-xs font-bold tabular-nums"
      style={{ backgroundColor: bg, color: text }}
    >
      {number}
    </div>
  )
}
