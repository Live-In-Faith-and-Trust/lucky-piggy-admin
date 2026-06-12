'use client'

import { useState, useTransition } from 'react'
import { type FeatureFlag } from '@/lib/supabase/feature-flags'
import { toggleFeatureFlagAction } from './actions'

interface Props {
  initialFlags: FeatureFlag[]
  isProduction: boolean
}

export default function FeatureFlagsClient({ initialFlags, isProduction }: Props) {
  const [flags, setFlags] = useState<FeatureFlag[]>(initialFlags)
  const [dirty, setDirty] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleToggle = (code: string) => {
    setFlags((prev) =>
      prev.map((f) => (f.code === code ? { ...f, is_enabled: !f.is_enabled } : f))
    )
    setDirty((prev) => {
      const next = new Set(prev)
      const original = initialFlags.find((f) => f.code === code)
      // 현재 flags 상태는 setFlags 이전이므로 토글 전 값이 current
      const current = flags.find((f) => f.code === code)
      if (original && current) {
        // 토글하면 current.is_enabled가 반전되므로, 반전 후 원본과 같아지면 dirty 제거
        const afterToggle = !current.is_enabled
        if (afterToggle === original.is_enabled) {
          next.delete(code)
        } else {
          next.add(code)
        }
      } else {
        next.add(code)
      }
      return next
    })
  }

  const handleSave = () => {
    if (dirty.size === 0) return
    if (isProduction) {
      const ok = confirm(
        `⚠️ 프로덕션에 적용합니다.\n${dirty.size}개 플래그가 변경됩니다. 계속할까요?`
      )
      if (!ok) return
    }

    setError(null)
    startTransition(async () => {
      const dirtyFlags = flags.filter((f) => dirty.has(f.code))
      const results = await Promise.all(
        dirtyFlags.map((f) => toggleFeatureFlagAction(f.code, f.is_enabled))
      )
      const firstError = results.find((r) => r.error)
      if (firstError?.error) {
        setError(firstError.error)
      } else {
        setDirty(new Set())
      }
    })
  }

  const dirtyCount = dirty.size

  return (
    <div className="space-y-4">
      {/* 저장 바 */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground tracking-tight">
          {dirtyCount > 0
            ? `${dirtyCount}개 변경됨 — 저장 전까지 적용되지 않습니다`
            : '변경사항 없음'}
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={dirtyCount === 0 || isPending}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
            dirtyCount > 0 && !isPending
              ? isProduction
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          }`}
        >
          {isPending ? '저장 중...' : dirtyCount > 0 ? `저장 (${dirtyCount})` : '저장'}
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-500 tracking-tight">{error}</p>
      )}

      {/* 플래그 목록 */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {flags.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Feature flag 데이터가 없습니다
          </div>
        ) : (
          <div className="divide-y divide-border">
            {flags.map((flag) => {
              const isDirty = dirty.has(flag.code)
              const d = new Date(flag.updated_at)
              const updatedAt = `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
              return (
                <div
                  key={flag.code}
                  className={`relative flex items-center justify-between px-4 py-3.5 transition-colors ${
                    isDirty ? 'bg-blue-50/60' : 'hover:bg-muted/30'
                  } ${isPending ? 'opacity-60' : ''}`}
                >
                  {/* dirty 인디케이터 */}
                  {isDirty && (
                    <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary rounded-r" />
                  )}

                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground tracking-tight">{flag.name}</p>
                      {isDirty && (
                        <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                          변경됨
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">{flag.code}</p>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    <span className="text-[11px] text-muted-foreground hidden sm:block tabular-nums">
                      {updatedAt}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={flag.is_enabled}
                      disabled={isPending}
                      onClick={() => handleToggle(flag.code)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed ${
                        flag.is_enabled ? 'bg-primary' : 'bg-border'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                          flag.is_enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
