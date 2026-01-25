import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const protectedRoutes = ['/dashboard', '/onboarding']
const authRoutes = ['/sign-in', '/sign-up']

// Production domain for subdomain routing
const PRODUCTION_DOMAIN = 'storeforge.site'

/**
 * Extract store slug from subdomain if present
 * e.g., mystore.storeforge.site -> mystore
 */
function extractStoreSlug(hostname: string): string | null {
  // Handle localhost development
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    return null
  }

  // Check for subdomain pattern: {slug}.storeforge.site
  const subdomainMatch = hostname.match(new RegExp(`^([^.]+)\\.${PRODUCTION_DOMAIN.replace('.', '\\.')}$`))

  if (subdomainMatch && subdomainMatch[1]) {
    const subdomain = subdomainMatch[1].toLowerCase()
    // Ignore www and app subdomains
    if (subdomain === 'www' || subdomain === 'app') {
      return null
    }
    return subdomain
  }

  return null
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = request.headers.get('host') || ''

  // Skip for static files and API routes
  if (pathname.startsWith('/_next') || pathname.includes('.') || pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // === SUBDOMAIN ROUTING ===
  const storeSlug = extractStoreSlug(hostname)

  if (storeSlug) {
    // Subdomain detected - rewrite to store route
    // e.g., mystore.storeforge.site/products -> /mystore/products
    const url = request.nextUrl.clone()

    // If already on a store path, don't double-rewrite
    if (!pathname.startsWith(`/${storeSlug}`)) {
      url.pathname = pathname === '/' ? `/${storeSlug}` : `/${storeSlug}${pathname}`
      return NextResponse.rewrite(url)
    }
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
        setAll: (cookies: { name: string; value: string; options: CookieOptions }[]) => {
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
