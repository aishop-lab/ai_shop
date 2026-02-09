// Tool Executor for AI Bot
// Executes tools by calling the appropriate dashboard APIs

import { getSupabaseAdmin } from '@/lib/supabase/admin'

interface ToolContext {
  storeId: string
}

interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
  message?: string
}

// =============================================================================
// READ TOOL EXECUTORS
// =============================================================================

export async function executeGetProducts(
  args: {
    status?: string
    category?: string
    featured?: boolean
    lowStock?: boolean
    search?: string
    limit?: number
  },
  ctx: ToolContext
): Promise<ToolResult> {
  try {
    const supabase = getSupabaseAdmin()
    let query = supabase
      .from('products')
      .select('id, title, price, status, quantity, track_quantity, category, featured, sku', { count: 'exact' })
      .eq('store_id', ctx.storeId)

    if (args.status && args.status !== 'all') {
      query = query.eq('status', args.status)
    } else {
      query = query.neq('status', 'archived')
    }

    if (args.category) {
      query = query.eq('category', args.category)
    }

    if (args.featured !== undefined) {
      query = query.eq('featured', args.featured)
    }

    if (args.lowStock) {
      query = query.eq('track_quantity', true).lte('quantity', 5)
    }

    if (args.search) {
      query = query.or(`title.ilike.%${args.search}%,sku.ilike.%${args.search}%`)
    }

    const limit = args.limit || 20
    query = query.limit(limit).order('created_at', { ascending: false })

    const { data, count, error } = await query

    if (error) throw error

    return {
      success: true,
      data: { products: data, total: count },
      message: `Found ${count} products`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch products',
    }
  }
}

export async function executeGetProduct(
  args: { productId?: string; sku?: string },
  ctx: ToolContext
): Promise<ToolResult> {
  try {
    const supabase = getSupabaseAdmin()
    let query = supabase
      .from('products')
      .select('*, product_images(*)')
      .eq('store_id', ctx.storeId)

    if (args.productId) {
      query = query.eq('id', args.productId)
    } else if (args.sku) {
      query = query.eq('sku', args.sku)
    } else {
      return { success: false, error: 'Product ID or SKU required' }
    }

    const { data, error } = await query.single()

    if (error) throw error

    return {
      success: true,
      data: data,
      message: `Found product: ${data.title}`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch product',
    }
  }
}

export async function executeGetOrders(
  args: { status?: string; dateRange?: string; limit?: number },
  ctx: ToolContext
): Promise<ToolResult> {
  try {
    const supabase = getSupabaseAdmin()
    let query = supabase
      .from('orders')
      .select('id, order_number, status, total, customer_name, customer_email, created_at', { count: 'exact' })
      .eq('store_id', ctx.storeId)

    if (args.status && args.status !== 'all') {
      query = query.eq('status', args.status)
    }

    // Date range filtering
    if (args.dateRange) {
      const now = new Date()
      let startDate: Date

      switch (args.dateRange) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0))
          break
        case 'yesterday':
          startDate = new Date(now.setDate(now.getDate() - 1))
          startDate.setHours(0, 0, 0, 0)
          break
        case 'this_week':
          startDate = new Date(now.setDate(now.getDate() - 7))
          break
        case 'this_month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case 'last_30_days':
          startDate = new Date(now.setDate(now.getDate() - 30))
          break
        default:
          startDate = new Date(0)
      }

      query = query.gte('created_at', startDate.toISOString())
    }

    const limit = args.limit || 20
    query = query.limit(limit).order('created_at', { ascending: false })

    const { data, count, error } = await query

    if (error) throw error

    return {
      success: true,
      data: { orders: data, total: count },
      message: `Found ${count} orders`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch orders',
    }
  }
}

export async function executeGetOrder(
  args: { orderId?: string; orderNumber?: string },
  ctx: ToolContext
): Promise<ToolResult> {
  try {
    const supabase = getSupabaseAdmin()
    let query = supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('store_id', ctx.storeId)

    if (args.orderId) {
      query = query.eq('id', args.orderId)
    } else if (args.orderNumber) {
      query = query.eq('order_number', args.orderNumber)
    } else {
      return { success: false, error: 'Order ID or order number required' }
    }

    const { data, error } = await query.single()

    if (error) throw error

    return {
      success: true,
      data: data,
      message: `Found order #${data.order_number}`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch order',
    }
  }
}

