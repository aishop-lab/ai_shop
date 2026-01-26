// Supabase Database Queries for Store Data

import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { Store, Product, PaginatedProducts, StoreSettings } from '@/lib/types/store'
import { DEFAULT_STORE_SETTINGS, DEFAULT_BRAND_COLORS, DEFAULT_TYPOGRAPHY } from '@/lib/types/store'
import type { ProductWithVariants, ProductVariantOption, ProductVariant } from '@/lib/types/variant'

// Production domain configuration
const PRODUCTION_DOMAIN = process.env.NEXT_PUBLIC_PRODUCTION_DOMAIN || 'storeforge.site'
const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

/**
 * Get the full URL for a store
 * In production: https://{slug}.storeforge.site
 * In development: http://localhost:3000/{slug}
 */
export function getStoreUrl(slug: string): string {
  if (IS_PRODUCTION) {
    return `https://${slug}.${PRODUCTION_DOMAIN}`
  }
  return `${BASE_URL}/${slug}`
}

/**
 * Get just the display hostname for a store (without protocol)
 */
export function getStoreHostname(slug: string): string {
  if (IS_PRODUCTION) {
    return `${slug}.${PRODUCTION_DOMAIN}`
  }
  return `localhost:3000/${slug}`
}

/**
 * Get store by slug
 * Only returns active stores
 * Uses admin client to bypass RLS for public storefront access
 */
export async function getStore(slug: string): Promise<Store | null> {
  try {
    // Use admin client for public storefront queries to bypass RLS
    const supabase = await createAdminClient()

    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'active')
      .single()

    if (error || !data) {
      console.error('Error fetching store:', error?.message, 'slug:', slug)
      return null
    }

    // Transform database record to Store type
    return transformStoreData(data)
  } catch (error) {
    console.error('Store query failed:', error)
    return null
  }
}

/**
 * Check if store exists and is accessible
 * Uses admin client for public access
 */
export async function storeExists(slug: string): Promise<boolean> {
  try {
    const supabase = await createAdminClient()

    const { count, error } = await supabase
      .from('stores')
      .select('id', { count: 'exact', head: true })
      .eq('slug', slug)
      .eq('status', 'active')

    if (error) {
      console.error('Store existence check failed:', error.message)
      return false
    }

    return (count ?? 0) > 0
  } catch (error) {
    console.error('Store existence query failed:', error)
    return false
  }
}

/**
 * Get featured products for store (max 8)
 * Uses admin client for public storefront access
 */
export async function getFeaturedProducts(storeId: string): Promise<Product[]> {
  try {
    const supabase = await createAdminClient()

    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        product_images (
          id,
          url,
          thumbnail_url,
          position,
          alt_text
        )
      `)
      .eq('store_id', storeId)
      .eq('status', 'published')
      .eq('featured', true)
      .order('created_at', { ascending: false })
      .limit(8)
    
    if (error) {
      console.error('Error fetching featured products:', error.message)
      return []
    }
    
    return (data || []).map(transformProductData)
  } catch (error) {
    console.error('Featured products query failed:', error)
    return []
  }
}

/**
 * Get all products for store with pagination
 */
export async function getStoreProducts(
  storeId: string,
  options: {
    page?: number
    limit?: number
    category?: string
    sortBy?: 'created_at' | 'price' | 'title'
    sortOrder?: 'asc' | 'desc'
  } = {}
): Promise<PaginatedProducts> {
  const {
    page = 1,
    limit = 24,
    category,
    sortBy = 'created_at',
    sortOrder = 'desc'
  } = options

  try {
    const supabase = await createAdminClient()

    let query = supabase
      .from('products')
      .select(`
        *,
        product_images (
          id,
          url,
          thumbnail_url,
          position,
          alt_text
        )
      `, { count: 'exact' })
      .eq('store_id', storeId)
      .eq('status', 'published')
    
    // Filter by category if provided
    if (category) {
      query = query.contains('categories', [category])
    }
    
    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })
    
    // Apply pagination
    const from = (page - 1) * limit
    const to = page * limit - 1
    query = query.range(from, to)
    
    const { data, count, error } = await query
    
    if (error) {
      console.error('Error fetching store products:', error.message)
      return { products: [], total: 0, page, totalPages: 0 }
    }
    
    const total = count || 0
    const totalPages = Math.ceil(total / limit)
    
    return {
      products: (data || []).map(transformProductData),
      total,
      page,
      totalPages
    }
  } catch (error) {
    console.error('Store products query failed:', error)
    return { products: [], total: 0, page, totalPages: 0 }
  }
}

/**
 * Get single product by ID
 * Uses admin client for public storefront access
 */
export async function getProduct(productId: string): Promise<Product | null> {
  try {
    const supabase = await createAdminClient()

    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        product_images (
          id,
          url,
          thumbnail_url,
          position,
          alt_text
        )
      `)
      .eq('id', productId)
      .eq('status', 'published')
      .single()
    
    if (error || !data) {
      console.error('Error fetching product:', error?.message)
      return null
    }
    
    return transformProductData(data)
  } catch (error) {
    console.error('Product query failed:', error)
    return null
  }
}

