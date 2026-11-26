import { NextRequest, NextResponse } from 'next/server'
import { decrypt } from '@/app/lib/session'
import { cookies } from 'next/headers'
import type { SessionPayload } from '@/app/lib/definitions'

// Specify protected and public routes in lowercase
const protectedRoutes = [
  '/dashboard', '/team', '/sales', '/schedule', '/telesales', '/clients', '/settings', '/technician',
  '/department', '/accounting', '/coins', '/jobs', '/projects', '/orders', '/executive', '/marketing',
  '/marketing-board', '/store', '/logistics', '/support', '/service', '/service-mgr', '/repair-orders',
  '/repair-deliveries', '/outsource-repairs', '/requisitions', '/facility-repairs', '/pipeline', '/tv-views'
]
const publicRoutes = ['/', '/login', '/signup', '/forgot-password']

const DEBUG_PROXY = process.env.DEBUG_PROXY === 'true'

export default async function proxy(req: NextRequest) {
  const rawPath = req.nextUrl.pathname
  const path = rawPath.toLowerCase()

  if (DEBUG_PROXY) {
    console.log('[proxy] incoming request', { method: req.method, rawPath, path })
  }

  // 1. Normalize case (e.g., /Dashboard -> /dashboard) for non-asset/non-API routes
  if (
    rawPath !== path &&
    !rawPath.startsWith('/_next') &&
    !rawPath.startsWith('/api') &&
    !rawPath.includes('.')
  ) {
    return NextResponse.redirect(new URL(path + req.nextUrl.search, req.nextUrl))
  }

  // 2. Check if the current route is protected or public (case-insensitive)
  const isProtectedRoute = protectedRoutes.some(route => path === route || path.startsWith(route + '/'))
  const isPublicRoute = publicRoutes.includes(path)

  if (DEBUG_PROXY) {
    console.log('[proxy] route check', { isProtectedRoute, isPublicRoute })
  }

  // 3. Decrypt the session from the cookie
  let cookie: string | undefined
  let session: SessionPayload | null = null
  try {
    cookie = (await cookies()).get('session')?.value
    session = await decrypt(cookie)
  } catch (err) {
    console.error('[proxy] session decrypt error', err)
  }

  if (DEBUG_PROXY) {
    console.log('[proxy] session state', { hasCookie: !!cookie, userId: session?.userId })
  }

  // 4. Redirect to /login if the user is not authenticated and accessing protected routes or root
  if (!session?.userId) {
    if (isProtectedRoute || path === '/') {
      if (DEBUG_PROXY) {
        console.log('[proxy] redirecting to /login (unauthenticated) for', { path })
      }
      return NextResponse.redirect(new URL('/login', req.nextUrl))
    }
  }

  // 5. Redirect to /dashboard if the user is authenticated and trying to access public auth routes
  if (isPublicRoute && session?.userId && (path === '/' || path === '/login')) {
    if (DEBUG_PROXY) {
      console.log('[proxy] redirecting to /dashboard (already authenticated)')
    }
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
  }

  return NextResponse.next()
}

// Routes Middleware should not run on
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|fonts/|logos/|uploads/|.*\\.(?:png|jpg|jpeg|svg|ico|gif|webp|woff|woff2|ttf|otf|eot|json|css|js|map|txt)$).*)',
  ],
}
