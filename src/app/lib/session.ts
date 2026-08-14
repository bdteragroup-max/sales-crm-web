import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { SessionPayload } from '@/app/lib/definitions'

const secretKey = process.env.SESSION_SECRET
const encodedKey = new TextEncoder().encode(secretKey)

export async function encrypt(payload: SessionPayload, expiresIn: string | number = '7d') {
  return new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(encodedKey)
}

export async function decrypt(session: string | undefined = '') {
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ['HS256'],
    })
    return payload as unknown as SessionPayload
  } catch (error) {
    // Session verification failed or no session provided
    return null
  }
}

export async function createSession(userId: string) {
  // Use a short expiry for JWT payload
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const session = await encrypt({ userId, expiresAt })
  const cookieStore = await cookies()

  cookieStore.set('session', session, {
    httpOnly: true,
    secure: true,
    // Intentionally omitting 'expires' makes it a "Session Cookie"
    // which automatically deletes itself when the browser is closed.
    sameSite: 'lax',
    path: '/',
  })
}

export async function updateSession() {
  const session = (await cookies()).get('session')?.value
  const payload = await decrypt(session)

  if (!session || !payload) {
    return null
  }

  const cookieStore = await cookies()
  cookieStore.set('session', session, {
    httpOnly: true,
    secure: true,
    // Intentionally omitting 'expires' to keep it as a Session Cookie
    sameSite: 'lax',
    path: '/',
  })
}

export async function deleteSession() {
  const cookieStore = await cookies()
  cookieStore.delete('session')
}

export async function refreshSession(expiresIn: string | number = '7d') {
  const sessionCookie = (await cookies()).get('session')?.value
  const payload = await decrypt(sessionCookie)
  
  if (!sessionCookie || !payload || !payload.userId) {
    return { success: false, error: 'No active session' }
  }

  const expiresAt = new Date(Date.now() + (expiresIn === '2h' ? 2 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000))
  const newSession = await encrypt({ userId: payload.userId, expiresAt }, expiresIn)
  
  const cookieStore = await cookies()
  cookieStore.set('session', newSession, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
  })
  
  return { success: true }
}
