'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { logout, setAdminEnv } from '@/app/login/actions'
import { cn } from '@/lib/utils'
import type { AdminEnv } from '@/lib/supabase/server'

const envConfig = {
  production: {
    label: 'Production',
    dot: 'bg-emerald-400',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    spinner: 'border-emerald-400',
  },
  staging: {
    label: 'Staging',
    dot: 'bg-amber-400',
    badge: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
    spinner: 'border-amber-400',
  },
} satisfies Record<AdminEnv, { label: string; dot: string; badge: string; spinner: string }>

export default function AdminHeader({ defaultEnv }: { defaultEnv: AdminEnv }) {
  const router = useRouter()
  const [env, setEnv] = useState<AdminEnv>(defaultEnv)
  const [isPending, startTransition] = useTransition()

  function handleEnvChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newEnv = e.target.value as AdminEnv
    setEnv(newEnv)
    startTransition(async () => {
      await setAdminEnv(newEnv)
      router.refresh()
    })
  }

  const cfg = envConfig[env]

  return (
    <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-border bg-card px-6">
      <span className="text-sm font-semibold text-foreground">당첨돼지 admin</span>

      <div className="flex items-center gap-3">
        {/* 환경 선택 — 뱃지 위에 투명 select 오버레이 */}
        <div className="relative">
          <div
            className={cn(
              'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors select-none',
              cfg.badge,
              isPending && 'opacity-60',
            )}
          >
            {isPending ? (
              <span
                className={cn(
                  'h-2 w-2 rounded-full border-2 border-t-transparent animate-spin',
                  cfg.spinner,
                )}
              />
            ) : (
              <span className={cn('h-2 w-2 rounded-full', cfg.dot)} />
            )}
            {cfg.label}
            <svg
              className="ml-0.5 h-3 w-3 opacity-50"
              viewBox="0 0 12 12"
              fill="currentColor"
            >
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <select
            value={env}
            onChange={handleEnvChange}
            disabled={isPending}
            className="absolute inset-0 w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            aria-label="환경 선택"
          >
            <option value="production">Production</option>
            <option value="staging">Staging</option>
          </select>
        </div>

        <div className="h-4 w-px bg-border" />

        <form action={logout}>
          <button
            type="submit"
            className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            로그아웃
          </button>
        </form>
      </div>
    </header>
  )
}
