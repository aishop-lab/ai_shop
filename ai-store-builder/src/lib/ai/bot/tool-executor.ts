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
// BUSINESS INTELLIGENCE TOOL EXECUTORS
// =============================================================================

function getPeriodDates(period?: string): { start: Date; end: Date; prevStart: Date; days: number } {
  const end = new Date()
  let days: number

  switch (period) {
    case 'last_7_days':
      days = 7
      break
    case 'last_90_days':
      days = 90
      break
    case 'last_30_days':
    default:
      days = 30
      break
  }

  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const prevStart = new Date(Date.now() - days * 2 * 24 * 60 * 60 * 1000)

  return { start, end, prevStart, days }
}

export async function executeGetBusinessIntelligence(
  args: { period?: string },
  ctx: ToolContext
): Promise<ToolResult> {
  try {
    const supabase = getSupabaseAdmin()
    const { start, prevStart, days } = getPeriodDates(args.period)

    // Parallel queries
    const [
      currentOrdersResult,
      prevOrdersResult,
      productsResult,
      customersResult,
    ] = await Promise.all([
      // Current period orders
      supabase
        .from('orders')
        .select('id, total_amount, payment_status, order_status, created_at, customer_id, shipped_at')
        .eq('store_id', ctx.storeId)
        .gte('created_at', start.toISOString()),
      // Previous period orders
      supabase
        .from('orders')
        .select('id, total_amount, payment_status')
        .eq('store_id', ctx.storeId)
        .gte('created_at', prevStart.toISOString())
        .lt('created_at', start.toISOString()),
      // Products
      supabase
        .from('products')
        .select('id, title, quantity, track_quantity, status')
        .eq('store_id', ctx.storeId)
        .neq('status', 'archived'),
      // Customers
      supabase
        .from('customers')
        .select('id, created_at')
        .eq('store_id', ctx.storeId),
    ])

    const currentOrders = currentOrdersResult.data || []
    const prevOrders = prevOrdersResult.data || []
    const products = productsResult.data || []
    const customers = customersResult.data || []

    // Revenue calculations
    const paidStatuses = ['paid']
    const currentPaid = currentOrders.filter((o) => paidStatuses.includes(o.payment_status))
    const prevPaid = prevOrders.filter((o) => paidStatuses.includes(o.payment_status))

    const currentRevenue = currentPaid.reduce((sum, o) => sum + (o.total_amount || 0), 0)
    const prevRevenue = prevPaid.reduce((sum, o) => sum + (o.total_amount || 0), 0)
    const revenueGrowth = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0

    const orderCount = currentOrders.length
    const prevOrderCount = prevOrders.length
    const orderGrowth = prevOrderCount > 0 ? ((orderCount - prevOrderCount) / prevOrderCount) * 100 : 0

    const aov = currentPaid.length > 0 ? currentRevenue / currentPaid.length : 0

    // Top products by revenue - need order_items
    const currentOrderIds = currentPaid.map((o) => o.id)
    let topProducts: Array<{ title: string; revenue: number; units: number }> = []

    if (currentOrderIds.length > 0) {
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id, product_title, quantity, total_price')
        .in('order_id', currentOrderIds.slice(0, 500))

      if (orderItems && orderItems.length > 0) {
        const productMap = new Map<string, { title: string; revenue: number; units: number }>()
        for (const item of orderItems) {
          const existing = productMap.get(item.product_id) || { title: item.product_title, revenue: 0, units: 0 }
          existing.revenue += item.total_price || 0
          existing.units += item.quantity || 0
          productMap.set(item.product_id, existing)
        }
        topProducts = Array.from(productMap.values())
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5)
      }
    }

    // New vs repeat customers
    const newCustomers = customers.filter((c) => new Date(c.created_at) >= start).length
    const customerIdsWithOrders = new Set(currentOrders.filter((o) => o.customer_id).map((o) => o.customer_id))
    const repeatCustomers = currentOrders.filter((o) => {
      if (!o.customer_id) return false
      return customers.some((c) => c.id === o.customer_id && new Date(c.created_at) < start)
    })
    const repeatCustomerCount = new Set(repeatCustomers.map((o) => o.customer_id)).size

    // Avg shipping time (for shipped orders)
    const shippedOrders = currentOrders.filter((o) => o.shipped_at && o.created_at)
    let avgShippingHours = 0
    if (shippedOrders.length > 0) {
      const totalHours = shippedOrders.reduce((sum, o) => {
        const diff = new Date(o.shipped_at!).getTime() - new Date(o.created_at).getTime()
        return sum + diff / (1000 * 60 * 60)
      }, 0)
      avgShippingHours = totalHours / shippedOrders.length
    }

    // Daily revenue trend (last 7 days)
    const dailyRevenue: Array<{ date: string; revenue: number; orders: number }> = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      const dayOrders = currentPaid.filter((o) => o.created_at.startsWith(dateStr))
      dailyRevenue.push({
        date: dateStr,
        revenue: dayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
        orders: dayOrders.length,
      })
    }

    // Pending orders needing attention
    const pendingOrders = currentOrders.filter(
      (o) => o.order_status === 'pending' || o.order_status === 'confirmed'
    ).length

    // Low stock
    const lowStock = products.filter(
      (p) => p.track_quantity && p.quantity !== null && p.quantity <= 5 && p.status === 'published'
    ).length
    const outOfStock = products.filter(
      (p) => p.track_quantity && p.quantity !== null && p.quantity === 0 && p.status === 'published'
    ).length

    return {
      success: true,
      data: {
        period: `Last ${days} days`,
        revenue: {
          current: currentRevenue,
          previous: prevRevenue,
          growthPercent: Math.round(revenueGrowth * 10) / 10,
        },
        orders: {
          current: orderCount,
          previous: prevOrderCount,
          growthPercent: Math.round(orderGrowth * 10) / 10,
          pending: pendingOrders,
        },
        aov: Math.round(aov),
        topProducts,
        customers: {
          total: customers.length,
          newInPeriod: newCustomers,
          repeatInPeriod: repeatCustomerCount,
          activeInPeriod: customerIdsWithOrders.size,
        },
        fulfillment: {
          avgShippingHours: Math.round(avgShippingHours),
          shippedCount: shippedOrders.length,
        },
        inventory: {
          totalProducts: products.length,
          lowStock,
          outOfStock,
        },
        dailyRevenueTrend: dailyRevenue,
      },
      message: `Business overview for last ${days} days: ₹${currentRevenue.toLocaleString('en-IN')} revenue (${revenueGrowth >= 0 ? '+' : ''}${Math.round(revenueGrowth)}%), ${orderCount} orders, AOV ₹${Math.round(aov).toLocaleString('en-IN')}`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch business intelligence',
    }
  }
}

