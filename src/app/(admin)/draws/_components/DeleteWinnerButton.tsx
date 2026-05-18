'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { deleteManualWinnerAction } from '@/app/(admin)/draws/actions'

interface Props {
  winnerId: string
}

export default function DeleteWinnerButton({ winnerId }: Props) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleDelete = () => {
    if (!confirm('수동 당첨자를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return
    startTransition(async () => {
      const result = await deleteManualWinnerAction(winnerId)
      if (result.error) {
        alert(result.error)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      aria-label="수동 당첨자 삭제"
      className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  )
}
