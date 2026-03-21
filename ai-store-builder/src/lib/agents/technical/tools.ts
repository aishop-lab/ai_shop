// src/lib/agents/technical/tools.ts
// Technical Agent tool definitions

import { z } from 'zod'
import type { AgentToolConfig, AgentExecutionContext } from '../base-agent'

// ---- Tool: auditSEO ----

const auditSEOSchema = z.object({
  storeId: z.string().describe('The store ID'),
})

async function executeAuditSEO(args: Record<string, unknown>, context: AgentExecutionContext) {
  const storeId = (context.storeId || args.storeId) as string
  const { auditStoreSEO } = await import('./seo-auditor')
  const result = await auditStoreSEO(storeId)

  const criticalCount = result.issues.filter((i: { severity: string }) => i.severity === 'critical').length
  const warningCount = result.issues.filter((i: { severity: string }) => i.severity === 'warning').length

  return {
    success: true,
    data: result,
    summary: `SEO Audit: Score ${result.score}/100. ${result.issues.length} issues found (${criticalCount} critical, ${warningCount} warnings). ${result.breakdown.metaDescriptions.issues} products missing meta descriptions.`,
  }
}

// ---- Tool: fixMetaTags ----

const fixMetaTagsSchema = z.object({
  storeId: z.string().describe('The store ID'),
  productIds: z
    .array(z.string())
    .optional()
    .describe('Specific product IDs to fix. If empty, fixes all products with missing meta descriptions.'),
})

async function executeFixMetaTags(args: Record<string, unknown>, context: AgentExecutionContext) {
  const storeId = (context.storeId || args.storeId) as string
  const productIds = args.productIds as string[] | undefined
  const { getSupabaseAdmin } = await import('@/lib/supabase/admin')
  const { generateMetaDescription, generateMetaTitle } = await import('./seo-auditor')

  const supabase = getSupabaseAdmin()

  // Fetch the store name for meta title generation
  const { data: store } = await supabase
    .from('stores')
    .select('name')
    .eq('id', storeId)
    .single()
  const storeName = store?.name || 'Store'

  // Fetch products with missing meta_description (or specific productIds)
  let query = supabase
    .from('products')
    .select('id, title, description, category, meta_title, meta_description')
    .eq('store_id', storeId)
    .eq('status', 'active')

  if (productIds && productIds.length > 0) {
    query = query.in('id', productIds)
  } else {
    query = query.or('meta_description.is.null,meta_description.eq.')
  }

  const { data: products, error } = await query.limit(20)

  if (error || !products) {
    return {
      success: false,
      summary: `Failed to fetch products: ${error?.message || 'No products found'}`,
    }
  }

  let descCount = 0
  let titleCount = 0

  for (const product of products) {
    const updates: Record<string, string> = {}

    if (!product.meta_description) {
      const metaDesc = await generateMetaDescription(product.title, product.description, product.category)
      if (metaDesc) {
        updates.meta_description = metaDesc
        descCount++
      }
    }

    if (!product.meta_title) {
      const metaTitle = await generateMetaTitle(product.title, storeName)
      if (metaTitle) {
        updates.meta_title = metaTitle
        titleCount++
      }
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from('products').update(updates).eq('id', product.id)
    }
  }

  const fixedCount = new Set([
    ...products.filter((p) => !p.meta_description).map((p) => p.id),
    ...products.filter((p) => !p.meta_title).map((p) => p.id),
  ]).size

  return {
    success: true,
    data: { fixedCount, descCount, titleCount },
    summary: `Fixed meta tags for ${fixedCount} products. Generated ${descCount} descriptions and ${titleCount} titles.`,
  }
}

// ---- Tool: generateStructuredData ----

const generateStructuredDataSchema = z.object({
  storeId: z.string().describe('The store ID'),
})

async function executeGenerateStructuredData(
  args: Record<string, unknown>,
  context: AgentExecutionContext
) {
  const storeId = (context.storeId || args.storeId) as string
  const { generateAllStructuredData } = await import('./structured-data')
  const result = await generateAllStructuredData(storeId)

  return {
    success: true,
    data: result,
    summary: `Generated structured data: ${result.schemasGenerated} product schemas + organization schema for ${result.productsProcessed} products.`,
  }
}

// ---- Tool: auditImages ----

const auditImagesSchema = z.object({
  storeId: z.string().describe('The store ID'),
})

async function executeAuditImages(args: Record<string, unknown>, context: AgentExecutionContext) {
  const storeId = (context.storeId || args.storeId) as string
  const { auditProductImages } = await import('./image-auditor')
  const result = await auditProductImages(storeId)

  return {
    success: true,
    data: result,
    summary: `Image Audit: Score ${result.score}/100. ${result.stats.productsWithNoImages} products have no images, ${result.stats.imagesWithoutAlt} images missing alt text.`,
  }
}

// ---- Tool: fixImageAltText ----

const fixImageAltTextSchema = z.object({
  storeId: z.string().describe('The store ID'),
  productId: z
    .string()
    .optional()
    .describe('Fix a specific product. If omitted, fixes all products with missing alt text (max 20).'),
})