export async function executeGetAnalytics(
  args: { metric?: string; period?: string },
  ctx: ToolContext
): Promise<ToolResult> {
  try {
    const supabase = getSupabaseAdmin()

    // Get basic stats
    const { count: productCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', ctx.storeId)
      .neq('status', 'archived')

    const { count: orderCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', ctx.storeId)

    const { data: revenueData } = await supabase
      .from('orders')
      .select('total')
      .eq('store_id', ctx.storeId)
      .in('status', ['confirmed', 'shipped', 'delivered'])

    const totalRevenue = revenueData?.reduce((sum, o) => sum + (o.total || 0), 0) || 0

    const { count: lowStockCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', ctx.storeId)
      .eq('track_quantity', true)
      .lte('quantity', 5)
      .neq('status', 'archived')

    return {
      success: true,
      data: {
        products: productCount || 0,
        orders: orderCount || 0,
        revenue: totalRevenue,
        lowStock: lowStockCount || 0,
      },
      message: `Store has ${productCount} products, ${orderCount} orders, ₹${totalRevenue.toLocaleString('en-IN')} revenue`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch analytics',
    }
  }
}

export async function executeGetSettings(
  args: { section?: string },
  ctx: ToolContext
): Promise<ToolResult> {
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('stores')
      .select('name, slug, status, logo_url, blueprint, settings')
      .eq('id', ctx.storeId)
      .single()

    if (error) throw error

    return {
      success: true,
      data: data,
      message: `Store settings for ${data.name}`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch settings',
    }
  }
}

export async function executeGetCoupons(
  args: { status?: string; limit?: number },
  ctx: ToolContext
): Promise<ToolResult> {
  try {
    const supabase = getSupabaseAdmin()
    let query = supabase
      .from('coupons')
      .select('*', { count: 'exact' })
      .eq('store_id', ctx.storeId)

    if (args.status === 'active') {
      query = query.eq('is_active', true).or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    } else if (args.status === 'expired') {
      query = query.lt('expires_at', new Date().toISOString())
    }

    const limit = args.limit || 20
    query = query.limit(limit).order('created_at', { ascending: false })

    const { data, count, error } = await query

    if (error) throw error

    return {
      success: true,
      data: { coupons: data, total: count },
      message: `Found ${count} coupons`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch coupons',
    }
  }
}

export async function executeGetCollections(
  args: { limit?: number },
  ctx: ToolContext
): Promise<ToolResult> {
  try {
    const supabase = getSupabaseAdmin()
    const limit = args.limit || 20

    const { data, count, error } = await supabase
      .from('collections')
      .select('*', { count: 'exact' })
      .eq('store_id', ctx.storeId)
      .limit(limit)
      .order('created_at', { ascending: false })

    if (error) throw error

    return {
      success: true,
      data: { collections: data, total: count },
      message: `Found ${count} collections`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch collections',
    }
  }
}

export async function executeGetReviews(
  args: { productId?: string; rating?: number; status?: string; limit?: number },
  ctx: ToolContext
): Promise<ToolResult> {
  try {
    const supabase = getSupabaseAdmin()

    // First get all product IDs for this store
    const { data: storeProducts } = await supabase
      .from('products')
      .select('id')
      .eq('store_id', ctx.storeId)

    if (!storeProducts || storeProducts.length === 0) {
      return {
        success: true,
        data: { reviews: [], total: 0 },
        message: 'No products found',
      }
    }

    const productIds = storeProducts.map((p) => p.id)

    let query = supabase
      .from('product_reviews')
      .select('*', { count: 'exact' })
      .in('product_id', productIds)

    if (args.productId) {
      query = query.eq('product_id', args.productId)
    }

    if (args.rating) {
      query = query.eq('rating', args.rating)
    }

    if (args.status && args.status !== 'all') {
      query = query.eq('status', args.status)
    }

    const limit = args.limit || 20
    query = query.limit(limit).order('created_at', { ascending: false })

    const { data, count, error } = await query

    if (error) throw error

    return {
      success: true,
      data: { reviews: data, total: count },
      message: `Found ${count} reviews`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch reviews',
    }
  }
}

// =============================================================================
// WRITE TOOL EXECUTORS
// =============================================================================

export async function executeCreateProduct(
  args: {
    title: string
    description?: string
    price: number
    compareAtPrice?: number
    category?: string
    sku?: string
    quantity?: number
    trackQuantity?: boolean
    status?: string
    featured?: boolean
    tags?: string[]
  },
  ctx: ToolContext
): Promise<ToolResult> {
  try {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('products')
      .insert({
        store_id: ctx.storeId,
        title: args.title,
        description: args.description || '',
        price: args.price,
        compare_at_price: args.compareAtPrice,
        category: args.category || 'General',
        sku: args.sku,
        quantity: args.quantity || 0,
        track_quantity: args.trackQuantity ?? false,
        status: args.status || 'draft',
        featured: args.featured ?? false,
        tags: args.tags || [],
      })
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      data: data,
      message: `Created product "${args.title}" with price ₹${args.price}`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create product',
    }
  }
}

export async function executeUpdateProduct(
  args: {
    productId: string
    title?: string
    description?: string
    price?: number
    compareAtPrice?: number
    category?: string
    quantity?: number
    status?: string
    featured?: boolean
    tags?: string[]
  },
  ctx: ToolContext
): Promise<ToolResult> {
  try {
    const supabase = getSupabaseAdmin()

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {}
    if (args.title !== undefined) updates.title = args.title
    if (args.description !== undefined) updates.description = args.description
    if (args.price !== undefined) updates.price = args.price
    if (args.compareAtPrice !== undefined) updates.compare_at_price = args.compareAtPrice
    if (args.category !== undefined) updates.category = args.category
    if (args.quantity !== undefined) updates.quantity = args.quantity
    if (args.status !== undefined) updates.status = args.status
    if (args.featured !== undefined) updates.featured = args.featured
    if (args.tags !== undefined) updates.tags = args.tags

    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', args.productId)
      .eq('store_id', ctx.storeId)
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      data: data,
      message: `Updated product "${data.title}"`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update product',
    }
  }
}

