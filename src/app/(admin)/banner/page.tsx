export const dynamic = 'force-dynamic'

import { getAdminEnv } from '@/lib/supabase/server'
import { getHomeBannerConfig, type HomeBannerConfig } from '@/lib/supabase/notices'
import BannerClient from './BannerClient'

export default async function BannerPage() {
  const env = await getAdminEnv()
  let config: HomeBannerConfig | null = null
  try {
    config = await getHomeBannerConfig(env)
  } catch {
    config = null
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">홈 배너 관리</h1>
        <p className="text-xs text-muted-foreground mt-0.5 tracking-tight">
          앱 홈 화면 상단에 표시되는 공지 배너를 관리합니다
        </p>
      </div>
      <BannerClient initialConfig={config} />
    </div>
  )
}
