import LottoBall from './LottoBall'

type Props = {
  roundNumber: number
  drawDate: string
  winningNumbers: number[] | null
  bonusNumber: number | null
}

function formatKSTDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export default function PreviousRoundCard({ roundNumber, drawDate, winningNumbers, bonusNumber }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
      <p className="text-xs font-medium text-muted-foreground">최근 추첨 결과</p>
      <div>
        <p className="text-2xl font-bold text-foreground">제{roundNumber}회</p>
        <p className="text-sm text-muted-foreground mt-1">{formatKSTDate(drawDate)} 추첨</p>
      </div>
      {winningNumbers && winningNumbers.length > 0 ? (
        <div className="flex items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap gap-2">
              {winningNumbers.map((n) => (
                <LottoBall key={n} number={n} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center">당첨번호</p>
          </div>
          {bonusNumber != null && (
            <>
              <span className="text-muted-foreground font-bold text-lg mb-5">+</span>
              <div className="flex flex-col gap-1.5 items-center">
                <LottoBall number={bonusNumber} />
                <p className="text-xs text-muted-foreground">보너스번호</p>
              </div>
            </>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">결과 대기중</p>
      )}
    </div>
  )
}
