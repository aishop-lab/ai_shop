// src/lib/agents/technical/structured-data.ts
// Generates JSON-LD structured data schemas for e-commerce store products
// and organization data. Queries Supabase for product/store data.

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProductSchema = {
  '@context': 'https://schema.org'
  '@type': 'Product'
  name: string
  description: string
  image: string[]
  sku?: string
  brand?: { '@type': 'Brand'; name: string }
  offers: {
    '@type': 'Offer'
    price: string
    priceCurrency: string
    availability: string
    url: string
    seller?: { '@type': 'Organization'; name: string }
  }
  aggregateRating?: {
    '@type': 'AggregateRating'
    ratingValue: string
    reviewCount: string
  }
}

export type OrganizationSchema = {
  '@context': 'https://schema.org'
  '@type': 'Organization'
  name: string
  url: string
  logo?: string
  description?: string
  contactPoint?: {
    '@type': 'ContactPoint'
    contactType: string
    email?: string
  }
}

export type BreadcrumbSchema = {
  '@context': 'https://schema.org'
  '@type': 'BreadcrumbList'
  itemListElement: Array<{
    '@type': 'ListItem'
    position: number
    name: string
    item?: string
  }>
}

export type StructuredDataResult = {
  productsProcessed: number
  schemasGenerated: number
  organizationSchema: OrganizationSchema | null
  productSchemas: Array<{
    productId: string
    productName: string
    schema: ProductSchema
  }>
}

// ---------------------------------------------------------------------------
// Internal types for DB rows
// ---------------------------------------------------------------------------

type ProductData = {
  id: string
  title: string
  description: string
  price: number
  compare_at_price?: number | null
  sku?: string | null
  status: string
  slug: string
  category?: string | null
  stock_quantity: number
}

type StoreData = {
  name: string
  slug: string
  description?: string | null
  logo_url?: string | null
  currency: string
  email?: string | null
}

// ---------------------------------------------------------------------------
// generateProductSchema
// ---------------------------------------------------------------------------

export function generateProductSchema(
  product: ProductData,
  storeData: StoreData,
  imageUrls: string[] = []
): ProductSchema {
  const schema: ProductSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: (product.description || '').slice(0, 5000),
    image: imageUrls,
    offers: {
      '@type': 'Offer',
      price: product.price.toString(),
      priceCurrency: storeData.currency,
      availability:
        product.stock_quantity > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      url: `https://${storeData.slug}.storeforge.site/products/${product.slug}`,
      seller: { '@type': 'Organization', name: storeData.name },
    },
  }

  if (product.sku) {
    schema.sku = product.sku
  }

  if (storeData.name) {
    schema.brand = { '@type': 'Brand', name: storeData.name }
  }

  return schema
}

// ---------------------------------------------------------------------------
// generateOrganizationSchema
// ---------------------------------------------------------------------------

export function generateOrganizationSchema(
  storeData: StoreData
): OrganizationSchema {
  const schema: OrganizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: storeData.name,
    url: `https://${storeData.slug}.storeforge.site`,
  }

  if (storeData.logo_url) {
    schema.logo = storeData.logo_url
  }

  if (storeData.description) {
    schema.description = storeData.description
  }

  if (storeData.email) {
    schema.contactPoint = {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: storeData.email,
    }
  }

  return schema
}

// ---------------------------------------------------------------------------
// generateBreadcrumbs
// ---------------------------------------------------------------------------

export function generateBreadcrumbs(
  storeName: string,
  storeSlug: string,
  segments: Array<{ name: string; slug?: string }>
): BreadcrumbSchema {
  const baseUrl = `https://${storeSlug}.storeforge.site`

  const itemListElement: BreadcrumbSchema['itemListElement'] = [
    {
      '@type': 'ListItem',
      position: 1,
      name: storeName,
      item: baseUrl,
    },
  ]

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    const entry: BreadcrumbSchema['itemListElement'][number] = {
      '@type': 'ListItem',
      position: i + 2,
      name: segment.name,
    }
    if (segment.slug) {
      entry.item = `${baseUrl}/${segment.slug}`
    }
    itemListElement.push(entry)
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement,
  }
}

// ---------------------------------------------------------------------------
// generateAllStructuredData
// ---------------------------------------------------------------------------

