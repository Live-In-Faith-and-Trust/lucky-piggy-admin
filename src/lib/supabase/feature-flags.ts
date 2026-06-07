import { createServerClient, type AdminEnv } from './server'

export interface FeatureFlag {
  code: string
  name: string
  is_enabled: boolean
  updated_at: string
}

export async function getFeatureFlags(env: AdminEnv): Promise<FeatureFlag[]> {
  const supabase = createServerClient(env)
  const { data, error } = await supabase
    .from('feature_flags')
    .select('code, name, is_enabled, updated_at')
    .order('name', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function setFeatureFlag(
  env: AdminEnv,
  code: string,
  enabled: boolean,
): Promise<void> {
  const supabase = createServerClient(env)
  const { error } = await supabase
    .from('feature_flags')
    .update({ is_enabled: enabled, updated_at: new Date().toISOString() })
    .eq('code', code)
  if (error) throw error
}
