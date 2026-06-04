'use client'

import { useEffect, useRef, useState } from 'react'
import { updateManualEntryCountAction } from '@/app/(admin)/draws/actions'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface Props {
  winnerId: string
  count: number | null
}

export default function ManualEntryCountInput({ winnerId, count }: Props) {
  const [value, setValue] = useState(count?.toString() ?? '')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  const handleBlur = async () => {
    const num = parseInt(value, 10)
    if (!value || isNaN(num) || num < 1) {
      setValue(count?.toString() ?? '')
      return
    }
    if (num === count) return
    setSaveStatus('saving')
    const result = await updateManualEntryCountAction(winnerId, num)
    if (result?.error) {
      setSaveStatus('error')
      setValue(count?.toString() ?? '')
    } else {
      setSaveStatus('saved')
    }
    timerRef.current = setTimeout(() => setSaveStatus('idle'), 1500)
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        min={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        placeholder="0"
        className="text-xs w-14 border-0 border-b border-transparent hover:border-border focus:border-border focus:outline-none bg-transparent py-0.5 px-1 tabular-nums"
      />
      <span className="text-xs text-muted-foreground">장</span>
      {saveStatus === 'saving' && (
        <span className="text-xs text-muted-foreground whitespace-nowrap">저장 중</span>
      )}
      {saveStatus === 'saved' && (
        <span className="text-xs text-emerald-600 whitespace-nowrap">저장됨</span>
      )}
      {saveStatus === 'error' && (
        <span className="text-xs text-red-500 whitespace-nowrap">실패</span>
      )}
    </div>
  )
}