export async function executeCreateCoupon(
  args: {
    code: string
    discountType: 'percentage' | 'fixed'
    discountValue: number
    minOrderValue?: number
    maxUses?: number
    expiresAt?: string
    description?: string
  },
  ctx: ToolContext
): Promise<ToolResult> {
  try {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('coupons')
      .insert({
        store_id: ctx.storeId,
        code: args.code.toUpperCase().replace(/\s/g, ''),
        discount_type: args.discountType,
        discount_value: args.discountValue,
        min_order_value: args.minOrderValue || 0,
        max_uses: args.maxUses,
        expires_at: args.expiresAt,
        description: args.description,
        is_active: true,
        used_count: 0,
      })
      .select()
      .single()

    if (error) throw error

    const discountText =
      args.discountType === 'percentage'
        ? `${args.discountValue}% off`
        : `₹${args.discountValue} off`

    return {
      success: true,
      data: data,
      message: `Created coupon "${args.code}" - ${discountText}`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create coupon',
    }
  }
}

export async function executeUpdateCoupon(
  args: {
    couponId: string
    code?: string
    discountType?: 'percentage' | 'fixed'
    discountValue?: number
    minOrderValue?: number
    maxUses?: number
    expiresAt?: string
    isActive?: boolean
  },
  ctx: ToolContext
): Promise<ToolResult> {
  try {
    const supabase = getSupabaseAdmin()

    const updates: Record<string, unknown> = {}
    if (args.code !== undefined) updates.code = args.code.toUpperCase().replace(/\s/g, '')
    if (args.discountType !== undefined) updates.discount_type = args.discountType
    if (args.discountValue !== undefined) updates.discount_value = args.discountValue
    if (args.minOrderValue !== undefined) updates.min_order_value = args.minOrderValue
    if (args.maxUses !== undefined) updates.max_uses = args.maxUses
    if (args.expiresAt !== undefined) updates.expires_at = args.expiresAt
    if (args.isActive !== undefined) updates.is_active = args.isActive

    const { data, error } = await supabase
      .from('coupons')
      .update(updates)
      .eq('id', args.couponId)
      .eq('store_id', ctx.storeId)
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      data: data,
      message: `Updated coupon "${data.code}"`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update coupon',
    }
  }
}

