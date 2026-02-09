import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const protectedRoutes = ['/dashboard', '/onboarding', '/admin']
const authRoutes = ['/sign-in', '/sign-up']

// Production domain for subdomain routing
const PRODUCTION_DOMAIN = 'storeforge.site'

// Cache for custom domain lookups (in-memory, resets on cold start)
const customDomainCache = new Map<string, { slug: string; expiresAt: number }>()
const CACHE_TTL = 60 * 1000 // 1 minute

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

/**
 * Check if hostname is a custom domain (not our platform domain)
 */
function isCustomDomain(hostname: string): boolean {
  // Remove port if present
  const host = hostname.split(':')[0]

  // Not a custom domain if it's our platform
  if (host.endsWith(PRODUCTION_DOMAIN)) return false
  if (host.includes('localhost') || host.includes('127.0.0.1')) return false
  if (host.endsWith('.vercel.app')) return false

  return true
}

/**
 * Look up store slug for a custom domain
 */
async function getStoreSlugForCustomDomain(hostname: string): Promise<string | null> {
  const host = hostname.split(':')[0].toLowerCase()

  // Check cache first
  const cached = customDomainCache.get(host)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.slug
  }

  // Look up in database
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return null
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/stores?custom_domain=eq.${encodeURIComponent(host)}&custom_domain_verified=eq.true&status=eq.active&select=slug`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      if (data && data[0]?.slug) {
        // Cache the result
        customDomainCache.set(host, {
          slug: data[0].slug,
          expiresAt: Date.now() + CACHE_TTL
        })
        return data[0].slug
      }
    }
  } catch (error) {
    console.error('Custom domain lookup error:', error)
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

  // === CUSTOM DOMAIN ROUTING ===
  if (isCustomDomain(hostname)) {
    const storeSlug = await getStoreSlugForCustomDomain(hostname)

    if (storeSlug) {
      // Custom domain found - rewrite to store route
      const url = request.nextUrl.clone()

      if (!pathname.startsWith(`/${storeSlug}`)) {
        url.pathname = pathname === '/' ? `/${storeSlug}` : `/${storeSlug}${pathname}`
        return NextResponse.rewrite(url)
      }
    }
    // If custom domain not found, continue (will show 404 or landing page)
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
