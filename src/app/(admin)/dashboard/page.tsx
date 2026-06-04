import Image from 'next/image'
import { getSupabaseClient } from '@/lib/supabase/server'
import SignupChart, { type DayData } from './SignupChart'
import DrawSection from './DrawSection'

export const dynamic = 'force-dynamic'

function getTodayUTCMidnight(): Date {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  return d
}

async function getDailySignupCounts(
  supabase: Awaited<ReturnType<typeof getSupabaseClient>>,
  days: number,
): Promise<DayData[]> {
  const todayUTC = getTodayUTCMidnight()

  const dayStarts = Array.from({ length: days }, (_, i) => {
    const d = new Date(todayUTC)
    d.setUTCDate(todayUTC.getUTCDate() - (days - 1 - i))
    return d
  })

  const counts = await Promise.all(
    dayStarts.map((start) => {
      const end = new Date(start)
      end.setUTCDate(start.getUTCDate() + 1)
      return supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString())
        .then(({ count }) => count ?? 0)
    }),
  )

  return dayStarts.map((d, i) => ({
    date: `${d.getUTCMonth() + 1}/${d.getUTCDate()}`,
    count: counts[i],
  }))
}

async function getDashboardData() {
  try {
    const supabase = await getSupabaseClient()
    const todayStart = getTodayUTCMidnight().toISOString()

    const [totalResult, todayResult, monthlyData] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart),
      getDailySignupCounts(supabase, 30),
    ])

    return {
      totalUsers: totalResult.count ?? null,
      todaySignups: todayResult.count ?? null,
      weeklyData: monthlyData.slice(-7),
      monthlyData,
    }
  } catch {
    return { totalUsers: null, todaySignups: null, weeklyData: [], monthlyData: [] }
  }
}

export default async function DashboardPage() {
  const { totalUsers, todaySignups, weeklyData, monthlyData } = await getDashboardData()

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold tracking-tight text-foreground">대시보드</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-visible rounded-xl border border-border bg-card p-5">
          <Image
            src="/character/pig-notice.png"
            alt=""
            width={160}
            height={160}
            loading="eager"
            className="absolute -bottom-5 -right-6 w-40 h-40 object-contain pointer-events-none select-none"
            aria-hidden
          />
          <p className="text-xs font-medium text-muted-foreground tracking-tight mb-2">전체 회원수</p>
          <p className="text-2xl font-bold tabular-nums tracking-tight text-foreground">
            {totalUsers === null ? '—' : totalUsers.toLocaleString('ko-KR')}
          </p>
          <p className="text-xs text-muted-foreground tracking-tight mt-1">명</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground tracking-tight mb-2">오늘 가입자</p>
          <p className="text-2xl font-bold tabular-nums tracking-tight text-foreground">
            {todaySignups === null ? '—' : todaySignups.toLocaleString('ko-KR')}
          </p>
          <p className="text-xs text-muted-foreground tracking-tight mt-1">명</p>
        </div>
      </div>

      <SignupChart weeklyData={weeklyData} monthlyData={monthlyData} />

      <DrawSection />
    </div>
  )
}
