// Caching Strategy for Store Data

import { revalidateTag as nextRevalidateTag, unstable_cache } from 'next/cache'

// Wrapper to handle potential type mismatches
function revalidateTag(tag: string): void {
  try {
    // Next.js revalidateTag only takes one argument
    (nextRevalidateTag as (tag: string) => void)(tag)
  } catch {
    // Silently fail if revalidation is not supported in this context
  }
}
import { getStore, getFeaturedProducts, getStoreProducts } from './queries'

/**
 * Cache configuration for different data types
 */
export const CACHE_CONFIG = {
  store: {
    revalidate: 60, // 1 minute
    tags: (slug: string) => [`store`, `store-${slug}`]
  },
  products: {
    revalidate: 300, // 5 minutes
    tags: (storeId: string) => [`products`, `products-${storeId}`]
  },
  product: {
    revalidate: 3600, // 1 hour
    tags: (productId: string) => [`product`, `product-${productId}`]
  },
  categories: {
    revalidate: 3600, // 1 hour
    tags: (storeId: string) => [`categories`, `categories-${storeId}`]
  }
}

/**
 * Cached store fetch
 * Uses Next.js unstable_cache for server-side caching
 */
export const getCachedStore = (slug: string) => 
  unstable_cache(
    async () => getStore(slug),
    [`store-${slug}`],
    {
      revalidate: CACHE_CONFIG.store.revalidate,
      tags: CACHE_CONFIG.store.tags(slug)
    }
  )()

/**
 * Cached featured products fetch
 */
export const getCachedFeaturedProducts = (storeId: string) =>
  unstable_cache(
    async () => getFeaturedProducts(storeId),
    [`featured-products-${storeId}`],
    {
      revalidate: CACHE_CONFIG.products.revalidate,
      tags: CACHE_CONFIG.products.tags(storeId)
    }
  )()

/**
 * Cached products fetch with pagination
 */
export const getCachedProducts = (
  storeId: string, 
  options: { page: number; limit: number; category?: string }
) =>
  unstable_cache(
    async () => getStoreProducts(storeId, options),
    [`products-${storeId}-${options.page}-${options.limit}-${options.category || 'all'}`],
    {
      revalidate: CACHE_CONFIG.products.revalidate,
      tags: CACHE_CONFIG.products.tags(storeId)
    }
  )()

/**
 * Revalidate store cache
 * Call this when store data is updated
 */
export async function revalidateStoreCache(slug: string): Promise<void> {
  try {
    revalidateTag(`store-${slug}`)
    console.log(`Revalidated cache for store: ${slug}`)
  } catch (error) {
    console.error(`Failed to revalidate store cache: ${slug}`, error)
  }
}

/**
 * Revalidate products cache
 * Call this when products are added/updated/deleted
 */
export async function revalidateProductsCache(storeId: string): Promise<void> {
  try {
    revalidateTag(`products-${storeId}`)
    console.log(`Revalidated products cache for store: ${storeId}`)
  } catch (error) {
    console.error(`Failed to revalidate products cache: ${storeId}`, error)
  }
}

/**
 * Revalidate single product cache
 */
export async function revalidateProductCache(productId: string): Promise<void> {
  try {
    revalidateTag(`product-${productId}`)
    console.log(`Revalidated cache for product: ${productId}`)
  } catch (error) {
    console.error(`Failed to revalidate product cache: ${productId}`, error)
  }
}

/**
 * Revalidate all data for a store
 * Use when major changes occur
 */
export async function revalidateAllStoreData(slug: string, storeId: string): Promise<void> {
  try {
    revalidateTag(`store-${slug}`)
    revalidateTag(`products-${storeId}`)
    revalidateTag(`categories-${storeId}`)
    console.log(`Revalidated all cache for store: ${slug}`)
  } catch (error) {
    console.error(`Failed to revalidate all store data: ${slug}`, error)
  }
}

/**
 * Get cache headers for API responses
 */
export function getCacheHeaders(type: keyof typeof CACHE_CONFIG): HeadersInit {
  const config = CACHE_CONFIG[type]
  return {
    'Cache-Control': `public, s-maxage=${config.revalidate}, stale-while-revalidate=${config.revalidate * 2}`
  }
}

/**
 * Generate cache key for store data
 */
export function getStoreCacheKey(slug: string): string {
  return `store:${slug}`
}

/**
 * Generate cache key for products
 */
export function getProductsCacheKey(
  storeId: string, 
  page: number, 
  limit: number, 
  category?: string
): string {
  return `products:${storeId}:${page}:${limit}:${category || 'all'}`
}

/**
 * Generate cache key for single product
 */
export function getProductCacheKey(productId: string): string {
  return `product:${productId}`
}

// ISR Configuration for page rendering
export const ISR_CONFIG = {
  storePage: {
    revalidate: 60 // Revalidate every 60 seconds
  },
  productPage: {
    revalidate: 300 // Revalidate every 5 minutes
  },
  productsListPage: {
    revalidate: 120 // Revalidate every 2 minutes
  }
}

/**
 * Generate static params for ISR
 * Returns array of slugs for static generation
 */
export async function getStaticStoreSlugs(): Promise<string[]> {
  // This would fetch all active store slugs from the database
  // For now, return empty array (dynamic rendering)
  return []
}
