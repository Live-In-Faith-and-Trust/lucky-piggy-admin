'use client'

import { useState, useTransition } from 'react'
import { ChevronDown } from 'lucide-react'
import { type PaymentStatus } from '@/lib/supabase/draws'
import { updatePaymentStatusAction } from '@/app/(admin)/draws/actions'

const STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: '미지급',
  paid: '지급완료',
  cancelled: '취소',
}

const STATUS_BADGE: Record<PaymentStatus, string> = {
  pending: 'bg-neutral-100 text-neutral-600 border-neutral-200',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-50 text-red-500 border-red-200',
}

const STATUS_DOT: Record<PaymentStatus, string> = {
  pending: 'bg-neutral-400',
  paid: 'bg-emerald-500',
  cancelled: 'bg-red-400',
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
    <div className="relative inline-flex">
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border cursor-pointer select-none transition-opacity ${STATUS_BADGE[localStatus]} ${isPending ? 'opacity-50' : ''}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[localStatus]}`} />
        {STATUS_LABELS[localStatus]}
        <ChevronDown className="w-3 h-3 opacity-40" />
      </span>
      <select
        value={localStatus}
        onChange={handleChange}
        disabled={isPending}
        aria-label="지급 상태 변경"
        className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed w-full"
      >
        {(Object.keys(STATUS_LABELS) as PaymentStatus[]).map((s) => (
          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
        ))}
      </select>
    </div>
  )
}
