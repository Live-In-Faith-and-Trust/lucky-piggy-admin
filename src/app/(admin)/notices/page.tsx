export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getAdminEnv } from '@/lib/supabase/server'
import { getNotices, type Notice } from '@/lib/supabase/notices'
import NoticesClient from './NoticesClient'

export default async function NoticesPage() {
  const env = await getAdminEnv()
  let notices: Notice[] = []
  try {
    notices = await getNotices(env)
  } catch {
    notices = []
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">공지사항</h1>
          <p className="text-xs text-muted-foreground mt-0.5 tracking-tight">
            총 {notices.length}개 · 발행 {notices.filter((n) => n.status === 'published').length}개
          </p>
        </div>
        <Link
          href="/notices/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          새 공지 작성
        </Link>
      </div>

      <NoticesClient initialNotices={notices} />
    </div>
  )
}
