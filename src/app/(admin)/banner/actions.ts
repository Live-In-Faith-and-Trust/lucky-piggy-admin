'use server'

import { revalidatePath } from 'next/cache'
import { getAdminEnv } from '@/lib/supabase/server'
import { updateHomeBannerConfig } from '@/lib/supabase/notices'

export async function updateBannerAction(formData: FormData): Promise<{ error?: string }> {
  const env = await getAdminEnv()
  try {
    await updateHomeBannerConfig(env, {
      line1: formData.get('line1') as string,
      line2: (formData.get('line2') as string) || null,
      is_active: formData.get('is_active') === 'true',
    })
    revalidatePath('/banner')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : '오류가 발생했습니다' }
  }
}
