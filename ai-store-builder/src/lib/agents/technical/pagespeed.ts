// src/lib/agents/technical/pagespeed.ts
// PageSpeed Insights integration for the Technical Agent

import { logger } from '@/lib/logger'

interface CoreWebVitals {
  lcp: { value: number; unit: string; rating: string } | null
  fid: { value: number; unit: string; rating: string } | null
  inp: { value: number; unit: string; rating: string } | null
  cls: { value: number; unit: string; rating: string } | null
  ttfb: { value: number; unit: string; rating: string } | null
  fcp: { value: number; unit: string; rating: string } | null
}

interface AuditRecommendation {
  id: string
  title: string
  description: string
  score: number | null
  displayValue?: string
  savings?: { ms?: number; bytes?: number }
}

interface PageSpeedResult {
  url: string
  fetchTime: string
  performanceScore: number
  accessibilityScore: number
  bestPracticesScore: number
  seoScore: number
  coreWebVitals: CoreWebVitals
  recommendations: AuditRecommendation[]
  strategy: 'mobile' | 'desktop'
}

// Map PSI metric ratings
function getRating(category: string | undefined): string {
  if (!category) return 'unknown'
  switch (category) {
    case 'FAST':
      return 'good'
    case 'AVERAGE':
      return 'needs-improvement'
    case 'SLOW':
      return 'poor'
    default:
      return 'unknown'
  }
}

// Extract a metric from the Lighthouse result
function extractMetric(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  audits: Record<string, any>,
  auditId: string,
  unit: string
): { value: number; unit: string; rating: string } | null {
  const audit = audits[auditId]
  if (!audit || audit.score === undefined) return null

  return {
    value: Math.round((audit.numericValue || 0) * 100) / 100,
    unit,
    rating:
      audit.score >= 0.9 ? 'good' : audit.score >= 0.5 ? 'needs-improvement' : 'poor',
  }
}

/**
 * Run a PageSpeed Insights audit on a URL.
 *
 * @param url - The URL to audit
 * @param strategy - 'mobile' or 'desktop' (default: 'mobile')
 * @returns PageSpeed audit results including Core Web Vitals and recommendations
 */
