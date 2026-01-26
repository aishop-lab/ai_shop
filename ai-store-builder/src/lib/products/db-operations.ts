// Product Database Operations

import { createClient } from '@/lib/supabase/server'
import type { Product, ProductImage } from '@/lib/types/store'
import type { ProductInput, ProductUpdate } from './validation'

/**
 * Generate a URL-friendly handle from title
 */
function generateHandle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100) + '-' + Date.now().toString(36)
}

export interface ProductWithImages extends Product {
  images: ProductImage[]
}

export interface PaginatedProductsResult {
  products: ProductWithImages[]
  total: number
  page: number
  totalPages: number
}

/**
 * Create a new product in the database
 */
export async function createProduct(
  storeId: string,
  productData: ProductInput
): Promise<Product> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('products')
    .insert({
      store_id: storeId,
      title: productData.title,
      handle: generateHandle(productData.title),
      description: productData.description,
      price: productData.price ?? 0,
      compare_at_price: productData.compare_at_price || null,
      cost_per_item: productData.cost_per_item || null,
      sku: productData.sku || null,
      barcode: productData.barcode || null,
      quantity: productData.quantity ?? 0,
      track_quantity: productData.track_quantity ?? true,
      weight: productData.weight || null,
      requires_shipping: productData.requires_shipping ?? true,
      categories: productData.categories || [],
      tags: productData.tags || [],
      featured: productData.featured ?? false,
      status: productData.status || 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    console.error('Product creation error:', error)
    throw new Error(`Failed to create product: ${error.message}`)
  }

  return transformProductData(data)
}

/**
 * Update an existing product
 */
export async function updateProduct(
  productId: string,
  updates: ProductUpdate
): Promise<Product> {
  const supabase = await createClient()

  // Build update object with only provided fields
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  }

  if (updates.title !== undefined) updateData.title = updates.title
  if (updates.description !== undefined) updateData.description = updates.description
  if (updates.price !== undefined) updateData.price = updates.price
  if (updates.compare_at_price !== undefined) updateData.compare_at_price = updates.compare_at_price
  if (updates.cost_per_item !== undefined) updateData.cost_per_item = updates.cost_per_item
  if (updates.sku !== undefined) updateData.sku = updates.sku
  if (updates.barcode !== undefined) updateData.barcode = updates.barcode
  if (updates.quantity !== undefined) updateData.quantity = updates.quantity
  if (updates.track_quantity !== undefined) updateData.track_quantity = updates.track_quantity
  if (updates.weight !== undefined) updateData.weight = updates.weight
  if (updates.requires_shipping !== undefined) updateData.requires_shipping = updates.requires_shipping
  if (updates.categories !== undefined) updateData.categories = updates.categories
  if (updates.tags !== undefined) updateData.tags = updates.tags
  if (updates.status !== undefined) updateData.status = updates.status
  if (updates.featured !== undefined) updateData.featured = updates.featured
  if ((updates as Record<string, unknown>).has_variants !== undefined) updateData.has_variants = (updates as Record<string, unknown>).has_variants

  const { data, error } = await supabase
    .from('products')
    .update(updateData)
    .eq('id', productId)
    .select()
    .single()

  if (error) {
    console.error('Product update error:', error)
    throw new Error(`Failed to update product: ${error.message}`)
  }

  return transformProductData(data)
}

/**
 * Get a single product by ID with images
 */
export async function getProductById(productId: string): Promise<ProductWithImages | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      product_images (
        id,
        original_url,
        thumbnail_url,
        position,
        alt_text
      )
    `)
    .eq('id', productId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    console.error('Product fetch error:', error)
    throw new Error(`Failed to fetch product: ${error.message}`)
  }

  return transformProductWithImages(data)
}

/**
 * Get product by ID and verify store ownership
 */
export async function getProductForStore(
  storeId: string,
  productId: string
): Promise<ProductWithImages | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      product_images (
        id,
        original_url,
        thumbnail_url,
        position,
        alt_text
      )
    `)
    .eq('id', productId)
    .eq('store_id', storeId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    console.error('Product fetch error:', error)
    throw new Error(`Failed to fetch product: ${error.message}`)
  }

  return transformProductWithImages(data)
}

/**
 * Delete a product (soft delete - set status to archived)
 */
export async function deleteProduct(productId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('products')
    .update({ 
      status: 'archived',
      updated_at: new Date().toISOString()
    })
    .eq('id', productId)

  if (error) {
    console.error('Product deletion error:', error)
    throw new Error(`Failed to delete product: ${error.message}`)
  }
}

/**
 * Hard delete a product (permanent)
 */
export async function hardDeleteProduct(productId: string): Promise<void> {
  const supabase = await createClient()

  // First delete images
  await supabase
    .from('product_images')
    .delete()
    .eq('product_id', productId)

  // Then delete product
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId)

  if (error) {
    console.error('Product hard deletion error:', error)
    throw new Error(`Failed to delete product: ${error.message}`)
  }
}

/**
 * Publish a product (draft → active)
 */
export async function publishProduct(productId: string): Promise<Product> {
  return updateProduct(productId, { status: 'active' })
}

/**
 * Unpublish a product (active → draft)
 */
export async function unpublishProduct(productId: string): Promise<Product> {
  return updateProduct(productId, { status: 'draft' })
}

/**
 * Toggle product featured status
 */
export async function toggleFeatured(productId: string, featured: boolean): Promise<Product> {
  return updateProduct(productId, { featured })
}

