// src/app/(admin)/dashboard/LottoBall.tsx

function getBallColor(n: number): string {
  if (n <= 9) return '#FBC400'
  if (n <= 19) return '#69C8F2'
  if (n <= 29) return '#FF7272'
  if (n <= 39) return '#AAAAAA'
  return '#B0D840'
}

export default function LottoBall({ number }: { number: number }) {
  const bg = getBallColor(number)
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm"
      style={{ backgroundColor: bg }}
    >
      {number}
    </div>
  )
}
