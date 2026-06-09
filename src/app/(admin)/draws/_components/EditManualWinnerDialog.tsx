'use client'

import { useEffect, useState, useTransition } from 'react'
import { ChevronDown } from 'lucide-react'
import { updateManualWinnerAction } from '@/app/(admin)/draws/actions'
import { type DrawWinner } from '@/lib/supabase/draws'
import { BANKS } from '@/lib/banks'

interface Props {
  winner: DrawWinner
}

export default function EditManualWinnerDialog({ winner }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const initBankCode = BANKS.find((b) => b.name === winner.bank_name)?.code ?? ''

  const [realName, setRealName] = useState(winner.real_name ?? '')
  const [bankCode, setBankCode] = useState(initBankCode)
  const [accountNumber, setAccountNumber] = useState(winner.account_number ?? '')
  const [accountHolder, setAccountHolder] = useState(winner.account_holder ?? '')
  const [winnerComment, setWinnerComment] = useState(winner.winner_comment ?? '')
  const [adminMemo, setAdminMemo] = useState(winner.admin_memo ?? '')
  const [manualEntryCount, setManualEntryCount] = useState(winner.manual_entry_count?.toString() ?? '')
  const [email, setEmail] = useState(winner.email ?? '')
  const [phone, setPhone] = useState(winner.phone ?? '')
  const [residentId, setResidentId] = useState(winner.resident_id ?? '')

  // winner prop 변경 시 상태 동기화 (페이지 revalidate 후)
  useEffect(() => {
    setRealName(winner.real_name ?? '')
    setBankCode(BANKS.find((b) => b.name === winner.bank_name)?.code ?? '')
    setAccountNumber(winner.account_number ?? '')
    setAccountHolder(winner.account_holder ?? '')
    setWinnerComment(winner.winner_comment ?? '')
    setAdminMemo(winner.admin_memo ?? '')
    setManualEntryCount(winner.manual_entry_count?.toString() ?? '')
    setEmail(winner.email ?? '')
    setPhone(winner.phone ?? '')
    setResidentId(winner.resident_id ?? '')
  }, [winner])

  const handleClose = () => {
    if (isPending) return
    setOpen(false)
    setError(null)
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

    const entryCountNum = parseInt(manualEntryCount, 10)
    if (!manualEntryCount || isNaN(entryCountNum) || entryCountNum < 1) {
      setError('응모 횟수를 1 이상 입력하세요.')
      return
    }

    const selectedBank = BANKS.find((b) => b.code === bankCode)

    startTransition(async () => {
      const result = await updateManualWinnerAction(winner.id, {
        real_name: realName || undefined,
        bank_name: selectedBank?.name || undefined,
        account_number: accountNumber || undefined,
        account_holder: accountHolder || undefined,
        winner_comment: winnerComment || undefined,
        admin_memo: adminMemo || undefined,
        manual_entry_count: entryCountNum,
        email: email || undefined,
        phone: phone || undefined,
        resident_id: residentId || undefined,
      })
      if (result.error) {
        setError(result.error)
      } else {
        handleClose()
      }
    })
  }

  const inputClass = "w-full bg-muted border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
  const labelClass = "text-xs font-medium text-muted-foreground tracking-tight"

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-foreground hover:text-primary hover:underline underline-offset-2 transition-colors text-left"
      >
        {winner.real_name ?? winner.manual_referral_code ?? '—'}
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
        >
          <div className="bg-card rounded-xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground tracking-tight">수동 당첨자 수정</h2>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {winner.prize_rank}등
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 응모 횟수 */}
              <div className="space-y-1">
                <label htmlFor="ew-entry-count" className={labelClass}>
                  응모 횟수 <span className="text-red-500">*</span>
                </label>
                <input
                  id="ew-entry-count"
                  type="number"
                  min={1}
                  value={manualEntryCount}
                  onChange={(e) => setManualEntryCount(e.target.value)}
                  placeholder="0"
                  required
                  className={inputClass}
                />
              </div>

              {/* 실명 */}
              <div className="space-y-1">
                <label htmlFor="ew-real-name" className={labelClass}>
                  실명 <span className="text-muted-foreground/60">(선택)</span>
                </label>
                <input
                  id="ew-real-name"
                  type="text"
                  value={realName}
                  onChange={(e) => setRealName(e.target.value)}
                  placeholder="홍길동"
                  className={inputClass}
                />
              </div>

              {/* 계좌 정보 */}
              <div className="border-t border-border pt-3 space-y-3">
                <p className="text-[11px] font-semibold text-muted-foreground tracking-widest uppercase">계좌 정보 (선택)</p>

                <div className="space-y-1">
                  <label htmlFor="ew-bank" className={labelClass}>은행</label>
                  <div className="relative">
                    <select
                      id="ew-bank"
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

                <div className="space-y-1">
                  <label htmlFor="ew-account-number" className={labelClass}>계좌번호</label>
                  <input
                    id="ew-account-number"
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9-]/g, ''))}
                    placeholder="12345678901234"
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="ew-account-holder" className={labelClass}>예금주</label>
                  <input
                    id="ew-account-holder"
                    type="text"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    placeholder="홍길동"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* 개인정보 */}
              <div className="border-t border-border pt-3 space-y-3">
                <p className="text-[11px] font-semibold text-muted-foreground tracking-widest uppercase">개인정보 (선택)</p>

                {/* 이메일 */}
                <div className="space-y-1">
                  <label htmlFor="ew-email" className={labelClass}>이메일</label>
                  <input
                    id="ew-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="안내 사항을 전달받을 이메일"
                    className={inputClass}
                  />
                </div>

                {/* 전화번호 */}
                <div className="space-y-1">
                  <label htmlFor="ew-phone" className={labelClass}>전화번호</label>
                  <input
                    id="ew-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="안내 사항을 전달받을 번호"
                    className={inputClass}
                  />
                </div>

                {/* 주민번호 */}
                <div className="space-y-1">
                  <label htmlFor="ew-resident-id" className={labelClass}>주민번호</label>
                  <input
                    id="ew-resident-id"
                    type="text"
                    value={residentId}
                    onChange={(e) => setResidentId(e.target.value)}
                    placeholder="당첨자 본인 주민등록번호"
                    className={inputClass}
                  />
                  <p className="text-[11px] text-muted-foreground/70 tracking-tight">원천세 신고 처리를 위해 필요해요</p>
                </div>
              </div>

              {/* 당첨 소감 */}
              <div className="space-y-1">
                <label htmlFor="ew-winner-comment" className={labelClass}>
                  당첨 소감 <span className="text-muted-foreground/60">(선택 — 앱 당첨자 화면에 표시)</span>
                </label>
                <textarea
                  id="ew-winner-comment"
                  value={winnerComment}
                  onChange={(e) => setWinnerComment(e.target.value)}
                  placeholder="당첨 소감을 입력하세요..."
                  rows={2}
                  className={`${inputClass} resize-none`}
                />
              </div>

              {/* 어드민 메모 */}
              <div className="space-y-1">
                <label htmlFor="ew-admin-memo" className={labelClass}>
                  어드민 메모 <span className="text-muted-foreground/60">(선택)</span>
                </label>
                <textarea
                  id="ew-admin-memo"
                  value={adminMemo}
                  onChange={(e) => setAdminMemo(e.target.value)}
                  placeholder="메모를 입력하세요..."
                  rows={2}
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
                  {isPending ? '저장 중...' : '저장하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
