'use client'

import { useState, useTransition } from 'react'
import { toggleAccountVerifiedAction } from '@/app/(admin)/draws/actions'

interface Props {
  winnerId: string
  verified: boolean
}

export default function AccountVerifyToggle({ winnerId, verified }: Props) {
  const [localVerified, setLocalVerified] = useState(verified)
  const [isPending, startTransition] = useTransition()

  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={localVerified}
        onChange={() => {
          const next = !localVerified
          setLocalVerified(next)
          startTransition(async () => {
            const result = await toggleAccountVerifiedAction(winnerId, next)
            if (result?.error) setLocalVerified(!next)
          })
        }}
        disabled={isPending}
        className="h-4 w-4 rounded accent-emerald-600"
      />
      <span className="text-xs text-muted-foreground">
        {isPending ? '저장 중...' : localVerified ? '확인됨' : '미확인'}
      </span>
    </label>
  )
}
