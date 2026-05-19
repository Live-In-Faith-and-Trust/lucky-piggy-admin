'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { addManualWinnerAction } from '@/app/(admin)/draws/actions'
import { BANKS } from '@/lib/banks'

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
  const [bankCode, setBankCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountHolder, setAccountHolder] = useState('')
  const [adminMemo, setAdminMemo] = useState('')

  const handleClose = () => {
    if (isPending) return
    setOpen(false)
    setError(null)
    setUserId('')
    setPrizeRank('1')
    setRealName('')
    setBankCode('')
    setAccountNumber('')
    setAccountHolder('')
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

    const selectedBank = BANKS.find((b) => b.code === bankCode)

    startTransition(async () => {
      const result = await addManualWinnerAction({
        draw_id: drawId,
        user_id: userId || undefined,
        prize_rank: Number(prizeRank),
        real_name: realName || undefined,
        bank_name: selectedBank?.name || undefined,
        account_number: accountNumber || undefined,
        account_holder: accountHolder || undefined,
        admin_memo: adminMemo || undefined,
      })
      if (result.error) {
        setError(result.error)
      } else {
        handleClose()
        router.refresh()
      }
    })
  }

  const inputClass = "w-full bg-muted border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
  const labelClass = "text-xs font-medium text-muted-foreground tracking-tight"

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
          onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
        >
          <div className="bg-card rounded-xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-sm font-semibold text-foreground tracking-tight">수동 당첨자 추가</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 유저 ID */}
              <div className="space-y-1">
                <label htmlFor="aw-user-id" className={labelClass}>
                  유저 ID <span className="text-muted-foreground/60">(선택 — 앱 미가입자는 비워두세요)</span>
                </label>
                <input
                  id="aw-user-id"
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className={inputClass}
                />
              </div>

              {/* 등수 */}
              <div className="space-y-1">
                <label htmlFor="aw-prize-rank" className={labelClass}>등수</label>
                <select
                  id="aw-prize-rank"
                  value={prizeRank}
                  onChange={(e) => setPrizeRank(e.target.value as '1' | '2' | '3')}
                  required
                  className={inputClass}
                >
                  <option value="1">1등</option>
                  <option value="2">2등</option>
                  <option value="3">3등</option>
                </select>
              </div>

              {/* 실명 */}
              <div className="space-y-1">
                <label htmlFor="aw-real-name" className={labelClass}>
                  실명 <span className="text-muted-foreground/60">(선택)</span>
                </label>
                <input
                  id="aw-real-name"
                  type="text"
                  value={realName}
                  onChange={(e) => setRealName(e.target.value)}
                  placeholder="홍길동"
                  className={inputClass}
                />
              </div>

              {/* 구분선 */}
              <div className="border-t border-border pt-3 space-y-3">
                <p className="text-[11px] font-semibold text-muted-foreground tracking-widest uppercase">계좌 정보 (선택)</p>

                {/* 은행 선택 */}
                <div className="space-y-1">
                  <label htmlFor="aw-bank" className={labelClass}>은행</label>
                  <div className="relative">
                    <select
                      id="aw-bank"
                      value={bankCode}
                      onChange={(e) => setBankCode(e.target.value)}
                      className={`${inputClass} appearance-none pr-8`}
                    >
                      <option value="">은행 선택</option>
                      {BANKS.map((bank) => (
                        <option key={bank.code} value={bank.code}>
                          {bank.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>

                {/* 계좌번호 */}
                <div className="space-y-1">
                  <label htmlFor="aw-account-number" className={labelClass}>계좌번호</label>
                  <input
                    id="aw-account-number"
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9-]/g, ''))}
                    placeholder="12345678901234"
                    className={inputClass}
                  />
                </div>

                {/* 예금주 */}
                <div className="space-y-1">
                  <label htmlFor="aw-account-holder" className={labelClass}>예금주</label>
                  <input
                    id="aw-account-holder"
                    type="text"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    placeholder="홍길동"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* 어드민 메모 */}
              <div className="space-y-1">
                <label htmlFor="aw-admin-memo" className={labelClass}>
                  어드민 메모 <span className="text-muted-foreground/60">(선택)</span>
                </label>
                <textarea
                  id="aw-admin-memo"
                  value={adminMemo}
                  onChange={(e) => setAdminMemo(e.target.value)}
                  placeholder="메모를 입력하세요..."
                  rows={3}
                  className={`${inputClass} resize-none`}
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