export async function generateAllStructuredData(
  storeId: string
): Promise<StructuredDataResult> {
  const supabase = getSupabaseAdmin()

  // Fetch store
  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('id, name, slug, description, logo_url, blueprint')
    .eq('id', storeId)
    .single()

  if (storeError || !store) {
    logger.error('Failed to fetch store for structured data', undefined, {
      storeId,
      error: storeError?.message,
    })
    return {
      productsProcessed: 0,
      schemasGenerated: 0,
      organizationSchema: null,
      productSchemas: [],
    }
  }

  // Extract currency and email from blueprint
  const blueprint = store.blueprint as Record<string, unknown> | null
  const location = blueprint?.location as
    | Record<string, unknown>
    | undefined
  const contact = blueprint?.contact as
    | Record<string, unknown>
    | undefined

  const storeData: StoreData = {
    name: store.name,
    slug: store.slug,
    description: store.description,
    logo_url: store.logo_url,
    currency: (location?.currency as string) || 'INR',
    email: (contact?.email as string) || null,
  }

  // Fetch active products
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select(
      'id, title, description, price, compare_at_price, sku, status, slug, category, stock_quantity'
    )
    .eq('store_id', storeId)
    .eq('status', 'active')

  if (productsError) {
    logger.error('Failed to fetch products for structured data', undefined, {
      storeId,
      error: productsError.message,
    })
    return {
      productsProcessed: 0,
      schemasGenerated: 0,
      organizationSchema: generateOrganizationSchema(storeData),
      productSchemas: [],
    }
  }

  const productList = products || []
  const productIds = productList.map((p) => p.id)

  // Fetch product images
  let imagesByProduct: Record<string, string[]> = {}

  if (productIds.length > 0) {
    const { data: images, error: imagesError } = await supabase
      .from('product_images')
      .select('product_id, original_url')
      .in('product_id', productIds)
      .order('position', { ascending: true })

    if (imagesError) {
      logger.error('Failed to fetch product images for structured data', undefined, {
        storeId,
        error: imagesError.message,
      })
    } else {
      for (const img of images || []) {
        if (!imagesByProduct[img.product_id]) {
          imagesByProduct[img.product_id] = []
        }
        imagesByProduct[img.product_id].push(img.original_url)
      }
    }
  }

  // Generate schemas
  const productSchemas = productList.map((product) => ({
    productId: product.id,
    productName: product.title,
    schema: generateProductSchema(
      product as ProductData,
      storeData,
      imagesByProduct[product.id] || []
    ),
  }))

  const organizationSchema = generateOrganizationSchema(storeData)

  logger.info('Generated structured data', {
    storeId,
    productsProcessed: productList.length,
    schemasGenerated: productSchemas.length,
  })

  return {
    productsProcessed: productList.length,
    schemasGenerated: productSchemas.length,
    organizationSchema,
    productSchemas,
  }
}

// ---------------------------------------------------------------------------
// checkStructuredDataCoverage
// ---------------------------------------------------------------------------

export async function checkStructuredDataCoverage(
  storeId: string
): Promise<{
  total: number
  hasSchema: number
  missing: number
  missingProducts: Array<{ id: string; name: string }>
}> {
  const supabase = getSupabaseAdmin()

  // Fetch all active products
  const { data: products, error } = await supabase
    .from('products')
    .select('id, title, description, price, slug')
    .eq('store_id', storeId)
    .eq('status', 'active')

  if (error) {
    logger.error('Failed to check structured data coverage', undefined, {
      storeId,
      error: error.message,
    })
    return { total: 0, hasSchema: 0, missing: 0, missingProducts: [] }
  }

  const productList = products || []
  const productIds = productList.map((p) => p.id)

  // Check which products have at least one image
  let productsWithImages = new Set<string>()

  if (productIds.length > 0) {
    const { data: images } = await supabase
      .from('product_images')
      .select('product_id')
      .in('product_id', productIds)

    for (const img of images || []) {
      productsWithImages.add(img.product_id)
    }
  }

  // A product has valid structured data if it has title, description, price, and at least one image
  const missingProducts: Array<{ id: string; name: string }> = []

  for (const product of productList) {
    const hasTitle = !!product.title
    const hasDescription = !!product.description
    const hasPrice = product.price != null && product.price > 0
    const hasImage = productsWithImages.has(product.id)

    if (!hasTitle || !hasDescription || !hasPrice || !hasImage) {
      missingProducts.push({ id: product.id, name: product.title || '(untitled)' })
    }
  }

  const hasSchema = productList.length - missingProducts.length

  return {
    total: productList.length,
    hasSchema,
    missing: missingProducts.length,
    missingProducts,
  }
}
