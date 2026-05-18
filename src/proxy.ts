import { NextRequest, NextResponse } from 'next/server'
import { decrypt } from '@/app/lib/session'
import { cookies } from 'next/headers'

// Specify protected and public routes in lowercase
const protectedRoutes = ['/dashboard', '/team', '/sales', '/schedule', '/telesales', '/clients', '/settings']
const publicRoutes = ['/', '/login', '/signup', '/forgot-password']

export default async function proxy(req: NextRequest) {
  const rawPath = req.nextUrl.pathname
  const path = rawPath.toLowerCase()

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

  // 3. Decrypt the session from the cookie
  const cookie = (await cookies()).get('session')?.value
  const session = await decrypt(cookie)

  // 4. Redirect to / if the user is not authenticated
  if (isProtectedRoute && !session?.userId) {
    return NextResponse.redirect(new URL('/', req.nextUrl))
  }

  // 5. Redirect to /dashboard if the user is authenticated and trying to access public auth routes
  if (isPublicRoute && session?.userId && (path === '/' || path === '/login')) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
  }

  return NextResponse.next()
}

// Routes Middleware should not run on
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
}
