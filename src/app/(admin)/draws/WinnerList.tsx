'use client'

import { useMemo, useState } from 'react'
import { Download, Target, CheckCircle2 } from 'lucide-react'
import { type DrawWinner } from '@/lib/supabase/draws'
import { formatKRW } from '@/lib/format'
import AccountVerifyToggle from './_components/AccountVerifyToggle'
import PaymentStatusButton from './_components/PaymentStatusButton'
import AdminMemoInput from './_components/AdminMemoInput'
import AddWinnerDialog from './_components/AddWinnerDialog'
import BulkAddWinnerDialog from './_components/BulkAddWinnerDialog'
import DeleteWinnerButton from './_components/DeleteWinnerButton'
import ManualEntryCountInput from './_components/ManualEntryCountInput'
import EditManualWinnerDialog from './_components/EditManualWinnerDialog'

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: '미지급',
  paid: '지급완료',
  cancelled: '취소',
}

function downloadWinnersCSV(winners: DrawWinner[], rankAmounts: Record<number, number | null>, roundNumber: number) {
  const headers = ['등수', '이름(실명)', '초대코드', '1인당 상금', '계좌제출', '계좌확인', '은행명', '계좌번호', '예금주', '이메일', '전화번호', '주민번호', '지급상태', '메모']
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
      w.email ?? '',
      w.phone ?? '',
      w.resident_id ?? '',
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

const RANK_BADGE: Record<number, string> = {
  1: 'bg-[#FFDD13] text-[#7A5C00]',
  2: 'bg-slate-100 text-slate-600 border border-slate-200',
  3: 'bg-orange-100 text-orange-700 border border-orange-200',
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
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <AddWinnerDialog drawId={drawId} />
          <BulkAddWinnerDialog drawId={drawId} />
        </div>
        <button
          onClick={() => downloadWinnersCSV(winners.filter((w) => w.source === 'auto'), rankAmounts, roundNumber)}
          disabled={winners.filter((w) => w.source === 'auto').length === 0}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="w-3.5 h-3.5" />
          CSV 내보내기
        </button>
      </div>

      {/* Segment Control Tabs */}
      <div className="px-4 py-2.5 border-b border-border">
        <div role="tablist" className="inline-flex items-center gap-0.5 p-1 bg-muted rounded-lg">
          {TABS.map(({ key, label }) => {
            const count = key === 0 ? winners.length : (countByRank[key] ?? 0)
            const isActive = activeTab === key
            return (
              <button
                key={key}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all tracking-tight ${
                  isActive
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
                <span
                  className={`text-[11px] tabular-nums px-1.5 py-0.5 rounded-full leading-none font-semibold ${
                    isActive ? 'bg-primary text-primary-foreground' : 'bg-border text-muted-foreground'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground text-sm tracking-tight">
            <Target className="w-8 h-8 opacity-40" />
            <span>{emptyMessage}</span>
          </div>
        ) : (
          <table className="w-full text-sm">
            <caption className="sr-only">당첨자 목록</caption>
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">등수</th>
                <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">이름</th>
                <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">당첨소감</th>
                <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">초대코드</th>
                <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">1인당 상금</th>
                <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">응모수</th>
                <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">계좌제출</th>
                <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">은행</th>
                <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">계좌번호</th>
                <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">예금주</th>
                <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">계좌확인</th>
                <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">이메일</th>
                <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">전화번호</th>
                <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">주민번호</th>
                <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">지급상태</th>
                <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">메모</th>
                <th className="px-3 py-2.5 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((winner) => {
                const amount = rankAmounts[winner.prize_rank]
                return (
                  <tr
                    key={winner.id}
                    className={`transition-colors ${
                      winner.source === 'manual'
                        ? 'bg-amber-500/[0.07] hover:bg-amber-500/[0.12]'
                        : 'hover:bg-muted/40'
                    }`}
                  >
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex items-center justify-center text-xs font-bold px-2 py-0.5 rounded-md ${RANK_BADGE[winner.prize_rank] ?? 'bg-muted text-muted-foreground'}`}
                      >
                        {winner.prize_rank}등
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-medium tracking-tight">
                      {winner.source === 'manual' ? (
                        <EditManualWinnerDialog winner={winner} />
                      ) : (
                        <span className="text-foreground">
                          {winner.real_name ?? winner.profiles?.nickname ?? winner.profiles?.referral_code ?? winner.manual_referral_code ?? '—'}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-[160px] whitespace-pre-wrap break-words align-top">
                      {winner.winner_comment ?? '—'}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground tracking-tight">
                      {winner.profiles?.referral_code ?? winner.manual_referral_code ?? '—'}
                    </td>
                    <td className="px-3 py-2.5 text-foreground tabular-nums tracking-tight font-medium">
                      {amount !== null && amount !== undefined ? formatKRW(amount) : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      {winner.source === 'manual' ? (
                        <ManualEntryCountInput
                          winnerId={winner.id}
                          count={winner.manual_entry_count}
                        />
                      ) : (
                        <span className="text-xs tabular-nums text-foreground">
                          {winner._auto_entry_count != null && winner._auto_entry_count > 0
                            ? `${winner._auto_entry_count}장`
                            : '—'}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {winner.account_submitted_at ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />제출
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">미제출</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-foreground">
                      {winner.bank_name ?? '—'}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-foreground">
                      {winner.account_number ?? '—'}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-foreground">
                      {winner.account_holder ?? '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <AccountVerifyToggle winnerId={winner.id} verified={winner.account_verified} />
                    </td>
                    <td className="px-3 py-2.5 text-sm text-foreground">
                      {winner.email ?? '—'}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-foreground">
                      {winner.phone ?? '—'}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-foreground">
                      {winner.resident_id ?? '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <PaymentStatusButton winnerId={winner.id} status={winner.payment_status} />
                    </td>
                    <td className="px-3 py-2.5 min-w-[140px]">
                      <AdminMemoInput winnerId={winner.id} memo={winner.admin_memo ?? ''} />
                    </td>
                    <td className="px-3 py-2.5">
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
