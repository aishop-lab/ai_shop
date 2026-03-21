// src/lib/agents/technical/image-auditor.ts
// Audits product images for SEO and quality issues — missing alt text,
// broken URLs, and overall image completeness.

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { generateText } from 'ai'
import { getModelForTier } from '../model-router'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ImageIssue = {
  type: 'missing_alt_text' | 'empty_alt_text' | 'broken_url' | 'no_images' | 'low_image_count'
  severity: 'critical' | 'warning' | 'info'
  productId: string
  productName: string
  imageId?: string
  imageUrl?: string
  message: string
}

export type ImageAuditResult = {
  totalProducts: number
  totalImages: number
  issues: ImageIssue[]
  stats: {
    productsWithNoImages: number
    productsWithOneImage: number
    imagesWithoutAlt: number
    imagesWithAlt: number
  }
  score: number // 0-100
}

// ---------------------------------------------------------------------------
// auditProductImages
// ---------------------------------------------------------------------------

export async function auditProductImages(storeId: string): Promise<ImageAuditResult> {
  const supabase = getSupabaseAdmin()

  // Fetch active products
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, title, status')
    .eq('store_id', storeId)
    .eq('status', 'active')

  if (productsError) {
    logger.error('Failed to fetch products for image audit', undefined, { storeId, error: productsError?.message })
    throw new Error(`Failed to fetch products: ${productsError.message}`)
  }

  if (!products || products.length === 0) {
    return {
      totalProducts: 0,
      totalImages: 0,
      issues: [],
      stats: {
        productsWithNoImages: 0,
        productsWithOneImage: 0,
        imagesWithoutAlt: 0,
        imagesWithAlt: 0,
      },
      score: 100,
    }
  }

  // Fetch all product images for this store's products
  const productIds = products.map((p) => p.id)
  const { data: images, error: imagesError } = await supabase
    .from('product_images')
    .select('id, product_id, alt_text, original_url, thumbnail_url, position')
    .in('product_id', productIds)

  if (imagesError) {
    logger.error('Failed to fetch product images for audit', undefined, { storeId, error: imagesError?.message })
    throw new Error(`Failed to fetch product images: ${imagesError.message}`)
  }

  const allImages = images || []
  const issues: ImageIssue[] = []

  // Group images by product
  const imagesByProduct = new Map<string, typeof allImages>()
  for (const img of allImages) {
    const list = imagesByProduct.get(img.product_id) || []
    list.push(img)
    imagesByProduct.set(img.product_id, list)
  }

  // Stats accumulators
  let productsWithNoImages = 0
  let productsWithOneImage = 0
  let imagesWithoutAlt = 0
  let imagesWithAlt = 0

  for (const product of products) {
    const productImages = imagesByProduct.get(product.id) || []

    // No images at all
    if (productImages.length === 0) {
      productsWithNoImages++
      issues.push({
        type: 'no_images',
        severity: 'critical',
        productId: product.id,
        productName: product.title,
        message: `Product "${product.title}" has no images. Products without images have significantly lower conversion rates.`,
      })
      continue
    }

    // Only 1 image
    if (productImages.length === 1) {
      productsWithOneImage++
      issues.push({
        type: 'low_image_count',
        severity: 'info',
        productId: product.id,
        productName: product.title,
        message: `Product "${product.title}" has only 1 image. Recommend 3+ images for better conversions.`,
      })
    }

    // Check each image
    for (const img of productImages) {
      if (img.alt_text === null) {
        imagesWithoutAlt++
        issues.push({
          type: 'missing_alt_text',
          severity: 'warning',
          productId: product.id,
          productName: product.title,
          imageId: img.id,
          imageUrl: img.original_url,
          message: `Image #${img.position} of "${product.title}" is missing alt text (null). This hurts SEO and accessibility.`,
        })
      } else if (img.alt_text.trim() === '') {
        imagesWithoutAlt++
        issues.push({
          type: 'empty_alt_text',
          severity: 'warning',
          productId: product.id,
          productName: product.title,
          imageId: img.id,
          imageUrl: img.original_url,
          message: `Image #${img.position} of "${product.title}" has empty alt text. This hurts SEO and accessibility.`,
        })
      } else {
        imagesWithAlt++
      }
    }
  }

  // Compute score: start at 100, deduct for issues
  let score = 100
  score -= productsWithNoImages * 10
  score -= productsWithOneImage * 3
  score -= imagesWithoutAlt * 2
  score = Math.max(0, Math.min(100, score))

  const result: ImageAuditResult = {
    totalProducts: products.length,
    totalImages: allImages.length,
    issues,
    stats: {
      productsWithNoImages,
      productsWithOneImage,
      imagesWithoutAlt,
      imagesWithAlt,
    },
    score,
  }

  logger.info('Image audit completed', {
    storeId,
    totalProducts: result.totalProducts,
    totalImages: result.totalImages,
    issueCount: result.issues.length,
    score: result.score,
  })

  return result
}

// ---------------------------------------------------------------------------
// generateAltText
// ---------------------------------------------------------------------------

export async function generateAltText(
  productTitle: string,
  productDescription: string,
  imagePosition: number
): Promise<string> {
  const model = getModelForTier('fast')

  const { text } = await generateText({
    model,
    prompt: `Generate a concise, descriptive alt text (under 125 characters) for product image #${imagePosition} of: ${productTitle}. Product description: ${productDescription}. Return ONLY the alt text, no quotes or explanation.`,
  })

  return text.trim()
}

// ---------------------------------------------------------------------------
// fixMissingAltText
// ---------------------------------------------------------------------------

export async function fixMissingAltText(
  storeId: string,
  productIds: string | string[]
): Promise<{ totalFixed: number; productsFixed: number; errors: number }> {
  const ids = Array.isArray(productIds) ? productIds : [productIds]
  const supabase = getSupabaseAdmin()

  let totalFixed = 0
  let productsFixed = 0
  let errors = 0

  for (const productId of ids) {
    // Fetch product details
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, title, description')
      .eq('id', productId)
      .eq('store_id', storeId)
      .single()

    if (productError || !product) {
      logger.error('Failed to fetch product for alt text fix', undefined, { storeId, productId, error: productError?.message })
      errors++
      continue
    }

    // Fetch images without alt text
    const { data: images, error: imagesError } = await supabase
      .from('product_images')
      .select('id, position')
      .eq('product_id', productId)
      .or('alt_text.is.null,alt_text.eq.')

    if (imagesError) {
      logger.error('Failed to fetch images for alt text fix', undefined, { productId, error: imagesError?.message })
      errors++
      continue
    }

    if (!images || images.length === 0) continue

    let fixedForProduct = 0

    for (const img of images) {
      try {
        const altText = await generateAltText(
          product.title,
          product.description || '',
          img.position
        )

        const { error: updateError } = await supabase
          .from('product_images')
          .update({ alt_text: altText })
          .eq('id', img.id)

        if (updateError) {
          logger.error('Failed to update alt text', undefined, { imageId: img.id, error: updateError?.message })
          errors++
        } else {
          fixedForProduct++
          totalFixed++
        }
      } catch (err) {
        logger.error('Failed to generate alt text', err instanceof Error ? err : undefined, { imageId: img.id })
        errors++
      }
    }

    if (fixedForProduct > 0) productsFixed++
  }

  logger.info('Alt text fix completed', { storeId, productsFixed, totalFixed, errors })

  return { totalFixed, productsFixed, errors }
}
