// src/lib/agents/sales/dynamic-pricing.ts
// Dynamic pricing engine for the Sales Agent

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { storeMemory, getMemories, getMemoryByKey } from '../memory'

// ---- Types ----

export interface PricingFactors {
  demandScore: number       // 0-1, based on recent order velocity
  inventoryPressure: number // 0-1, high when stock is low or very high
  marginTarget: number      // Target margin percentage
  competitorAvg?: number    // Average competitor price if available
  seasonality: number       // 0-1, seasonal demand modifier
}

export interface PricingRecommendation {
  productId: string
  productTitle: string
  currentPrice: number
  recommendedPrice: number
  priceChange: number
  changePercent: number
  reason: string
  confidence: number // 0-1
  factors: PricingFactors
}

interface ProductRow {
  id: string
  title: string
  price: number
  compare_at_price: number | null
  cost_price: number | null
  quantity: number
  status: string
  categories: string[] | null
  tags: string[] | null
}

interface PriceHistoryEntry {
  productId: string
  productTitle: string
  oldPrice: number
  newPrice: number
  change: number
  changePercent: number
  reason: string
  appliedAt: string
  appliedBy: 'agent' | 'merchant'
}

// ---- Pricing Constraints (per-store configurable) ----

export interface PricingConstraints {
  /** Maximum price increase allowed in a single change (default: 0.30 = 30%) */
  max_increase_percent: number
  /** Maximum discount from compare_at_price (default: 0.50 = 50%) */
  max_discount_from_compare: number
  /** Minimum confidence to include in recommendations (default: 0.3) */
  min_recommendation_confidence: number
  /** Default margin target when cost_price is available (default: 0.35 = 35%) */
  default_margin_target: number
}

/** Default pricing constraints — used when store has no overrides */
export const DEFAULT_PRICING_CONSTRAINTS: PricingConstraints = {
  max_increase_percent: 0.30,
  max_discount_from_compare: 0.50,
  min_recommendation_confidence: 0.3,
  default_margin_target: 0.35,
}

/**
 * Resolve pricing constraints for a store.
 * Falls back to DEFAULT_PRICING_CONSTRAINTS for any missing fields.
 */
function resolvePricingConstraints(
  storeOverrides?: Partial<PricingConstraints> | null
): PricingConstraints {
  if (!storeOverrides) return DEFAULT_PRICING_CONSTRAINTS
  return {
    max_increase_percent:
      storeOverrides.max_increase_percent ?? DEFAULT_PRICING_CONSTRAINTS.max_increase_percent,
    max_discount_from_compare:
      storeOverrides.max_discount_from_compare ?? DEFAULT_PRICING_CONSTRAINTS.max_discount_from_compare,
    min_recommendation_confidence:
      storeOverrides.min_recommendation_confidence ?? DEFAULT_PRICING_CONSTRAINTS.min_recommendation_confidence,
    default_margin_target:
      storeOverrides.default_margin_target ?? DEFAULT_PRICING_CONSTRAINTS.default_margin_target,
  }
}

// ---- Constants ----

/** Memory key prefix for price history entries */
const PRICE_HISTORY_PREFIX = 'price_history:'

/** Days considered "recent" for demand scoring */
const DEMAND_PERIOD_DAYS: Record<string, number> = {
  '7d': 7,
  '30d': 30,
}

// ---- Demand Scoring ----

/**
 * Calculate demand score for a product based on order velocity.
 * Returns 0-1 where 1 means extremely high demand.
 */
export async function getProductDemandScore(
  storeId: string,
  productId: string,
  period: '7d' | '30d' = '30d'
): Promise<number> {
  const supabase = getSupabaseAdmin()
  const days = DEMAND_PERIOD_DAYS[period]
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  // Count order items for this product in the period
  const { data: orderItems, error } = await supabase
    .from('order_items')
    .select('quantity, orders!inner(store_id, created_at)')
    .eq('product_id', productId)
    .eq('orders.store_id', storeId)
    .gte('orders.created_at', cutoff)

  if (error || !orderItems) return 0

  const totalUnitsSold = orderItems.reduce(
    (sum, item) => sum + ((item.quantity as number) || 1),
    0
  )

  // Calculate daily velocity
  const dailyVelocity = totalUnitsSold / days

  // Normalize: 0 orders/day = 0, 10+ orders/day = 1.0
  // Using sigmoid-like scaling for smooth curve
  const score = Math.min(1, dailyVelocity / 10)

  return Math.round(score * 100) / 100
}

/**
 * Calculate inventory pressure for a product.
 * Returns 0-1 where:
 *  - Near 0 = normal stock levels
 *  - Near 1 = very low stock (price up) OR very high stock (price down)
 * The sign of the pricing action is determined separately.
 */
