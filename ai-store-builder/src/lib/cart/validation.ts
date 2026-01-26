// Cart Validation Logic

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { Product } from '@/lib/types/store'
import type { CartItemInput, ValidatedCartItem } from '@/lib/types/cart'
import type { ProductVariant } from '@/lib/types/variant'

/**
 * Zod schema for cart validation request (variant-aware)
 */
export const cartValidationSchema = z.object({
  store_id: z.string().uuid('Invalid store ID'),
  items: z.array(z.object({
    product_id: z.string().uuid('Invalid product ID'),
    variant_id: z.string().uuid('Invalid variant ID').optional(),
    quantity: z.number().int().positive('Quantity must be positive')
  })).min(1, 'Cart cannot be empty'),
  payment_method: z.string().optional(),
  coupon_code: z.string().optional()
})

/**
 * Zod schema for inventory check request (variant-aware)
 */
export const inventoryCheckSchema = z.object({
  items: z.array(z.object({
    product_id: z.string().uuid('Invalid product ID'),
    variant_id: z.string().uuid('Invalid variant ID').optional(),
    quantity: z.number().int().positive('Quantity must be positive')
  })).min(1, 'No items to check')
})

/**
 * Validate cart items against database (variant-aware)
 * Checks: product exists, is published, belongs to store, has sufficient quantity
 * For variant items: checks variant exists, is active, has sufficient quantity
 */