export async function executeGetRevenueAnalytics(
  args: { period?: string; compareWithPrevious?: boolean },
  ctx: ToolContext
): Promise<ToolResult> {
  try {
    const supabase = getSupabaseAdmin()
    const { start, prevStart, days } = getPeriodDates(args.period)
    const compare = args.compareWithPrevious !== false

    // Get orders with financial data
    const [currentResult, prevResult] = await Promise.all([
      supabase
        .from('orders')
        .select('id, total_amount, subtotal, shipping_amount, discount_amount, payment_method, payment_status, created_at, coupon_code')
        .eq('store_id', ctx.storeId)
        .gte('created_at', start.toISOString()),
      compare
        ? supabase
            .from('orders')
            .select('id, total_amount, payment_status')
            .eq('store_id', ctx.storeId)
            .gte('created_at', prevStart.toISOString())
            .lt('created_at', start.toISOString())
        : Promise.resolve({ data: [] }),
    ])

    const currentOrders = currentResult.data || []
    const prevOrders = (prevResult as { data: Array<{ id: string; total_amount: number; payment_status: string }> | null }).data || []

    const paidOrders = currentOrders.filter((o) => o.payment_status === 'paid')
    const prevPaid = prevOrders.filter((o) => o.payment_status === 'paid')

    const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
    const prevRevenue = prevPaid.reduce((sum, o) => sum + (o.total_amount || 0), 0)

    // Revenue by payment method
    const byMethod: Record<string, { revenue: number; orders: number }> = {}
    for (const order of paidOrders) {
      const method = order.payment_method || 'unknown'
      if (!byMethod[method]) byMethod[method] = { revenue: 0, orders: 0 }
      byMethod[method].revenue += order.total_amount || 0
      byMethod[method].orders++
    }

    // Revenue by product category
    const paidOrderIds = paidOrders.map((o) => o.id)
    const byCategory: Record<string, { revenue: number; units: number }> = {}

    if (paidOrderIds.length > 0) {
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id, quantity, total_price')
        .in('order_id', paidOrderIds.slice(0, 500))

      if (orderItems && orderItems.length > 0) {
        // Get product categories
        const productIds = [...new Set(orderItems.map((i) => i.product_id))]
        const { data: productData } = await supabase
          .from('products')
          .select('id, category')
          .in('id', productIds.slice(0, 200))

        const categoryMap = new Map<string, string>()
        for (const p of productData || []) {
          categoryMap.set(p.id, p.category || 'Uncategorized')
        }

        for (const item of orderItems) {
          const cat = categoryMap.get(item.product_id) || 'Uncategorized'
          if (!byCategory[cat]) byCategory[cat] = { revenue: 0, units: 0 }
          byCategory[cat].revenue += item.total_price || 0
          byCategory[cat].units += item.quantity || 0
        }
      }
    }

    // Discount impact
    const totalDiscounts = paidOrders.reduce((sum, o) => sum + (o.discount_amount || 0), 0)
    const ordersWithDiscount = paidOrders.filter((o) => (o.discount_amount || 0) > 0).length
    const ordersWithCoupon = paidOrders.filter((o) => o.coupon_code).length

    // Shipping revenue
    const shippingRevenue = paidOrders.reduce((sum, o) => sum + (o.shipping_amount || 0), 0)

    // Weekly revenue breakdown
    const weeklyRevenue: Array<{ week: string; revenue: number; orders: number }> = []
    const weeksToShow = Math.min(Math.ceil(days / 7), 13)
    for (let i = weeksToShow - 1; i >= 0; i--) {
      const weekStart = new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000)
      const weekEnd = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000)
      const weekOrders = paidOrders.filter((o) => {
        const d = new Date(o.created_at)
        return d >= weekStart && d < weekEnd
      })
      weeklyRevenue.push({
        week: `${weekStart.toISOString().split('T')[0]} to ${weekEnd.toISOString().split('T')[0]}`,
        revenue: weekOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
        orders: weekOrders.length,
      })
    }

    // Top categories sorted by revenue
    const sortedCategories = Object.entries(byCategory)
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    return {
      success: true,
      data: {
        period: `Last ${days} days`,
        totalRevenue,
        totalOrders: paidOrders.length,
        aov: paidOrders.length > 0 ? Math.round(totalRevenue / paidOrders.length) : 0,
        comparison: compare
          ? {
              previousRevenue: prevRevenue,
              growthPercent: prevRevenue > 0 ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 1000) / 10 : 0,
            }
          : null,
        byPaymentMethod: byMethod,
        byCategory: sortedCategories,
        discounts: {
          totalDiscountGiven: totalDiscounts,
          ordersWithDiscount,
          ordersWithCoupon,
          avgDiscountPerOrder: ordersWithDiscount > 0 ? Math.round(totalDiscounts / ordersWithDiscount) : 0,
        },
        shippingRevenue,
        weeklyTrend: weeklyRevenue,
      },
      message: `Revenue analytics for last ${days} days: ₹${totalRevenue.toLocaleString('en-IN')} from ${paidOrders.length} paid orders`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch revenue analytics',
    }
  }
}

