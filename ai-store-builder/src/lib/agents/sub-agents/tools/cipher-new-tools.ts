// CIPHER (Technical) Sub-Agent Tool Definitions — SEO/Speed/Uptime/Security/Integration agents
// AI SDK tool syntax using `tool()` from 'ai' + zod inputSchema

import { tool } from 'ai'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

// ---------------------------------------------------------------------------
// SEO-ENGINEER tools
// ---------------------------------------------------------------------------

const get_page_meta_tags = tool({
  description:
    'Query products to find missing or inadequate meta descriptions and SEO titles. ' +
    'Returns products ordered by SEO priority — those with no meta_description first.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    limit: z
      .number()
      .optional()
      .describe('Max products to return (default: 50)'),
  }),
  execute: async ({ store_id, limit = 50 }) => {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('products')
      .select(
        `
        id,
        title,
        description,
        meta_description,
        seo_title,
        status,
        category,
        slug
      `
      )
      .eq('store_id', store_id)
      .eq('is_demo', false)
      .order('meta_description', { ascending: true, nullsFirst: true })
      .limit(limit)

    if (error) {
      return { success: false, error: error.message, products: [] }
    }

    const products = (data ?? []).map((p) => {
      const issues: string[] = []
      if (!p.meta_description) issues.push('missing_meta_description')
      else if ((p.meta_description as string).length < 50)
        issues.push('meta_description_too_short')
      else if ((p.meta_description as string).length > 160)
        issues.push('meta_description_too_long')
      if (!p.seo_title) issues.push('missing_seo_title')
      else if ((p.seo_title as string).length > 60) issues.push('seo_title_too_long')

      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        seo_title: p.seo_title ?? null,
        meta_description: p.meta_description ?? null,
        meta_description_length: (p.meta_description as string | null)?.length ?? 0,
        seo_title_length: (p.seo_title as string | null)?.length ?? 0,
        issues,
      }
    })

    return {
      success: true,
      count: products.length,
      products,
      summary: {
        missing_meta_description: products.filter((p) =>
          p.issues.includes('missing_meta_description')
        ).length,
        missing_seo_title: products.filter((p) => p.issues.includes('missing_seo_title')).length,
        needs_attention: products.filter((p) => p.issues.length > 0).length,
      },
    }
  },
})

const update_meta_tags = tool({
  description:
    'Update a product\'s SEO meta description and/or SEO title in the products table. ' +
    'Use this to apply optimized meta tags after SEO analysis.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    product_id: z.string().describe('The product UUID to update'),
    meta_description: z
      .string()
      .max(160)
      .optional()
      .describe('SEO meta description (50–160 characters recommended)'),
    seo_title: z
      .string()
      .max(60)
      .optional()
      .describe('SEO title / page title override (up to 60 characters)'),
  }),
  execute: async ({ store_id, product_id, meta_description, seo_title }) => {
    if (!meta_description && !seo_title) {
      return { success: false, error: 'Provide at least one of meta_description or seo_title' }
    }

    const supabase = getSupabaseAdmin()

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (meta_description !== undefined) updatePayload.meta_description = meta_description
    if (seo_title !== undefined) updatePayload.seo_title = seo_title

    const { data, error } = await supabase
      .from('products')
      .update(updatePayload)
      .eq('id', product_id)
      .eq('store_id', store_id)
      .select('id, title, meta_description, seo_title')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return {
      success: true,
      product: data,
      message: `SEO tags updated for product "${data?.title ?? product_id}"`,
    }
  },
})

export const SEO_ENGINEER_TOOLS = {
  get_page_meta_tags,
  update_meta_tags,
}

// ---------------------------------------------------------------------------
// SPEED-DEMON tools
// ---------------------------------------------------------------------------

interface PageSpeedApiResponse {
  lighthouseResult?: {
    categories?: {
      performance?: { score?: number }
    }
    audits?: {
      'largest-contentful-paint'?: { numericValue?: number; displayValue?: string }
      'cumulative-layout-shift'?: { numericValue?: number; displayValue?: string }
      'first-contentful-paint'?: { numericValue?: number; displayValue?: string }
      'total-blocking-time'?: { numericValue?: number; displayValue?: string }
      'speed-index'?: { numericValue?: number; displayValue?: string }
    }
  }
  error?: { message?: string }
}

interface PageSpeedAudit {
  id: string
  title: string
  description: string
  score: number | null
  displayValue?: string
  numericValue?: number
}

interface PageSpeedOpportunity {
  id: string
  title: string
  description: string
  score: number | null
  displayValue?: string
}

