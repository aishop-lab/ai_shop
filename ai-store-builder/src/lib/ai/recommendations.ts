/**
 * AI-Powered Product Recommendation Engine
 *
 * Uses AI to generate personalized product recommendations based on:
 * - Product similarity (categories, tags, attributes)
 * - Customer behavior (viewed products, purchase history)
 * - Collaborative filtering (customers who bought X also bought Y)
 */

import { generateObject } from 'ai'
import { z } from 'zod'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { getFastModel } from './provider'

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

// Schema for AI-generated recommendations
const recommendationSchema = z.object({
  recommendations: z.array(z.object({
    product_id: z.string(),
    score: z.number().min(0).max(1),
    reason: z.string()
  })),
  reasoning: z.string()
})

interface Product {
  id: string
  title: string
  description?: string
  price: number
  categories?: string[]
  tags?: string[]
  store_id?: string
}

interface RecommendationResult {
  product_id: string
  score: number
  reason: string
  product?: Product
}

interface GetRecommendationsParams {
  storeId: string
  productId?: string
  customerId?: string
  customerEmail?: string
  limit?: number
  type?: 'similar' | 'complementary' | 'trending' | 'personalized'
}

/**
 * Get similar products based on AI analysis
 */
export async function getSimilarProducts(
  storeId: string,
  productId: string,
  limit: number = 4
): Promise<RecommendationResult[]> {
  try {
    // Get the source product
    const { data: sourceProduct, error: sourceError } = await getSupabase()
      .from('products')
      .select('id, title, description, price, categories, tags')
      .eq('id', productId)
      .eq('store_id', storeId)
      .single()

    if (sourceError || !sourceProduct) {
      console.error('Source product not found:', sourceError)
      return []
    }

    // Get other products from the same store
    const { data: candidates, error: candidatesError } = await getSupabase()
      .from('products')
      .select('id, title, description, price, categories, tags')
      .eq('store_id', storeId)
      .eq('status', 'published')
      .eq('is_demo', false)
      .neq('id', productId)
      .limit(50)

    if (candidatesError || !candidates || candidates.length === 0) {
      return []
    }

    // For small catalogs, use rule-based matching
    if (candidates.length <= 10) {
      return getSimpleRecommendations(sourceProduct, candidates, limit)
    }

    // Use AI for larger catalogs
    const model = getFastModel()

    const prompt = `Given this product:
Title: ${sourceProduct.title}
Description: ${sourceProduct.description || 'N/A'}
Categories: ${sourceProduct.categories?.join(', ') || 'N/A'}
Tags: ${sourceProduct.tags?.join(', ') || 'N/A'}
Price: ₹${sourceProduct.price}

Find the ${limit} most similar products from this catalog:
${candidates.map((p, i) => `${i + 1}. ID: ${p.id}, Title: ${p.title}, Categories: ${p.categories?.join(', ') || 'N/A'}, Tags: ${p.tags?.join(', ') || 'N/A'}, Price: ₹${p.price}`).join('\n')}

Return the product IDs of the most similar items with relevance scores (0-1) and brief reasons.
Consider: category match, tag overlap, price range similarity, and complementary nature.`

    const { object } = await generateObject({
      model,
      schema: recommendationSchema,
      prompt,
      system: 'You are an e-commerce product recommendation engine. Analyze products and find the most relevant recommendations based on similarity, complementary nature, and customer preferences.'
    })

    // Map results with full product data
    const results: RecommendationResult[] = object.recommendations
      .slice(0, limit)
      .map(rec => ({
        ...rec,
        product: candidates.find(p => p.id === rec.product_id)
      }))
      .filter(rec => rec.product)

    return results
  } catch (error) {
    console.error('Get similar products error:', error)
    // Fallback to simple matching
    return []
  }
}

/**
 * Simple rule-based recommendations for small catalogs
 */
