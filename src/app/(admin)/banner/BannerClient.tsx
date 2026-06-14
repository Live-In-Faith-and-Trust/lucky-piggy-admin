'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { type HomeBannerConfig } from '@/lib/supabase/notices'
import { updateBannerAction } from './actions'

interface Props {
  initialConfig: HomeBannerConfig | null
}

export default function BannerClient({ initialConfig }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [isActive, setIsActive] = useState(initialConfig?.is_active ?? false)
  const [line1, setLine1] = useState(initialConfig?.line1 ?? '')
  const [line2, setLine2] = useState(initialConfig?.line2 ?? '')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await updateBannerAction(formData)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      }
    })
  }

  return (
    <div className="space-y-5">
      {/* 앱 미리보기 */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground tracking-tight uppercase">앱 미리보기</p>
        {/* 폰 화면 프레임 (375px = 일반 스마트폰 기준) */}
        <div className="w-[375px] max-w-full">
          <div className="rounded-2xl border border-border bg-muted/30 px-4 py-4 space-y-1">
            <p className="text-[10px] text-muted-foreground/60 text-center tracking-tight mb-3">
              iPhone 기준 (375px)
            </p>
            {isActive && (line1 || line2) ? (
              <div className="rounded-xl bg-[#EEF2FF] px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  {line1 && (
                    <p className="text-sm font-semibold text-indigo-800 tracking-tight truncate">{line1}</p>
                  )}
                  {line2 && (
                    <p className="text-xs text-indigo-600 tracking-tight truncate mt-0.5">{line2}</p>
                  )}
                </div>
                <X className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-border px-4 py-3 text-center">
                <p className="text-xs text-muted-foreground tracking-tight">
                  {!isActive ? '배너 비활성화 상태' : '배너 내용을 입력하면 미리보기가 표시됩니다'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 폼 */}
      <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-5 space-y-4">
        {/* 활성화 토글 */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground tracking-tight">배너 활성화</p>
            <p className="text-xs text-muted-foreground tracking-tight mt-0.5">켜면 앱 홈 화면에 배너가 표시됩니다</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isActive}
            onClick={() => setIsActive((v) => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 ${
              isActive ? 'bg-primary' : 'bg-border'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                isActive ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          {/* hidden input for form submission */}
          <input type="hidden" name="is_active" value={isActive ? 'true' : 'false'} />
        </div>

        <div className="border-t border-border" />

        {/* 배너 1줄 */}
        <div className="space-y-1.5">
          <label htmlFor="line1" className="text-sm font-medium text-foreground tracking-tight">
            배너 1줄 {isActive && <span className="text-red-500">*</span>}
          </label>
          <input
            id="line1"
            name="line1"
            type="text"
            required={isActive}
            value={line1}
            onChange={(e) => setLine1(e.target.value)}
            placeholder="예) 이번 주 추첨이 시작되었습니다!"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
          />
        </div>

        {/* 배너 2줄 */}
        <div className="space-y-1.5">
          <label htmlFor="line2" className="text-sm font-medium text-foreground tracking-tight">
            배너 2줄 <span className="text-muted-foreground font-normal">(선택)</span>
          </label>
          <input
            id="line2"
            name="line2"
            type="text"
            value={line2}
            onChange={(e) => setLine2(e.target.value)}
            placeholder="예) 지금 바로 응모권을 사용해보세요"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
          />
        </div>

        {error && (
          <p className="text-xs text-red-500 tracking-tight">{error}</p>
        )}

        {success && (
          <p className="text-xs text-green-600 tracking-tight font-medium">저장되었습니다.</p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? '저장 중...' : '저장하기'}
        </button>
      </form>
    </div>
  )
}
