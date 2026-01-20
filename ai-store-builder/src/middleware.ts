import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from './lib/supabase/middleware'

// Routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/onboarding',
  '/products',
  '/orders',
  '/settings'
]

// Routes that are always public (no auth check needed)
const publicRoutes = [
  '/',
  '/sign-in',
  '/sign-up',
  '/api'
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Update session (refresh tokens if needed)
  const { supabaseResponse, user } = await updateSession(request)

  // Check if current path is a protected route
  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )

  // Check if current path is explicitly public
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )

  // Handle protected routes - redirect to sign-in if not authenticated
  if (isProtectedRoute && !user) {
    const signInUrl = new URL('/sign-in', request.url)
    signInUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(signInUrl)
  }

  // Redirect authenticated users away from auth pages
  if (user && (pathname === '/sign-in' || pathname === '/sign-up')) {
    // Check if user needs onboarding
    // We can't make DB calls in middleware easily, so redirect to dashboard
    // and let the dashboard handle onboarding redirect if needed
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Allow store slugs (any path that doesn't match protected/public routes)
  // These are dynamic store front pages like /my-store, /awesome-shop, etc.
  if (!isProtectedRoute && !isPublicRoute) {
    // This could be a store slug - allow it
    return supabaseResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
}
