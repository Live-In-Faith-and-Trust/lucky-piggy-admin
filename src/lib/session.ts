export const SESSION_COOKIE = 'admin_token'

async function getKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(process.env.SESSION_SECRET!),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

export async function createSession(email: string): Promise<string> {
  const payload = `admin:${email}`
  const key = await getKey()
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  const sigBase64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
  return `${btoa(payload)}.${sigBase64}`
}

export async function verifySession(token: string): Promise<boolean> {
  try {
    const dot = token.indexOf('.')
    if (dot === -1) return false
    const encodedPayload = token.slice(0, dot)
    const encodedSig = token.slice(dot + 1)
    const payload = atob(encodedPayload)
    const sigBytes = Uint8Array.from(atob(encodedSig), (c) => c.charCodeAt(0))
    const key = await getKey()
    return await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(payload))
  } catch {
    return false
  }
}
