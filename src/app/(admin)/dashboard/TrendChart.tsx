'use client'
import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'

export type DayData = { date: string; count: number }

type Props = {
  title: string
  weeklyData: DayData[]
  monthlyData: DayData[]
  color: string
  tooltipLabel: string
  summaryMode: 'sum' | 'avg'
  gradientId: string
}

const TABS = [{ key: 'week', label: '일주일' }, { key: 'month', label: '한달' }] as const
type Tab = (typeof TABS)[number]['key']

export default function TrendChart({ title, weeklyData, monthlyData, color, tooltipLabel, summaryMode, gradientId }: Props) {
  const [tab, setTab] = useState<Tab>('week')
  const data = tab === 'week' ? weeklyData : monthlyData
  const sum = data.reduce((s, d) => s + d.count, 0)
  const summary = summaryMode === 'avg' ? Math.round(sum / (data.length || 1)) : sum
  const summaryLabel = summaryMode === 'avg' ? '일평균' : '합계'
  const max = Math.max(...data.map((d) => d.count), 1)

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-sm font-semibold tracking-tight text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground tracking-tight mt-0.5">
            {tab === 'week' ? '최근 7일' : '최근 30일'} {summaryLabel}{' '}
            <span className="font-semibold text-foreground">{summary.toLocaleString('ko-KR')}명</span>
          </p>
        </div>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {TABS.map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)} className={cn('px-3 py-1 text-xs font-medium rounded-md transition-all', tab === key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>{label}</button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.15} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} interval={tab === 'month' ? 4 : 0} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} allowDecimals={false} domain={[0, Math.ceil(max * 1.2) || 1]} />
          <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid #E0E0E0', borderRadius: '8px', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} labelStyle={{ color: 'var(--muted-foreground)', marginBottom: 2 }} formatter={(value) => [`${Number(value).toLocaleString('ko-KR')}명`, tooltipLabel]} cursor={{ stroke: '#E0E0E0', strokeWidth: 1 }} />
          <Area type="monotone" dataKey="count" stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} dot={false} activeDot={{ r: 4, fill: color, strokeWidth: 0 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