async function executeFixImageAltText(
  args: Record<string, unknown>,
  context: AgentExecutionContext
) {
  const storeId = (context.storeId || args.storeId) as string
  const productId = args.productId as string | undefined
  const { fixMissingAltText } = await import('./image-auditor')

  if (productId) {
    const result = await fixMissingAltText(storeId, productId)
    return {
      success: true,
      data: result,
      summary: `Fixed alt text for ${result.totalFixed} images across 1 product. ${result.errors} errors.`,
      relatedEntityType: 'product',
      relatedEntityId: productId,
    }
  }

  // Find up to 20 products with images missing alt text
  const { getSupabaseAdmin } = await import('@/lib/supabase/admin')
  const supabase = getSupabaseAdmin()

  const { data: images } = await supabase
    .from('product_images')
    .select('product_id, products!inner(store_id)')
    .eq('products.store_id', storeId)
    .or('alt_text.is.null,alt_text.eq.')
    .limit(100)

  const productIdsSet = new Set<string>()
  if (images) {
    for (const img of images) {
      if (productIdsSet.size >= 20) break
      productIdsSet.add(img.product_id)
    }
  }

  const productIds = Array.from(productIdsSet)
  if (productIds.length === 0) {
    return {
      success: true,
      data: { totalFixed: 0, productsFixed: 0, errors: 0 },
      summary: 'No products with missing alt text found.',
    }
  }

  const result = await fixMissingAltText(storeId, productIds)

  return {
    success: true,
    data: result,
    summary: `Fixed alt text for ${result.totalFixed} images across ${result.productsFixed} products. ${result.errors} errors.`,
  }
}

// ---- Tool: getHealthScore ----

const getHealthScoreSchema = z.object({
  storeId: z.string().describe('The store ID'),
})

async function executeGetHealthScore(
  args: Record<string, unknown>,
  context: AgentExecutionContext
) {
  const storeId = (context.storeId || args.storeId) as string
  const { computeHealthScore } = await import('./health-checker')
  const result = await computeHealthScore(storeId)

  return {
    success: true,
    data: result,
    summary: `Store Health: ${result.overallScore}/100 (Grade: ${result.grade}). Top issue: ${result.topIssues[0]?.issue || 'None'}`,
  }
}

// ---- Tool: updateProductSEO ----

const updateProductSEOSchema = z.object({
  storeId: z.string().describe('The store ID'),
  productId: z.string().describe('The product ID to update'),
  metaTitle: z.string().optional().describe('New meta title'),
  metaDescription: z.string().optional().describe('New meta description'),
})

async function executeUpdateProductSEO(
  args: Record<string, unknown>,
  context: AgentExecutionContext
) {
  const storeId = (context.storeId || args.storeId) as string
  const productId = args.productId as string
  const metaTitle = args.metaTitle as string | undefined
  const metaDescription = args.metaDescription as string | undefined

  const { getSupabaseAdmin } = await import('@/lib/supabase/admin')
  const supabase = getSupabaseAdmin()

  // Security check: verify product belongs to store
  const { data: product, error: fetchError } = await supabase
    .from('products')
    .select('id')
    .eq('id', productId)
    .eq('store_id', storeId)
    .single()

  if (fetchError || !product) {
    return {
      success: false,
      summary: `Product ${productId} not found in store ${storeId}`,
    }
  }

  // Build update object from provided fields
  const updates: Record<string, string> = {}
  const fieldNames: string[] = []

  if (metaTitle) {
    updates.meta_title = metaTitle
    fieldNames.push('meta_title')
  }
  if (metaDescription) {
    updates.meta_description = metaDescription
    fieldNames.push('meta_description')
  }

  if (fieldNames.length === 0) {
    return {
      success: false,
      summary: 'No SEO fields provided to update',
    }
  }

  const { error: updateError } = await supabase
    .from('products')
    .update(updates)
    .eq('id', productId)

  if (updateError) {
    return {
      success: false,
      summary: `Failed to update SEO: ${updateError.message}`,
    }
  }

  return {
    success: true,
    data: { productId, updatedFields: fieldNames },
    summary: `Updated SEO for product: ${fieldNames.join(', ')}`,
    relatedEntityType: 'product',
    relatedEntityId: productId,
  }
}

// ---- Export all tools ----

export const technicalTools: AgentToolConfig[] = [
  {
    name: 'auditSEO',
    description:
      'Run a comprehensive SEO audit: check all products for meta titles, descriptions, canonicals, duplicates, and compute an SEO score',
    inputSchema: auditSEOSchema,
    category: 'analysis',
    riskLevel: 'low',
    execute: executeAuditSEO,
  },
  {
    name: 'fixMetaTags',
    description:
      'Auto-generate missing meta descriptions and titles for products using AI',
    inputSchema: fixMetaTagsSchema,
    category: 'optimization',
    riskLevel: 'medium',
    execute: executeFixMetaTags,
  },
  {
    name: 'generateStructuredData',
    description:
      'Generate JSON-LD Product and Organization schemas for all active products',
    inputSchema: generateStructuredDataSchema,
    category: 'optimization',
    riskLevel: 'low',
    execute: executeGenerateStructuredData,
  },
  {
    name: 'auditImages',
    description:
      'Audit all product images: check for missing alt text, products with no images, and image count recommendations',
    inputSchema: auditImagesSchema,
    category: 'analysis',
    riskLevel: 'low',
    execute: executeAuditImages,
  },
  {
    name: 'fixImageAltText',
    description:
      'Auto-generate and apply missing alt text for product images using AI',
    inputSchema: fixImageAltTextSchema,
    category: 'optimization',
    riskLevel: 'medium',
    execute: executeFixImageAltText,
  },
  {
    name: 'getHealthScore',
    description:
      'Compute overall store health score (0-100) with breakdown across SEO, images, structured data, and content quality',
    inputSchema: getHealthScoreSchema,
    category: 'analysis',
    riskLevel: 'low',
    execute: executeGetHealthScore,
  },
  {
    name: 'updateProductSEO',
    description:
      'Update SEO fields (meta title, meta description) for a specific product',
    inputSchema: updateProductSEOSchema,
    category: 'optimization',
    riskLevel: 'medium',
    execute: executeUpdateProductSEO,
  },
]
