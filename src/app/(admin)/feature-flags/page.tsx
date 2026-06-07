export const dynamic = 'force-dynamic'

import { AlertTriangle } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/server'
import { type FeatureFlag } from '@/lib/supabase/feature-flags'
import FeatureFlagsClient from './FeatureFlagsClient'

const ENV = process.env.NEXT_PUBLIC_APP_ENV ?? 'development'

const ENV_META: Record<string, { label: string; badgeClass: string; warn: boolean }> = {
  production: {
    label: 'PRODUCTION',
    badgeClass: 'bg-red-100 text-red-700 border border-red-300',
    warn: true,
  },
  staging: {
    label: 'STAGING',
    badgeClass: 'bg-orange-100 text-orange-700 border border-orange-300',
    warn: false,
  },
}
const envMeta = ENV_META[ENV] ?? {
  label: 'LOCAL / DEV',
  badgeClass: 'bg-gray-100 text-gray-600 border border-gray-300',
  warn: false,
}

async function getFlags(): Promise<FeatureFlag[]> {
  try {
    const supabase = await getSupabaseClient()
    const { data, error } = await supabase
      .from('feature_flags')
      .select('code, name, is_enabled, updated_at')
      .order('name', { ascending: true })
    if (error) throw error
    return (data ?? []) as FeatureFlag[]
  } catch {
    return []
  }
}

export default async function FeatureFlagsPage() {
  const flags = await getFlags()

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Feature Flags</h1>
          <p className="text-xs text-muted-foreground mt-0.5 tracking-tight">
            ON {flags.filter((f) => f.is_enabled).length} · OFF {flags.filter((f) => !f.is_enabled).length} · 총 {flags.length}개
          </p>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${envMeta.badgeClass}`}>
          {envMeta.warn && <AlertTriangle className="w-3 h-3" />}
          {envMeta.label}
        </span>
      </div>

      {envMeta.warn && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          프로덕션 환경입니다. 저장 시 실 사용자에게 즉시 반영됩니다.
        </div>
      )}

      <FeatureFlagsClient
        initialFlags={flags}
        isProduction={ENV === 'production'}
      />
    </div>
  )
}
