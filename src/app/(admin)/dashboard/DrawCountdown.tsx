'use client'

import { useEffect, useState } from 'react'

type TimeLeft = { days: number; hours: number; minutes: number; seconds: number }

function getTimeLeft(drawDate: string): TimeLeft | null {
  const diff = new Date(drawDate).getTime() - Date.now()
  if (diff <= 0) return null
  const total = Math.floor(diff / 1000)
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  }
}

export default function DrawCountdown({ drawDate }: { drawDate: string }) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(() => getTimeLeft(drawDate))

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(getTimeLeft(drawDate)), 1000)
    return () => clearInterval(id)
  }, [drawDate])

  if (!timeLeft) {
    return <p className="text-sm text-muted-foreground">추첨 완료</p>
  }

  const units: { label: string; value: number }[] = [
    { label: '일', value: timeLeft.days },
    { label: '시', value: timeLeft.hours },
    { label: '분', value: timeLeft.minutes },
    { label: '초', value: timeLeft.seconds },
  ]

  return (
    <div className="flex gap-3">
      {units.map(({ label, value }) => (
        <div key={label} className="flex flex-col items-center">
          <span className="text-2xl font-bold text-foreground tabular-nums">
            {String(value).padStart(2, '0')}
          </span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  )
}
