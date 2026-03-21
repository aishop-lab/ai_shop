// src/lib/agents/technical/health-checker.ts
// Computes a weighted 0-100 store health score across multiple dimensions.
// Aggregates results from the SEO auditor, image auditor, and structured data checker.

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { auditStoreSEO } from './seo-auditor'
import { auditProductImages } from './image-auditor'
import { checkStructuredDataCoverage } from './structured-data'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HealthDimension = {
  name: string
  score: number // 0-100
  weight: number // 0-1, all weights sum to 1
  issues: number
  description: string
}

export type StoreHealthResult = {
  overallScore: number // 0-100, weighted average
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  dimensions: HealthDimension[]
  topIssues: Array<{
    dimension: string
    issue: string
    severity: 'critical' | 'warning' | 'info'
    fixable: boolean
  }>
  lastAuditAt: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WEIGHTS = {
  seo: 0.3,
  images: 0.25,
  structuredData: 0.25,
  contentQuality: 0.2,
} as const

const SHORT_DESCRIPTION_THRESHOLD = 50
const SHORT_DESCRIPTION_PENALTY = 3
const MISSING_CATEGORY_PENALTY = 2

/** Issue types that can be auto-fixed by agents */
const FIXABLE_ISSUE_TYPES = new Set([
  'missing_meta_description',
  'missing_alt_text',
  'missing_structured_data',
  'missing_schema',
  'no_alt_text',
  'short_description',
])

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  warning: 1,
  info: 2,
}

const MAX_TOP_ISSUES = 10

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A'
  if (score >= 75) return 'B'
  if (score >= 60) return 'C'
  if (score >= 40) return 'D'
  return 'F'
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function isFixable(issueType: string): boolean {
  // Check if the issue type or a normalized version of it is in the fixable set
  const normalized = issueType.toLowerCase().replace(/\s+/g, '_')
  return FIXABLE_ISSUE_TYPES.has(normalized)
}

// ---------------------------------------------------------------------------
// Content quality assessment
// ---------------------------------------------------------------------------

