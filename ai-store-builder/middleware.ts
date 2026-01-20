import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const protectedRoutes = ['/dashboard', '/onboarding']
const authRoutes = ['/sign-in', '/sign-up']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip for static files
  if (pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })

  // Only run auth check for protected or auth routes
  const needsAuthCheck =
    protectedRoutes.some(r => pathname.startsWith(r)) ||
    authRoutes.some(r => pathname.startsWith(r))

  if (!needsAuthCheck) {
    return response
  }

  // Check for env vars
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return response
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookies.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        }
      }
    })

    const { data: { user } } = await supabase.auth.getUser()

    // Redirect to sign-in if accessing protected route without auth
    if (!user && protectedRoutes.some(r => pathname.startsWith(r))) {
      return NextResponse.redirect(new URL('/sign-in', request.url))
    }

    // Redirect to dashboard if accessing auth routes while logged in
    if (user && authRoutes.some(r => pathname.startsWith(r))) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  } catch {
    // Continue on error
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)']
}
