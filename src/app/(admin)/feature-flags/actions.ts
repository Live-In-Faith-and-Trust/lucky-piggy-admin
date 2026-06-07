'use server'

import { revalidatePath } from 'next/cache'
import { getAdminEnv } from '@/lib/supabase/server'
import { setFeatureFlag } from '@/lib/supabase/feature-flags'

function extractError(e: unknown): string {
  if (e instanceof Error) return e.message
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message)
  return '오류가 발생했습니다'
}

export async function toggleFeatureFlagAction(
  code: string,
  enabled: boolean,
): Promise<{ error?: string }> {
  const env = await getAdminEnv()
  try {
    await setFeatureFlag(env, code, enabled)
    revalidatePath('/feature-flags')
    return {}
  } catch (e) {
    return { error: extractError(e) }
  }
}
