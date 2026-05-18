'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createSession, SESSION_COOKIE } from '@/lib/session'

type LoginResult = { success: true } | { success: false; error: string }

export async function login(formData: FormData): Promise<LoginResult> {
  const email = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string

  if (!email || !password) {
    return { success: false, error: '이메일과 비밀번호를 입력해주세요.' }
  }

  const adminId = process.env.ADMIN_ID
  const adminPassword = process.env.ADMIN_PASSWORD

  if (email !== adminId || password !== adminPassword) {
    return { success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' }
  }

  const token = await createSession(email)
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  return { success: true }
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
  redirect('/login')
}

export async function setAdminEnv(env: 'staging' | 'production'): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set('admin_env', env, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  })
}
