import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export type AdminEnv = 'staging' | 'production'

const envConfigs: Record<AdminEnv, { urlKey: string; serviceKeyName: string }> = {
  production: {
    urlKey: 'NEXT_PUBLIC_SUPABASE_URL',
    serviceKeyName: 'SUPABASE_SERVICE_ROLE_KEY',
  },
  staging: {
    urlKey: 'NEXT_PUBLIC_SUPABASE_URL_STAGING',
    serviceKeyName: 'SUPABASE_SERVICE_ROLE_KEY_STAGING',
  },
}

export function createServerClient(env: AdminEnv = 'production') {
  const { urlKey, serviceKeyName } = envConfigs[env]
  const url = process.env[urlKey]
  const key = process.env[serviceKeyName]

  if (!url || !key) {
    throw new Error(`Supabase ${env} 환경변수가 설정되지 않았습니다. (${urlKey}, ${serviceKeyName})`)
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  })
}

export async function getAdminEnv(): Promise<AdminEnv> {
  const cookieStore = await cookies()
  const val = cookieStore.get('admin_env')?.value
  return val === 'staging' ? 'staging' : 'production'
}

export async function getSupabaseClient() {
  const env = await getAdminEnv()
  return createServerClient(env)
}
