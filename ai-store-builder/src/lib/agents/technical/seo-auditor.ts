// src/lib/agents/technical/seo-auditor.ts
// Audits SEO completeness for an e-commerce store.
// Checks products, collections, and store metadata for common SEO issues.

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { generateText } from 'ai'
import { geminiFlash } from '@/lib/ai/provider'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SEOIssue = {
  type:
    | 'missing_meta_title'
    | 'short_meta_title'
    | 'long_meta_title'
    | 'missing_meta_description'
    | 'short_meta_description'
    | 'long_meta_description'
    | 'missing_og_image'
    | 'missing_canonical'
    | 'duplicate_title'
    | 'missing_alt_text'
  severity: 'critical' | 'warning' | 'info'
  entity: 'product' | 'store' | 'collection'
  entityId: string
  entityName: string
  message: string
  currentValue?: string
  suggestedFix?: string
}

export type SEOAuditResult = {
  totalProducts: number
  totalCollections: number
  issues: SEOIssue[]
  score: number // 0-100
  breakdown: {
    metaTitles: { total: number; good: number; issues: number }
    metaDescriptions: { total: number; good: number; issues: number }
    images: { total: number; withAlt: number; withoutAlt: number }
    structuredData: { total: number; hasSchema: number; missing: number }
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const META_TITLE_MIN = 30
const META_TITLE_MAX = 60
const META_DESC_MIN = 70
const META_DESC_MAX = 160

// ---------------------------------------------------------------------------
// Main audit function
// ---------------------------------------------------------------------------

export async function auditStoreSEO(storeId: string): Promise<SEOAuditResult> {
  const supabase = getSupabaseAdmin()

  // Fetch all data in parallel
  const [productsRes, imagesRes, collectionsRes, storeRes] = await Promise.all([
    supabase
      .from('products')
      .select('id, title, description, meta_title, meta_description, status, slug')
      .eq('store_id', storeId)
      .eq('status', 'active'),
    supabase
      .from('product_images')
      .select('id, product_id, alt_text, original_url'),
    supabase
      .from('collections')
      .select('id, name, description, slug')
      .eq('store_id', storeId),
    supabase
      .from('stores')
      .select('name, description, slug, blueprint')
      .eq('id', storeId)
      .single(),
  ])

  const products = productsRes.data ?? []
  const images = imagesRes.data ?? []
  const collections = collectionsRes.data ?? []
  const store = storeRes.data

  if (productsRes.error) {
    logger.error('SEO audit: failed to fetch products', undefined, { error: productsRes.error?.message })
  }
  if (imagesRes.error) {
    logger.error('SEO audit: failed to fetch product images', undefined, { error: imagesRes.error?.message })
  }
  if (collectionsRes.error) {
    logger.error('SEO audit: failed to fetch collections', undefined, { error: collectionsRes.error?.message })
  }
  if (storeRes.error) {
    logger.error('SEO audit: failed to fetch store', undefined, { error: storeRes.error?.message })
  }

  const issues: SEOIssue[] = []

  // Track breakdown stats
  let metaTitleGood = 0
  let metaTitleIssues = 0
  let metaDescGood = 0
  let metaDescIssues = 0

  // Build image lookup: productId -> images
  const imagesByProduct = new Map<string, typeof images>()
  for (const img of images) {
    const list = imagesByProduct.get(img.product_id) ?? []
    list.push(img)
    imagesByProduct.set(img.product_id, list)
  }

  // Track meta titles to detect duplicates
  const metaTitleMap = new Map<string, { id: string; name: string }[]>()

  // ---------------------------------------------------------------------------
  // Check each product
  // ---------------------------------------------------------------------------

  for (const product of products) {
    const effectiveMetaTitle = product.meta_title || product.title
    const titleLower = (effectiveMetaTitle ?? '').toLowerCase().trim()

    // Track for duplicate detection
    if (titleLower) {
      const existing = metaTitleMap.get(titleLower) ?? []
      existing.push({ id: product.id, name: product.title })
      metaTitleMap.set(titleLower, existing)
    }

    // --- Meta title checks ---
    if (!product.meta_title) {
      metaTitleIssues++
      issues.push({
        type: 'missing_meta_title',
        severity: 'critical',
        entity: 'product',
        entityId: product.id,
        entityName: product.title,
        message: `Product "${product.title}" has no meta title`,
        currentValue: product.title,
        suggestedFix: `Create a descriptive meta title (${META_TITLE_MIN}-${META_TITLE_MAX} chars) for this product`,
      })
    } else if (product.meta_title.length < META_TITLE_MIN) {
      metaTitleIssues++
      issues.push({
        type: 'short_meta_title',
        severity: 'warning',
        entity: 'product',
        entityId: product.id,
        entityName: product.title,
        message: `Meta title is too short (${product.meta_title.length} chars, min ${META_TITLE_MIN})`,
        currentValue: product.meta_title,
        suggestedFix: `Expand the meta title to at least ${META_TITLE_MIN} characters with relevant keywords`,
      })
    } else if (product.meta_title.length > META_TITLE_MAX) {
      metaTitleIssues++
      issues.push({
        type: 'long_meta_title',
        severity: 'warning',
        entity: 'product',
        entityId: product.id,
        entityName: product.title,
        message: `Meta title is too long (${product.meta_title.length} chars, max ${META_TITLE_MAX})`,
        currentValue: product.meta_title,
        suggestedFix: `Shorten the meta title to under ${META_TITLE_MAX} characters`,
      })
    } else {
      metaTitleGood++
    }

    // --- Meta description checks ---
    if (!product.meta_description) {
      metaDescIssues++
      const truncatedDesc = product.description
        ? product.description.substring(0, 100) + (product.description.length > 100 ? '...' : '')
        : undefined
      issues.push({
        type: 'missing_meta_description',
        severity: 'critical',
        entity: 'product',
        entityId: product.id,
        entityName: product.title,
        message: `Product "${product.title}" has no meta description`,
        currentValue: truncatedDesc,
        suggestedFix: truncatedDesc
          ? 'Generate a compelling meta description from the existing product description'
          : 'Write a meta description (70-160 chars) that summarizes this product',
      })
    } else if (product.meta_description.length < META_DESC_MIN) {
      metaDescIssues++
      issues.push({
        type: 'short_meta_description',
        severity: 'warning',
        entity: 'product',
        entityId: product.id,
        entityName: product.title,
        message: `Meta description is too short (${product.meta_description.length} chars, min ${META_DESC_MIN})`,
        currentValue: product.meta_description,
        suggestedFix: `Expand the meta description to at least ${META_DESC_MIN} characters`,
      })
    } else if (product.meta_description.length > META_DESC_MAX) {
      metaDescIssues++
      issues.push({
        type: 'long_meta_description',
        severity: 'warning',
        entity: 'product',
        entityId: product.id,
        entityName: product.title,
        message: `Meta description is too long (${product.meta_description.length} chars, max ${META_DESC_MAX})`,
        currentValue: product.meta_description,
        suggestedFix: `Shorten the meta description to under ${META_DESC_MAX} characters`,
      })
    } else {
      metaDescGood++
    }

    // --- Image alt text checks ---
    const productImages = imagesByProduct.get(product.id) ?? []
    for (const img of productImages) {
      if (!img.alt_text) {
        issues.push({
          type: 'missing_alt_text',
          severity: 'warning',
          entity: 'product',
          entityId: product.id,
          entityName: product.title,
          message: `Image for "${product.title}" is missing alt text`,
          currentValue: img.original_url,
          suggestedFix: `Add descriptive alt text for accessibility and SEO`,
        })
      }
    }
  }

  // --- Duplicate meta title checks ---
  metaTitleMap.forEach((entries) => {
    if (entries.length > 1) {
      for (const entry of entries) {
        issues.push({
          type: 'duplicate_title',
          severity: 'warning',
          entity: 'product',
          entityId: entry.id,
          entityName: entry.name,
          message: `Duplicate meta title shared with ${entries.length - 1} other product(s)`,
          suggestedFix: 'Make each product meta title unique to avoid SEO cannibalization',
        })
      }
    }
  })

  // ---------------------------------------------------------------------------
  // Image stats
  // ---------------------------------------------------------------------------

  const totalImages = images.length
  const withAlt = images.filter((img) => !!img.alt_text).length
  const withoutAlt = totalImages - withAlt

  // ---------------------------------------------------------------------------
  // Compute SEO score
  // ---------------------------------------------------------------------------

  const criticalCount = issues.filter((i) => i.severity === 'critical').length
  const warningCount = issues.filter((i) => i.severity === 'warning').length
  const infoCount = issues.filter((i) => i.severity === 'info').length

  const rawScore = 100 - criticalCount * 5 - warningCount * 2 - infoCount * 0.5
  const score = Math.max(0, Math.min(100, Math.round(rawScore)))

  // ---------------------------------------------------------------------------
  // Build result
  // ---------------------------------------------------------------------------

  const totalEntities = products.length + collections.length
  // Structured data is a placeholder — the store may or may not have JSON-LD
  const hasSchema = store ? 1 : 0

  const result: SEOAuditResult = {
    totalProducts: products.length,
    totalCollections: collections.length,
    issues,
    score,
    breakdown: {
      metaTitles: {
        total: products.length,
        good: metaTitleGood,
        issues: metaTitleIssues,
      },
      metaDescriptions: {
        total: products.length,
        good: metaDescGood,
        issues: metaDescIssues,
      },
      images: {
        total: totalImages,
        withAlt,
        withoutAlt,
      },
      structuredData: {
        total: totalEntities,
        hasSchema,
        missing: totalEntities - hasSchema,
      },
    },
  }

  logger.info('SEO audit completed', {
    storeId,
    score,
    totalIssues: issues.length,
    critical: criticalCount,
    warnings: warningCount,
  })

  return result
}

// ---------------------------------------------------------------------------
// AI-powered meta description generator
// ---------------------------------------------------------------------------

export async function generateMetaDescription(
  title: string,
  description: string,
  category?: string,
): Promise<string> {
  const prompt = `Generate a concise, compelling meta description (150-160 chars) for this product. Title: ${title}. Description: ${description}. Category: ${category ?? 'N/A'}. Return ONLY the meta description text, no quotes.`

  const { text } = await generateText({
    model: geminiFlash,
    prompt,
  })

  return text.trim()
}

// ---------------------------------------------------------------------------
// Meta title generator (pure function)
// ---------------------------------------------------------------------------

export function generateMetaTitle(productTitle: string, storeName: string): string {
  const full = `${productTitle} | ${storeName}`
  if (full.length <= META_TITLE_MAX) {
    return full
  }
  // Truncate product title to fit within limit, keeping the store suffix
  const suffix = ` | ${storeName}`
  const maxProductLen = META_TITLE_MAX - suffix.length
  if (maxProductLen <= 0) {
    return full.substring(0, META_TITLE_MAX)
  }
  return productTitle.substring(0, maxProductLen) + suffix
}
