// src/lib/agents/sub-agents/tools/shared/products.ts
// Shared product query tools — used by 11+ sub-agents

import { tool } from 'ai'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

// ---------------------------------------------------------------------------
// get_products — List products with flexible filters
// ---------------------------------------------------------------------------

export const get_products = tool({
  description:
    'Query products for a store. Supports filtering by status, category, keyword search, and sorting. ' +
    'Returns compact product data suitable for analysis, recommendations, and customer-facing responses.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    status: z
      .enum(['active', 'draft', 'archived', 'all'])
      .optional()
      .describe('Filter by product status (default: active)'),
    category: z.string().optional().describe('Filter by product category (case-insensitive partial match)'),
    search: z.string().optional().describe('Keyword search across title and description'),
    sort_by: z
      .enum(['title', 'price_asc', 'price_desc', 'newest', 'oldest'])
      .optional()
      .describe('Sort order (default: title)'),
    limit: z.number().optional().describe('Max products to return (default: 50)'),
  }),
  execute: async ({ store_id, status = 'active', category, search, sort_by = 'title', limit = 50 }) => {
    const supabase = getSupabaseAdmin()

    let query = supabase
      .from('products')
      .select(
        `id, title, description, price, compare_at_price, category, tags,
         stock_quantity, status, created_at`
      )
      .eq('store_id', store_id)
      .eq('is_demo', false)
      .limit(limit)

    if (status !== 'all') {
      query = query.eq('status', status)
    }
    if (category) {
      query = query.ilike('category', `%${category}%`)
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }

    switch (sort_by) {
      case 'price_asc':
        query = query.order('price', { ascending: true })
        break
      case 'price_desc':
        query = query.order('price', { ascending: false })
        break
      case 'newest':
        query = query.order('created_at', { ascending: false })
        break
      case 'oldest':
        query = query.order('created_at', { ascending: true })
        break
      default:
        query = query.order('title')
    }

    const { data, error } = await query

    if (error) {
      return { success: false, error: error.message, products: [] }
    }

    return { success: true, count: data?.length ?? 0, products: data ?? [] }
  },
})

// ---------------------------------------------------------------------------
// get_product_details — Full details for a single product
// ---------------------------------------------------------------------------

export const get_product_details = tool({
  description:
    'Get complete details for a single product including images, variants, and review summary. ' +
    'Use this when you need deep information about a specific product.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    product_id: z.string().describe('The product UUID'),
  }),
  execute: async ({ store_id, product_id }) => {
    const supabase = getSupabaseAdmin()

    const { data: product, error } = await supabase
      .from('products')
      .select(
        `id, title, description, price, compare_at_price, cost_price,
         category, tags, stock_quantity, status,
         created_at, updated_at`
      )
      .eq('id', product_id)
      .eq('store_id', store_id)
      .eq('is_demo', false)
      .single()

    if (error) {
      return { success: false, error: error.message, product: null }
    }

    // Fetch images
    const { data: images } = await supabase
      .from('product_images')
      .select('id, original_url, thumbnail_url, alt_text, position, is_primary')
      .eq('product_id', product_id)
      .order('position')

    // Fetch variants
    const { data: variants } = await supabase
      .from('product_variants')
      .select('id, title, price, compare_at_price, stock_quantity, sku, options')
      .eq('product_id', product_id)
      .order('title')

    // Fetch review summary
    const { data: reviews, count: reviewCount } = await supabase
      .from('product_reviews')
      .select('rating', { count: 'exact' })
      .eq('product_id', product_id)

    const avgRating =
      reviews && reviews.length > 0
        ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
        : null

    return {
      success: true,
      product: {
        ...product,
        images: images ?? [],
        variants: variants ?? [],
        review_count: reviewCount ?? 0,
        avg_rating: avgRating,
      },
    }
  },
})

// ---------------------------------------------------------------------------
// get_product_categories — Distinct categories with counts
// ---------------------------------------------------------------------------

export const get_product_categories = tool({
  description:
    'Get distinct product categories for a store with product counts and average price per category.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
  }),
  execute: async ({ store_id }) => {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('products')
      .select('category, price')
      .eq('store_id', store_id)
      .eq('is_demo', false)
      .eq('status', 'active')

    if (error) {
      return { success: false, error: error.message, categories: [] }
    }

    const categoryMap: Record<string, { count: number; totalPrice: number }> = {}
    for (const p of data ?? []) {
      const cat = p.category || 'Uncategorized'
      if (!categoryMap[cat]) categoryMap[cat] = { count: 0, totalPrice: 0 }
      categoryMap[cat].count++
      categoryMap[cat].totalPrice += p.price ?? 0
    }

    const categories = Object.entries(categoryMap)
      .map(([name, stats]) => ({
        category: name,
        product_count: stats.count,
        avg_price: Math.round((stats.totalPrice / stats.count) * 100) / 100,
      }))
      .sort((a, b) => b.product_count - a.product_count)

    return { success: true, count: categories.length, categories }
  },
})

// ---------------------------------------------------------------------------
// get_trending_products — Products ranked by recent sales volume
// ---------------------------------------------------------------------------

export const get_trending_products = tool({
  description:
    'Get products ranked by recent sales volume. ' +
    'Identifies what is actually selling well to inform content, promos, and recommendations.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    days: z.number().optional().describe('Look-back period in days (default: 30)'),
    limit: z.number().optional().describe('Max products to return (default: 10)'),
  }),
  execute: async ({ store_id, days = 30, limit = 10 }) => {
    const supabase = getSupabaseAdmin()
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    // Get paid orders in the period
    const { data: orders } = await supabase
      .from('orders')
      .select('id, order_items(product_id, title, quantity, price)')
      .eq('store_id', store_id)
      .eq('payment_status', 'paid')
      .gte('created_at', since)
      .limit(500)

    if (!orders || orders.length === 0) {
      return { success: true, period_days: days, count: 0, products: [] }
    }

    // Aggregate by product
    const productMap: Record<string, { title: string; units_sold: number; revenue: number }> = {}
    for (const order of orders) {
      const items = (order.order_items as Array<{ product_id: string; title: string; quantity: number; price: number }>) ?? []
      for (const item of items) {
        if (!item.product_id) continue
        if (!productMap[item.product_id]) {
          productMap[item.product_id] = { title: item.title, units_sold: 0, revenue: 0 }
        }
        productMap[item.product_id].units_sold += item.quantity || 1
        productMap[item.product_id].revenue += (item.price || 0) * (item.quantity || 1)
      }
    }

    const trending = Object.entries(productMap)
      .map(([id, stats]) => ({
        product_id: id,
        title: stats.title,
        units_sold: stats.units_sold,
        revenue: Math.round(stats.revenue * 100) / 100,
      }))
      .sort((a, b) => b.units_sold - a.units_sold)
      .slice(0, limit)

    return { success: true, period_days: days, count: trending.length, products: trending }
  },
})
