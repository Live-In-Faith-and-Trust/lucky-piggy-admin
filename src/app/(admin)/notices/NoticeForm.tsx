'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type Notice } from '@/lib/supabase/notices'
import { createNoticeAction, updateNoticeAction } from './actions'

interface Props {
  mode: 'create' | 'edit'
  notice?: Notice
}

// ISO(UTC) → datetime-local 입력값("YYYY-MM-DDTHH:mm", 로컬/KST)
function toDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function NoticeForm({ mode, notice }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    // datetime-local 입력값(로컬/KST)을 ISO(UTC)로 변환해 서버 타임존 영향 제거
    const createdAtLocal = formData.get('created_at') as string
    if (createdAtLocal) {
      formData.set('created_at', new Date(createdAtLocal).toISOString())
    }

    startTransition(async () => {
      let result: { error?: string }
      if (mode === 'create') {
        result = await createNoticeAction(formData)
      } else {
        result = await updateNoticeAction(notice!.id, formData)
      }

      if (result.error) {
        setError(result.error)
      } else {
        router.push('/notices')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        {/* 제목 */}
        <div className="space-y-1.5">
          <label htmlFor="title" className="text-sm font-medium text-foreground tracking-tight">
            제목 <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            defaultValue={notice?.title ?? ''}
            placeholder="공지 제목을 입력하세요"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
          />
        </div>

        {/* 내용 */}
        <div className="space-y-1.5">
          <label htmlFor="content" className="text-sm font-medium text-foreground tracking-tight">
            내용 <span className="text-red-500">*</span>
          </label>
          <textarea
            id="content"
            name="content"
            required
            rows={10}
            defaultValue={notice?.content ?? ''}
            placeholder="공지 내용을 입력하세요"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow resize-none"
          />
        </div>

        {/* 상태 + 우선순위 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="status" className="text-sm font-medium text-foreground tracking-tight">
              상태
            </label>
            <select
              id="status"
              name="status"
              defaultValue={notice?.status ?? 'draft'}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
            >
              <option value="draft">임시저장</option>
              <option value="published">발행</option>
              <option value="archived">종료</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="priority" className="text-sm font-medium text-foreground tracking-tight">
              우선순위
            </label>
            <input
              id="priority"
              name="priority"
              type="number"
              min={0}
              defaultValue={notice?.priority ?? 0}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
            />
            <p className="text-[11px] text-muted-foreground tracking-tight">높을수록 앱에서 먼저 표시됩니다</p>
          </div>
        </div>

        {/* 등록일시 (수정 모드만) */}
        {mode === 'edit' && (
          <div className="space-y-1.5">
            <label htmlFor="created_at" className="text-sm font-medium text-foreground tracking-tight">
              등록일시
            </label>
            <input
              id="created_at"
              name="created_at"
              type="datetime-local"
              defaultValue={notice ? toDatetimeLocal(notice.created_at) : ''}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
            />
            <p className="text-[11px] text-muted-foreground tracking-tight">앱에 표시되는 공지 날짜입니다</p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500 tracking-tight">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? '저장 중...' : '저장하기'}
        </button>
        <Link
          href="/notices"
          className="px-5 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          취소
        </Link>
      </div>
    </form>
  )
}
