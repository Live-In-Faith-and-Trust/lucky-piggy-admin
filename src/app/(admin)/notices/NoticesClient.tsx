'use client'

import { useState, useTransition, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { type Notice } from '@/lib/supabase/notices'
import { deleteNoticeAction, updateNoticePrioritiesAction } from './actions'

const STATUS_LABELS: Record<Notice['status'], string> = {
  draft: '임시저장',
  published: '발행',
  archived: '종료',
}

const STATUS_BADGE: Record<Notice['status'], string> = {
  draft: 'bg-gray-100 text-gray-600 border border-gray-200',
  published: 'bg-green-100 text-green-700 border border-green-200',
  archived: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
}

interface Props {
  initialNotices: Notice[]
}

export default function NoticesClient({ initialNotices }: Props) {
  const router = useRouter()
  const [notices, setNotices] = useState<Notice[]>(initialNotices)

  useEffect(() => {
    setNotices(initialNotices)
  }, [initialNotices])
  const [isPending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [movingId, setMovingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const sortedNotices = useMemo(
    () =>
      [...notices].sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }),
    [notices],
  )

  function handleMove(notice: Notice, idx: number, direction: 'up' | 'down') {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= sortedNotices.length) return

    const target = sortedNotices[targetIdx]
    let updates: { id: string; priority: number }[]

    if (notice.priority !== target.priority) {
      updates = [
        { id: notice.id, priority: target.priority },
        { id: target.id, priority: notice.priority },
      ]
    } else {
      updates = [{ id: notice.id, priority: notice.priority + (direction === 'up' ? 1 : -1) }]
    }

    const prevNotices = notices
    setMovingId(notice.id)
    setError(null)
    setNotices((prev) =>
      prev.map((n) => {
        const upd = updates.find((u) => u.id === n.id)
        return upd ? { ...n, priority: upd.priority } : n
      }),
    )

    startTransition(async () => {
      const result = await updateNoticePrioritiesAction(updates)
      if (result.error) {
        setError(result.error)
        setNotices(prevNotices)
      }
      setMovingId(null)
    })
  }

  function handleDelete(notice: Notice) {
    if (!confirm(`"${notice.title}" 공지를 삭제하시겠습니까?`)) return
    setDeletingId(notice.id)
    setError(null)
    startTransition(async () => {
      const result = await deleteNoticeAction(notice.id)
      if (result.error) {
        setError(result.error)
      } else {
        setNotices((prev) => prev.filter((n) => n.id !== notice.id))
        router.refresh()
      }
      setDeletingId(null)
    })
  }

  function formatDate(iso: string) {
    const d = new Date(iso)
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  }

  if (notices.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card py-16 text-center">
        <p className="text-sm text-muted-foreground tracking-tight">등록된 공지가 없습니다</p>
        <Link
          href="/notices/new"
          className="mt-3 inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
        >
          첫 공지 작성하기
        </Link>
      </div>
    )
  }

  const isMoving = movingId !== null

  return (
    <div className="space-y-2">
      {error && <p className="text-xs text-red-500 tracking-tight">{error}</p>}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-[1fr_80px_90px_100px_80px] gap-3 px-4 py-2.5 border-b border-border bg-muted/30">
          <span className="text-xs font-semibold text-muted-foreground tracking-tight">제목</span>
          <span className="text-xs font-semibold text-muted-foreground tracking-tight">상태</span>
          <span className="text-xs font-semibold text-muted-foreground tracking-tight text-center">우선순위</span>
          <span className="text-xs font-semibold text-muted-foreground tracking-tight">작성일</span>
          <span className="text-xs font-semibold text-muted-foreground tracking-tight text-right">액션</span>
        </div>

        {sortedNotices.map((notice, idx) => (
          <div
            key={notice.id}
            className="grid grid-cols-[1fr_80px_90px_100px_80px] gap-3 px-4 py-3.5 border-b border-border last:border-0 items-center hover:bg-muted/20 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground tracking-tight truncate">{notice.title}</p>
              <p className="text-xs text-muted-foreground tracking-tight truncate mt-0.5 line-clamp-1">{notice.content}</p>
            </div>

            <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold w-fit ${STATUS_BADGE[notice.status]}`}>
              {STATUS_LABELS[notice.status]}
            </span>

            <div className="flex items-center justify-center gap-0.5">
              <button
                type="button"
                onClick={() => handleMove(notice, idx, 'up')}
                disabled={isMoving || idx === 0}
                className="inline-flex items-center justify-center w-5 h-5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="우선순위 올리기"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <span className="text-sm text-muted-foreground tabular-nums w-6 text-center">{notice.priority}</span>
              <button
                type="button"
                onClick={() => handleMove(notice, idx, 'down')}
                disabled={isMoving || idx === sortedNotices.length - 1}
                className="inline-flex items-center justify-center w-5 h-5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="우선순위 내리기"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            <span className="text-xs text-muted-foreground tabular-nums">{formatDate(notice.created_at)}</span>

            <div className="flex items-center justify-end gap-1">
              <Link
                href={`/notices/${notice.id}`}
                className="inline-flex items-center justify-center w-7 h-7 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title="수정"
              >
                <Pencil className="w-3.5 h-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => handleDelete(notice)}
                disabled={isPending && deletingId === notice.id}
                className="inline-flex items-center justify-center w-7 h-7 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-50"
                title="삭제"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