/**
 * Get product by ID and verify it belongs to store
 * Includes variant data if the product has variants
 * Uses admin client for public storefront access
 */
export async function getProductForStore(
  storeId: string,
  productId: string
): Promise<Product | ProductWithVariants | null> {
  try {
    const supabase = await createAdminClient()

    // Fetch base product with images
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        product_images (
          id,
          url,
          thumbnail_url,
          position,
          alt_text
        )
      `)
      .eq('id', productId)
      .eq('store_id', storeId)
      .eq('status', 'published')
      .single()

    if (error || !data) {
      return null
    }

    const product = transformProductData(data)

    // If product has variants, fetch variant options and variants
    if (product.has_variants) {
      // Fetch variant options with their values
      const { data: optionsData } = await supabase
        .from('product_variant_options')
        .select(`
          id,
          product_id,
          name,
          position,
          product_variant_option_values (
            id,
            option_id,
            value,
            color_code,
            position
          )
        `)
        .eq('product_id', productId)
        .order('position')

      // Fetch active variants
      const { data: variantsData } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', productId)
        .eq('status', 'active')
        .order('created_at')

      // Transform variant options to match types
      const variant_options: ProductVariantOption[] = (optionsData || []).map(opt => ({
        id: opt.id,
        product_id: opt.product_id,
        name: opt.name,
        position: opt.position,
        values: (opt.product_variant_option_values || [])
          .sort((a, b) => a.position - b.position)
          .map(val => ({
            id: val.id,
            option_id: val.option_id,
            value: val.value,
            color_code: val.color_code,
            position: val.position
          }))
      }))

      // Transform variants to match types
      const variants: ProductVariant[] = (variantsData || []).map(v => ({
        id: v.id,
        product_id: v.product_id,
        attributes: v.attributes,
        price: v.price,
        compare_at_price: v.compare_at_price,
        sku: v.sku,
        barcode: v.barcode,
        quantity: v.quantity,
        track_quantity: v.track_quantity,
        weight: v.weight,
        image_id: v.image_id,
        is_default: v.is_default,
        status: v.status,
        created_at: v.created_at,
        updated_at: v.updated_at
      }))

      // Return product with variants
      return {
        ...product,
        has_variants: true,
        variant_options,
        variants,
        variant_count: variants.length,
        total_inventory: variants.reduce((sum, v) => sum + (v.quantity || 0), 0)
      } as ProductWithVariants
    }

    return product
  } catch (error) {
    console.error('Product for store query failed:', error)
    return null
  }
}

/**
 * Get all unique categories from store products
 * Uses admin client for public storefront access
 */
export async function getStoreCategories(storeId: string): Promise<string[]> {
  try {
    const supabase = await createAdminClient()

    const { data, error } = await supabase
      .from('products')
      .select('categories')
      .eq('store_id', storeId)
      .eq('status', 'published')
    
    if (error || !data) {
      return []
    }
    
    // Extract and flatten all categories
    const allCategories = data
      .flatMap(p => p.categories || [])
      .filter(Boolean)
    
    // Return unique categories
    return [...new Set(allCategories)]
  } catch (error) {
    console.error('Categories query failed:', error)
    return []
  }
}

/**
 * Transform database store record to Store type
 */
function transformStoreData(data: Record<string, unknown>): Store {
  const blueprint = data.blueprint as Store['blueprint'] | null
  const brandColors = data.brand_colors as { primary?: string; secondary?: string } | null

  return {
    id: data.id as string,
    owner_id: data.owner_id as string,
    name: data.name as string || blueprint?.identity?.business_name || 'Store',
    slug: data.slug as string,
    description: data.description as string || blueprint?.identity?.description || '',
    tagline: data.tagline as string || blueprint?.identity?.tagline,
    logo_url: data.logo_url as string || blueprint?.branding?.logo_url || undefined,
    blueprint: blueprint || {} as Store['blueprint'],
    brand_colors: {
      // Priority: brand_colors column > blueprint > default
      primary: brandColors?.primary || blueprint?.branding?.colors?.primary || DEFAULT_BRAND_COLORS.primary,
      secondary: brandColors?.secondary || blueprint?.branding?.colors?.secondary || DEFAULT_BRAND_COLORS.secondary
    },
    typography: {
      heading_font: blueprint?.branding?.typography?.heading_font || DEFAULT_TYPOGRAPHY.heading_font,
      body_font: blueprint?.branding?.typography?.body_font || DEFAULT_TYPOGRAPHY.body_font
    },
    theme_template: blueprint?.theme?.template || 'modern-minimal',
    contact_email: data.contact_email as string || blueprint?.contact?.email || '',
    contact_phone: data.contact_phone as string || blueprint?.contact?.phone,
    whatsapp_number: data.whatsapp_number as string || blueprint?.contact?.whatsapp || undefined,
    instagram_handle: data.instagram_handle as string || blueprint?.contact?.instagram || undefined,
    facebook_url: data.facebook_url as string || undefined,
    settings: mergeSettings(data.settings as StoreSettings | null, blueprint?.settings),
    marketing_pixels: data.marketing_pixels as Store['marketing_pixels'] || undefined,
    policies: data.policies as Store['policies'] || undefined,
    status: data.status as Store['status'],
    created_at: data.created_at as string,
    updated_at: data.updated_at as string
  }
}

/**
 * Transform database product record to Product type
 */
function transformProductData(data: Record<string, unknown>): Product {
  const images = (data.product_images as Record<string, unknown>[] || [])
    .sort((a, b) => (a.position as number || 0) - (b.position as number || 0))
    .map(img => ({
      id: img.id as string,
      product_id: img.product_id as string,
      url: img.url as string,
      thumbnail_url: img.thumbnail_url as string | undefined,
      position: img.position as number,
      alt_text: img.alt_text as string | undefined
    }))
  
  return {
    id: data.id as string,
    store_id: data.store_id as string,
    title: data.title as string,
    description: data.description as string || '',
    price: data.price as number || 0,
    compare_at_price: data.compare_at_price as number | undefined,
    cost_per_item: data.cost_per_item as number | undefined,
    sku: data.sku as string | undefined,
    barcode: data.barcode as string | undefined,
    quantity: data.quantity as number || 0,
    track_quantity: data.track_quantity as boolean ?? true,
    featured: data.featured as boolean ?? false,
    status: data.status as Product['status'],
    images,
    categories: data.categories as string[] || [],
    tags: data.tags as string[] || [],
    weight: data.weight as number | undefined,
    requires_shipping: data.requires_shipping as boolean ?? true,
    has_variants: data.has_variants as boolean ?? false,
    created_at: data.created_at as string,
    updated_at: data.updated_at as string
  }
}

/**
 * Merge store settings with defaults
 */
function mergeSettings(
  dbSettings: StoreSettings | null,
  blueprintSettings: Store['blueprint']['settings'] | undefined
): StoreSettings {
  return {
    checkout: {
      guest_checkout_enabled: 
        dbSettings?.checkout?.guest_checkout_enabled ??
        blueprintSettings?.checkout?.guest_checkout_enabled ??
        DEFAULT_STORE_SETTINGS.checkout.guest_checkout_enabled,
      phone_required:
        dbSettings?.checkout?.phone_required ??
        blueprintSettings?.checkout?.phone_required ??
        DEFAULT_STORE_SETTINGS.checkout.phone_required
    },
    shipping: {
      free_shipping_threshold:
        dbSettings?.shipping?.free_shipping_threshold ??
        blueprintSettings?.shipping?.free_shipping_threshold ??
        DEFAULT_STORE_SETTINGS.shipping.free_shipping_threshold,
      flat_rate_national:
        dbSettings?.shipping?.flat_rate_national ??
        blueprintSettings?.shipping?.flat_rate_national ??
        DEFAULT_STORE_SETTINGS.shipping.flat_rate_national,
      cod_enabled:
        dbSettings?.shipping?.cod_enabled ??
        blueprintSettings?.shipping?.cod_enabled ??
        DEFAULT_STORE_SETTINGS.shipping.cod_enabled,
      cod_fee: dbSettings?.shipping?.cod_fee ?? DEFAULT_STORE_SETTINGS.shipping.cod_fee
    },
    payments: {
      razorpay_enabled:
        dbSettings?.payments?.razorpay_enabled ??
        blueprintSettings?.payments?.razorpay_enabled ??
        DEFAULT_STORE_SETTINGS.payments.razorpay_enabled,
      stripe_enabled:
        dbSettings?.payments?.stripe_enabled ??
        blueprintSettings?.payments?.stripe_enabled ??
        DEFAULT_STORE_SETTINGS.payments.stripe_enabled,
      upi_enabled:
        dbSettings?.payments?.upi_enabled ??
        blueprintSettings?.payments?.upi_enabled ??
        DEFAULT_STORE_SETTINGS.payments.upi_enabled
    }
  }
}
