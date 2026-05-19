'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition, useEffect } from 'react'
import { FlaskConical, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import {
  closeDrawAction,
  judgeWinnersAction,
  publishDrawAction,
  resetDrawAction,
  getEntryCountAction,
} from '@/app/(admin)/draws/actions'
import { type DrawStatus } from '@/lib/supabase/draws'

interface Props {
  drawId: string
  roundNumber: number
  status: DrawStatus
}

const STATUS_BADGE: Record<DrawStatus, { label: string; className: string }> = {
  active: { label: '응모 진행중', className: 'bg-blue-100 text-blue-700' },
  closed: { label: '응모 마감', className: 'bg-amber-100 text-amber-700' },
  drawn: { label: '판정 완료', className: 'bg-purple-100 text-purple-700' },
  completed: { label: '발표 완료', className: 'bg-green-100 text-green-700' },
  upcoming: { label: '예정', className: 'bg-gray-100 text-gray-600' },
}

const ENV = process.env.NEXT_PUBLIC_APP_ENV ?? 'development'
const ENV_BADGE = ENV === 'production'
  ? { label: 'PRODUCTION', className: 'bg-red-100 text-red-700 border border-red-300', warn: true }
  : ENV === 'staging'
    ? { label: 'STAGING', className: 'bg-orange-100 text-orange-700 border border-orange-300', warn: false }
    : { label: 'LOCAL / DEV', className: 'bg-gray-100 text-gray-600 border border-gray-300', warn: false }

const EMPTY_NUMBERS = ['', '', '', '', '', ''] as const

export default function TestControlPanel({ drawId, roundNumber, status }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [collapsed, setCollapsed] = useState(false)
  const [showJudgeForm, setShowJudgeForm] = useState(false)
  const [entryCount, setEntryCount] = useState<number | null>(null)
  const [winNumbers, setWinNumbers] = useState<string[]>([...EMPTY_NUMBERS])
  const [bonusNumber, setBonusNumber] = useState('')
  const [error, setError] = useState<string | null>(null)

  // 응모자 수 조회: closed 상태일 때
  useEffect(() => {
    if (status === 'closed') {
      getEntryCountAction(drawId).then((result) => setEntryCount(result.count ?? null)).catch(() => {})
    }
  }, [drawId, status])

  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.upcoming

  // ── 각 스텝 활성 여부
  const step1Active = status === 'active'
  const step2Active = status === 'closed'
  const step3Active = status === 'drawn'
  const resetActive = status !== 'completed'

  // ── 공통 액션 래퍼 (actions는 throw 대신 { error? } 반환)
  function run(fn: () => Promise<{ error?: string }>) {
    setError(null)
    startTransition(async () => {
      const result = await fn()
      if (result?.error) {
        setError(result.error)
      } else {
        router.refresh()
      }
    })
  }

  // ── Step 1: 응모 마감
  function handleClose() {
    if (!step1Active) return
    run(() => closeDrawAction(drawId))
  }

  // ── Step 2: 당첨자 판정 (폼 토글)
  function handleJudgeToggle() {
    if (!step2Active) return
    setShowJudgeForm((prev) => !prev)
  }

  function handleJudgeSubmit() {
    const nums = winNumbers.map(Number)
    const bonus = Number(bonusNumber)
    if (nums.some((n) => !n || n < 1 || n > 45) || !bonus || bonus < 1 || bonus > 45) {
      setError('당첨번호 6개와 보너스번호를 1~45 사이로 입력하세요.')
      return
    }
    run(() => judgeWinnersAction(drawId, nums, bonus))
  }

  // ── Step 3: 당첨자 발표
  function handlePublish() {
    if (!step3Active) return
    if (!confirm('당첨자를 발표하고 다음 회차를 활성화하시겠습니까?')) return
    run(() => publishDrawAction(drawId, roundNumber))
  }

  // ── 초기화
  function handleReset() {
    if (!resetActive) return
    if (!confirm(`⚠️ ${roundNumber}회차 데이터를 초기화하시겠습니까?\n당첨자 삭제 + 응모 상태 롤백됩니다.`)) return
    run(() => resetDrawAction(drawId))
  }

  // ── 버튼 카드 스타일 헬퍼
  function cardClass(active: boolean, isReset = false) {
    const base = 'rounded-xl border p-3 text-left space-y-1.5 w-full transition-colors'
    if (isPending) return `${base} opacity-50 pointer-events-none bg-muted/30 border-border/50`
    if (!active) return `${base} bg-muted/30 border-border/50 opacity-50 cursor-not-allowed`
    if (isReset) return `${base} bg-red-50 border-red-200 hover:bg-red-100 cursor-pointer`
    return `${base} bg-white border-border hover:bg-accent cursor-pointer`
  }

  return (
    <div className="rounded-xl border border-border bg-[#fafafa] p-4 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-semibold text-foreground">
            테스트 컨트롤 패널 — {roundNumber}회차
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${ENV_BADGE.className}`}>
            {ENV_BADGE.warn && <AlertTriangle className="w-3 h-3" />}
            {ENV_BADGE.label}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {/* 프로덕션 경고 배너 */}
      {ENV_BADGE.warn && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 font-medium flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          프로덕션 환경입니다. 실제 사용자 데이터에 영향을 줄 수 있습니다. 신중하게 진행하세요.
        </div>
      )}

      {!collapsed && (
        <>
          {/* 현재 상태 배지 */}
          <div>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
              {badge.label}
            </span>
          </div>

          {/* 버튼 그리드 2×2 */}
          <div className="grid grid-cols-2 gap-3">
            {/* Step 1: 응모 마감 */}
            <button
              type="button"
              disabled={!step1Active || isPending}
              onClick={handleClose}
              className={cardClass(step1Active)}
            >
              <p className="text-xs font-semibold text-foreground">[Step 1] 응모 마감</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                토요일 20:00 close-draw 스케줄 역할. end_date 무시하고 즉시 마감
              </p>
            </button>

            {/* Step 2: 당첨자 판정 */}
            <button
              type="button"
              disabled={!step2Active || isPending}
              onClick={handleJudgeToggle}
              className={cardClass(step2Active)}
            >
              <p className="text-xs font-semibold text-foreground flex items-center gap-1">
                [Step 2] 당첨자 판정
                {step2Active && (showJudgeForm
                  ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                  : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />)}
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                winning_numbers 저장 → judge_draw_winners RPC → status=drawn
              </p>
            </button>

            {/* Step 3: 당첨자 발표 */}
            <button
              type="button"
              disabled={!step3Active || isPending}
              onClick={handlePublish}
              className={cardClass(step3Active)}
            >
              <p className="text-xs font-semibold text-foreground">[Step 3] 당첨자 발표</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                일요일 10:00 publish-and-open 스케줄 역할. 다음 회차 활성화 (푸시 생략)
              </p>
            </button>

            {/* 초기화 */}
            <button
              type="button"
              disabled={!resetActive || isPending}
              onClick={handleReset}
              className={cardClass(resetActive, true)}
            >
              <p className={`text-xs font-semibold ${resetActive ? 'text-red-700' : 'text-foreground'}`}>
                [초기화]
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                draw_winners 삭제 + draw_entries 롤백 + status=active 복원
              </p>
            </button>
          </div>

          {/* Step 2 인라인 폼 */}
          {step2Active && showJudgeForm && (
            <div className="mt-3 pt-3 border-t border-border space-y-3">
              <p className="text-xs font-medium text-muted-foreground">
                응모자 수: {entryCount !== null ? `${entryCount}명` : '조회 중...'}
              </p>

              {/* 당첨번호 6개 */}
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">당첨번호 (6개, 1~45)</label>
                <div className="grid grid-cols-6 gap-2">
                  {winNumbers.map((val, idx) => (
                    <input
                      key={idx}
                      type="number"
                      min={1}
                      max={45}
                      value={val}
                      onChange={(e) => {
                        const next = [...winNumbers]
                        next[idx] = e.target.value
                        setWinNumbers(next)
                      }}
                      placeholder={String(idx + 1)}
                      className="rounded-md border border-border bg-white px-2 py-1.5 text-center text-xs focus:outline-none focus:ring-1 focus:ring-primary/30 w-full"
                    />
                  ))}
                </div>
              </div>

              {/* 보너스번호 */}
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-muted-foreground whitespace-nowrap">보너스번호 (1~45)</label>
                <input
                  type="number"
                  min={1}
                  max={45}
                  value={bonusNumber}
                  onChange={(e) => setBonusNumber(e.target.value)}
                  placeholder="보너스"
                  className="rounded-md border border-border bg-white px-2 py-1.5 text-center text-xs focus:outline-none focus:ring-1 focus:ring-primary/30 w-20"
                />
              </div>

              {/* 판정 실행 버튼 */}
              <button
                type="button"
                onClick={handleJudgeSubmit}
                disabled={isPending}
                className="w-full rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                {isPending ? '판정 중...' : '판정 실행'}
              </button>
            </div>
          )}

          {/* 에러 메시지 */}
          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}
        </>
      )}
    </div>
  )
}
