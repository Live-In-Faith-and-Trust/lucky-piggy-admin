'use client'

import { useState, useTransition } from 'react'
import { type PaymentStatus } from '@/lib/supabase/draws'
import { updatePaymentStatusAction } from '@/app/(admin)/draws/actions'

interface Props {
  winnerId: string
  status: PaymentStatus
}

export default function PaymentStatusButton({ winnerId, status }: Props) {
  const [localStatus, setLocalStatus] = useState<PaymentStatus>(status)
  const [isPending, startTransition] = useTransition()

  if (localStatus === 'paid') {
    return (
      <span className="text-xs font-medium text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5">
        완료
      </span>
    )
  }

  if (localStatus === 'cancelled') {
    return (
      <span className="text-xs font-medium text-red-500 bg-red-50 rounded-full px-2 py-0.5">
        취소됨
      </span>
    )
  }

  const handlePaid = () => {
    if (!confirm('지급 완료 처리하시겠습니까? 되돌릴 수 없습니다.')) return
    const prev = localStatus
    setLocalStatus('paid')
    startTransition(async () => {
      const result = await updatePaymentStatusAction(winnerId, 'paid')
      if (result?.error) {
        setLocalStatus(prev)
        alert(`오류: ${result.error}`)
      }
    })
  }

  const handleCancel = () => {
    if (!confirm('당첨을 취소하시겠습니까?')) return
    const prev = localStatus
    setLocalStatus('cancelled')
    startTransition(async () => {
      const result = await updatePaymentStatusAction(winnerId, 'cancelled')
      if (result?.error) {
        setLocalStatus(prev)
        alert(`오류: ${result.error}`)
      }
    })
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handlePaid}
        disabled={isPending}
        className="text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 disabled:opacity-50"
      >
        지급완료
      </button>
      <button
        onClick={handleCancel}
        disabled={isPending}
        className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 disabled:opacity-50"
      >
        취소
      </button>
    </div>
  )
}
