'use client'

import { useEffect, useState, useTransition } from 'react'
import { bulkAddManualWinnersAction, revalidateDrawWinnersAction } from '@/app/(admin)/draws/actions'

const CHUNK_SIZE = 25
const MAX_BULK = 2000

interface Props {
  drawId: string
}

export default function BulkAddWinnerDialog({ drawId }: Props) {
  const [open, setOpen] = useState(false)
  const [, startTransition] = useTransition()
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(0)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [prizeRank, setPrizeRank] = useState<'1' | '2' | '3' | '4' | '5'>('1')
  const [count, setCount] = useState('')
  const [minEntryCount, setMinEntryCount] = useState('')
  const [maxEntryCount, setMaxEntryCount] = useState('')

  const handleClose = () => {
    if (running) return
    setOpen(false)
    setError(null)
    setSuccessMessage(null)
    setDone(0)
    setTotal(0)
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
  }, [open, running])

  const countNum = parseInt(count, 10)
  const minNum = parseInt(minEntryCount, 10)
  const maxNum = parseInt(maxEntryCount, 10)

  const allFilled = count !== '' && minEntryCount !== '' && maxEntryCount !== ''
  const previewText =
    allFilled && !isNaN(countNum) && !isNaN(minNum) && !isNaN(maxNum)
      ? `${prizeRank}등 ${countNum}명 · 응모권 ${minNum}~${maxNum}장 랜덤`
      : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

    if (!count || isNaN(countNum) || countNum < 1) {
      setError('추가 인원을 1 이상 입력하세요.')
      return
    }
    if (countNum > MAX_BULK) {
      setError(`한 번에 최대 ${MAX_BULK}명까지 추가할 수 있습니다.`)
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

    setRunning(true)
    setDone(0)
    setTotal(countNum)

    let added = 0
    let remaining = countNum
    let first = true
    let failed = false
    let threw = false

    try {
      while (remaining > 0) {
        const chunkCount = Math.min(CHUNK_SIZE, remaining)

        const result = await bulkAddManualWinnersAction({
          draw_id: drawId,
          prize_rank: Number(prizeRank),
          count: chunkCount,
          min_entry_count: minNum,
          max_entry_count: maxNum,
          ensurePrizes: first,
        })

        added += result.added
        setDone(added)

        if (result.error) {
          setError(`${added}명까지 추가됨 · 오류: ${result.error}`)
          failed = true
          break
        }

        remaining -= chunkCount
        first = false
      }
    } catch {
      // 전송 자체가 실패(네트워크/서버 throw) — 서버 커밋 여부가 응답 유실로 불확실하다.
      // running 영구 고착만 막고, 남은 인원을 자동으로 줄이지 않는다(중복 추가 위험).
      setError(`네트워크 오류로 중단됐습니다(약 ${added}명까지 추가). 당첨자 목록을 확인한 뒤 남은 인원을 직접 입력해 다시 추가하세요.`)
      failed = true
      threw = true
    } finally {
      // 첫 청크 실패 시에도 draw_prizes가 upsert됐을 수 있으므로 항상 목록 갱신 — transition으로 RSC 리렌더
      startTransition(async () => { await revalidateDrawWinnersAction() })
      setRunning(false)
      // 결정적 실패(서버가 error를 반환 = insert 미커밋)만 남은 인원 자동 반영.
      // 전송 throw는 커밋 불확실하므로 입력값을 건드리지 않는다.
      if (failed && !threw) setCount(String(countNum - added))
    }

    if (!failed) {
      setSuccessMessage(`${added}명 추가 완료!`)
      setTimeout(() => { handleClose() }, 1500)
    }
  }

  const inputClass = "w-full bg-muted border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
  const labelClass = "text-xs font-medium text-muted-foreground tracking-tight"

  const progressPct = total > 0 ? Math.round((done / total) * 100) : 0

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
              {previewText && !running && (
                <div className="rounded-lg bg-muted border border-border px-3 py-2.5">
                  <p className="text-xs font-medium text-foreground tracking-tight">{previewText}</p>
                </div>
              )}

              {/* 진행률 (작업 중) */}
              {running && (
                <div className="space-y-2">
                  <div
                    className="w-full bg-muted rounded h-2 overflow-hidden"
                    role="progressbar"
                    aria-valuenow={done}
                    aria-valuemin={0}
                    aria-valuemax={total}
                  >
                    <div
                      className="bg-primary h-2 rounded transition-all"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground tracking-tight">
                    총 {total}명 중 {done}명 추가 완료 ({progressPct}%)
                  </p>
                </div>
              )}

              {error && <p className="text-sm text-red-500 tracking-tight">{error}</p>}
              {successMessage && <p className="text-sm text-emerald-600 font-semibold tracking-tight">{successMessage}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={running}
                  className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-50 tracking-tight"
                >
                  {running && (
                    <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  )}
                  취소
                </button>
                <button
                  type="submit"
                  disabled={running || !!successMessage}
                  className="text-sm px-4 py-2 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50 tracking-tight"
                >
                  {running ? '추가 중...' : '추가하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