function calculateInventoryPressure(quantity: number): {
  pressure: number
  direction: 'increase' | 'decrease' | 'neutral'
} {
  if (quantity <= 0) {
    // Out of stock - no pricing action possible
    return { pressure: 0, direction: 'neutral' }
  }

  if (quantity <= 5) {
    // Very low stock - strong pressure to increase price
    return { pressure: 0.9, direction: 'increase' }
  }

  if (quantity <= 15) {
    // Low stock - moderate pressure to increase
    return { pressure: 0.5, direction: 'increase' }
  }

  if (quantity >= 200) {
    // Very high stock - strong pressure to decrease price
    return { pressure: 0.8, direction: 'decrease' }
  }

  if (quantity >= 100) {
    // High stock - moderate pressure to decrease
    return { pressure: 0.5, direction: 'decrease' }
  }

  // Normal stock levels (16-99)
  return { pressure: 0.1, direction: 'neutral' }
}

/**
 * Calculate a seasonality modifier based on month.
 * Returns 0-1 where higher means more seasonal demand expected.
 */
function calculateSeasonality(): number {
  const month = new Date().getMonth() // 0-11
  // Peak months: November (10), December (11), January (0) for sales
  const peakMonths = [10, 11, 0, 1] // Nov, Dec, Jan, Feb
  const moderateMonths = [2, 3, 8, 9] // Mar, Apr, Sep, Oct

  if (peakMonths.includes(month)) return 0.8
  if (moderateMonths.includes(month)) return 0.5
  return 0.3
}

// ---- Optimal Price Calculation ----

/**
 * Calculate the optimal price for a product given pricing factors.
 */
export function calculateOptimalPrice(
  product: ProductRow,
  factors: PricingFactors,
  constraints: PricingConstraints = DEFAULT_PRICING_CONSTRAINTS
): { price: number; reason: string; confidence: number } {
  const currentPrice = product.price
  const costPrice = product.cost_price
  const compareAtPrice = product.compare_at_price

  let adjustmentPercent = 0
  const reasons: string[] = []
  let confidence = 0.5

  // Factor 1: Demand-driven adjustment
  if (factors.demandScore >= 0.7) {
    adjustmentPercent += 0.10 + (factors.demandScore - 0.7) * 0.33 // 10-20% increase
    reasons.push(`high demand (score: ${factors.demandScore})`)
    confidence += 0.15
  } else if (factors.demandScore <= 0.1) {
    adjustmentPercent -= 0.10 + (0.1 - factors.demandScore) * 0.5 // 10-15% decrease
    reasons.push(`low demand (score: ${factors.demandScore})`)
    confidence += 0.10
  }

  // Factor 2: Inventory pressure
  if (factors.inventoryPressure >= 0.5) {
    const inventory = calculateInventoryPressure(product.quantity)
    if (inventory.direction === 'increase') {
      adjustmentPercent += factors.inventoryPressure * 0.15 // Up to 15% increase
      reasons.push(`low stock pressure (${product.quantity} units)`)
      confidence += 0.10
    } else if (inventory.direction === 'decrease') {
      adjustmentPercent -= factors.inventoryPressure * 0.20 // Up to 20% decrease
      reasons.push(`high stock pressure (${product.quantity} units)`)
      confidence += 0.10
    }
  }

  // Factor 3: Competitor pricing
  if (factors.competitorAvg && factors.competitorAvg > 0) {
    const priceDiff = (factors.competitorAvg - currentPrice) / currentPrice
    if (priceDiff > 0.1) {
      // We're more than 10% cheaper than competitors
      adjustmentPercent += Math.min(priceDiff * 0.5, 0.15) // Move up to 50% of the gap, max 15%
      reasons.push(`below competitor avg (${factors.competitorAvg.toFixed(2)})`)
      confidence += 0.15
    } else if (priceDiff < -0.1) {
      // We're more than 10% more expensive
      adjustmentPercent += Math.max(priceDiff * 0.3, -0.10) // Move 30% of the gap, max -10%
      reasons.push(`above competitor avg (${factors.competitorAvg.toFixed(2)})`)
      confidence += 0.10
    }
  }

  // Factor 4: Seasonality
  if (factors.seasonality >= 0.7 && factors.demandScore >= 0.5) {
    adjustmentPercent += 0.05 // Small seasonal bump during peak + decent demand
    reasons.push('peak season boost')
  }

  // Factor 5: Margin target (if cost is known)
  if (costPrice && costPrice > 0 && factors.marginTarget > 0) {
    const currentMargin = (currentPrice - costPrice) / currentPrice
    const targetPrice = costPrice / (1 - factors.marginTarget)

    if (currentMargin < factors.marginTarget * 0.8) {
      // Margin is significantly below target - nudge price up
      const marginGap = (targetPrice - currentPrice) / currentPrice
      adjustmentPercent += Math.min(marginGap * 0.3, 0.10) // Gradual, max 10%
      reasons.push(`margin below target (${(currentMargin * 100).toFixed(1)}% vs ${(factors.marginTarget * 100).toFixed(1)}%)`)
      confidence += 0.10
    }
  }

  // ---- Apply constraints ----

  // Cap the increase at the configured max
  if (adjustmentPercent > constraints.max_increase_percent) {
    adjustmentPercent = constraints.max_increase_percent
  }

  let recommendedPrice = currentPrice * (1 + adjustmentPercent)

  // Never go below cost price
  if (costPrice && costPrice > 0 && recommendedPrice < costPrice) {
    recommendedPrice = costPrice * 1.05 // At least 5% above cost
    reasons.push('floored at cost + 5%')
  }

  // Never discount more than the configured max from compare_at_price
  if (compareAtPrice && compareAtPrice > 0) {
    const minFromCompare = compareAtPrice * (1 - constraints.max_discount_from_compare)
    if (recommendedPrice < minFromCompare) {
      recommendedPrice = minFromCompare
      reasons.push(`floored at 50% off compare price (${compareAtPrice.toFixed(2)})`)
    }
  }

  // Round to 2 decimal places
  recommendedPrice = Math.round(recommendedPrice * 100) / 100

  // Clamp confidence to 0-1
  confidence = Math.min(1, Math.max(0, confidence))

  // If change is very small (< 1%), skip
  const changePct = Math.abs((recommendedPrice - currentPrice) / currentPrice)
  if (changePct < 0.01) {
    return { price: currentPrice, reason: 'Price is already optimal', confidence: 0.1 }
  }

  const reason = reasons.length > 0
    ? reasons.join('; ')
    : 'General market adjustment'

  return { price: recommendedPrice, reason, confidence }
}

