'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  value: number
  decimals?: number   // 소수점 자릿수 (없으면 정수 + ko-KR 포맷)
  className?: string
}

export default function AnimatedNumber({ value, decimals, className }: Props) {
  const [display, setDisplay] = useState(value)
  const prevRef = useRef(value)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    const from = prevRef.current
    const to = value
    if (from === to) return

    const DURATION = 600
    const start = performance.now()

    const tick = (now: number) => {
      const progress = Math.min((now - start) / DURATION, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setDisplay(from + (to - from) * eased)
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        prevRef.current = to
        setDisplay(to)
      }
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => { if (frameRef.current !== null) cancelAnimationFrame(frameRef.current) }
  }, [value])

  const formatted =
    decimals !== undefined
      ? display.toFixed(decimals)
      : Math.round(display).toLocaleString('ko-KR')

  return <span className={className}>{formatted}</span>
}
