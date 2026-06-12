'use client'

import { useEffect, useState, useTransition } from 'react'
import { ChevronDown, Search, X, CheckCircle2, AlertTriangle } from 'lucide-react'
import { addManualWinnerAction, searchUserAction } from '@/app/(admin)/draws/actions'
import { BANKS } from '@/lib/banks'

interface Props {
  drawId: string
}

export default function AddWinnerDialog({ drawId }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isSearching, startSearchTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [userId, setUserId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResult, setSearchResult] = useState<{
    id: string
    nickname: string | null
    referral_code: string | null
    alreadyWinner?: boolean
  } | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [prizeRank, setPrizeRank] = useState<'1' | '2' | '3' | '4' | '5'>('1')
  const [realName, setRealName] = useState('')
  const [bankCode, setBankCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountHolder, setAccountHolder] = useState('')
  const [winnerComment, setWinnerComment] = useState('')
  const [adminMemo, setAdminMemo] = useState('')
  const [manualEntryCount, setManualEntryCount] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [residentId, setResidentId] = useState('')

  const handleClose = () => {
    if (isPending) return
    setOpen(false)
    setError(null)
    setUserId('')
    setSearchQuery('')
    setSearchResult(null)
    setSearchError(null)
    setPrizeRank('1')
    setRealName('')
    setBankCode('')
    setAccountNumber('')
    setAccountHolder('')
    setWinnerComment('')
    setAdminMemo('')
    setManualEntryCount('')
    setEmail('')
    setPhone('')
    setResidentId('')
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, isPending])

  const handleSearch = () => {
    if (!searchQuery.trim()) return
    setSearchError(null)
    setSearchResult(null)
    startSearchTransition(async () => {
      const res = await searchUserAction(searchQuery.trim(), drawId)
      if (res.error) {
        setSearchError(res.error)
      } else if (res.user) {
        setSearchResult({ ...res.user, alreadyWinner: res.alreadyWinner })
        setUserId(res.user.id)
      }
    })
  }

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
      const result = await addManualWinnerAction({
        draw_id: drawId,
        user_id: userId || undefined,
        prize_rank: Number(prizeRank),
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
              {/* 앱 유저 연결 */}
              <div className="space-y-2">
                <label className={labelClass}>
                  앱 유저 연결 <span className="text-muted-foreground/60">(선택)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch() } }}
                    placeholder="초대코드 또는 UUID"
                    disabled={isSearching}
                    className={`${inputClass} flex-1`}
                  />
                  <button
                    type="button"
                    onClick={handleSearch}
                    disabled={isSearching || !searchQuery.trim()}
                    className="px-3 py-2 rounded-md bg-muted border border-border text-sm text-foreground hover:bg-accent disabled:opacity-40 transition-colors flex items-center gap-1"
                  >
                    <Search className="w-3.5 h-3.5" />
                    {isSearching ? '검색 중' : '검색'}
                  </button>
                </div>

                {searchError && (
                  <p className="text-xs text-red-500 tracking-tight">{searchError}</p>
                )}

                {searchResult && (
                  <div className={`flex items-center justify-between rounded-lg px-3 py-2.5 border ${searchResult.alreadyWinner ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      {searchResult.alreadyWinner
                        ? <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                        : <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                      }
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground tracking-tight truncate">
                          {searchResult.nickname ?? '(닉네임 없음)'} · {searchResult.referral_code}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono truncate">{searchResult.id}</p>
                        {searchResult.alreadyWinner && (
                          <p className="text-[10px] text-amber-600 tracking-tight">이미 이 회차에 당첨자로 등록됨</p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchResult(null)
                        setSearchQuery('')
                        setUserId('')
                      }}
                      className="ml-2 p-1 rounded hover:bg-black/10 text-muted-foreground flex-shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* 등수 */}
              <div className="space-y-1">
                <label htmlFor="aw-prize-rank" className={labelClass}>등수</label>
                <select
                  id="aw-prize-rank"
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

              {/* 응모 횟수 */}
              <div className="space-y-1">
                <label htmlFor="aw-entry-count" className={labelClass}>
                  응모 횟수 <span className="text-muted-foreground/60">(필수)</span>
                </label>
                <input
                  id="aw-entry-count"
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

              {/* 개인정보 */}
              <div className="border-t border-border pt-3 space-y-3">
                <p className="text-[11px] font-semibold text-muted-foreground tracking-widest uppercase">개인정보 (선택)</p>

                {/* 이메일 */}
                <div className="space-y-1">
                  <label htmlFor="aw-email" className={labelClass}>이메일</label>
                  <input
                    id="aw-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="안내 사항을 전달받을 이메일"
                    className={inputClass}
                  />
                </div>

                {/* 전화번호 */}
                <div className="space-y-1">
                  <label htmlFor="aw-phone" className={labelClass}>전화번호</label>
                  <input
                    id="aw-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="안내 사항을 전달받을 번호"
                    className={inputClass}
                  />
                </div>

                {/* 주민번호 */}
                <div className="space-y-1">
                  <label htmlFor="aw-resident-id" className={labelClass}>주민번호</label>
                  <input
                    id="aw-resident-id"
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
                <label htmlFor="aw-winner-comment" className={labelClass}>
                  당첨 소감 <span className="text-muted-foreground/60">(선택 — 앱 당첨자 화면에 표시)</span>
                </label>
                <textarea
                  id="aw-winner-comment"
                  value={winnerComment}
                  onChange={(e) => setWinnerComment(e.target.value)}
                  placeholder="당첨 소감을 입력하세요..."
                  rows={2}
                  className={`${inputClass} resize-none`}
                />
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
