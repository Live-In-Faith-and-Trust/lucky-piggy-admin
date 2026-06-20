'use client'

import { useEffect, useState, useTransition } from 'react'
import { bulkAddManualWinnersAction } from '@/app/(admin)/draws/actions'

interface Props {
  drawId: string
}

export default function BulkAddWinnerDialog({ drawId }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [prizeRank, setPrizeRank] = useState<'1' | '2' | '3' | '4' | '5'>('1')
  const [count, setCount] = useState('')
  const [minEntryCount, setMinEntryCount] = useState('')
  const [maxEntryCount, setMaxEntryCount] = useState('')

  const handleClose = () => {
    if (isPending) return
    setOpen(false)
    setError(null)
    setSuccessMessage(null)
    setPrizeRank('1')
    setCount('')
    setMinEntryCount('')
    setMaxEntryCount('')
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, isPending])

  const countNum = parseInt(count, 10)
  const minNum = parseInt(minEntryCount, 10)
  const maxNum = parseInt(maxEntryCount, 10)

  const allFilled = count !== '' && minEntryCount !== '' && maxEntryCount !== ''
  const previewText =
    allFilled && !isNaN(countNum) && !isNaN(minNum) && !isNaN(maxNum)
      ? `${prizeRank}등 ${countNum}명 · 응모권 ${minNum}~${maxNum}장 랜덤`
      : null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!count || isNaN(countNum) || countNum < 1) {
      setError('추가 인원을 1 이상 입력하세요.')
      return
    }
    if (!minEntryCount || isNaN(minNum) || minNum < 1) {
      setError('응모권 최솟값을 1 이상 입력하세요.')
      return
    }
    if (!maxEntryCount || isNaN(maxNum) || maxNum < 1) {
      setError('응모권 최댓값을 1 이상 입력하세요.')
      return
    }
    if (maxNum < minNum) {
      setError('응모권 최댓값은 최솟값 이상이어야 합니다.')
      return
    }

    startTransition(async () => {
      const result = await bulkAddManualWinnersAction({
        draw_id: drawId,
        prize_rank: Number(prizeRank),
        count: countNum,
        min_entry_count: minNum,
        max_entry_count: maxNum,
      })

      if (result.error) {
        setError(result.error)
      } else {
        setSuccessMessage(`${result.added}명 추가 완료!`)
        setTimeout(() => {
          handleClose()
        }, 1500)
      }
    })
  }

  const inputClass = "w-full bg-muted border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
  const labelClass = "text-xs font-medium text-muted-foreground tracking-tight"

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-1.5 rounded-full border border-border text-foreground hover:bg-muted transition-all active:scale-95"
      >
        + 일괄 추가
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
        >
          <div className="bg-card rounded-xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-sm font-semibold text-foreground tracking-tight">수동 당첨자 일괄 추가</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 등수 */}
              <div className="space-y-1">
                <label htmlFor="ba-prize-rank" className={labelClass}>등수</label>
                <select
                  id="ba-prize-rank"
                  value={prizeRank}
                  onChange={(e) => setPrizeRank(e.target.value as '1' | '2' | '3' | '4' | '5')}
                  required
                  className={inputClass}
                >
                  <option value="1">1등</option>
                  <option value="2">2등</option>
                  <option value="3">3등</option>
                  <option value="4">4등</option>
                  <option value="5">5등</option>
                </select>
              </div>

              {/* 추가 인원 */}
              <div className="space-y-1">
                <label htmlFor="ba-count" className={labelClass}>추가 인원</label>
                <input
                  id="ba-count"
                  type="number"
                  min={1}
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                  placeholder="0"
                  required
                  className={inputClass}
                />
              </div>

              {/* 응모권 범위 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="ba-min-entry" className={labelClass}>응모권 최솟값</label>
                  <input
                    id="ba-min-entry"
                    type="number"
                    min={1}
                    value={minEntryCount}
                    onChange={(e) => setMinEntryCount(e.target.value)}
                    placeholder="1"
                    required
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="ba-max-entry" className={labelClass}>응모권 최댓값</label>
                  <input
                    id="ba-max-entry"
                    type="number"
                    min={1}
                    value={maxEntryCount}
                    onChange={(e) => setMaxEntryCount(e.target.value)}
                    placeholder="1"
                    required
                    className={inputClass}
                  />
                </div>
              </div>

              {/* 미리보기 */}
              {previewText && (
                <div className="rounded-lg bg-muted border border-border px-3 py-2.5">
                  <p className="text-xs font-medium text-foreground tracking-tight">{previewText}</p>
                </div>
              )}

              {error && <p className="text-sm text-red-500 tracking-tight">{error}</p>}
              {successMessage && <p className="text-sm text-emerald-600 font-semibold tracking-tight">{successMessage}</p>}

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
                  disabled={isPending || !!successMessage}
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