export async function runPageSpeedAudit(
  url: string,
  strategy: 'mobile' | 'desktop' = 'mobile'
): Promise<PageSpeedResult> {
  const apiKey = process.env.PAGESPEED_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY

  if (!apiKey) {
    throw new Error(
      'No API key configured for PageSpeed Insights. Set PAGESPEED_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY.'
    )
  }

  const params = new URLSearchParams({
    url,
    key: apiKey,
    strategy,
    category: 'performance',
    // Request multiple categories
  })

  // Add all categories
  const categories = ['performance', 'accessibility', 'best-practices', 'seo']
  // PSI API accepts multiple category params
  params.delete('category')
  for (const cat of categories) {
    params.append('category', cat)
  }

  const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`

  logger.info('[pagespeed] Running audit', { url, strategy })

  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    const errorBody = await response.text()
    logger.error(`[pagespeed] API error (${response.status}): ${errorBody}`)
    throw new Error(`PageSpeed API error (${response.status}): ${errorBody}`)
  }

  const data = await response.json()
  const lighthouse = data.lighthouseResult
  const audits = lighthouse?.audits || {}
  const categoryScores = lighthouse?.categories || {}

  // Extract Core Web Vitals from field data (CrUX) if available, else from lab data
  const fieldMetrics = data.loadingExperience?.metrics || {}

  const coreWebVitals: CoreWebVitals = {
    lcp: fieldMetrics.LARGEST_CONTENTFUL_PAINT_MS
      ? {
          value: fieldMetrics.LARGEST_CONTENTFUL_PAINT_MS.percentile,
          unit: 'ms',
          rating: getRating(fieldMetrics.LARGEST_CONTENTFUL_PAINT_MS.category),
        }
      : extractMetric(audits, 'largest-contentful-paint', 'ms'),
    fid: fieldMetrics.FIRST_INPUT_DELAY_MS
      ? {
          value: fieldMetrics.FIRST_INPUT_DELAY_MS.percentile,
          unit: 'ms',
          rating: getRating(fieldMetrics.FIRST_INPUT_DELAY_MS.category),
        }
      : null,
    inp: fieldMetrics.INTERACTION_TO_NEXT_PAINT
      ? {
          value: fieldMetrics.INTERACTION_TO_NEXT_PAINT.percentile,
          unit: 'ms',
          rating: getRating(fieldMetrics.INTERACTION_TO_NEXT_PAINT.category),
        }
      : extractMetric(audits, 'interaction-to-next-paint', 'ms'),
    cls: fieldMetrics.CUMULATIVE_LAYOUT_SHIFT_SCORE
      ? {
          value: fieldMetrics.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile / 100,
          unit: 'score',
          rating: getRating(fieldMetrics.CUMULATIVE_LAYOUT_SHIFT_SCORE.category),
        }
      : extractMetric(audits, 'cumulative-layout-shift', 'score'),
    ttfb: fieldMetrics.EXPERIMENTAL_TIME_TO_FIRST_BYTE
      ? {
          value: fieldMetrics.EXPERIMENTAL_TIME_TO_FIRST_BYTE.percentile,
          unit: 'ms',
          rating: getRating(fieldMetrics.EXPERIMENTAL_TIME_TO_FIRST_BYTE.category),
        }
      : extractMetric(audits, 'server-response-time', 'ms'),
    fcp: fieldMetrics.FIRST_CONTENTFUL_PAINT_MS
      ? {
          value: fieldMetrics.FIRST_CONTENTFUL_PAINT_MS.percentile,
          unit: 'ms',
          rating: getRating(fieldMetrics.FIRST_CONTENTFUL_PAINT_MS.category),
        }
      : extractMetric(audits, 'first-contentful-paint', 'ms'),
  }

  // Extract actionable recommendations (audits with score < 0.9 that have savings)
  const recommendationAuditIds = [
    'render-blocking-resources',
    'unused-css-rules',
    'unused-javascript',
    'unminified-css',
    'unminified-javascript',
    'efficient-animated-content',
    'uses-optimized-images',
    'uses-webp-images',
    'uses-text-compression',
    'uses-responsive-images',
    'offscreen-images',
    'uses-long-cache-ttl',
    'dom-size',
    'redirects',
    'total-byte-weight',
    'mainthread-work-breakdown',
    'bootup-time',
    'font-display',
    'third-party-summary',
    'largest-contentful-paint-element',
    'layout-shift-elements',
    'long-tasks',
  ]

  const recommendations: AuditRecommendation[] = []
  for (const auditId of recommendationAuditIds) {
    const audit = audits[auditId]
    if (!audit) continue
    // Only include audits that are not passing (score < 0.9) or have no score
    if (audit.score !== null && audit.score >= 0.9) continue

    const rec: AuditRecommendation = {
      id: auditId,
      title: audit.title || auditId,
      description: (audit.description || '').replace(/\[.*?\]\(.*?\)/g, '').trim(),
      score: audit.score,
      displayValue: audit.displayValue,
    }

    // Extract savings info if available
    if (audit.details?.overallSavingsMs || audit.details?.overallSavingsBytes) {
      rec.savings = {
        ms: audit.details.overallSavingsMs,
        bytes: audit.details.overallSavingsBytes,
      }
    }

    recommendations.push(rec)
  }

  // Sort recommendations by impact (lowest score first)
  recommendations.sort((a, b) => (a.score ?? 0) - (b.score ?? 0))

  return {
    url,
    fetchTime: data.analysisUTCTimestamp || new Date().toISOString(),
    performanceScore: Math.round((categoryScores.performance?.score || 0) * 100),
    accessibilityScore: Math.round((categoryScores.accessibility?.score || 0) * 100),
    bestPracticesScore: Math.round((categoryScores['best-practices']?.score || 0) * 100),
    seoScore: Math.round((categoryScores.seo?.score || 0) * 100),
    coreWebVitals,
    recommendations: recommendations.slice(0, 10), // Top 10 recommendations
    strategy,
  }
}

/**
 * Run a PageSpeed audit on a store's storefront.
 *
 * @param storeId - The store ID
 * @param strategy - 'mobile' or 'desktop' (default: 'mobile')
 */
export async function auditStorePageSpeed(
  storeId: string,
  strategy: 'mobile' | 'desktop' = 'mobile'
): Promise<PageSpeedResult> {
  const { getSupabaseAdmin } = await import('@/lib/supabase/admin')
  const supabase = getSupabaseAdmin()

  const { data: store, error } = await supabase
    .from('stores')
    .select('slug, custom_domain')
    .eq('id', storeId)
    .single()

  if (error || !store) {
    throw new Error(`Store ${storeId} not found`)
  }

  const { getStoreUrl } = await import('@/lib/store/queries')
  const storeUrl = getStoreUrl(store.slug, store.custom_domain)
  return runPageSpeedAudit(storeUrl, strategy)
}
