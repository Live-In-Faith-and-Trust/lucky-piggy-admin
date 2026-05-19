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
    <button
      type="button"
      role="switch"
      aria-checked={localVerified}
      disabled={isPending}
      onClick={() => {
        const next = !localVerified
        setLocalVerified(next)
        startTransition(async () => {
          const result = await toggleAccountVerifiedAction(winnerId, next)
          if (result?.error) setLocalVerified(!next)
        })
      }}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        localVerified ? 'bg-emerald-500' : 'bg-neutral-200'
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition-transform duration-150 ease-in-out ${
          localVerified ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  )
}