interface PageSpeedApiFullResponse {
  lighthouseResult?: {
    audits?: Record<string, PageSpeedAudit>
  }
  error?: { message?: string }
}

const check_page_speed = tool({
  description:
    'Call the Google PageSpeed Insights API (free, no auth required) to get Core Web Vitals and performance score for a URL.',
  inputSchema: z.object({
    url: z.string().url().describe('The page URL to test (e.g. https://mystore.storeforge.site)'),
    strategy: z
      .enum(['mobile', 'desktop'])
      .optional()
      .describe('Device strategy to test (default: mobile)'),
  }),
  execute: async ({ url, strategy = 'mobile' }) => {
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}`

    let response: Response
    try {
      response = await fetch(apiUrl, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(30000),
      })
    } catch (err) {
      return {
        success: false,
        error: `Failed to reach PageSpeed API: ${String(err)}`,
        url,
        strategy,
      }
    }

    if (!response.ok) {
      return {
        success: false,
        error: `PageSpeed API returned HTTP ${response.status}`,
        url,
        strategy,
      }
    }

    const data = (await response.json()) as PageSpeedApiResponse

    if (data.error) {
      return { success: false, error: data.error.message ?? 'PageSpeed API error', url, strategy }
    }

    const categories = data.lighthouseResult?.categories
    const audits = data.lighthouseResult?.audits

    const performanceScore = categories?.performance?.score != null
      ? Math.round(categories.performance.score * 100)
      : null

    const lcp = audits?.['largest-contentful-paint']
    const cls = audits?.['cumulative-layout-shift']
    const fcp = audits?.['first-contentful-paint']
    const tbt = audits?.['total-blocking-time']
    const si = audits?.['speed-index']

    return {
      success: true,
      url,
      strategy,
      performance_score: performanceScore,
      score_label:
        performanceScore == null
          ? 'unknown'
          : performanceScore >= 90
          ? 'good'
          : performanceScore >= 50
          ? 'needs_improvement'
          : 'poor',
      core_web_vitals: {
        lcp: {
          value_ms: lcp?.numericValue != null ? Math.round(lcp.numericValue) : null,
          display: lcp?.displayValue ?? null,
          status:
            lcp?.numericValue == null
              ? 'unknown'
              : lcp.numericValue <= 2500
              ? 'good'
              : lcp.numericValue <= 4000
              ? 'needs_improvement'
              : 'poor',
        },
        cls: {
          value: cls?.numericValue != null ? Math.round(cls.numericValue * 1000) / 1000 : null,
          display: cls?.displayValue ?? null,
          status:
            cls?.numericValue == null
              ? 'unknown'
              : cls.numericValue <= 0.1
              ? 'good'
              : cls.numericValue <= 0.25
              ? 'needs_improvement'
              : 'poor',
        },
        fcp: {
          value_ms: fcp?.numericValue != null ? Math.round(fcp.numericValue) : null,
          display: fcp?.displayValue ?? null,
          status:
            fcp?.numericValue == null
              ? 'unknown'
              : fcp.numericValue <= 1800
              ? 'good'
              : fcp.numericValue <= 3000
              ? 'needs_improvement'
              : 'poor',
        },
        tbt: {
          value_ms: tbt?.numericValue != null ? Math.round(tbt.numericValue) : null,
          display: tbt?.displayValue ?? null,
        },
        speed_index: {
          value_ms: si?.numericValue != null ? Math.round(si.numericValue) : null,
          display: si?.displayValue ?? null,
        },
      },
    }
  },
})

const get_speed_recommendations = tool({
  description:
    'Call the Google PageSpeed Insights API and return actionable performance recommendations ranked by potential impact.',
  inputSchema: z.object({
    url: z.string().url().describe('The page URL to analyze for optimization opportunities'),
  }),
  execute: async ({ url }) => {
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile`

    let response: Response
    try {
      response = await fetch(apiUrl, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(30000),
      })
    } catch (err) {
      return {
        success: false,
        error: `Failed to reach PageSpeed API: ${String(err)}`,
        recommendations: [],
      }
    }

    if (!response.ok) {
      return {
        success: false,
        error: `PageSpeed API returned HTTP ${response.status}`,
        recommendations: [],
      }
    }

    const data = (await response.json()) as PageSpeedApiFullResponse

    if (data.error) {
      return {
        success: false,
        error: 'PageSpeed API error',
        recommendations: [],
      }
    }

    const audits = data.lighthouseResult?.audits ?? {}

    // Opportunity audits are actionable items with potential savings
    const opportunityIds = [
      'render-blocking-resources',
      'unused-css-rules',
      'unused-javascript',
      'uses-optimized-images',
      'uses-webp-images',
      'uses-responsive-images',
      'efficient-animated-content',
      'defer-offscreen-images',
      'uses-text-compression',
      'uses-rel-preconnect',
      'server-response-time',
      'redirects',
      'uses-http2',
      'bootup-time',
      'mainthread-work-breakdown',
      'font-display',
      'third-party-summary',
    ]

    const recommendations: Array<{
      id: string
      title: string
      description: string
      priority: 'high' | 'medium' | 'low'
      estimated_savings: string | null
      score: number | null
    }> = []

    for (const id of opportunityIds) {
      const audit = audits[id] as PageSpeedOpportunity | undefined
      if (!audit) continue

      // Skip passing audits (score 1.0)
      if (audit.score === 1) continue

      const priority: 'high' | 'medium' | 'low' =
        audit.score === null || audit.score < 0.5
          ? 'high'
          : audit.score < 0.9
          ? 'medium'
          : 'low'

      recommendations.push({
        id,
        title: audit.title,
        description: audit.description,
        priority,
        estimated_savings: audit.displayValue ?? null,
        score: audit.score,
      })
    }

    // Sort by priority: high → medium → low
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

    return {
      success: true,
      url,
      total_recommendations: recommendations.length,
      high_priority: recommendations.filter((r) => r.priority === 'high').length,
      recommendations,
    }
  },
})

