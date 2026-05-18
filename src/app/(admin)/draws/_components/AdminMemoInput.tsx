'use client'

import { useEffect, useRef, useState } from 'react'
import { saveAdminMemoAction } from '@/app/(admin)/draws/actions'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface Props {
  winnerId: string
  memo: string
}

export default function AdminMemoInput({ winnerId, memo }: Props) {
  const [value, setValue] = useState(memo)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  const handleBlur = async () => {
    if (value === memo) return
    setSaveStatus('saving')
    const result = await saveAdminMemoAction(winnerId, value)
    if (result?.error) {
      setSaveStatus('error')
      setValue(memo)
    } else {
      setSaveStatus('saved')
    }
    timerRef.current = setTimeout(() => setSaveStatus('idle'), 1500)
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        placeholder="메모 입력..."
        className="text-xs w-full border-0 border-b border-transparent hover:border-border focus:border-border focus:outline-none bg-transparent py-0.5 px-1"
      />
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
