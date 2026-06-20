'use server'

import { revalidatePath } from 'next/cache'
import { getAdminEnv } from '@/lib/supabase/server'
import { createNotice, updateNotice, deleteNotice, updateNoticePriority } from '@/lib/supabase/notices'

export async function createNoticeAction(formData: FormData): Promise<{ error?: string }> {
  const env = await getAdminEnv()
  try {
    await createNotice(env, {
      title: formData.get('title') as string,
      content: formData.get('content') as string,
      status: formData.get('status') as 'draft' | 'published' | 'archived',
      priority: Number(formData.get('priority') ?? 0),
    })
    revalidatePath('/notices')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : '오류가 발생했습니다' }
  }
}

export async function updateNoticeAction(id: string, formData: FormData): Promise<{ error?: string }> {
  const env = await getAdminEnv()
  try {
    const createdAt = formData.get('created_at') as string | null
    await updateNotice(env, id, {
      title: formData.get('title') as string,
      content: formData.get('content') as string,
      status: formData.get('status') as 'draft' | 'published' | 'archived',
      priority: Number(formData.get('priority') ?? 0),
      ...(createdAt ? { created_at: createdAt } : {}),
    })
    revalidatePath('/notices')
    revalidatePath(`/notices/${id}`)
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : '오류가 발생했습니다' }
  }
}

export async function updateNoticePrioritiesAction(
  updates: { id: string; priority: number }[]
): Promise<{ error?: string }> {
  const env = await getAdminEnv()
  try {
    await Promise.all(updates.map(({ id, priority }) => updateNoticePriority(env, id, priority)))
    revalidatePath('/notices')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : '오류가 발생했습니다' }
  }
}

export async function deleteNoticeAction(id: string): Promise<{ error?: string }> {
  const env = await getAdminEnv()
  try {
    await deleteNotice(env, id)
    revalidatePath('/notices')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : '오류가 발생했습니다' }
  }
}
