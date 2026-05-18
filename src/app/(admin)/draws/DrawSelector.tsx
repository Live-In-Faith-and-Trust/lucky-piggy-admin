'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { RotateCw } from 'lucide-react'
import { type Draw } from '@/lib/supabase/draws'
import { refreshWinners } from '@/app/(admin)/draws/actions'

const STATUS_LABELS: Record<string, string> = {
  upcoming: '예정',
  active: '진행중',
  closed: '마감',
  drawn: '추첨완료',
  completed: '완료',
}

interface Props {
  draws: Draw[]
  currentDrawId: string
}

export default function DrawSelector({ draws, currentDrawId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <div className="flex items-center gap-2">
      <select
        value={currentDrawId}
        onChange={(e) => router.push(`/draws?drawId=${e.target.value}`)}
        aria-label="회차 선택"
        className="border border-border rounded-md px-3 py-1.5 text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        {draws.map((draw) => (
          <option key={draw.id} value={draw.id}>
            {draw.round_number}회차 ({STATUS_LABELS[draw.status] ?? draw.status})
          </option>
        ))}
      </select>
      <button
        onClick={() =>
          startTransition(async () => {
            await refreshWinners(currentDrawId)
            router.refresh()
          })
        }
        disabled={isPending}
        aria-label="당첨자 목록 새로고침"
        className="ml-2 p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
      >
        <RotateCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
      </button>
    </div>
  )
}