export async function validateCartItems(
  storeId: string,
  items: CartItemInput[]
): Promise<{
  valid: boolean
  validatedItems: ValidatedCartItem[]
  errors: string[]
}> {
  const supabase = await createClient()
  const validatedItems: ValidatedCartItem[] = []
  const errors: string[] = []

  // Fetch all products in one query for efficiency
  const productIds = [...new Set(items.map(item => item.product_id))]

  const { data: products, error: fetchError } = await supabase
    .from('products')
    .select(`
      id,
      store_id,
      title,
      description,
      price,
      compare_at_price,
      quantity,
      track_quantity,
      status,
      sku,
      weight,
      requires_shipping,
      categories,
      tags,
      featured,
      has_variants,
      created_at,
      updated_at,
      product_images (
        id,
        original_url,
        thumbnail_url,
        position,
        alt_text
      )
    `)
    .in('id', productIds)

  if (fetchError) {
    console.error('Failed to fetch products:', fetchError)
    return {
      valid: false,
      validatedItems: [],
      errors: ['Failed to validate cart items']
    }
  }

  // Fetch variants if any items have variant_id
  const variantIds = items.filter(i => i.variant_id).map(i => i.variant_id!)
  let variantMap = new Map<string, ProductVariant>()

  if (variantIds.length > 0) {
    const { data: variants, error: variantError } = await supabase
      .from('product_variants')
      .select(`
        id,
        product_id,
        attributes,
        price,
        compare_at_price,
        sku,
        barcode,
        quantity,
        track_quantity,
        weight,
        image_id,
        is_default,
        status
      `)
      .in('id', variantIds)

    if (variantError) {
      console.error('Failed to fetch variants:', variantError)
    } else if (variants) {
      for (const v of variants) {
        variantMap.set(v.id, {
          id: v.id,
          product_id: v.product_id,
          attributes: v.attributes as Record<string, string>,
          price: v.price,
          compare_at_price: v.compare_at_price,
          sku: v.sku,
          barcode: v.barcode,
          quantity: v.quantity || 0,
          track_quantity: v.track_quantity ?? true,
          weight: v.weight,
          image_id: v.image_id,
          is_default: v.is_default ?? false,
          status: v.status as 'active' | 'disabled',
        })
      }
    }
  }

  // Create a map for quick product lookup
  const productMap = new Map<string, Product & { has_variants?: boolean }>()
  if (products) {
    for (const p of products) {
      const product = {
        id: p.id,
        store_id: p.store_id,
        title: p.title,
        description: p.description || '',
        price: p.price,
        compare_at_price: p.compare_at_price || undefined,
        quantity: p.quantity || 0,
        track_quantity: p.track_quantity ?? true,
        status: p.status as 'draft' | 'active' | 'published',
        sku: p.sku || undefined,
        weight: p.weight || undefined,
        requires_shipping: p.requires_shipping ?? true,
        categories: p.categories || [],
        tags: p.tags || [],
        featured: p.featured ?? false,
        has_variants: p.has_variants ?? false,
        created_at: p.created_at,
        updated_at: p.updated_at,
        images: (p.product_images || [])
          .sort((a: { position: number }, b: { position: number }) => a.position - b.position)
          .map((img: { id: string; original_url?: string; url?: string; thumbnail_url?: string; position: number; alt_text?: string }) => ({
            id: img.id,
            product_id: p.id,
            url: img.original_url || img.url || '',
            thumbnail_url: img.thumbnail_url,
            position: img.position,
            alt_text: img.alt_text
          }))
      }
      productMap.set(p.id, product)
    }
  }

  // Validate each cart item
  for (const item of items) {
    const product = productMap.get(item.product_id)
    const variant = item.variant_id ? variantMap.get(item.variant_id) : undefined
    const issues: string[] = []

    // Check if product exists
    if (!product) {
      errors.push(`Product not found: ${item.product_id}`)
      continue
    }

    // Check if product belongs to the store
    if (product.store_id !== storeId) {
      errors.push(`Product ${product.title} does not belong to this store`)
      continue
    }

    // Check if product is published/active
    if (product.status !== 'active' && product.status !== 'published') {
      errors.push(`Product ${product.title} is not available`)
      continue
    }

    // If product has variants but no variant was specified
    if (product.has_variants && !item.variant_id) {
      errors.push(`Please select options for ${product.title}`)
      continue
    }

    // If variant was specified, validate it
    if (item.variant_id) {
      if (!variant) {
        errors.push(`Selected option not found for ${product.title}`)
        continue
      }
      if (variant.product_id !== product.id) {
        errors.push(`Invalid option for ${product.title}`)
        continue
      }
      if (variant.status !== 'active') {
        errors.push(`Selected option for ${product.title} is not available`)
        continue
      }
    }

    // Determine effective quantity and price based on variant or product
    const trackQuantity = variant?.track_quantity ?? product.track_quantity
    const availableQty = variant ? variant.quantity : product.quantity
    const effectivePrice = variant?.price ?? product.price
    let adjustedQuantity = item.quantity

    // Check quantity availability
    const availableQuantity = trackQuantity ? availableQty : 9999

    if (trackQuantity && item.quantity > availableQty) {
      if (availableQty === 0) {
        issues.push('Out of stock')
        adjustedQuantity = 0
      } else {
        issues.push(`Only ${availableQty} available`)
        adjustedQuantity = availableQty
      }
    }

    // Create validated item
    const validatedItem: ValidatedCartItem = {
      product_id: product.id,
      variant_id: variant?.id,
      variant: variant,
      variant_attributes: variant?.attributes,
      product,
      quantity: adjustedQuantity,
      available_quantity: availableQuantity,
      price: effectivePrice,
      subtotal: effectivePrice * adjustedQuantity,
      issues: issues.length > 0 ? issues : undefined
    }

    validatedItems.push(validatedItem)
  }

  // Check if any items have issues
  const hasIssues = validatedItems.some(item => item.issues && item.issues.length > 0)

  return {
    valid: errors.length === 0 && !hasIssues,
    validatedItems,
    errors
  }
}

/**
 * Check inventory for multiple products (variant-aware)
 */