/**
 * Get products for a store with filtering and pagination
 */
export async function getStoreProducts(
  storeId: string,
  filters: {
    status?: 'draft' | 'published' | 'archived' | 'all'
    category?: string
    search?: string
    page?: number
    limit?: number
    sortBy?: 'created_at' | 'price' | 'title' | 'quantity'
    sortOrder?: 'asc' | 'desc'
  } = {}
): Promise<PaginatedProductsResult> {
  const supabase = await createClient()

  const {
    status = 'all',
    category,
    search,
    page = 1,
    limit = 24,
    sortBy = 'created_at',
    sortOrder = 'desc'
  } = filters

  // Build query
  let query = supabase
    .from('products')
    .select(`
      *,
      product_images (
        id,
        original_url,
        thumbnail_url,
        position,
        alt_text
      )
    `, { count: 'exact' })
    .eq('store_id', storeId)

  // Apply status filter
  if (status && status !== 'all') {
    query = query.eq('status', status)
  } else {
    // Exclude archived by default
    query = query.neq('status', 'archived')
  }

  // Apply category filter
  if (category) {
    query = query.contains('categories', [category])
  }

  // Apply search filter
  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,sku.ilike.%${search}%`)
  }

  // Apply sorting
  query = query.order(sortBy, { ascending: sortOrder === 'asc' })

  // Apply pagination
  const from = (page - 1) * limit
  const to = from + limit - 1
  query = query.range(from, to)

  const { data, count, error } = await query

  if (error) {
    console.error('Products fetch error:', error)
    throw new Error(`Failed to fetch products: ${error.message}`)
  }

  const total = count || 0
  const totalPages = Math.ceil(total / limit)

  return {
    products: (data || []).map(transformProductWithImages),
    total,
    page,
    totalPages
  }
}

/**
 * Get all categories used in store products
 */
export async function getStoreCategories(storeId: string): Promise<string[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('products')
    .select('categories')
    .eq('store_id', storeId)
    .neq('status', 'archived')

  if (error) {
    console.error('Categories fetch error:', error)
    return []
  }

  // Extract and flatten all categories
  const allCategories = (data || [])
    .flatMap(p => p.categories || [])
    .filter(Boolean)

  // Return unique categories sorted
  return [...new Set(allCategories)].sort()
}

/**
 * Get product count for a store
 */
export async function getStoreProductCount(
  storeId: string,
  status?: 'draft' | 'published' | 'archived'
): Promise<number> {
  const supabase = await createClient()

  let query = supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('store_id', storeId)

  if (status) {
    query = query.eq('status', status)
  } else {
    query = query.neq('status', 'archived')
  }

  const { count, error } = await query

  if (error) {
    console.error('Product count error:', error)
    return 0
  }

  return count || 0
}

/**
 * Bulk update product status
 */
export async function bulkUpdateStatus(
  productIds: string[],
  status: 'draft' | 'published' | 'archived'
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('products')
    .update({ 
      status,
      updated_at: new Date().toISOString()
    })
    .in('id', productIds)

  if (error) {
    console.error('Bulk status update error:', error)
    throw new Error(`Failed to update products: ${error.message}`)
  }
}

/**
 * Check if user owns the store
 */
export async function verifyStoreOwnership(
  userId: string,
  storeId: string
): Promise<boolean> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('stores')
    .select('id')
    .eq('id', storeId)
    .eq('owner_id', userId)
    .single()

  if (error || !data) {
    return false
  }

  return true
}

/**
 * Check if user owns the product (via store ownership)
 */
export async function verifyProductOwnership(
  userId: string,
  productId: string
): Promise<boolean> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      stores!inner (
        owner_id
      )
    `)
    .eq('id', productId)
    .single()

  if (error || !data) {
    return false
  }

  // Check if the store's owner matches the user
  const storeData = data.stores as unknown as { owner_id: string }
  return storeData?.owner_id === userId
}

// Helper functions

function transformProductData(data: Record<string, unknown>): Product {
  return {
    id: data.id as string,
    store_id: data.store_id as string,
    title: data.title as string,
    description: data.description as string || '',
    price: data.price as number,
    compare_at_price: data.compare_at_price as number | undefined,
    cost_per_item: data.cost_per_item as number | undefined,
    sku: data.sku as string | undefined,
    barcode: data.barcode as string | undefined,
    quantity: data.quantity as number || 0,
    track_quantity: data.track_quantity as boolean ?? true,
    featured: data.featured as boolean ?? false,
    status: data.status as 'draft' | 'active' | 'published',
    images: [],
    categories: data.categories as string[] || [],
    tags: data.tags as string[] || [],
    weight: data.weight as number | undefined,
    requires_shipping: data.requires_shipping as boolean ?? true,
    has_variants: data.has_variants as boolean ?? false,
    created_at: data.created_at as string,
    updated_at: data.updated_at as string
  }
}

function transformProductWithImages(data: Record<string, unknown>): ProductWithImages {
  const product = transformProductData(data)

  const images = (data.product_images as Record<string, unknown>[] || [])
    .sort((a, b) => (a.position as number || 0) - (b.position as number || 0))
    .map(img => ({
      id: img.id as string,
      product_id: img.product_id as string,
      url: (img.original_url || img.url) as string,
      thumbnail_url: img.thumbnail_url as string | undefined,
      position: img.position as number,
      alt_text: img.alt_text as string | undefined
    }))

  return {
    ...product,
    images
  }
}
