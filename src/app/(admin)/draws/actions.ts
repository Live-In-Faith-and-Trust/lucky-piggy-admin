'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { getAdminEnv, createServerClient } from '@/lib/supabase/server'
import {
  toggleAccountVerified,
  updatePaymentStatus,
  saveAdminMemo,
  addManualWinner,
  addManualWinnersBatch,
  updateManualWinner,
  deleteManualWinner,
  getEntryCount,
  closeDrawForTest,
  judgeWinnersForTest,
  publishDrawForTest,
  resetDrawForTest,
  updateManualEntryCount,
  type PaymentStatus,
} from '@/lib/supabase/draws'

export async function refreshWinners(_drawId: string): Promise<void> {
  revalidateTag('draws-list', {})
  revalidatePath('/draws')
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
  manual_entry_count: number
  email?: string
  phone?: string
  resident_id?: string
}): Promise<{ error?: string }> {
  const env = await getAdminEnv()
  try {
    await addManualWinner(env, payload)
    revalidateTag('draw-winners', {})
    revalidatePath('/draws')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : '오류가 발생했습니다' }
  }
}

export async function deleteManualWinnerAction(winnerId: string): Promise<{ error?: string }> {
  const env = await getAdminEnv()
  try {
    await deleteManualWinner(env, winnerId)
    revalidatePath('/draws')
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

function extractError(e: unknown): string {
  if (e instanceof Error) return e.message
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message)
  return '알 수 없는 오류가 발생했습니다'
}

export async function closeDrawAction(drawId: string): Promise<{ error?: string }> {
  const env = await getAdminEnv()
  try {
    await closeDrawForTest(env, drawId)
    revalidatePath('/draws')
    return {}
  } catch (e) {
    return { error: extractError(e) }
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
    revalidatePath('/draws')
    return {}
  } catch (e) {
    return { error: extractError(e) }
  }
}

export async function publishDrawAction(
  drawId: string,
  currentRoundNumber: number
): Promise<{ error?: string }> {
  const env = await getAdminEnv()
  try {
    await publishDrawForTest(env, drawId, currentRoundNumber)
    revalidatePath('/draws')
    return {}
  } catch (e) {
    return { error: extractError(e) }
  }
}

export async function resetDrawAction(drawId: string, currentRoundNumber: number): Promise<{ error?: string }> {
  const env = await getAdminEnv()
  try {
    await resetDrawForTest(env, drawId, currentRoundNumber)
    revalidatePath('/draws')
    return {}
  } catch (e) {
    return { error: extractError(e) }
  }
}

export async function updateManualWinnerAction(
  winnerId: string,
  payload: {
    real_name?: string
    bank_name?: string
    account_number?: string
    account_holder?: string
    winner_comment?: string
    admin_memo?: string
    manual_entry_count: number
    email?: string
    phone?: string
    resident_id?: string
  },
): Promise<{ error?: string }> {
  const env = await getAdminEnv()
  try {
    await updateManualWinner(env, winnerId, payload)
    revalidatePath('/draws')
    return {}
  } catch (e) {
    return { error: extractError(e) }
  }
}

export async function updateManualEntryCountAction(
  winnerId: string,
  count: number,
): Promise<{ error?: string }> {
  const env = await getAdminEnv()
  try {
    await updateManualEntryCount(env, winnerId, count)
    revalidatePath('/draws')
    return {}
  } catch (e) {
    return { error: extractError(e) }
  }
}

export async function searchUserAction(
  query: string,
): Promise<{
  user?: { id: string; nickname: string | null; referral_code: string | null }
  error?: string
}> {
  if (!query.trim()) return { error: '검색어를 입력하세요.' }
  const env = await getAdminEnv()
  const supabase = createServerClient(env)

  // referral_code로 먼저 조회, 없으면 uuid로 조회
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query.trim())

  let profile: { id: string; nickname: string | null; referral_code: string | null } | null = null

  if (isUUID) {
    const { data } = await supabase
      .from('profiles')
      .select('id, nickname, referral_code')
      .eq('id', query.trim())
      .single()
    profile = data ?? null
  } else {
    const { data } = await supabase
      .from('profiles')
      .select('id, nickname, referral_code')
      .eq('referral_code', query.trim().toUpperCase())
      .single()
    profile = data ?? null
  }

  if (!profile) return { error: '유저를 찾을 수 없습니다.' }

  return { user: profile }
}

/**
 * 수동 당첨자 일괄 추가 — 청크 1회분을 단일 배치로 삽입한다.
 * 클라이언트가 전체 인원을 청크로 나눠 이 액션을 반복 호출하며 진행률을 표시한다.
 * `count`는 이번 청크 인원수, `ensurePrizes`는 첫 청크에서만 true.
 * 캐시 무효화는 루프 종료 후 클라이언트가 revalidateDrawWinnersAction을 1회 호출한다
 * (진행 중 리스트 리렌더 방지 + 부분 성공 시에도 갱신 보장).
 */
export async function bulkAddManualWinnersAction(payload: {
  draw_id: string
  prize_rank: number
  count: number
  min_entry_count: number
  max_entry_count: number
  ensurePrizes?: boolean
}): Promise<{ added: number; error?: string }> {
  const env = await getAdminEnv()
  const { draw_id, prize_rank, count, min_entry_count, max_entry_count, ensurePrizes = true } = payload

  const entryCounts = Array.from({ length: count }, () =>
    Math.floor(Math.random() * (max_entry_count - min_entry_count + 1)) + min_entry_count,
  )

  try {
    const added = await addManualWinnersBatch(env, { draw_id, prize_rank, entryCounts, ensurePrizes })
    return { added }
  } catch (e) {
    return { added: 0, error: e instanceof Error ? e.message : '오류가 발생했습니다' }
  }
}

/** 일괄 추가 루프 종료 후 1회 호출 — 당첨자 데이터/페이지 캐시 무효화. */
export async function revalidateDrawWinnersAction(): Promise<void> {
  revalidateTag('draw-winners', {})
  revalidatePath('/draws')
}