// ---- Main Analysis Function ----

/**
 * Scan all products in a store for dynamic pricing opportunities.
 */
export async function analyzePricingOpportunities(
  storeId: string,
  storeConstraints?: Partial<PricingConstraints> | null
): Promise<PricingRecommendation[]> {
  const supabase = getSupabaseAdmin()
  const constraints = resolvePricingConstraints(storeConstraints)

  // Fetch all active products with pricing data
  const { data: products, error } = await supabase
    .from('products')
    .select('id, title, price, compare_at_price, cost_price, quantity, status, categories, tags')
    .eq('store_id', storeId)
    .eq('status', 'active')
    .gt('price', 0)
    .order('price', { ascending: false })
    .limit(100)

  if (error || !products || products.length === 0) {
    return []
  }

  // Fetch competitor prices for this store (if any)
  const competitorData = await getCompetitorPriceMap(storeId)

  const seasonality = calculateSeasonality()
  const recommendations: PricingRecommendation[] = []

  for (const product of products as ProductRow[]) {
    // Calculate demand score
    const demandScore = await getProductDemandScore(storeId, product.id, '30d')

    // Calculate inventory pressure
    const inventory = calculateInventoryPressure(product.quantity)

    // Get competitor average if available
    const competitorAvg = competitorData.get(product.id)

    // Determine margin target
    const marginTarget = product.cost_price && product.cost_price > 0
      ? constraints.default_margin_target
      : 0

    const factors: PricingFactors = {
      demandScore,
      inventoryPressure: inventory.pressure,
      marginTarget,
      competitorAvg,
      seasonality,
    }

    const { price: recommendedPrice, reason, confidence } = calculateOptimalPrice(product, factors, constraints)

    // Skip if no meaningful change or low confidence
    if (
      recommendedPrice === product.price ||
      confidence < constraints.min_recommendation_confidence
    ) {
      continue
    }

    const priceChange = recommendedPrice - product.price
    const changePercent = (priceChange / product.price) * 100

    recommendations.push({
      productId: product.id,
      productTitle: product.title,
      currentPrice: product.price,
      recommendedPrice,
      priceChange: Math.round(priceChange * 100) / 100,
      changePercent: Math.round(changePercent * 10) / 10,
      reason,
      confidence,
      factors,
    })
  }

  // Sort by absolute potential impact (price change * confidence)
  recommendations.sort(
    (a, b) =>
      Math.abs(b.priceChange) * b.confidence - Math.abs(a.priceChange) * a.confidence
  )

  return recommendations
}

// ---- Price Application ----

/**
 * Apply a price change to a product and record it in history.
 */