export const SPEED_DEMON_TOOLS = {
  check_page_speed,
  get_speed_recommendations,
}

// ---------------------------------------------------------------------------
// UPTIME-GUARDIAN tools
// ---------------------------------------------------------------------------

const check_site_health = tool({
  description:
    'Perform an HTTP HEAD request to the store URL to check availability, response time, and status code.',
  inputSchema: z.object({
    url: z.string().url().describe('The store URL to check (e.g. https://mystore.storeforge.site)'),
  }),
  execute: async ({ url }) => {
    const startMs = Date.now()
    let statusCode: number | null = null
    let responseTimeMs: number | null = null
    let isUp = false
    let error: string | null = null
    let redirected = false
    let finalUrl = url

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(10000),
      })

      responseTimeMs = Date.now() - startMs
      statusCode = response.status
      redirected = response.redirected
      finalUrl = response.url || url
      isUp = response.status < 500
    } catch (err) {
      responseTimeMs = Date.now() - startMs
      error = String(err)
      isUp = false
    }

    const status: 'up' | 'slow' | 'down' =
      !isUp
        ? 'down'
        : responseTimeMs != null && responseTimeMs > 3000
        ? 'slow'
        : 'up'

    return {
      success: true,
      url,
      final_url: finalUrl,
      redirected,
      status,
      status_code: statusCode,
      response_time_ms: responseTimeMs,
      error,
      checked_at: new Date().toISOString(),
      ssl: url.startsWith('https://') ? 'https_detected' : 'no_ssl',
    }
  },
})

const get_uptime_history = tool({
  description:
    'Query the agent_actions table for past uptime check results to show recent site health history.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    days: z
      .number()
      .optional()
      .describe('Number of past days of history to retrieve (default: 7)'),
  }),
  execute: async ({ store_id, days = 7 }) => {
    const supabase = getSupabaseAdmin()
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('agent_actions')
      .select('completed_at, details, status')
      .eq('store_id', store_id)
      .eq('sub_agent_type', 'uptime-guardian')
      .eq('action_type', 'check_site_health')
      .gte('completed_at', since)
      .order('completed_at', { ascending: false })
      .limit(200)

    if (error) {
      return { success: false, error: error.message, history: [] }
    }

    const checks = (data ?? []).map((row) => {
      const details = (row.details as Record<string, unknown>) ?? {}
      return {
        checked_at: row.completed_at,
        status: details.status ?? 'unknown',
        status_code: details.status_code ?? null,
        response_time_ms: details.response_time_ms ?? null,
        error: details.error ?? null,
      }
    })

    const upCount = checks.filter((c) => c.status === 'up').length
    const downCount = checks.filter((c) => c.status === 'down').length
    const slowCount = checks.filter((c) => c.status === 'slow').length
    const uptimePct =
      checks.length > 0 ? Math.round(((upCount + slowCount) / checks.length) * 10000) / 100 : null

    return {
      success: true,
      period_days: days,
      total_checks: checks.length,
      summary: {
        up: upCount,
        slow: slowCount,
        down: downCount,
        uptime_pct: uptimePct,
      },
      history: checks,
    }
  },
})

export const UPTIME_GUARDIAN_TOOLS = {
  check_site_health,
  get_uptime_history,
}

