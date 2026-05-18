'use client'

import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { type DrawWinner } from '@/lib/supabase/draws'
import { formatKRW } from '@/lib/format'
import AccountVerifyToggle from './_components/AccountVerifyToggle'
import PaymentStatusButton from './_components/PaymentStatusButton'
import AdminMemoInput from './_components/AdminMemoInput'
import AddWinnerDialog from './_components/AddWinnerDialog'
import DeleteWinnerButton from './_components/DeleteWinnerButton'

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: '미지급',
  paid: '지급완료',
  cancelled: '취소',
}

function downloadWinnersCSV(winners: DrawWinner[], rankAmounts: Record<number, number | null>, roundNumber: number) {
  const headers = ['등수', '이름(실명)', '초대코드', '1인당 상금', '계좌제출', '계좌확인', '은행명', '계좌번호', '예금주', '지급상태', '메모']
  const rows = winners.map((w) => {
    const referralCode = w.source === 'auto' ? (w.profiles?.referral_code ?? '') : (w.manual_referral_code ?? '')
    const amount = rankAmounts[w.prize_rank]
    return [
      `${w.prize_rank}등`,
      w.real_name ?? '',
      referralCode,
      amount != null ? amount.toString() : '',
      w.account_submitted_at ? '제출' : '미제출',
      w.account_verified ? '확인' : '미확인',
      w.bank_name ?? '',
      w.account_number ?? '',
      w.account_holder ?? '',
      PAYMENT_STATUS_LABELS[w.payment_status] ?? w.payment_status,
      w.admin_memo ?? '',
    ]
  })
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `당첨자_${roundNumber}회차.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function maskName(winner: DrawWinner): string {
  const name = winner.real_name ?? winner.profiles?.nickname ?? null
  if (!name) return '—'
  if (name.length <= 1) return name
  return name[0] + '*'.repeat(Math.min(name.length - 1, 2))
}

const RANK_STYLES: Record<number, string> = {
  1: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  2: 'bg-slate-50 text-slate-600 border border-slate-200',
  3: 'bg-orange-50 text-orange-700 border border-orange-200',
}

const TABS = [
  { key: 0, label: '전체' },
  { key: 1, label: '1등' },
  { key: 2, label: '2등' },
  { key: 3, label: '3등' },
] as const

type TabKey = 0 | 1 | 2 | 3

interface Props {
  winners: DrawWinner[]
  drawId: string
  rankAmounts: Record<number, number | null>
  roundNumber: number
}

export default function WinnerList({ winners, drawId, rankAmounts, roundNumber }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>(0)

  const filtered = activeTab === 0 ? winners : winners.filter((w) => w.prize_rank === activeTab)

  const countByRank = useMemo(() => {
    const map: Record<number, number> = {}
    for (const w of winners) map[w.prize_rank] = (map[w.prize_rank] ?? 0) + 1
    return map
  }, [winners])

  const emptyMessage =
    activeTab === 0 ? '이 회차의 1~3등 당첨자가 없습니다' : `이 회차의 ${activeTab}등 당첨자가 없습니다`

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <AddWinnerDialog drawId={drawId} />
        <button
          onClick={() => downloadWinnersCSV(winners, rankAmounts, roundNumber)}
          disabled={winners.length === 0}
          className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md bg-muted text-muted-foreground hover:bg-accent hover:text-foreground border border-border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="w-3.5 h-3.5" />
          엑셀 다운로드
        </button>
      </div>

      <div role="tablist" className="flex gap-1 border-b border-border px-4 pt-1">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            aria-selected={activeTab === key}
            onClick={() => setActiveTab(key)}
            className={`px-3 py-2 text-sm font-medium rounded-t-md transition-colors flex items-center gap-1.5 ${
              activeTab === key
                ? 'text-foreground border-b-2 border-primary -mb-px'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
            <span className="text-xs bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 tabular-nums">
              {key === 0 ? winners.length : (countByRank[key] ?? 0)}
            </span>
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            {emptyMessage}
          </div>
        ) : (
          <table className="w-full text-sm">
            <caption className="sr-only">당첨자 목록</caption>
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border">
                <th className="text-left px-4 py-3 font-medium">등수</th>
                <th className="text-left px-4 py-3 font-medium">이름</th>
                <th className="text-left px-4 py-3 font-medium">초대코드</th>
                <th className="text-left px-4 py-3 font-medium">1인당 상금</th>
                <th className="text-left px-4 py-3 font-medium">계좌제출</th>
                <th className="text-left px-4 py-3 font-medium">확인</th>
                <th className="text-left px-4 py-3 font-medium">지급상태</th>
                <th className="text-left px-4 py-3 font-medium">메모</th>
                <th className="px-4 py-3 font-medium w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((winner) => {
                const amount = rankAmounts[winner.prize_rank]
                return (
                  <tr key={winner.id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${RANK_STYLES[winner.prize_rank] ?? ''}`}
                      >
                        {winner.prize_rank}등
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground">{maskName(winner)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-foreground">
                      {winner.source === 'auto'
                        ? (winner.profiles?.referral_code ?? '—')
                        : (winner.manual_referral_code ?? '—')}
                    </td>
                    <td className="px-4 py-3 text-foreground tabular-nums">
                      {amount !== null && amount !== undefined ? formatKRW(amount) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {winner.account_submitted_at ? (
                        <span className="text-emerald-600 text-xs font-medium">✓ 제출</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">미제출</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <AccountVerifyToggle
                        winnerId={winner.id}
                        verified={winner.account_verified}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <PaymentStatusButton
                        winnerId={winner.id}
                        status={winner.payment_status}
                      />
                    </td>
                    <td className="px-4 py-3 min-w-[140px]">
                      <AdminMemoInput
                        winnerId={winner.id}
                        memo={winner.admin_memo ?? ''}
                      />
                    </td>
                    <td className="px-4 py-3">
                      {winner.source === 'manual' && (
                        <DeleteWinnerButton winnerId={winner.id} />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

    </div>
  )
}
