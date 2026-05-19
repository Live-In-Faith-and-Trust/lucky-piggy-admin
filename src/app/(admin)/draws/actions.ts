'use server'

import { revalidateTag } from 'next/cache'
import { getAdminEnv } from '@/lib/supabase/server'
import {
  toggleAccountVerified,
  updatePaymentStatus,
  saveAdminMemo,
  addManualWinner,
  deleteManualWinner,
  getEntryCount,
  closeDrawForTest,
  judgeWinnersForTest,
  publishDrawForTest,
  resetDrawForTest,
  type PaymentStatus,
} from '@/lib/supabase/draws'

export async function refreshWinners(_drawId: string): Promise<void> {
  revalidateTag('draws-list', {})
  revalidateTag('draw-winners', {})
}

export async function toggleAccountVerifiedAction(
  winnerId: string,
  verified: boolean
): Promise<{ error?: string }> {
  const env = await getAdminEnv()
  try {
    await toggleAccountVerified(env, winnerId, verified)
    revalidateTag('draw-winners', {})
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : '오류가 발생했습니다' }
  }
}

export async function updatePaymentStatusAction(
  winnerId: string,
  status: PaymentStatus
): Promise<{ error?: string }> {
  const env = await getAdminEnv()
  try {
    await updatePaymentStatus(env, winnerId, status)
    revalidateTag('draw-winners', {})
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : '오류가 발생했습니다' }
  }
}

export async function saveAdminMemoAction(
  winnerId: string,
  memo: string
): Promise<{ error?: string }> {
  const env = await getAdminEnv()
  try {
    await saveAdminMemo(env, winnerId, memo)
    revalidateTag('draw-winners', {})
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : '오류가 발생했습니다' }
  }
}

export async function addManualWinnerAction(payload: {
  draw_id: string
  user_id?: string
  prize_rank: number
  real_name?: string
  bank_name?: string
  account_number?: string
  account_holder?: string
  winner_comment?: string
  admin_memo?: string
}): Promise<{ error?: string }> {
  const env = await getAdminEnv()
  try {
    await addManualWinner(env, payload)
    revalidateTag('draw-winners', {})
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : '오류가 발생했습니다' }
  }
}

export async function deleteManualWinnerAction(winnerId: string): Promise<{ error?: string }> {
  const env = await getAdminEnv()
  try {
    await deleteManualWinner(env, winnerId)
    revalidateTag('draw-winners', {})
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : '오류가 발생했습니다' }
  }
}

export async function getEntryCountAction(drawId: string): Promise<{ count?: number; error?: string }> {
  const env = await getAdminEnv()
  try {
    const count = await getEntryCount(env, drawId)
    return { count }
  } catch (e) {
    return { error: e instanceof Error ? e.message : '오류가 발생했습니다' }
  }
}

export async function closeDrawAction(drawId: string): Promise<{ error?: string }> {
  const env = await getAdminEnv()
  try {
    await closeDrawForTest(env, drawId)
    revalidateTag('draws-list', {})
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : '오류가 발생했습니다' }
  }
}

export async function judgeWinnersAction(
  drawId: string,
  winningNumbers: number[],
  bonusNumber: number
): Promise<{ error?: string }> {
  const env = await getAdminEnv()
  try {
    await judgeWinnersForTest(env, drawId, winningNumbers, bonusNumber)
    revalidateTag('draws-list', {})
    revalidateTag('draw-winners', {})
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : '오류가 발생했습니다' }
  }
}

export async function publishDrawAction(
  drawId: string,
  currentRoundNumber: number
): Promise<{ error?: string }> {
  const env = await getAdminEnv()
  try {
    await publishDrawForTest(env, drawId, currentRoundNumber)
    revalidateTag('draws-list', {})
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : '오류가 발생했습니다' }
  }
}

export async function resetDrawAction(drawId: string): Promise<{ error?: string }> {
  const env = await getAdminEnv()
  try {
    await resetDrawForTest(env, drawId)
    revalidateTag('draws-list', {})
    revalidateTag('draw-winners', {})
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : '오류가 발생했습니다' }
  }
}
