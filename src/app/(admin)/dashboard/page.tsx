import { getSupabaseClient } from '@/lib/supabase/server'
import SignupChart, { type DayData } from './SignupChart'
import DrawSection from './DrawSection'

export const dynamic = 'force-dynamic'

function getTodayStartISO(): string {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  return d.toISOString()
}

function buildDailyStats(rows: { created_at: string }[], days: number): DayData[] {
  const counts: Record<string, number> = {}
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    counts[key] = 0
  }
  for (const row of rows) {
    const key = row.created_at.slice(0, 10)
    if (key in counts) counts[key]++
  }
  return Object.entries(counts).map(([date, count]) => ({
    date: `${parseInt(date.slice(5, 7))}/${parseInt(date.slice(8, 10))}`,
    count,
  }))
}

async function getDashboardData() {
  try {
    const supabase = await getSupabaseClient()

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [totalResult, todayResult, signupsResult] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', getTodayStartISO()),
      supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true }),
    ])

    const monthlyData = buildDailyStats(signupsResult.data ?? [], 30)
    const weeklyData = monthlyData.slice(-7)

    return {
      totalUsers: totalResult.count ?? null,
      todaySignups: todayResult.count ?? null,
      weeklyData,
      monthlyData,
    }
  } catch {
    return { totalUsers: null, todaySignups: null, weeklyData: [], monthlyData: [] }
  }
}

export default async function DashboardPage() {
  const { totalUsers, todaySignups, weeklyData, monthlyData } = await getDashboardData()

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-foreground">대시보드</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground mb-2">전체 회원수</p>
          <p className="text-3xl font-bold text-foreground tabular-nums">
            {totalUsers === null ? '—' : totalUsers.toLocaleString('ko-KR')}
          </p>
          <p className="text-xs text-muted-foreground mt-1">명</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground mb-2">오늘 가입자</p>
          <p className="text-3xl font-bold text-foreground tabular-nums">
            {todaySignups === null ? '—' : todaySignups.toLocaleString('ko-KR')}
          </p>
          <p className="text-xs text-muted-foreground mt-1">명</p>
        </div>
      </div>

      <SignupChart weeklyData={weeklyData} monthlyData={monthlyData} />

      <DrawSection />
    </div>
  )
}
