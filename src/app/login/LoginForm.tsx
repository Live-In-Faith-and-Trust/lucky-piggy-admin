'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { login } from './actions'

export function LoginForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const data = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await login(data)
      if (result.success) {
        router.replace('/')
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* 이미지: 카드 밖, 카드 가로 꽉 차게 */}
        <div className="relative w-full rounded-t-xl overflow-hidden">
          <Image
            src="/admin-login.png"
            alt="Lucky Piggy"
            width={384}
            height={384}
            priority
            className="w-full h-auto"
          />
        </div>

        <div className="bg-card rounded-b-xl shadow-sm border border-border border-t-0 px-8 py-10">
          <h1 className="text-center text-lg font-semibold text-foreground tracking-tight mb-8">
            Lucky Piggy Admin
          </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-xs font-medium text-muted-foreground tracking-tight">
              이메일
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="admin@example.com"
              className="bg-muted border border-border rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all w-full"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-xs font-medium text-muted-foreground tracking-tight">
              비밀번호
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="bg-muted border border-border rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all w-full"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 tracking-tight">{error}</p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer mt-2"
          >
            {isPending ? '로그인 중...' : '로그인'}
          </button>
        </form>
        </div>
      </div>
    </div>
  )
}