// ---------------------------------------------------------------------------
// SECURITY-SCANNER tools
// ---------------------------------------------------------------------------

const scan_ssl_certificate = tool({
  description:
    'Check whether a domain serves a valid HTTPS connection. ' +
    'Returns SSL status by attempting an HTTPS fetch and inspecting the connection.',
  inputSchema: z.object({
    domain: z
      .string()
      .describe('The domain to check SSL for (e.g. mystore.storeforge.site — without https://)'),
  }),
  execute: async ({ domain }) => {
    const url = `https://${domain}`
    const startMs = Date.now()

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(10000),
      })

      const responseTimeMs = Date.now() - startMs

      // If fetch succeeded over HTTPS, SSL is valid
      return {
        success: true,
        domain,
        ssl_valid: response.status < 500,
        https_reachable: true,
        status_code: response.status,
        response_time_ms: responseTimeMs,
        final_url: response.url || url,
        redirected: response.redirected,
        checked_at: new Date().toISOString(),
        note: 'SSL certificate validated via successful HTTPS connection. For detailed cert expiry dates, use a dedicated SSL monitoring service.',
      }
    } catch (err) {
      const errorMessage = String(err)
      const isSslError =
        errorMessage.toLowerCase().includes('ssl') ||
        errorMessage.toLowerCase().includes('certificate') ||
        errorMessage.toLowerCase().includes('cert')

      return {
        success: true,
        domain,
        ssl_valid: false,
        https_reachable: false,
        error: errorMessage,
        is_ssl_error: isSslError,
        checked_at: new Date().toISOString(),
        recommendation: isSslError
          ? 'SSL certificate issue detected. Check certificate validity and renewal in Vercel dashboard.'
          : 'Domain may be unreachable. Check DNS configuration and deployment status.',
      }
    }
  },
})

const check_security_headers = tool({
  description:
    'Fetch a URL and inspect the HTTP response headers for essential security headers. ' +
    'Returns presence and values of HSTS, CSP, X-Frame-Options, X-Content-Type-Options, and Referrer-Policy.',
  inputSchema: z.object({
    url: z.string().url().describe('The URL to check security headers for'),
  }),
  execute: async ({ url }) => {
    let response: Response
    try {
      response = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(10000),
      })
    } catch (err) {
      return {
        success: false,
        error: `Failed to fetch URL: ${String(err)}`,
        url,
        headers: [],
      }
    }

    // Security headers to check
    const securityHeaders = [
      {
        name: 'Strict-Transport-Security',
        key: 'strict-transport-security',
        description: 'HSTS — forces HTTPS connections',
        recommended: 'max-age=31536000; includeSubDomains',
      },
      {
        name: 'Content-Security-Policy',
        key: 'content-security-policy',
        description: 'CSP — restricts resource loading sources',
        recommended: "default-src 'self'",
      },
      {
        name: 'X-Frame-Options',
        key: 'x-frame-options',
        description: 'Prevents clickjacking via iframes',
        recommended: 'DENY or SAMEORIGIN',
      },
      {
        name: 'X-Content-Type-Options',
        key: 'x-content-type-options',
        description: 'Prevents MIME type sniffing',
        recommended: 'nosniff',
      },
      {
        name: 'Referrer-Policy',
        key: 'referrer-policy',
        description: 'Controls referrer information in requests',
        recommended: 'strict-origin-when-cross-origin',
      },
      {
        name: 'Permissions-Policy',
        key: 'permissions-policy',
        description: 'Restricts browser feature access',
        recommended: 'camera=(), microphone=(), geolocation=()',
      },
    ]

    const results = securityHeaders.map((header) => {
      const value = response.headers.get(header.key)
      return {
        header: header.name,
        present: value !== null,
        value: value ?? null,
        description: header.description,
        recommended_value: header.recommended,
        status: value !== null ? 'pass' : 'fail',
      }
    })

    const passingCount = results.filter((r) => r.present).length
    const securityScore = Math.round((passingCount / results.length) * 100)

    return {
      success: true,
      url,
      final_url: response.url || url,
      security_score: securityScore,
      headers_present: passingCount,
      headers_missing: results.length - passingCount,
      overall_status: securityScore >= 80 ? 'good' : securityScore >= 50 ? 'fair' : 'poor',
      headers: results,
      checked_at: new Date().toISOString(),
    }
  },
})

export const SECURITY_SCANNER_TOOLS = {
  scan_ssl_certificate,
  check_security_headers,
}

// ---------------------------------------------------------------------------
// INTEGRATION-DOCTOR tools
// ---------------------------------------------------------------------------

