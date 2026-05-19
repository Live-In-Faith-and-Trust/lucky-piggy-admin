'use client'

import { useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { cn } from '@/lib/utils'

export type DayData = { date: string; count: number }

type Props = {
  weeklyData: DayData[]
  monthlyData: DayData[]
}

const TABS = [
  { key: 'week', label: '일주일' },
  { key: 'month', label: '한달' },
] as const

type Tab = (typeof TABS)[number]['key']

export default function SignupChart({ weeklyData, monthlyData }: Props) {
  const [tab, setTab] = useState<Tab>('week')
  const data = tab === 'week' ? weeklyData : monthlyData

  const total = data.reduce((s, d) => s + d.count, 0)
  const max = Math.max(...data.map((d) => d.count), 1)

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-sm font-semibold tracking-tight text-foreground">가입자 추이</p>
          <p className="text-xs text-muted-foreground tracking-tight mt-0.5">
            {tab === 'week' ? '최근 7일' : '최근 30일'} 합계{' '}
            <span className="font-semibold text-foreground">{total.toLocaleString('ko-KR')}명</span>
          </p>
        </div>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded-md transition-all',
                tab === key
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 차트 */}
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="signupFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1A4FD8" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#1A4FD8" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#E0E0E0"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            axisLine={false}
            tickLine={false}
            interval={tab === 'month' ? 4 : 0}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            domain={[0, Math.ceil(max * 1.2) || 1]}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--card)',
              border: '1px solid #E0E0E0',
              borderRadius: '8px',
              fontSize: 12,
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
            labelStyle={{ color: 'var(--muted-foreground)', marginBottom: 2 }}
            formatter={(value) => [`${Number(value).toLocaleString('ko-KR')}명`, '신규 가입']}
            cursor={{ stroke: '#E0E0E0', strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#1A4FD8"
            strokeWidth={2}
            fill="url(#signupFill)"
            dot={false}
            activeDot={{ r: 4, fill: '#1A4FD8', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