function getSimpleRecommendations(
  sourceProduct: Product,
  candidates: Product[],
  limit: number
): RecommendationResult[] {
  const scored = candidates.map(candidate => {
    let score = 0
    const reasons: string[] = []

    // Category match
    if (sourceProduct.categories && candidate.categories) {
      const commonCategories = sourceProduct.categories.filter(
        c => candidate.categories?.includes(c)
      )
      if (commonCategories.length > 0) {
        score += 0.4 * (commonCategories.length / sourceProduct.categories.length)
        reasons.push('Same category')
      }
    }

    // Tag overlap
    if (sourceProduct.tags && candidate.tags) {
      const commonTags = sourceProduct.tags.filter(
        t => candidate.tags?.includes(t)
      )
      if (commonTags.length > 0) {
        score += 0.3 * (commonTags.length / Math.max(sourceProduct.tags.length, 1))
        reasons.push('Similar style')
      }
    }

    // Price similarity (within 50% range)
    const priceDiff = Math.abs(sourceProduct.price - candidate.price) / sourceProduct.price
    if (priceDiff < 0.5) {
      score += 0.2 * (1 - priceDiff)
      reasons.push('Similar price range')
    }

    // Boost for having any content match
    if (score > 0) {
      score += 0.1
    }

    return {
      product_id: candidate.id,
      score: Math.min(score, 1),
      reason: reasons.join(', ') || 'You might also like',
      product: candidate
    }
  })

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/**
 * Get "Customers also bought" recommendations
 */
export async function getFrequentlyBoughtTogether(
  storeId: string,
  productId: string,
  limit: number = 4
): Promise<RecommendationResult[]> {
  try {
    // Find orders containing this product
    const { data: orderItems, error: ordersError } = await getSupabase()
      .from('order_items')
      .select('order_id')
      .eq('product_id', productId)
      .limit(100)

    if (ordersError || !orderItems || orderItems.length === 0) {
      // No purchase history, fall back to similar products
      return getSimilarProducts(storeId, productId, limit)
    }

    const orderIds = orderItems.map(oi => oi.order_id)

    // Find other products in those orders
    const { data: relatedItems, error: relatedError } = await getSupabase()
      .from('order_items')
      .select('product_id, products(id, title, price, categories, tags, status, is_demo)')
      .in('order_id', orderIds)
      .neq('product_id', productId)

    if (relatedError || !relatedItems) {
      return getSimilarProducts(storeId, productId, limit)
    }

    // Count co-occurrences
    const productCounts: Record<string, { count: number; product: Product }> = {}

    for (const item of relatedItems) {
      const product = item.products as unknown as Product & { status: string; is_demo: boolean }
      if (!product || product.status !== 'published' || product.is_demo) continue

      if (!productCounts[item.product_id]) {
        productCounts[item.product_id] = { count: 0, product }
      }
      productCounts[item.product_id].count++
    }

    // Sort by frequency
    const sorted = Object.entries(productCounts)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, limit)

    const maxCount = sorted[0]?.[1].count || 1

    return sorted.map(([productId, { count, product }]) => ({
      product_id: productId,
      score: count / maxCount,
      reason: 'Frequently bought together',
      product
    }))
  } catch (error) {
    console.error('Get frequently bought together error:', error)
    return []
  }
}

/**
 * Get personalized recommendations for a customer
 */