export async function executeCreateCollection(
  args: {
    name: string
    description?: string
    productIds?: string[]
    tags?: string[]
  },
  ctx: ToolContext
): Promise<ToolResult> {
  try {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('collections')
      .insert({
        store_id: ctx.storeId,
        name: args.name,
        description: args.description,
        slug: args.name.toLowerCase().replace(/\s+/g, '-'),
        tags: args.tags,
      })
      .select()
      .single()

    if (error) throw error

    // Add products to collection if provided
    if (args.productIds && args.productIds.length > 0) {
      const collectionProducts = args.productIds.map((productId) => ({
        collection_id: data.id,
        product_id: productId,
      }))

      await supabase.from('collection_products').insert(collectionProducts)
    }

    return {
      success: true,
      data: data,
      message: `Created collection "${args.name}"${args.productIds ? ` with ${args.productIds.length} products` : ''}`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create collection',
    }
  }
}

export async function executeUpdateCollection(
  args: {
    collectionId: string
    name?: string
    description?: string
    addProductIds?: string[]
    removeProductIds?: string[]
  },
  ctx: ToolContext
): Promise<ToolResult> {
  try {
    const supabase = getSupabaseAdmin()

    // Update collection details
    if (args.name || args.description) {
      const updates: Record<string, unknown> = {}
      if (args.name) {
        updates.name = args.name
        updates.slug = args.name.toLowerCase().replace(/\s+/g, '-')
      }
      if (args.description) updates.description = args.description

      const { error } = await supabase
        .from('collections')
        .update(updates)
        .eq('id', args.collectionId)
        .eq('store_id', ctx.storeId)

      if (error) throw error
    }

    // Add products
    if (args.addProductIds && args.addProductIds.length > 0) {
      const newProducts = args.addProductIds.map((productId) => ({
        collection_id: args.collectionId,
        product_id: productId,
      }))

      await supabase.from('collection_products').upsert(newProducts, {
        onConflict: 'collection_id,product_id',
      })
    }

    // Remove products
    if (args.removeProductIds && args.removeProductIds.length > 0) {
      await supabase
        .from('collection_products')
        .delete()
        .eq('collection_id', args.collectionId)
        .in('product_id', args.removeProductIds)
    }

    return {
      success: true,
      message: `Updated collection`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update collection',
    }
  }
}

export async function executeUpdateSettings(
  args: {
    storeName?: string
    tagline?: string
    description?: string
    email?: string
    phone?: string
    address?: string
    currency?: string
  },
  ctx: ToolContext
): Promise<ToolResult> {
  try {
    const supabase = getSupabaseAdmin()

    // Get current store data
    const { data: store, error: fetchError } = await supabase
      .from('stores')
      .select('blueprint')
      .eq('id', ctx.storeId)
      .single()

    if (fetchError) throw fetchError

    const blueprint = store.blueprint || {}

    // Update blueprint with new values
    if (args.tagline) blueprint.tagline = args.tagline
    if (args.description) blueprint.brand_description = args.description
    if (args.email || args.phone) {
      blueprint.contact = blueprint.contact || {}
      if (args.email) blueprint.contact.email = args.email
      if (args.phone) blueprint.contact.phone = args.phone
    }
    if (args.address) {
      blueprint.location = blueprint.location || {}
      blueprint.location.address = args.address
    }
    if (args.currency) {
      blueprint.location = blueprint.location || {}
      blueprint.location.currency = args.currency
    }

    const updates: Record<string, unknown> = { blueprint }
    if (args.storeName) updates.name = args.storeName

    const { error } = await supabase.from('stores').update(updates).eq('id', ctx.storeId)

    if (error) throw error

    return {
      success: true,
      message: `Updated store settings`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update settings',
    }
  }
}

