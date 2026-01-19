// Main Store Data Fetching Functions

import { 
  getStore, 
  storeExists, 
  getFeaturedProducts, 
  getStoreProducts, 
  getProductForStore,
  getStoreCategories
} from './queries'
import type { Store, StorePageData, Product, PaginatedProducts } from '@/lib/types/store'

/**
 * Get store by slug (from URL path)
 * Example: /thevasa → fetch store with slug="thevasa"
 */
export async function getStoreBySlug(slug: string): Promise<Store | null> {
  if (!slug || typeof slug !== 'string') {
    console.warn('Invalid slug provided to getStoreBySlug')
    return null
  }
  
  // Normalize slug (lowercase, trim)
  const normalizedSlug = slug.toLowerCase().trim()
  
  try {
    return await getStore(normalizedSlug)
  } catch (error) {
    console.error(`Failed to fetch store with slug: ${normalizedSlug}`, error)
    return null
  }
}

/**
 * Get store with all related data for rendering pages
 * Returns complete data needed for store homepage
 */
export async function getStoreData(slug: string): Promise<StorePageData | null> {
  if (!slug || typeof slug !== 'string') {
    console.warn('Invalid slug provided to getStoreData')
    return null
  }
  
  const normalizedSlug = slug.toLowerCase().trim()
  
  try {
    // Fetch store first
    const store = await getStore(normalizedSlug)
    
    if (!store) {
      return null
    }
    
    // Fetch all related data in parallel
    const [
      featuredProducts,
      productsResult,
      categories
    ] = await Promise.all([
      getFeaturedProducts(store.id),
      getStoreProducts(store.id, { page: 1, limit: 24 }),
      getStoreCategories(store.id)
    ])
    
    return {
      store,
      products: productsResult.products,
      featured_products: featuredProducts,
      categories,
      settings: store.settings
    }
  } catch (error) {
    console.error(`Failed to fetch store data for slug: ${normalizedSlug}`, error)
    return null
  }
}

/**
 * Get single product with store context
 * Returns both product and store data for product detail page
 */
export async function getProductData(
  storeSlug: string,
  productId: string
): Promise<{ store: Store; product: Product } | null> {
  if (!storeSlug || !productId) {
    console.warn('Invalid storeSlug or productId provided to getProductData')
    return null
  }
  
  const normalizedSlug = storeSlug.toLowerCase().trim()
  
  try {
    // Fetch store first
    const store = await getStore(normalizedSlug)
    
    if (!store) {
      return null
    }
    
    // Fetch product that belongs to this store
    const product = await getProductForStore(store.id, productId)
    
    if (!product) {
      return null
    }
    
    return { store, product }
  } catch (error) {
    console.error(`Failed to fetch product data for store: ${normalizedSlug}, product: ${productId}`, error)
    return null
  }
}

/**
 * Check if store exists and is active
 * Used for access validation before rendering
 */
export async function validateStoreAccess(slug: string): Promise<boolean> {
  if (!slug || typeof slug !== 'string') {
    return false
  }
  
  const normalizedSlug = slug.toLowerCase().trim()
  
  try {
    return await storeExists(normalizedSlug)
  } catch (error) {
    console.error(`Failed to validate store access for slug: ${normalizedSlug}`, error)
    return false
  }
}

/**
 * Get paginated products for store
 * Used for product listing pages with filtering
 */
export async function getStoreProductsPaginated(
  slug: string,
  options: {
    page?: number
    limit?: number
    category?: string
    sortBy?: 'created_at' | 'price' | 'title'
    sortOrder?: 'asc' | 'desc'
  } = {}
): Promise<PaginatedProducts | null> {
  if (!slug || typeof slug !== 'string') {
    return null
  }
  
  const normalizedSlug = slug.toLowerCase().trim()
  
  try {
    // Fetch store to get ID
    const store = await getStore(normalizedSlug)
    
    if (!store) {
      return null
    }
    
    return await getStoreProducts(store.id, options)
  } catch (error) {
    console.error(`Failed to fetch paginated products for slug: ${normalizedSlug}`, error)
    return null
  }
}

/**
 * Get store categories
 * Used for navigation and filtering
 */
export async function getStoreCategoriesBySlug(slug: string): Promise<string[]> {
  if (!slug || typeof slug !== 'string') {
    return []
  }
  
  const normalizedSlug = slug.toLowerCase().trim()
  
  try {
    const store = await getStore(normalizedSlug)
    
    if (!store) {
      return []
    }
    
    return await getStoreCategories(store.id)
  } catch (error) {
    console.error(`Failed to fetch categories for slug: ${normalizedSlug}`, error)
    return []
  }
}

/**
 * Get related products (same category, excluding current)
 */
export async function getRelatedProducts(
  storeId: string,
  productId: string,
  categories: string[],
  limit: number = 4
): Promise<Product[]> {
  try {
    // Get products from same categories
    const result = await getStoreProducts(storeId, {
      page: 1,
      limit: limit + 1, // Get one extra in case we need to exclude current
      category: categories[0] // Use first category for now
    })
    
    // Filter out current product and limit
    return result.products
      .filter(p => p.id !== productId)
      .slice(0, limit)
  } catch (error) {
    console.error('Failed to fetch related products:', error)
    return []
  }
}
