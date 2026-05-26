import 'server-only'
import { cookies } from 'next/headers'
import { decrypt } from '@/app/lib/session'
import { cache } from 'react'
import prisma from '@/app/lib/db'
import { SessionPayload } from '@/app/lib/definitions'
import { redirect } from 'next/navigation'

export const verifySession = cache(async () => {
  let cookie: string | undefined
  let session: SessionPayload | null = null
  try {
    cookie = (await cookies()).get('session')?.value
    session = await decrypt(cookie)
  } catch (err) {
    console.error('[dal] verifySession decrypt error', err)
  }

  try {
    console.log('[dal] verifySession', { hasCookie: !!cookie, userId: session?.userId })
  } catch {}

  if (!session || !session.userId) {
    return { isAuth: false, userId: null }
  }

  return { isAuth: true, userId: session.userId }
})

export const getUser = cache(async () => {
  const session = await verifySession()
  if (!session.isAuth) return null

  let user = null;
  try {
    user = await prisma.user.findUnique({
      where: {
        id: session.userId as string,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        employeeId: true,
        isActive: true,
      },
    })
  } catch (error) {
    console.error('[dal] getUser error', error)
    return null
  }

  if (!user || !user.isActive) {
    console.log('[dal] getUser not found or inactive', { userId: session.userId })
    // Clear invalid session cookie to prevent infinite redirect loop
    redirect('/api/auth/logout')
  }

  console.log('[dal] getUser found', { id: user.id, email: user.email })
  return user
})
