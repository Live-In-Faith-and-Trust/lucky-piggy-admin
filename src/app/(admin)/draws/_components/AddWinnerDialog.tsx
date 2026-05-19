'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addManualWinnerAction } from '@/app/(admin)/draws/actions'

interface Props {
  drawId: string
}

export default function AddWinnerDialog({ drawId }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const [userId, setUserId] = useState('')
  const [prizeRank, setPrizeRank] = useState<'1' | '2' | '3'>('1')
  const [realName, setRealName] = useState('')
  const [adminMemo, setAdminMemo] = useState('')

  const handleClose = () => {
    if (isPending) return
    setOpen(false)
    setError(null)
    setUserId('')
    setPrizeRank('1')
    setRealName('')
    setAdminMemo('')
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, isPending])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await addManualWinnerAction({
        draw_id: drawId,
        user_id: userId || undefined,
        prize_rank: Number(prizeRank),
        real_name: realName || undefined,
        admin_memo: adminMemo || undefined,
      })
      if (result.error) {
        setError(result.error)
      } else {
        setOpen(false)
        setError(null)
        setUserId('')
        setPrizeRank('1')
        setRealName('')
        setAdminMemo('')
        router.refresh()
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-95"
      >
        + 수동 당첨자 추가
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose()
          }}
        >
          <div className="bg-card rounded-xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-sm font-semibold text-foreground tracking-tight">수동 당첨자 추가</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="aw-user-id" className="text-xs font-medium text-muted-foreground tracking-tight">
                  유저 ID (선택 — 앱 가입자가 아닌 경우 비워두세요)
                </label>
                <input
                  id="aw-user-id"
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="aw-prize-rank" className="text-xs font-medium text-muted-foreground tracking-tight">등수</label>
                <select
                  id="aw-prize-rank"
                  value={prizeRank}
                  onChange={(e) => setPrizeRank(e.target.value as '1' | '2' | '3')}
                  required
                  className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="1">1등</option>
                  <option value="2">2등</option>
                  <option value="3">3등</option>
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="aw-real-name" className="text-xs font-medium text-muted-foreground tracking-tight">실명 (선택)</label>
                <input
                  id="aw-real-name"
                  type="text"
                  value={realName}
                  onChange={(e) => setRealName(e.target.value)}
                  placeholder="홍길동"
                  className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="aw-admin-memo" className="text-xs font-medium text-muted-foreground tracking-tight">
                  어드민 메모 (선택)
                </label>
                <textarea
                  id="aw-admin-memo"
                  value={adminMemo}
                  onChange={(e) => setAdminMemo(e.target.value)}
                  placeholder="메모를 입력하세요..."
                  rows={3}
                  className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>

              {error && <p className="text-sm text-red-500 tracking-tight">{error}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isPending}
                  className="text-sm px-4 py-2 rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-50 tracking-tight"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="text-sm px-4 py-2 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50 tracking-tight"
                >
                  {isPending ? '추가 중...' : '추가하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
