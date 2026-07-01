'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import TrendChart, { type DayData, type Tab } from './TrendChart'

type Props = {
  weeklyData: DayData[]
  monthlyData: DayData[]
}

export default function DauSection({ weeklyData, monthlyData }: Props) {
  const [tab, setTab] = useState<Tab>('month')
  const data = tab === 'week' ? weeklyData : monthlyData

  const latest = data.length > 0 ? data[data.length - 1].count : 0
  const avg = data.length > 0 ? Math.round(data.reduce((s, d) => s + d.count, 0) / data.length) : 0
  const deltaPct = avg === 0 ? 0 : Math.round(((latest - avg) / avg) * 100)

  const positive = deltaPct >= 0
  const neutralZero = deltaPct === 0

  return (
    <div className="flex flex-col gap-4">
      {/* 요약 카드 */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground tracking-tight mb-2">전날 DAU</p>
            <p className="text-2xl font-bold tabular-nums tracking-tight text-foreground">
              {latest.toLocaleString('ko-KR')}명
            </p>
          </div>
          <div className="text-right">
            <p className={cn('text-sm font-semibold tabular-nums', neutralZero ? 'text-muted-foreground' : positive ? 'text-emerald-600' : 'text-red-600')}>
              {positive ? '▲' : '▼'} {Math.abs(deltaPct)}%
            </p>
            <p className="text-xs text-muted-foreground tracking-tight mt-0.5">
              {tab === 'week' ? '주간' : '월간'} 평균 대비
            </p>
          </div>
        </div>
      </div>

      {/* 차트 카드 — 토글은 여기만 */}
      <TrendChart
        title="DAU 추이"
        weeklyData={weeklyData}
        monthlyData={monthlyData}
        color="#16A34A"
        tooltipLabel="활성 사용자"
        summaryMode="avg"
        gradientId="dauFill"
        tab={tab}
        onTabChange={setTab}
      />
    </div>
  )
}