export async function applyPriceChange(
  storeId: string,
  productId: string,
  newPrice: number,
  reason: string = 'Dynamic pricing adjustment',
  storeConstraints?: Partial<PricingConstraints> | null
): Promise<{ success: boolean; summary: string; data?: Record<string, unknown> }> {
  const supabase = getSupabaseAdmin()
  const constraints = resolvePricingConstraints(storeConstraints)

  // Fetch current product
  const { data: product, error: fetchError } = await supabase
    .from('products')
    .select('id, title, price, compare_at_price, cost_price, store_id')
    .eq('id', productId)
    .eq('store_id', storeId)
    .single()

  if (fetchError || !product) {
    return { success: false, summary: `Product ${productId} not found in store` }
  }

  const oldPrice = product.price

  // Validate constraints
  if (product.cost_price && product.cost_price > 0 && newPrice < product.cost_price) {
    return {
      success: false,
      summary: `Cannot set price (${newPrice}) below cost price (${product.cost_price})`,
    }
  }

  const increasePercent = (newPrice - oldPrice) / oldPrice
  if (increasePercent > constraints.max_increase_percent) {
    return {
      success: false,
      summary: `Price increase of ${(increasePercent * 100).toFixed(1)}% exceeds maximum allowed (${constraints.max_increase_percent * 100}%)`,
    }
  }

  if (product.compare_at_price && product.compare_at_price > 0) {
    const minAllowed = product.compare_at_price * (1 - constraints.max_discount_from_compare)
    if (newPrice < minAllowed) {
      return {
        success: false,
        summary: `Price (${newPrice}) would exceed 50% discount from compare-at price (${product.compare_at_price})`,
      }
    }
  }

  // Apply the price change
  const { error: updateError } = await supabase
    .from('products')
    .update({ price: newPrice, updated_at: new Date().toISOString() })
    .eq('id', productId)
    .eq('store_id', storeId)

  if (updateError) {
    return { success: false, summary: `Failed to update price: ${updateError.message}` }
  }

  // Record in price history
  const historyEntry: PriceHistoryEntry = {
    productId,
    productTitle: product.title,
    oldPrice,
    newPrice,
    change: Math.round((newPrice - oldPrice) * 100) / 100,
    changePercent: Math.round(((newPrice - oldPrice) / oldPrice) * 100 * 10) / 10,
    reason,
    appliedAt: new Date().toISOString(),
    appliedBy: 'agent',
  }

  const historyKey = `${PRICE_HISTORY_PREFIX}${productId}:${Date.now()}`

  await storeMemory({
    store_id: storeId,
    agent_type: 'sales',
    memory_type: 'context',
    memory_key: historyKey,
    memory_value: historyEntry as unknown as Record<string, unknown>,
    confidence: 1.0,
    source: 'data_analysis',
  })

  const changeDir = newPrice > oldPrice ? 'increased' : 'decreased'
  const changePct = Math.abs(historyEntry.changePercent)

  return {
    success: true,
    summary: `Price for "${product.title}" ${changeDir} from ${oldPrice.toFixed(2)} to ${newPrice.toFixed(2)} (${changePct}%)`,
    data: {
      productId,
      productTitle: product.title,
      oldPrice,
      newPrice,
      change: historyEntry.change,
      changePercent: historyEntry.changePercent,
      reason,
    },
  }
}

// ---- Price History ----

/**
 * Get price change history for a product.
 */
export async function getPricingHistory(
  storeId: string,
  productId: string
): Promise<PriceHistoryEntry[]> {
  const memories = await getMemories({
    store_id: storeId,
    agent_type: 'sales',
    memory_type: 'context',
    limit: 200,
  })

  const prefix = `${PRICE_HISTORY_PREFIX}${productId}:`

  return memories
    .filter(m => m.memory_key.startsWith(prefix))
    .map(m => m.memory_value as unknown as PriceHistoryEntry)
    .sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime())
}

// ---- Helper: Competitor Price Map ----

/**
 * Build a map of productId -> average competitor price from stored competitor data.
 */
async function getCompetitorPriceMap(storeId: string): Promise<Map<string, number>> {
  const memories = await getMemories({
    store_id: storeId,
    agent_type: 'sales',
    memory_type: 'context',
    limit: 500,
  })

  const priceMap = new Map<string, number[]>()

  for (const m of memories) {
    if (m.memory_key.startsWith('competitor_price:')) {
      const entry = m.memory_value as unknown as {
        productId: string
        price: number
      }
      if (entry.productId && typeof entry.price === 'number') {
        const existing = priceMap.get(entry.productId) || []
        existing.push(entry.price)
        priceMap.set(entry.productId, existing)
      }
    }
  }

  const avgMap = new Map<string, number>()
  for (const [productId, prices] of priceMap.entries()) {
    const avg = prices.reduce((s, p) => s + p, 0) / prices.length
    avgMap.set(productId, Math.round(avg * 100) / 100)
  }

  return avgMap
}