export async function executeUpdateBranding(
  args: {
    primaryColor?: string
    secondaryColor?: string
    logoUrl?: string
  },
  ctx: ToolContext
): Promise<ToolResult> {
  try {
    const supabase = getSupabaseAdmin()

    // Get current store data
    const { data: store, error: fetchError } = await supabase
      .from('stores')
      .select('blueprint, logo_url')
      .eq('id', ctx.storeId)
      .single()

    if (fetchError) throw fetchError

    const blueprint = store.blueprint || {}

    // Update colors in blueprint
    if (args.primaryColor) {
      blueprint.brand_colors = blueprint.brand_colors || {}
      blueprint.brand_colors.primary = args.primaryColor
    }
    if (args.secondaryColor) {
      blueprint.brand_colors = blueprint.brand_colors || {}
      blueprint.brand_colors.secondary = args.secondaryColor
    }

    const updates: Record<string, unknown> = { blueprint }
    if (args.logoUrl) updates.logo_url = args.logoUrl

    const { error } = await supabase.from('stores').update(updates).eq('id', ctx.storeId)

    if (error) throw error

    return {
      success: true,
      message: `Updated branding${args.primaryColor ? ` - primary color: ${args.primaryColor}` : ''}`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update branding',
    }
  }
}

export async function executeUpdateOrderStatus(
  args: {
    orderId: string
    status: string
    trackingNumber?: string
    trackingUrl?: string
    notes?: string
  },
  ctx: ToolContext
): Promise<ToolResult> {
  try {
    const supabase = getSupabaseAdmin()

    const updates: Record<string, unknown> = {
      status: args.status,
    }

    if (args.trackingNumber) updates.tracking_number = args.trackingNumber
    if (args.trackingUrl) updates.tracking_url = args.trackingUrl
    if (args.notes) updates.notes = args.notes

    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', args.orderId)
      .eq('store_id', ctx.storeId)
      .select('order_number')
      .single()

    if (error) throw error

    return {
      success: true,
      data: data,
      message: `Order #${data.order_number} status changed to ${args.status}`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update order status',
    }
  }
}

export async function executeAddTrackingNumber(
  args: {
    orderId: string
    trackingNumber: string
    courier?: string
    trackingUrl?: string
  },
  ctx: ToolContext
): Promise<ToolResult> {
  try {
    const supabase = getSupabaseAdmin()

    const updates: Record<string, unknown> = {
      tracking_number: args.trackingNumber,
    }
    if (args.courier) updates.courier = args.courier
    if (args.trackingUrl) updates.tracking_url = args.trackingUrl

    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', args.orderId)
      .eq('store_id', ctx.storeId)
      .select('order_number')
      .single()

    if (error) throw error

    return {
      success: true,
      message: `Added tracking ${args.trackingNumber} to order #${data.order_number}`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add tracking number',
    }
  }
}

// =============================================================================
// DESTRUCTIVE TOOL EXECUTORS
// =============================================================================

export async function executeDeleteProduct(
  args: { productId: string; productTitle?: string },
  ctx: ToolContext
): Promise<ToolResult> {
  try {
    const supabase = getSupabaseAdmin()

    // Delete product images first
    await supabase.from('product_images').delete().eq('product_id', args.productId)

    // Delete the product
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', args.productId)
      .eq('store_id', ctx.storeId)

    if (error) throw error

    return {
      success: true,
      message: `Deleted product${args.productTitle ? ` "${args.productTitle}"` : ''}`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete product',
    }
  }
}

export async function executeDeleteCoupon(
  args: { couponId: string; couponCode?: string },
  ctx: ToolContext
): Promise<ToolResult> {
  try {
    const supabase = getSupabaseAdmin()

    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('id', args.couponId)
      .eq('store_id', ctx.storeId)

    if (error) throw error

    return {
      success: true,
      message: `Deleted coupon${args.couponCode ? ` "${args.couponCode}"` : ''}`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete coupon',
    }
  }
}

export async function executeDeleteCollection(
  args: { collectionId: string; collectionName?: string },
  ctx: ToolContext
): Promise<ToolResult> {
  try {
    const supabase = getSupabaseAdmin()

    // Delete collection products first
    await supabase.from('collection_products').delete().eq('collection_id', args.collectionId)

    // Delete the collection
    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('id', args.collectionId)
      .eq('store_id', ctx.storeId)

    if (error) throw error

    return {
      success: true,
      message: `Deleted collection${args.collectionName ? ` "${args.collectionName}"` : ''}`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete collection',
    }
  }
}

