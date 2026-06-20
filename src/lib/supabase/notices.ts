import { createServerClient, type AdminEnv } from './server'

export interface Notice {
  id: string
  title: string
  content: string
  status: 'draft' | 'published' | 'archived'
  priority: number
  created_at: string
  updated_at: string
}

export interface HomeBannerConfig {
  id: number
  line1: string
  line2: string | null
  is_active: boolean
  updated_at: string
}

// Notices CRUD
export async function getNotices(env: AdminEnv): Promise<Notice[]> {
  const supabase = createServerClient(env)
  const { data, error } = await supabase
    .from('notices')
    .select('*')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getNoticeById(env: AdminEnv, id: string): Promise<Notice | null> {
  const supabase = createServerClient(env)
  const { data, error } = await supabase
    .from('notices')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createNotice(
  env: AdminEnv,
  notice: { title: string; content: string; status: 'draft' | 'published' | 'archived'; priority: number }
): Promise<void> {
  const supabase = createServerClient(env)
  const { error } = await supabase.from('notices').insert({
    ...notice,
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
}

export async function updateNotice(
  env: AdminEnv,
  id: string,
  notice: {
    title: string
    content: string
    status: 'draft' | 'published' | 'archived'
    priority: number
    created_at?: string
  }
): Promise<void> {
  const supabase = createServerClient(env)
  const { error } = await supabase
    .from('notices')
    .update({ ...notice, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function updateNoticePriority(env: AdminEnv, id: string, priority: number): Promise<void> {
  const supabase = createServerClient(env)
  const { error } = await supabase
    .from('notices')
    .update({ priority, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function deleteNotice(env: AdminEnv, id: string): Promise<void> {
  const supabase = createServerClient(env)
  const { error } = await supabase.from('notices').delete().eq('id', id)
  if (error) throw error
}

// Home banner
export async function getHomeBannerConfig(env: AdminEnv): Promise<HomeBannerConfig | null> {
  const supabase = createServerClient(env)
  const { data, error } = await supabase
    .from('home_banner_config')
    .select('*')
    .eq('id', 1)
    .single()
  if (error) return null
  return data
}

export async function updateHomeBannerConfig(
  env: AdminEnv,
  config: { line1: string; line2: string | null; is_active: boolean }
): Promise<void> {
  const supabase = createServerClient(env)
  const { error } = await supabase
    .from('home_banner_config')
    .update({ ...config, updated_at: new Date().toISOString() })
    .eq('id', 1)
  if (error) throw error
}