export async function getPersonalizedRecommendations(
  storeId: string,
  customerId?: string,
  customerEmail?: string,
  limit: number = 8
): Promise<RecommendationResult[]> {
  try {
    if (!customerId && !customerEmail) {
      // No customer context, return trending/popular products
      return getTrendingProducts(storeId, limit)
    }

    // Get customer's purchase history
    let orderQuery = getSupabase()
      .from('orders')
      .select('id')
      .eq('store_id', storeId)
      .eq('payment_status', 'paid')
      .order('created_at', { ascending: false })
      .limit(20)

    if (customerId) {
      orderQuery = orderQuery.eq('customer_id', customerId)
    } else if (customerEmail) {
      orderQuery = orderQuery.eq('customer_email', customerEmail)
    }

    const { data: orders } = await orderQuery

    if (!orders || orders.length === 0) {
      return getTrendingProducts(storeId, limit)
    }

    // Get purchased products
    const { data: purchasedItems } = await getSupabase()
      .from('order_items')
      .select('product_id')
      .in('order_id', orders.map(o => o.id))

    const purchasedIds = new Set(purchasedItems?.map(i => i.product_id) || [])

    // Get recommendations based on purchased products
    const recommendations: RecommendationResult[] = []

    for (const productId of Array.from(purchasedIds).slice(0, 3)) {
      const similar = await getSimilarProducts(storeId, productId, 4)
      for (const rec of similar) {
        if (!purchasedIds.has(rec.product_id)) {
          recommendations.push({
            ...rec,
            reason: 'Based on your purchase history'
          })
        }
      }
    }

    // Deduplicate and sort by score
    const seen = new Set<string>()
    const unique = recommendations.filter(r => {
      if (seen.has(r.product_id)) return false
      seen.add(r.product_id)
      return true
    })

    return unique.sort((a, b) => b.score - a.score).slice(0, limit)
  } catch (error) {
    console.error('Get personalized recommendations error:', error)
    return getTrendingProducts(storeId, limit)
  }
}

/**
 * Get trending/popular products
 */
export async function getTrendingProducts(
  storeId: string,
  limit: number = 8
): Promise<RecommendationResult[]> {
  try {
    // Get products with most orders in last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: topProducts, error } = await getSupabase()
      .from('order_items')
      .select(`
        product_id,
        products!inner(id, title, price, categories, tags, status, is_demo, store_id)
      `)
      .eq('products.store_id', storeId)
      .eq('products.status', 'published')
      .eq('products.is_demo', false)
      .gte('created_at', thirtyDaysAgo.toISOString())

    if (error || !topProducts) {
      // Fallback to featured products
      const { data: featured } = await getSupabase()
        .from('products')
        .select('id, title, price, categories, tags')
        .eq('store_id', storeId)
        .eq('status', 'published')
        .eq('is_demo', false)
        .eq('featured', true)
        .limit(limit)

      return (featured || []).map(p => ({
        product_id: p.id,
        score: 0.8,
        reason: 'Featured product',
        product: p
      }))
    }

    // Count orders per product
    const counts: Record<string, { count: number; product: Product }> = {}

    for (const item of topProducts) {
      const product = item.products as unknown as Product
      if (!counts[item.product_id]) {
        counts[item.product_id] = { count: 0, product }
      }
      counts[item.product_id].count++
    }

    const sorted = Object.entries(counts)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, limit)

    const maxCount = sorted[0]?.[1].count || 1

    return sorted.map(([productId, { count, product }]) => ({
      product_id: productId,
      score: count / maxCount,
      reason: 'Trending now',
      product
    }))
  } catch (error) {
    console.error('Get trending products error:', error)
    return []
  }
}

/**
 * Main recommendation function that combines different strategies
 */
export async function getRecommendations(
  params: GetRecommendationsParams
): Promise<RecommendationResult[]> {
  const { storeId, productId, customerId, customerEmail, limit = 4, type = 'similar' } = params

  switch (type) {
    case 'similar':
      if (!productId) return []
      return getSimilarProducts(storeId, productId, limit)

    case 'complementary':
      if (!productId) return []
      return getFrequentlyBoughtTogether(storeId, productId, limit)

    case 'personalized':
      return getPersonalizedRecommendations(storeId, customerId, customerEmail, limit)

    case 'trending':
      return getTrendingProducts(storeId, limit)

    default:
      if (productId) {
        return getSimilarProducts(storeId, productId, limit)
      }
      return getTrendingProducts(storeId, limit)
  }
}
