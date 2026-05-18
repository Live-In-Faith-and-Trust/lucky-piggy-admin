'use client'

import { useState, useTransition } from 'react'
import { type PaymentStatus } from '@/lib/supabase/draws'
import { updatePaymentStatusAction } from '@/app/(admin)/draws/actions'

const STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: '미지급',
  paid: '지급완료',
  cancelled: '취소',
}

const STATUS_STYLES: Record<PaymentStatus, string> = {
  pending: 'bg-muted text-muted-foreground border-border',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-50 text-red-500 border-red-200',
}

const CONFIRM_MESSAGES: Partial<Record<PaymentStatus, string>> = {
  paid: '지급 완료 처리하시겠습니까?',
  cancelled: '당첨을 취소하시겠습니까?',
}

interface Props {
  winnerId: string
  status: PaymentStatus
}

export default function PaymentStatusButton({ winnerId, status }: Props) {
  const [localStatus, setLocalStatus] = useState<PaymentStatus>(status)
  const [isPending, startTransition] = useTransition()

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as PaymentStatus
    const confirmMsg = CONFIRM_MESSAGES[next]
    if (confirmMsg && !confirm(confirmMsg)) return

    const prev = localStatus
    setLocalStatus(next)
    startTransition(async () => {
      const result = await updatePaymentStatusAction(winnerId, next)
      if (result?.error) {
        setLocalStatus(prev)
        alert(`오류: ${result.error}`)
      }
    })
  }

  return (
    <select
      value={localStatus}
      onChange={handleChange}
      disabled={isPending}
      className={`text-xs font-medium px-2 py-0.5 rounded-full border cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none ${STATUS_STYLES[localStatus]}`}
    >
      {(Object.keys(STATUS_LABELS) as PaymentStatus[]).map((s) => (
        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
      ))}
    </select>
  )
}