export async function executeGetCustomerInsights(
  args: { period?: string },
  ctx: ToolContext
): Promise<ToolResult> {
  try {
    const supabase = getSupabaseAdmin()
    const { start, days } = getPeriodDates(args.period)

    const [customersResult, ordersResult, abandonedResult] = await Promise.all([
      supabase
        .from('customers')
        .select('id, email, created_at, marketing_consent')
        .eq('store_id', ctx.storeId),
      supabase
        .from('orders')
        .select('id, customer_id, customer_email, total_amount, payment_status, created_at')
        .eq('store_id', ctx.storeId)
        .eq('payment_status', 'paid'),
      supabase
        .from('abandoned_carts')
        .select('id, recovery_status, subtotal, created_at')
        .eq('store_id', ctx.storeId),
    ])

    const customers = customersResult.data || []
    const orders = ordersResult.data || []
    const abandonedCarts = abandonedResult.data || []

    // Acquisition trend - new customers in period
    const newInPeriod = customers.filter((c) => new Date(c.created_at) >= start).length
    const totalCustomers = customers.length

    // Repeat purchase rate
    const customerOrderCounts = new Map<string, number>()
    for (const order of orders) {
      if (order.customer_id) {
        customerOrderCounts.set(order.customer_id, (customerOrderCounts.get(order.customer_id) || 0) + 1)
      }
    }
    const customersWithOrders = customerOrderCounts.size
    const repeatCustomers = Array.from(customerOrderCounts.values()).filter((count) => count >= 2).length
    const repeatRate = customersWithOrders > 0 ? (repeatCustomers / customersWithOrders) * 100 : 0

    // Top 10 customers by spend
    const customerSpend = new Map<string, { email: string; totalSpent: number; orderCount: number }>()
    for (const order of orders) {
      const key = order.customer_id || order.customer_email
      if (!key) continue
      const existing = customerSpend.get(key) || { email: order.customer_email, totalSpent: 0, orderCount: 0 }
      existing.totalSpent += order.total_amount || 0
      existing.orderCount++
      customerSpend.set(key, existing)
    }
    const topCustomers = Array.from(customerSpend.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10)

    // CLV segments
    const spendValues = Array.from(customerSpend.values()).map((c) => c.totalSpent)
    const avgSpend = spendValues.length > 0 ? spendValues.reduce((a, b) => a + b, 0) / spendValues.length : 0
    const highValue = spendValues.filter((v) => v > avgSpend * 2).length
    const midValue = spendValues.filter((v) => v >= avgSpend * 0.5 && v <= avgSpend * 2).length
    const lowValue = spendValues.filter((v) => v < avgSpend * 0.5).length

    // Geographic distribution from customer addresses
    const customerIds = customers.map((c) => c.id)
    let topStates: Array<{ state: string; count: number }> = []
    let topCities: Array<{ city: string; count: number }> = []

    if (customerIds.length > 0) {
      const { data: addresses } = await supabase
        .from('customer_addresses')
        .select('state, city')
        .in('customer_id', customerIds.slice(0, 500))

      if (addresses && addresses.length > 0) {
        const stateCount = new Map<string, number>()
        const cityCount = new Map<string, number>()
        for (const addr of addresses) {
          if (addr.state) stateCount.set(addr.state, (stateCount.get(addr.state) || 0) + 1)
          if (addr.city) cityCount.set(addr.city, (cityCount.get(addr.city) || 0) + 1)
        }
        topStates = Array.from(stateCount.entries())
          .map(([state, count]) => ({ state, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
        topCities = Array.from(cityCount.entries())
          .map(([city, count]) => ({ city, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
      }
    }

    // Cart abandonment
    const activeCarts = abandonedCarts.filter((c) => c.recovery_status === 'active')
    const recoveredCarts = abandonedCarts.filter((c) => c.recovery_status === 'recovered')
    const totalAbandonedValue = activeCarts.reduce((sum, c) => sum + (c.subtotal || 0), 0)
    const totalAbandoned = abandonedCarts.length
    const recoveryRate = totalAbandoned > 0 ? (recoveredCarts.length / totalAbandoned) * 100 : 0

    // Marketing consent
    const withConsent = customers.filter((c) => c.marketing_consent).length

    return {
      success: true,
      data: {
        period: `Last ${days} days`,
        overview: {
          totalCustomers,
          newInPeriod,
          customersWithOrders,
        },
        retention: {
          repeatCustomers,
          repeatRate: Math.round(repeatRate * 10) / 10,
        },
        topCustomers,
        clvSegments: {
          highValue,
          midValue,
          lowValue,
          avgSpend: Math.round(avgSpend),
        },
        geography: {
          topStates,
          topCities,
        },
        cartAbandonment: {
          activeCarts: activeCarts.length,
          recoveredCarts: recoveredCarts.length,
          totalAbandonedValue,
          recoveryRate: Math.round(recoveryRate * 10) / 10,
        },
        marketing: {
          marketingConsentCount: withConsent,
          consentRate: totalCustomers > 0 ? Math.round((withConsent / totalCustomers) * 100) : 0,
        },
      },
      message: `Customer insights: ${totalCustomers} total customers, ${newInPeriod} new in period, ${Math.round(repeatRate)}% repeat rate`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch customer insights',
    }
  }
}

export async function executeGetInventoryHealth(
  args: { includeArchived?: boolean },
  ctx: ToolContext
): Promise<ToolResult> {
  try {
    const supabase = getSupabaseAdmin()

    // Get products with inventory data
    let productsQuery = supabase
      .from('products')
      .select('id, title, sku, price, quantity, track_quantity, status, category, cost_price')
      .eq('store_id', ctx.storeId)

    if (!args.includeArchived) {
      productsQuery = productsQuery.neq('status', 'archived')
    }

    const [productsResult, recentOrdersResult] = await Promise.all([
      productsQuery,
      // Get paid orders from last 30 days for velocity calculation
      supabase
        .from('orders')
        .select('id')
        .eq('store_id', ctx.storeId)
        .eq('payment_status', 'paid')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    ])

    const products = productsResult.data || []
    const recentOrderIds = (recentOrdersResult.data || []).map((o) => o.id)

    // Get order items for velocity calculation
    let salesVelocity = new Map<string, number>()
    if (recentOrderIds.length > 0) {
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id, quantity')
        .in('order_id', recentOrderIds.slice(0, 500))

      if (orderItems) {
        for (const item of orderItems) {
          salesVelocity.set(item.product_id, (salesVelocity.get(item.product_id) || 0) + (item.quantity || 0))
        }
      }
    }

    // Calculate per-product metrics
    const inventoryItems = products
      .filter((p) => p.track_quantity)
      .map((p) => {
        const unitsSold30d = salesVelocity.get(p.id) || 0
        const dailyVelocity = unitsSold30d / 30
        const daysUntilStockout = dailyVelocity > 0 && p.quantity !== null ? Math.round(p.quantity / dailyVelocity) : null
        const leadTimeDays = 14 // Default assumption
        const safetyFactor = 1.5
        const suggestedReorderQty = dailyVelocity > 0 ? Math.ceil(dailyVelocity * leadTimeDays * safetyFactor) : 0

        return {
          id: p.id,
          title: p.title,
          sku: p.sku,
          category: p.category,
          currentStock: p.quantity ?? 0,
          status: p.status,
          unitsSold30d,
          dailyVelocity: Math.round(dailyVelocity * 100) / 100,
          daysUntilStockout,
          suggestedReorderQty,
          needsReorder: daysUntilStockout !== null && daysUntilStockout <= 14,
        }
      })

    // Out of stock (published products with 0 stock)
    const outOfStock = inventoryItems
      .filter((p) => p.currentStock === 0 && p.status === 'published')
      .slice(0, 15)

    // Dead stock (has stock but no sales in 30 days)
    const deadStock = inventoryItems
      .filter((p) => p.currentStock > 0 && p.unitsSold30d === 0)
      .sort((a, b) => b.currentStock - a.currentStock)
      .slice(0, 15)

    // Needs reorder (will stock out within 14 days)
    const needsReorder = inventoryItems
      .filter((p) => p.needsReorder && p.currentStock > 0)
      .sort((a, b) => (a.daysUntilStockout ?? 999) - (b.daysUntilStockout ?? 999))
      .slice(0, 15)

    // Best sellers by velocity
    const bestSellers = inventoryItems
      .filter((p) => p.dailyVelocity > 0)
      .sort((a, b) => b.dailyVelocity - a.dailyVelocity)
      .slice(0, 10)

    // Inventory value
    const totalRetailValue = products
      .filter((p) => p.track_quantity && p.quantity)
      .reduce((sum, p) => sum + (p.price || 0) * (p.quantity || 0), 0)
    const totalCostValue = products
      .filter((p) => p.track_quantity && p.quantity && p.cost_price)
      .reduce((sum, p) => sum + (p.cost_price || 0) * (p.quantity || 0), 0)

    return {
      success: true,
      data: {
        summary: {
          totalTrackedProducts: inventoryItems.length,
          outOfStockCount: outOfStock.length,
          deadStockCount: deadStock.length,
          needsReorderCount: needsReorder.length,
          totalRetailValue,
          totalCostValue: totalCostValue || null,
        },
        outOfStock,
        deadStock,
        needsReorder,
        bestSellers,
      },
      message: `Inventory health: ${outOfStock.length} out of stock, ${needsReorder.length} need reorder, ${deadStock.length} dead stock items`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch inventory health',
    }
  }
}

export async function executeGetMarketingInsights(
  args: { period?: string },
  ctx: ToolContext
): Promise<ToolResult> {
  try {
    const supabase = getSupabaseAdmin()
    const { start, days } = getPeriodDates(args.period)

    // Get store products first for scoping reviews
    const { data: storeProducts } = await supabase
      .from('products')
      .select('id, title, featured, price')
      .eq('store_id', ctx.storeId)
      .neq('status', 'archived')

    const productIds = (storeProducts || []).map((p) => p.id)

    const [couponsResult, ordersResult, abandonedResult, reviewsResult] = await Promise.all([
      // Coupons with usage
      supabase
        .from('coupons')
        .select(`*, coupon_usage (discount_amount)`)
        .eq('store_id', ctx.storeId),
      // Orders with coupon info
      supabase
        .from('orders')
        .select('id, total_amount, coupon_code, discount_amount, payment_status, created_at')
        .eq('store_id', ctx.storeId)
        .eq('payment_status', 'paid')
        .gte('created_at', start.toISOString()),
      // Abandoned carts
      supabase
        .from('abandoned_carts')
        .select('id, recovery_status, subtotal, recovery_emails_sent')
        .eq('store_id', ctx.storeId),
      // Reviews
      productIds.length > 0
        ? supabase
            .from('product_reviews')
            .select('id, rating, status, created_at')
            .in('product_id', productIds.slice(0, 500))
        : Promise.resolve({ data: [] }),
    ])

    const coupons = couponsResult.data || []
    const orders = ordersResult.data || []
    const abandonedCarts = abandonedResult.data || []
    const reviews = (reviewsResult as { data: Array<{ id: string; rating: number; status: string; created_at: string }> | null }).data || []

    // Per-coupon performance
    const couponPerformance = coupons.map((coupon) => {
      const usage = coupon.coupon_usage || []
      const totalDiscountGiven = usage.reduce(
        (sum: number, u: { discount_amount: number }) => sum + Number(u.discount_amount || 0),
        0
      )
      const ordersWithCoupon = orders.filter((o) => o.coupon_code === coupon.code)
      const revenueFromCoupon = ordersWithCoupon.reduce((sum, o) => sum + (o.total_amount || 0), 0)
      const redemptionRate = coupon.max_uses
        ? (usage.length / coupon.max_uses) * 100
        : null

      return {
        code: coupon.code,
        discountType: coupon.discount_type,
        discountValue: coupon.discount_value,
        isActive: coupon.is_active,
        timesUsed: usage.length,
        maxUses: coupon.max_uses,
        redemptionRate: redemptionRate ? Math.round(redemptionRate) : null,
        totalDiscountGiven,
        revenueGenerated: revenueFromCoupon,
        roi: totalDiscountGiven > 0 ? Math.round((revenueFromCoupon / totalDiscountGiven) * 10) / 10 : null,
        expiresAt: coupon.expires_at,
      }
    }).slice(0, 15)

    // Expiring soon coupons (within 7 days)
    const soon = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const expiringSoon = coupons.filter(
      (c) => c.is_active && c.expires_at && new Date(c.expires_at) <= soon && new Date(c.expires_at) > new Date()
    ).map((c) => ({ code: c.code, expiresAt: c.expires_at }))

    // Cart recovery stats
    const totalCarts = abandonedCarts.length
    const recoveredCarts = abandonedCarts.filter((c) => c.recovery_status === 'recovered').length
    const activeCarts = abandonedCarts.filter((c) => c.recovery_status === 'active')
    const cartsWithEmails = abandonedCarts.filter((c) => c.recovery_emails_sent > 0).length
    const recoveryRate = totalCarts > 0 ? (recoveredCarts / totalCarts) * 100 : 0
    const activeCartValue = activeCarts.reduce((sum, c) => sum + (c.subtotal || 0), 0)

    // Unfeatured products with high ratings (feature recommendations)
    let featureRecommendations: Array<{ title: string; id: string; avgRating: number; reviewCount: number }> = []
    if (productIds.length > 0 && reviews.length > 0) {
      const productRatings = new Map<string, { sum: number; count: number }>()
      for (const review of reviews) {
        if (review.status !== 'approved') continue
        // We need product_id but we only selected id, rating, status - need to check
        // Actually we'll use a simpler approach
      }
      // Group reviews by looking at approved reviews
      const { data: reviewsWithProduct } = await supabase
        .from('product_reviews')
        .select('product_id, rating')
        .in('product_id', productIds.slice(0, 200))
        .eq('status', 'approved')

      if (reviewsWithProduct) {
        const ratingsByProduct = new Map<string, { sum: number; count: number }>()
        for (const r of reviewsWithProduct) {
          const existing = ratingsByProduct.get(r.product_id) || { sum: 0, count: 0 }
          existing.sum += r.rating
          existing.count++
          ratingsByProduct.set(r.product_id, existing)
        }

        const unfeatured = (storeProducts || []).filter((p) => !p.featured)
        featureRecommendations = unfeatured
          .map((p) => {
            const ratings = ratingsByProduct.get(p.id)
            if (!ratings || ratings.count < 2) return null
            return {
              title: p.title,
              id: p.id,
              avgRating: Math.round((ratings.sum / ratings.count) * 10) / 10,
              reviewCount: ratings.count,
            }
          })
          .filter((x): x is NonNullable<typeof x> => x !== null && x.avgRating >= 4.0)
          .sort((a, b) => b.avgRating - a.avgRating || b.reviewCount - a.reviewCount)
          .slice(0, 5)
      }
    }

    // Review overview
    const pendingReviews = reviews.filter((r) => r.status === 'pending').length
    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    for (const r of reviews) {
      if (r.rating >= 1 && r.rating <= 5) {
        ratingDistribution[r.rating]++
      }
    }
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0

    return {
      success: true,
      data: {
        period: `Last ${days} days`,
        coupons: {
          totalActive: coupons.filter((c) => c.is_active).length,
          performance: couponPerformance,
          expiringSoon,
        },
        cartRecovery: {
          totalAbandoned: totalCarts,
          recovered: recoveredCarts,
          recoveryRate: Math.round(recoveryRate * 10) / 10,
          activeCartValue,
          cartsWithEmailsSent: cartsWithEmails,
        },
        featureRecommendations,
        reviews: {
          totalReviews: reviews.length,
          pendingModeration: pendingReviews,
          avgRating: Math.round(avgRating * 10) / 10,
          ratingDistribution,
        },
      },
      message: `Marketing insights: ${coupons.filter((c) => c.is_active).length} active coupons, ${Math.round(recoveryRate)}% cart recovery, ${pendingReviews} reviews pending`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch marketing insights',
    }
  }
}

export async function executeGetActionableInsights(
  _args: Record<string, unknown>,
  ctx: ToolContext
): Promise<ToolResult> {
  try {
    const supabase = getSupabaseAdmin()
    const now = new Date()
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000)

    // Get store products first for scoping
    const { data: storeProducts } = await supabase
      .from('products')
      .select('id')
      .eq('store_id', ctx.storeId)

    const productIds = (storeProducts || []).map((p) => p.id)

    const [
      outOfStockResult,
      lowStockResult,
      pendingOrdersResult,
      recentRevenueResult,
      prevRevenueResult,
      pendingReviewsResult,
      expiringCouponsResult,
      activeCartsResult,
      unreadNotificationsResult,
    ] = await Promise.all([
      // Out of stock published products
      supabase
        .from('products')
        .select('id, title')
        .eq('store_id', ctx.storeId)
        .eq('status', 'published')
        .eq('track_quantity', true)
        .lte('quantity', 0),
      // Low stock (1-5)
      supabase
        .from('products')
        .select('id, title, quantity')
        .eq('store_id', ctx.storeId)
        .eq('status', 'published')
        .eq('track_quantity', true)
        .gt('quantity', 0)
        .lte('quantity', 5),
      // Old unshipped orders (pending/confirmed > 48 hours)
      supabase
        .from('orders')
        .select('id, order_number, order_status, created_at')
        .eq('store_id', ctx.storeId)
        .in('order_status', ['pending', 'confirmed'])
        .eq('payment_status', 'paid')
        .lt('created_at', fortyEightHoursAgo.toISOString()),
      // Revenue last 7 days
      supabase
        .from('orders')
        .select('total_amount')
        .eq('store_id', ctx.storeId)
        .eq('payment_status', 'paid')
        .gte('created_at', sevenDaysAgo.toISOString()),
      // Revenue previous 7 days
      supabase
        .from('orders')
        .select('total_amount')
        .eq('store_id', ctx.storeId)
        .eq('payment_status', 'paid')
        .gte('created_at', fourteenDaysAgo.toISOString())
        .lt('created_at', sevenDaysAgo.toISOString()),
      // Pending reviews
      productIds.length > 0
        ? supabase
            .from('product_reviews')
            .select('id', { count: 'exact', head: true })
            .in('product_id', productIds.slice(0, 500))
            .eq('status', 'pending')
        : Promise.resolve({ count: 0 }),
      // Expiring coupons (within 3 days)
      supabase
        .from('coupons')
        .select('code, expires_at')
        .eq('store_id', ctx.storeId)
        .eq('is_active', true)
        .gt('expires_at', now.toISOString())
        .lt('expires_at', new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()),
      // Active abandoned carts
      supabase
        .from('abandoned_carts')
        .select('id, subtotal', { count: 'exact', head: false })
        .eq('store_id', ctx.storeId)
        .eq('recovery_status', 'active'),
      // Unread notifications
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', ctx.storeId)
        .eq('is_read', false),
    ])

    const insights: Array<{
      priority: 'critical' | 'high' | 'medium' | 'low'
      category: string
      title: string
      detail: string
      suggestedAction: string
    }> = []

    // Out of stock products
    const outOfStock = outOfStockResult.data || []
    if (outOfStock.length > 0) {
      insights.push({
        priority: 'critical',
        category: 'inventory',
        title: `${outOfStock.length} product${outOfStock.length > 1 ? 's' : ''} out of stock`,
        detail: outOfStock.slice(0, 5).map((p) => p.title).join(', ') + (outOfStock.length > 5 ? ` and ${outOfStock.length - 5} more` : ''),
        suggestedAction: 'Restock these products immediately or set them to draft to avoid showing unavailable items.',
      })
    }

    // Old unshipped orders
    const pendingOrders = pendingOrdersResult.data || []
    if (pendingOrders.length > 0) {
      insights.push({
        priority: 'critical',
        category: 'orders',
        title: `${pendingOrders.length} paid order${pendingOrders.length > 1 ? 's' : ''} unshipped for 48+ hours`,
        detail: pendingOrders.slice(0, 5).map((o) => `#${o.order_number}`).join(', '),
        suggestedAction: 'Ship these orders ASAP. Delayed shipping hurts customer trust and increases cancellation risk.',
      })
    }

    // Revenue trend
    const recentRevenue = (recentRevenueResult.data || []).reduce((sum, o) => sum + (o.total_amount || 0), 0)
    const prevRevenue = (prevRevenueResult.data || []).reduce((sum, o) => sum + (o.total_amount || 0), 0)
    if (prevRevenue > 0) {
      const revenueChange = ((recentRevenue - prevRevenue) / prevRevenue) * 100
      if (revenueChange < -10) {
        insights.push({
          priority: 'high',
          category: 'revenue',
          title: `Revenue down ${Math.abs(Math.round(revenueChange))}% this week`,
          detail: `₹${recentRevenue.toLocaleString('en-IN')} this week vs ₹${prevRevenue.toLocaleString('en-IN')} last week`,
          suggestedAction: 'Check if best-sellers are in stock, review traffic sources, or run a promotional campaign.',
        })
      } else if (revenueChange > 20) {
        insights.push({
          priority: 'low',
          category: 'revenue',
          title: `Revenue up ${Math.round(revenueChange)}% this week`,
          detail: `₹${recentRevenue.toLocaleString('en-IN')} this week vs ₹${prevRevenue.toLocaleString('en-IN')} last week`,
          suggestedAction: 'Great momentum! Ensure inventory can handle continued growth.',
        })
      }
    }

    // Low stock
    const lowStock = lowStockResult.data || []
    if (lowStock.length > 0) {
      insights.push({
        priority: 'high',
        category: 'inventory',
        title: `${lowStock.length} product${lowStock.length > 1 ? 's' : ''} running low on stock`,
        detail: lowStock.slice(0, 5).map((p) => `${p.title} (${p.quantity} left)`).join(', '),
        suggestedAction: 'Reorder stock before these sell out. Use getInventoryHealth for detailed reorder quantities.',
      })
    }

    // Pending reviews
    const pendingReviewCount = (pendingReviewsResult as { count: number | null }).count || 0
    if (pendingReviewCount > 0) {
      insights.push({
        priority: 'medium',
        category: 'reviews',
        title: `${pendingReviewCount} review${pendingReviewCount > 1 ? 's' : ''} awaiting moderation`,
        detail: 'Customer reviews are waiting for your approval.',
        suggestedAction: 'Approve genuine reviews to build social proof and boost conversion.',
      })
    }

    // Expiring coupons
    const expiringCoupons = expiringCouponsResult.data || []
    if (expiringCoupons.length > 0) {
      insights.push({
        priority: 'medium',
        category: 'marketing',
        title: `${expiringCoupons.length} coupon${expiringCoupons.length > 1 ? 's' : ''} expiring within 3 days`,
        detail: expiringCoupons.map((c) => c.code).join(', '),
        suggestedAction: 'Extend expiry dates if these coupons are still useful, or promote them before they expire.',
      })
    }

    // Active abandoned carts
    const activeCarts = activeCartsResult.data || []
    if (activeCarts.length >= 5) {
      const cartValue = activeCarts.reduce((sum, c) => sum + (c.subtotal || 0), 0)
      insights.push({
        priority: 'medium',
        category: 'marketing',
        title: `${activeCarts.length} abandoned carts worth ₹${cartValue.toLocaleString('en-IN')}`,
        detail: 'Customers started checkout but did not complete their purchase.',
        suggestedAction: 'Enable cart recovery emails to automatically win back these customers.',
      })
    }

    // Unread notifications
    const unreadCount = (unreadNotificationsResult as { count: number | null }).count || 0
    if (unreadCount >= 5) {
      insights.push({
        priority: 'low',
        category: 'general',
        title: `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`,
        detail: 'You have unread store notifications.',
        suggestedAction: 'Check your notification bell for updates.',
      })
    }

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

    return {
      success: true,
      data: {
        insights,
        summary: {
          critical: insights.filter((i) => i.priority === 'critical').length,
          high: insights.filter((i) => i.priority === 'high').length,
          medium: insights.filter((i) => i.priority === 'medium').length,
          low: insights.filter((i) => i.priority === 'low').length,
          total: insights.length,
        },
      },
      message: insights.length > 0
        ? `Found ${insights.length} actionable insights: ${insights.filter((i) => i.priority === 'critical').length} critical, ${insights.filter((i) => i.priority === 'high').length} high priority`
        : 'No urgent issues found. Your store is running smoothly!',
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch actionable insights',
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

    // Business intelligence tools
    getBusinessIntelligence: executeGetBusinessIntelligence as (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>,
    getRevenueAnalytics: executeGetRevenueAnalytics as (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>,
    getCustomerInsights: executeGetCustomerInsights as (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>,
    getInventoryHealth: executeGetInventoryHealth as (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>,
    getMarketingInsights: executeGetMarketingInsights as (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>,
    getActionableInsights: executeGetActionableInsights as (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>,

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
