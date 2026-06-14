export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { getAdminEnv } from '@/lib/supabase/server'
import { getNoticeById } from '@/lib/supabase/notices'
import NoticeForm from '../NoticeForm'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditNoticePage({ params }: Props) {
  const { id } = await params
  const env = await getAdminEnv()

  let notice
  try {
    notice = await getNoticeById(env, id)
  } catch {
    notFound()
  }

  if (!notice) notFound()

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">공지 수정</h1>
        <p className="text-xs text-muted-foreground mt-0.5 tracking-tight">공지사항을 수정합니다</p>
      </div>
      <NoticeForm mode="edit" notice={notice} />
    </div>
  )
}