const check_payment_gateway = tool({
  description:
    'Check connectivity to payment gateway status pages (Razorpay and/or Stripe) ' +
    'by making a basic HTTP request to their status endpoints.',
  inputSchema: z.object({
    provider: z
      .enum(['razorpay', 'stripe'])
      .optional()
      .describe('Payment provider to check (default: checks both)'),
  }),
  execute: async ({ provider }) => {
    const checks: Array<{
      provider: string
      status_url: string
      reachable: boolean
      status_code: number | null
      response_time_ms: number | null
      error: string | null
    }> = []

    const targets: Array<{ name: string; url: string }> = []

    if (!provider || provider === 'razorpay') {
      targets.push({ name: 'razorpay', url: 'https://status.razorpay.com' })
    }
    if (!provider || provider === 'stripe') {
      targets.push({ name: 'stripe', url: 'https://status.stripe.com' })
    }

    await Promise.all(
      targets.map(async (target) => {
        const startMs = Date.now()
        try {
          const response = await fetch(target.url, {
            method: 'HEAD',
            signal: AbortSignal.timeout(8000),
          })
          checks.push({
            provider: target.name,
            status_url: target.url,
            reachable: response.status < 500,
            status_code: response.status,
            response_time_ms: Date.now() - startMs,
            error: null,
          })
        } catch (err) {
          checks.push({
            provider: target.name,
            status_url: target.url,
            reachable: false,
            status_code: null,
            response_time_ms: Date.now() - startMs,
            error: String(err),
          })
        }
      })
    )

    const allReachable = checks.every((c) => c.reachable)

    return {
      success: true,
      overall_status: allReachable ? 'reachable' : 'degraded',
      checked_at: new Date().toISOString(),
      results: checks,
      note: 'This checks gateway status pages only. Actual API credential validity is tested when processing transactions.',
    }
  },
})

const check_integration_status = tool({
  description:
    'Check which third-party integrations are configured for a store by querying credential fields in the stores table. ' +
    'Returns an overview of configured vs unconfigured integrations.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
  }),
  execute: async ({ store_id }) => {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('stores')
      .select(
        `
        name,
        razorpay_key_id,
        razorpay_key_secret_encrypted,
        razorpay_credentials_verified,
        stripe_publishable_key,
        stripe_secret_key_encrypted,
        stripe_credentials_verified,
        resend_api_key_encrypted,
        resend_credentials_verified,
        msg91_auth_key_encrypted,
        msg91_credentials_verified
      `
      )
      .eq('id', store_id)
      .single()

    if (error) {
      return { success: false, error: error.message, integrations: [] }
    }

    const integrations = [
      {
        name: 'Razorpay',
        category: 'payment',
        configured: !!(data?.razorpay_key_id && data?.razorpay_key_secret_encrypted && data?.razorpay_credentials_verified),
        using_platform_fallback: !(data?.razorpay_key_id && data?.razorpay_key_secret_encrypted && data?.razorpay_credentials_verified),
      },
      {
        name: 'Stripe',
        category: 'payment',
        configured: !!(data?.stripe_publishable_key && data?.stripe_secret_key_encrypted && data?.stripe_credentials_verified),
        using_platform_fallback: !(data?.stripe_publishable_key && data?.stripe_secret_key_encrypted && data?.stripe_credentials_verified),
      },
      {
        name: 'Resend (Email)',
        category: 'email',
        configured: !!(data?.resend_api_key_encrypted && data?.resend_credentials_verified),
        using_platform_fallback: !(data?.resend_api_key_encrypted && data?.resend_credentials_verified),
      },
      {
        name: 'MSG91 (WhatsApp)',
        category: 'whatsapp',
        configured: !!(data?.msg91_auth_key_encrypted && data?.msg91_credentials_verified),
        using_platform_fallback: !(data?.msg91_auth_key_encrypted && data?.msg91_credentials_verified),
      },
    ]

    const configuredCount = integrations.filter((i) => i.configured).length
    const usingFallbackCount = integrations.filter((i) => i.using_platform_fallback).length

    return {
      success: true,
      store_name: data?.name,
      integrations,
      summary: {
        total: integrations.length,
        configured_with_own_keys: configuredCount,
        using_platform_fallback: usingFallbackCount,
        not_configured: 0, // All have platform fallback
      },
      note: 'Integrations using platform fallback credentials work but billing goes through the platform account. Configure store-level credentials for direct settlement.',
    }
  },
})

export const INTEGRATION_DOCTOR_TOOLS = {
  check_payment_gateway,
  check_integration_status,
}