export async function checkInventory(
  items: CartItemInput[]
): Promise<{
  available: boolean
  items: Array<{
    product_id: string
    variant_id?: string
    variant_attributes?: Record<string, string>
    available_quantity: number
    requested_quantity: number
    in_stock: boolean
  }>
}> {
  const supabase = await createClient()

  const productIds = [...new Set(items.map(item => item.product_id))]
  const variantIds = items.filter(i => i.variant_id).map(i => i.variant_id!)

  // Fetch products
  const { data: products, error } = await supabase
    .from('products')
    .select('id, quantity, track_quantity, status, has_variants')
    .in('id', productIds)

  if (error) {
    console.error('Failed to check inventory:', error)
    return {
      available: false,
      items: items.map(item => ({
        product_id: item.product_id,
        variant_id: item.variant_id,
        available_quantity: 0,
        requested_quantity: item.quantity,
        in_stock: false
      }))
    }
  }

  // Fetch variants if needed
  let variantMap = new Map<string, { quantity: number; track_quantity: boolean; status: string; attributes: Record<string, string> }>()
  if (variantIds.length > 0) {
    const { data: variants } = await supabase
      .from('product_variants')
      .select('id, quantity, track_quantity, status, attributes')
      .in('id', variantIds)

    if (variants) {
      for (const v of variants) {
        variantMap.set(v.id, {
          quantity: v.quantity || 0,
          track_quantity: v.track_quantity ?? true,
          status: v.status,
          attributes: v.attributes as Record<string, string>
        })
      }
    }
  }

  // Create map for quick product lookup
  const productMap = new Map<string, { quantity: number; track_quantity: boolean; status: string; has_variants: boolean }>()
  if (products) {
    for (const p of products) {
      productMap.set(p.id, {
        quantity: p.quantity || 0,
        track_quantity: p.track_quantity ?? true,
        status: p.status,
        has_variants: p.has_variants ?? false
      })
    }
  }

  const inventoryItems = items.map(item => {
    const product = productMap.get(item.product_id)
    const variant = item.variant_id ? variantMap.get(item.variant_id) : undefined

    if (!product || (product.status !== 'active' && product.status !== 'published')) {
      return {
        product_id: item.product_id,
        variant_id: item.variant_id,
        available_quantity: 0,
        requested_quantity: item.quantity,
        in_stock: false
      }
    }

    // If product has variants but no variant specified
    if (product.has_variants && !item.variant_id) {
      return {
        product_id: item.product_id,
        available_quantity: 0,
        requested_quantity: item.quantity,
        in_stock: false // Variant required
      }
    }

    // If variant specified, check variant inventory
    if (variant) {
      if (variant.status !== 'active') {
        return {
          product_id: item.product_id,
          variant_id: item.variant_id,
          variant_attributes: variant.attributes,
          available_quantity: 0,
          requested_quantity: item.quantity,
          in_stock: false
        }
      }

      if (!variant.track_quantity) {
        return {
          product_id: item.product_id,
          variant_id: item.variant_id,
          variant_attributes: variant.attributes,
          available_quantity: 9999,
          requested_quantity: item.quantity,
          in_stock: true
        }
      }

      return {
        product_id: item.product_id,
        variant_id: item.variant_id,
        variant_attributes: variant.attributes,
        available_quantity: variant.quantity,
        requested_quantity: item.quantity,
        in_stock: variant.quantity >= item.quantity
      }
    }

    // Product without variants
    if (!product.track_quantity) {
      return {
        product_id: item.product_id,
        available_quantity: 9999,
        requested_quantity: item.quantity,
        in_stock: true
      }
    }

    return {
      product_id: item.product_id,
      available_quantity: product.quantity,
      requested_quantity: item.quantity,
      in_stock: product.quantity >= item.quantity
    }
  })

  const allAvailable = inventoryItems.every(item => item.in_stock)

  return {
    available: allAvailable,
    items: inventoryItems
  }
}

/**
 * Verify store exists and is active
 */
export async function verifyStore(storeId: string): Promise<{
  valid: boolean
  store?: { id: string; settings: Record<string, unknown> }
  error?: string
}> {
  const supabase = await createClient()

  const { data: store, error } = await supabase
    .from('stores')
    .select('id, status, settings')
    .eq('id', storeId)
    .single()

  if (error || !store) {
    return {
      valid: false,
      error: 'Store not found'
    }
  }

  if (store.status !== 'active') {
    return {
      valid: false,
      error: 'Store is not active'
    }
  }

  return {
    valid: true,
    store: {
      id: store.id,
      settings: store.settings || {}
    }
  }
}