async function assessContentQuality(
  storeId: string
): Promise<{ score: number; issues: Array<{ issue: string; severity: 'critical' | 'warning' | 'info'; fixable: boolean }> }> {
  const supabase = getSupabaseAdmin()

  const { data: products, error } = await supabase
    .from('products')
    .select('id, title, description, category')
    .eq('store_id', storeId)
    .eq('status', 'active')

  if (error) {
    logger.error('Failed to fetch products for content quality assessment', undefined, { storeId, error: error.message })
    return { score: 100, issues: [] }
  }

  if (!products || products.length === 0) {
    return { score: 100, issues: [] }
  }

  const issues: Array<{ issue: string; severity: 'critical' | 'warning' | 'info'; fixable: boolean }> = []
  let shortDescriptions = 0
  let missingCategories = 0

  for (const product of products) {
    const descLength = (product.description || '').trim().length

    if (descLength < SHORT_DESCRIPTION_THRESHOLD) {
      shortDescriptions++
      issues.push({
        issue: `Product "${product.title}" has a short description (${descLength} chars)`,
        severity: descLength === 0 ? 'warning' : 'info',
        fixable: true,
      })
    }

    if (!product.category || product.category.trim().length === 0) {
      missingCategories++
      issues.push({
        issue: `Product "${product.title}" is missing a category`,
        severity: 'warning',
        fixable: true,
      })
    }
  }

  const score = clamp(
    100 - (shortDescriptions * SHORT_DESCRIPTION_PENALTY) - (missingCategories * MISSING_CATEGORY_PENALTY),
    0,
    100
  )

  return { score, issues }
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function computeHealthScore(
  storeId: string
): Promise<StoreHealthResult> {
  logger.info('Computing store health score', { storeId })

  // Run all audits in parallel
  const [seoAudit, imageAudit, coverage, contentQuality] = await Promise.all([
    auditStoreSEO(storeId).catch((err) => {
      logger.error('SEO audit failed', err instanceof Error ? err : undefined, { storeId })
      return { score: 0, issues: [] as Array<{ type: string; message: string; severity: 'critical' | 'warning' | 'info' }> }
    }),
    auditProductImages(storeId).catch((err) => {
      logger.error('Image audit failed', err instanceof Error ? err : undefined, { storeId })
      return { score: 0, issues: [] as Array<{ type: string; message: string; severity: 'critical' | 'warning' | 'info' }> }
    }),
    checkStructuredDataCoverage(storeId).catch((err) => {
      logger.error('Structured data check failed', err instanceof Error ? err : undefined, { storeId })
      return { hasSchema: 0, total: 0, missing: 0 }
    }),
    assessContentQuality(storeId),
  ])

  // ---------------------------------------------------------------------------
  // Build dimensions
  // ---------------------------------------------------------------------------

  const structuredDataScore =
    coverage.total > 0
      ? Math.round((coverage.hasSchema / coverage.total) * 100)
      : 100

  const dimensions: HealthDimension[] = [
    {
      name: 'SEO Completeness',
      score: seoAudit.score,
      weight: WEIGHTS.seo,
      issues: seoAudit.issues.length,
      description: 'Meta titles, descriptions, and canonical URLs',
    },
    {
      name: 'Image Optimization',
      score: imageAudit.score,
      weight: WEIGHTS.images,
      issues: imageAudit.issues.length,
      description: 'Alt text, image count, and image quality',
    },
    {
      name: 'Structured Data',
      score: structuredDataScore,
      weight: WEIGHTS.structuredData,
      issues: coverage.missing,
      description: 'JSON-LD Product and Organization schemas',
    },
    {
      name: 'Content Quality',
      score: contentQuality.score,
      weight: WEIGHTS.contentQuality,
      issues: contentQuality.issues.length,
      description: 'Product descriptions, categories, and content depth',
    },
  ]

  // ---------------------------------------------------------------------------
  // Overall score (weighted average)
  // ---------------------------------------------------------------------------

  const overallScore = Math.round(
    dimensions.reduce((sum, dim) => sum + dim.score * dim.weight, 0)
  )

  const grade = computeGrade(overallScore)

  // ---------------------------------------------------------------------------
  // Collect top issues from all audits
  // ---------------------------------------------------------------------------

  const allIssues: Array<{
    dimension: string
    issue: string
    severity: 'critical' | 'warning' | 'info'
    fixable: boolean
  }> = []

  // SEO issues
  for (const issue of seoAudit.issues) {
    allIssues.push({
      dimension: 'SEO Completeness',
      issue: issue.message,
      severity: issue.severity,
      fixable: isFixable(issue.type),
    })
  }

  // Image issues
  for (const issue of imageAudit.issues) {
    allIssues.push({
      dimension: 'Image Optimization',
      issue: issue.message,
      severity: issue.severity,
      fixable: isFixable(issue.type),
    })
  }

  // Structured data issues
  if (coverage.missing > 0) {
    allIssues.push({
      dimension: 'Structured Data',
      issue: `${coverage.missing} product(s) missing JSON-LD structured data`,
      severity: coverage.missing > 5 ? 'critical' : 'warning',
      fixable: true,
    })
  }

  // Content quality issues
  for (const issue of contentQuality.issues) {
    allIssues.push({
      dimension: 'Content Quality',
      issue: issue.issue,
      severity: issue.severity,
      fixable: issue.fixable,
    })
  }

  // Sort by severity (critical first, then warning, then info)
  allIssues.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])

  const topIssues = allIssues.slice(0, MAX_TOP_ISSUES)

  // ---------------------------------------------------------------------------
  // Result
  // ---------------------------------------------------------------------------

  const result: StoreHealthResult = {
    overallScore,
    grade,
    dimensions,
    topIssues,
    lastAuditAt: new Date().toISOString(),
  }

  logger.info('Store health score computed', {
    storeId,
    overallScore,
    grade,
    dimensionCount: dimensions.length,
    issueCount: allIssues.length,
  })

  return result
}