export async function executeDeleteReview(
  args: { reviewId: string },
  ctx: ToolContext
): Promise<ToolResult> {
  try {
    const supabase = getSupabaseAdmin()

    // Verify the review belongs to a product in this store
    const { data: review } = await supabase
      .from('product_reviews')
      .select('product_id, products!inner(store_id)')
      .eq('id', args.reviewId)
      .single()

    if (!review) {
      return { success: false, error: 'Review not found or unauthorized' }
    }

    // Type guard for the joined product data
    const products = review.products as unknown as { store_id: string } | { store_id: string }[]
    const storeId = Array.isArray(products) ? products[0]?.store_id : products?.store_id
    if (storeId !== ctx.storeId) {
      return { success: false, error: 'Review not found or unauthorized' }
    }

    const { error } = await supabase.from('product_reviews').delete().eq('id', args.reviewId)

    if (error) throw error

    return {
      success: true,
      message: 'Deleted review',
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete review',
    }
  }
}

export async function executeProcessRefund(
  args: { orderId: string; amount?: number; reason?: string },
  ctx: ToolContext
): Promise<ToolResult> {
  try {
    const supabase = getSupabaseAdmin()

    // Get order details
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('order_number, total, status')
      .eq('id', args.orderId)
      .eq('store_id', ctx.storeId)
      .single()

    if (fetchError) throw fetchError

    const refundAmount = args.amount || order.total

    // Update order status
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'refunded',
        refund_amount: refundAmount,
        refund_reason: args.reason,
        refunded_at: new Date().toISOString(),
      })
      .eq('id', args.orderId)

    if (error) throw error

    return {
      success: true,
      message: `Processed ₹${refundAmount.toLocaleString('en-IN')} refund for order #${order.order_number}`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process refund',
    }
  }
}

export async function executeBulkDeleteProducts(
  args: { productIds: string[] },
  ctx: ToolContext
): Promise<ToolResult> {
  try {
    const supabase = getSupabaseAdmin()

    // Delete product images first
    await supabase.from('product_images').delete().in('product_id', args.productIds)

    // Delete products
    const { error } = await supabase
      .from('products')
      .delete()
      .in('id', args.productIds)
      .eq('store_id', ctx.storeId)

    if (error) throw error

    return {
      success: true,
      message: `Deleted ${args.productIds.length} products`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete products',
    }
  }
}

// =============================================================================
// MAIN EXECUTOR
// =============================================================================

export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<ToolResult> {
  const executors: Record<string, (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>> = {
    // Read tools
    getProducts: executeGetProducts as (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>,
    getProduct: executeGetProduct as (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>,
    getOrders: executeGetOrders as (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>,
    getOrder: executeGetOrder as (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>,
    getAnalytics: executeGetAnalytics as (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>,
    getSettings: executeGetSettings as (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>,
    getCoupons: executeGetCoupons as (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>,
    getCollections: executeGetCollections as (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>,
    getReviews: executeGetReviews as (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>,

    // Write tools
    createProduct: executeCreateProduct as (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>,
    updateProduct: executeUpdateProduct as (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>,
    createCoupon: executeCreateCoupon as (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>,
    updateCoupon: executeUpdateCoupon as (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>,
    createCollection: executeCreateCollection as (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>,
    updateCollection: executeUpdateCollection as (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>,
    updateSettings: executeUpdateSettings as (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>,
    updateBranding: executeUpdateBranding as (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>,
    updateOrderStatus: executeUpdateOrderStatus as (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>,
    addTrackingNumber: executeAddTrackingNumber as (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>,

    // Destructive tools
    deleteProduct: executeDeleteProduct as (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>,
    deleteCoupon: executeDeleteCoupon as (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>,
    deleteCollection: executeDeleteCollection as (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>,
    deleteReview: executeDeleteReview as (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>,
    processRefund: executeProcessRefund as (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>,
    bulkDeleteProducts: executeBulkDeleteProducts as (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>,
  }

  const executor = executors[toolName]

  if (!executor) {
    return {
      success: false,
      error: `Unknown tool: ${toolName}`,
    }
  }

  return executor(args, ctx)
}
