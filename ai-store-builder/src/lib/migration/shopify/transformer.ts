// Transform Shopify data to StoreForge normalized format

import type {
  ShopifyProduct,
  ShopifyCollection,
  MigrationProduct,
  MigrationCollection,
  MigrationVariant,
  MigrationImage,
} from '../types'

/**
 * Strip HTML tags from a string
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Extract numeric ID from Shopify GID (e.g. "gid://shopify/Product/123" -> "123")
 */
function extractGid(gid: string): string {
  const parts = gid.split('/')
  return parts[parts.length - 1]
}

/**
 * Convert Shopify weight to grams
 */
function normalizeWeight(weight: number | null, unit: string): number | undefined {
  if (weight === null || weight === 0) return undefined
  switch (unit) {
    case 'KILOGRAMS': return weight * 1000
    case 'GRAMS': return weight
    case 'POUNDS': return weight * 453.592
    case 'OUNCES': return weight * 28.3495
    default: return weight
  }
}

/**
 * Transform a Shopify product to StoreForge format
 */
export function transformShopifyProduct(product: ShopifyProduct): MigrationProduct | null {
  // Skip archived products
  if (product.status === 'ARCHIVED') return null

  const variants = product.variants.edges.map(e => e.node)
  const firstVariant = variants[0]

  // Transform images
  const images: MigrationImage[] = product.images.edges.map((e, idx) => ({
    source_url: e.node.url,
    alt_text: e.node.altText || undefined,
    position: idx,
  }))

  // Transform variants (only if more than 1, or if the single variant has options)
  const migrationVariants: MigrationVariant[] = []
  if (variants.length > 1) {
    for (const v of variants) {
      const options: Record<string, string> = {}
      for (const opt of v.selectedOptions) {
        options[opt.name.toLowerCase()] = opt.value
      }

      migrationVariants.push({
        source_id: extractGid(v.id),
        title: v.title,
        sku: v.sku || undefined,
        price: parseFloat(v.price),
        compare_at_price: v.compareAtPrice ? parseFloat(v.compareAtPrice) : undefined,
        quantity: Math.max(0, v.inventoryQuantity),
        options,
        weight: normalizeWeight(v.weight, v.weightUnit),
      })
    }
  }

  // Build categories from productType
  const categories: string[] = []
  if (product.productType) {
    categories.push(product.productType)
  }

  return {
    source_id: extractGid(product.id),
    title: product.title,
    description: stripHtml(product.descriptionHtml),
    price: firstVariant ? parseFloat(firstVariant.price) : 0,
    compare_at_price: firstVariant?.compareAtPrice
      ? parseFloat(firstVariant.compareAtPrice)
      : undefined,
    sku: firstVariant?.sku || undefined,
    quantity: firstVariant ? Math.max(0, firstVariant.inventoryQuantity) : 0,
    track_quantity: true,
    weight: firstVariant
      ? normalizeWeight(firstVariant.weight, firstVariant.weightUnit)
      : undefined,
    categories,
    tags: product.tags,
    images,
    variants: migrationVariants,
    status: product.status === 'ACTIVE' ? 'active' : 'draft',
  }
}

/**
 * Transform a Shopify collection to StoreForge format
 */
export function transformShopifyCollection(
  collection: ShopifyCollection
): MigrationCollection {
  return {
    source_id: extractGid(collection.id),
    title: collection.title,
    description: stripHtml(collection.descriptionHtml) || undefined,
    product_source_ids: collection.products.edges.map(e => extractGid(e.node.id)),
  }
}
