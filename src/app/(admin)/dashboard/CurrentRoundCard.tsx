import DrawCountdown from './DrawCountdown'

type Props = {
  roundNumber: number
  drawDate: string  // ISO 8601 UTC string
}

function formatKSTDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export default function CurrentRoundCard({ roundNumber, drawDate }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
      <p className="text-xs font-medium text-muted-foreground">이번 주 추첨</p>
      <div>
        <p className="text-2xl font-bold text-foreground">제{roundNumber}회</p>
        <p className="text-sm text-primary mt-1">{formatKSTDate(drawDate)} 추첨 예정</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-2">남은 시간</p>
        <DrawCountdown drawDate={drawDate} />
      </div>
    </div>
  )
}
