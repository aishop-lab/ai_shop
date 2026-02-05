import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazy initialization to avoid build-time errors
let supabase: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return supabase
}

interface OrderItem {
  product_id: string
  variant_id?: string    // Optional variant ID
  quantity: number
}

/**
 * Reduce inventory after successful payment (variant-aware)
 * Reduces variant quantity if variant_id is provided, otherwise reduces product quantity
 */
export async function reduceInventory(orderItems: OrderItem[]): Promise<void> {
  for (const item of orderItems) {
    // If variant_id is provided, reduce variant inventory
    if (item.variant_id) {
      const { data: variant } = await getSupabase()
        .from('product_variants')
        .select('quantity, track_quantity')
        .eq('id', item.variant_id)
        .single()

      if (!variant || !variant.track_quantity) continue

      const newQuantity = Math.max(0, variant.quantity - item.quantity)

      await getSupabase()
        .from('product_variants')
        .update({
          quantity: newQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.variant_id)
    } else {
      // Reduce product inventory
      const { data: product } = await getSupabase()
        .from('products')
        .select('quantity, track_quantity')
        .eq('id', item.product_id)
        .single()

      if (!product || !product.track_quantity) continue

      const newQuantity = Math.max(0, product.quantity - item.quantity)

      await getSupabase()
        .from('products')
        .update({
          quantity: newQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.product_id)
    }
  }
}

/**
 * Restore inventory after order cancellation or refund (variant-aware)
 */
export async function restoreInventory(orderItems: OrderItem[]): Promise<void> {
  for (const item of orderItems) {
    // If variant_id is provided, restore variant inventory
    if (item.variant_id) {
      const { data: variant } = await getSupabase()
        .from('product_variants')
        .select('quantity, track_quantity')
        .eq('id', item.variant_id)
        .single()

      if (!variant || !variant.track_quantity) continue

      const newQuantity = variant.quantity + item.quantity

      await getSupabase()
        .from('product_variants')
        .update({
          quantity: newQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.variant_id)
    } else {
      // Restore product inventory
      const { data: product } = await getSupabase()
        .from('products')
        .select('quantity, track_quantity')
        .eq('id', item.product_id)
        .single()

      if (!product || !product.track_quantity) continue

      const newQuantity = product.quantity + item.quantity

      await getSupabase()
        .from('products')
        .update({
          quantity: newQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.product_id)
    }
  }
}

/**
 * Check if all items are available in stock (variant-aware)
 * Returns list of items that are out of stock or have insufficient quantity
 */
export async function checkStockAvailability(
  orderItems: OrderItem[]
): Promise<{
  available: boolean
  unavailableItems: Array<{
    product_id: string
    variant_id?: string
    requested: number
    available: number
    title: string
  }>
}> {
  const unavailableItems: Array<{
    product_id: string
    variant_id?: string
    requested: number
    available: number
    title: string
  }> = []

  for (const item of orderItems) {
    // First get the product
    const { data: product } = await getSupabase()
      .from('products')
      .select('quantity, track_quantity, title, has_variants')
      .eq('id', item.product_id)
      .single()

    if (!product) {
      unavailableItems.push({
        product_id: item.product_id,
        variant_id: item.variant_id,
        requested: item.quantity,
        available: 0,
        title: 'Unknown product',
      })
      continue
    }

    // If variant_id is provided, check variant stock
    if (item.variant_id) {
      const { data: variant } = await getSupabase()
        .from('product_variants')
        .select('quantity, track_quantity, attributes, status')
        .eq('id', item.variant_id)
        .single()

      if (!variant) {
        unavailableItems.push({
          product_id: item.product_id,
          variant_id: item.variant_id,
          requested: item.quantity,
          available: 0,
          title: product.title,
        })
        continue
      }

      if (variant.status !== 'active') {
        unavailableItems.push({
          product_id: item.product_id,
          variant_id: item.variant_id,
          requested: item.quantity,
          available: 0,
          title: `${product.title} - ${formatVariantAttributes(variant.attributes)}`,
        })
        continue
      }

      if (variant.track_quantity && variant.quantity < item.quantity) {
        unavailableItems.push({
          product_id: item.product_id,
          variant_id: item.variant_id,
          requested: item.quantity,
          available: variant.quantity,
          title: `${product.title} - ${formatVariantAttributes(variant.attributes)}`,
        })
      }
    } else {
      // Product without variant - if product has variants, this is an error
      if (product.has_variants) {
        unavailableItems.push({
          product_id: item.product_id,
          requested: item.quantity,
          available: 0,
          title: `${product.title} (variant required)`,
        })
        continue
      }

      // Only check stock if product tracks quantity
      if (product.track_quantity && product.quantity < item.quantity) {
        unavailableItems.push({
          product_id: item.product_id,
          requested: item.quantity,
          available: product.quantity,
          title: product.title,
        })
      }
    }
  }

  return {
    available: unavailableItems.length === 0,
    unavailableItems,
  }
}

/**
 * Format variant attributes for display
 */
function formatVariantAttributes(attributes: Record<string, string>): string {
  return Object.values(attributes).join(' / ')
}

/**
 * Reserve inventory for pending orders (variant-aware)
 * Creates temporary reservations that expire after a set time
 * Prevents overselling during checkout process
 */
export async function reserveInventory(
  orderItems: OrderItem[],
  orderId: string,
  reservationMinutes: number = 15
): Promise<{
  success: boolean
  error?: string
}> {
  // First check if all items are available
  const { available, unavailableItems } = await checkStockAvailability(orderItems)

  if (!available) {
    const itemNames = unavailableItems.map((i) => i.title).join(', ')
    return {
      success: false,
      error: `Insufficient stock for: ${itemNames}`,
    }
  }

  // Create inventory reservations
  const expiresAt = new Date(
    Date.now() + reservationMinutes * 60 * 1000
  ).toISOString()

  const reservations = orderItems.map((item) => ({
    order_id: orderId,
    product_id: item.product_id,
    variant_id: item.variant_id || null,
    quantity: item.quantity,
    expires_at: expiresAt,
  }))

  const { error } = await getSupabase()
    .from('inventory_reservations')
    .insert(reservations)

  if (error) {
    console.error('Failed to create inventory reservations:', error)
    return {
      success: false,
      error: 'Failed to reserve inventory',
    }
  }

  return { success: true }
}

/**
 * Release inventory reservations
 * Called when order is completed or cancelled
 */
export async function releaseReservation(orderId: string): Promise<void> {
  await getSupabase()
    .from('inventory_reservations')
    .delete()
    .eq('order_id', orderId)
}

/**
 * Clean up expired reservations
 * Should be run periodically (e.g., via cron job)
 */
export async function cleanupExpiredReservations(): Promise<number> {
  const { data, error } = await getSupabase()
    .from('inventory_reservations')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select('id')

  if (error) {
    console.error('Failed to cleanup expired reservations:', error)
    return 0
  }

  return data?.length || 0
}

/**
 * Get effective available quantity for a product or variant (variant-aware)
 * Takes into account active reservations
 */
export async function getEffectiveAvailability(
  productId: string,
  variantId?: string
): Promise<number> {
  // If variant specified, check variant availability
  if (variantId) {
    const { data: variant } = await getSupabase()
      .from('product_variants')
      .select('quantity, track_quantity')
      .eq('id', variantId)
      .single()

    if (!variant || !variant.track_quantity) {
      return Infinity // Unlimited if not tracking
    }

    // Get active reservations for this variant
    const { data: reservations } = await getSupabase()
      .from('inventory_reservations')
      .select('quantity')
      .eq('variant_id', variantId)
      .gt('expires_at', new Date().toISOString())

    const reservedQuantity =
      reservations?.reduce((sum, r) => sum + r.quantity, 0) || 0

    return Math.max(0, variant.quantity - reservedQuantity)
  }

  // Product availability
  const { data: product } = await getSupabase()
    .from('products')
    .select('quantity, track_quantity, has_variants')
    .eq('id', productId)
    .single()

  if (!product || !product.track_quantity) {
    return Infinity // Unlimited if not tracking
  }

  // If product has variants, availability is per-variant
  if (product.has_variants) {
    return 0 // Must specify variant
  }

  // Get active reservations for this product (no variant)
  const { data: reservations } = await getSupabase()
    .from('inventory_reservations')
    .select('quantity')
    .eq('product_id', productId)
    .is('variant_id', null)
    .gt('expires_at', new Date().toISOString())

  const reservedQuantity =
    reservations?.reduce((sum, r) => sum + r.quantity, 0) || 0

  return Math.max(0, product.quantity - reservedQuantity)
}
