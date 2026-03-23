// src/lib/agents/sales/competitor-monitor.ts
// Competitor price monitoring framework for the Sales Agent

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { storeMemory, getMemories } from '../memory'

// ---- Types ----

export interface CompetitorPriceEntry {
  productId: string
  source: string
  price: number
  url?: string
  lastChecked: string
}

export interface CompetitorPrice {
  productId: string
  productTitle: string
  ourPrice: number
  competitorPrices: Array<{
    source: string
    price: number
    url?: string
    lastChecked: string
  }>
  avgCompetitorPrice: number
  pricePosition: 'cheapest' | 'below_avg' | 'average' | 'above_avg' | 'most_expensive'
  suggestedAction: string
}

export interface CompetitivePricingAnalysis {
  storeId: string
  analyzedAt: string
  totalProducts: number
  productsWithCompetitorData: number
  pricePositionBreakdown: Record<CompetitorPrice['pricePosition'], number>
  products: CompetitorPrice[]
  overallStrategy: string
}

// ---- Constants ----

const COMPETITOR_PRICE_PREFIX = 'competitor_price:'

// ---- Core Functions ----

/**
 * Get stored competitor prices for a store, optionally filtered to a single product.
 */
export async function getCompetitorPrices(
  storeId: string,
  productId?: string
): Promise<CompetitorPrice[]> {
  const supabase = getSupabaseAdmin()

  // Fetch our products
  let productQuery = supabase
    .from('products')
    .select('id, title, price')
    .eq('store_id', storeId)
    .eq('status', 'active')

  if (productId) {
    productQuery = productQuery.eq('id', productId)
  }

  const { data: products, error: productError } = await productQuery.limit(200)

  if (productError || !products || products.length === 0) {
    return []
  }

  // Fetch all competitor price memories for this store
  const memories = await getMemories({
    store_id: storeId,
    agent_type: 'sales',
    memory_type: 'context',
    limit: 1000,
  })

  // Build a map of productId -> competitor entries
  const competitorMap = new Map<string, CompetitorPriceEntry[]>()

  for (const m of memories) {
    if (!m.memory_key.startsWith(COMPETITOR_PRICE_PREFIX)) continue

    const entry = m.memory_value as unknown as CompetitorPriceEntry
    if (!entry.productId || typeof entry.price !== 'number') continue

    // If filtering by productId, skip non-matching entries
    if (productId && entry.productId !== productId) continue

    const existing = competitorMap.get(entry.productId) || []
    existing.push(entry)
    competitorMap.set(entry.productId, existing)
  }

  const results: CompetitorPrice[] = []

  for (const product of products) {
    const entries = competitorMap.get(product.id)
    if (!entries || entries.length === 0) continue

    // Deduplicate by source (keep most recent per source)
    const bySource = new Map<string, CompetitorPriceEntry>()
    for (const e of entries) {
      const existing = bySource.get(e.source)
      if (!existing || new Date(e.lastChecked) > new Date(existing.lastChecked)) {
        bySource.set(e.source, e)
      }
    }

    const dedupedEntries = Array.from(bySource.values())
    const competitorPrices = dedupedEntries.map(e => ({
      source: e.source,
      price: e.price,
      url: e.url,
      lastChecked: e.lastChecked,
    }))

    const avgCompetitorPrice =
      competitorPrices.reduce((s, c) => s + c.price, 0) / competitorPrices.length

    const pricePosition = determinePricePosition(product.price, avgCompetitorPrice, competitorPrices)
    const suggestedAction = getSuggestedAction(pricePosition, product.price, avgCompetitorPrice)

    results.push({
      productId: product.id,
      productTitle: product.title,
      ourPrice: product.price,
      competitorPrices,
      avgCompetitorPrice: Math.round(avgCompetitorPrice * 100) / 100,
      pricePosition,
      suggestedAction,
    })
  }

  return results
}

/**
 * Add a competitor price data point.
 */
export async function addCompetitorPrice(
  storeId: string,
  data: { productId: string; source: string; price: number; url?: string }
): Promise<{ success: boolean; summary: string }> {
  const supabase = getSupabaseAdmin()

  // Verify the product exists in this store
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, title, price')
    .eq('id', data.productId)
    .eq('store_id', storeId)
    .single()

  if (productError || !product) {
    return { success: false, summary: `Product ${data.productId} not found in store` }
  }

  if (data.price <= 0) {
    return { success: false, summary: 'Competitor price must be greater than 0' }
  }

  const entry: CompetitorPriceEntry = {
    productId: data.productId,
    source: data.source.trim(),
    price: data.price,
    url: data.url?.trim(),
    lastChecked: new Date().toISOString(),
  }

  // Use a key that allows multiple sources per product
  // Source name is sanitized to create a stable key for upsert
  const sanitizedSource = data.source.toLowerCase().replace(/[^a-z0-9]/g, '_')
  const memoryKey = `${COMPETITOR_PRICE_PREFIX}${data.productId}:${sanitizedSource}`

  await storeMemory({
    store_id: storeId,
    agent_type: 'sales',
    memory_type: 'context',
    memory_key: memoryKey,
    memory_value: entry as unknown as Record<string, unknown>,
    confidence: 1.0,
    source: 'explicit_config',
  })

  const diff = data.price - product.price
  const diffPercent = ((diff / product.price) * 100).toFixed(1)
  const comparison = diff > 0
    ? `${diffPercent}% higher than our price`
    : diff < 0
      ? `${Math.abs(Number(diffPercent))}% lower than our price`
      : 'same as our price'

  return {
    success: true,
    summary: `Added competitor price for "${product.title}" from ${data.source}: ${data.price.toFixed(2)} (${comparison})`,
  }
}

/**
 * Analyze competitive pricing across the store and generate a strategic overview.
 */
export async function analyzeCompetitivePricing(
  storeId: string
): Promise<CompetitivePricingAnalysis> {
  const supabase = getSupabaseAdmin()

  // Count total active products
  const { count: totalProducts } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('store_id', storeId)
    .eq('status', 'active')

  // Get all competitor price data
  const products = await getCompetitorPrices(storeId)

  const breakdown: Record<CompetitorPrice['pricePosition'], number> = {
    cheapest: 0,
    below_avg: 0,
    average: 0,
    above_avg: 0,
    most_expensive: 0,
  }

  for (const p of products) {
    breakdown[p.pricePosition]++
  }

  const overallStrategy = generateOverallStrategy(breakdown, products.length)

  return {
    storeId,
    analyzedAt: new Date().toISOString(),
    totalProducts: totalProducts || 0,
    productsWithCompetitorData: products.length,
    pricePositionBreakdown: breakdown,
    products,
    overallStrategy,
  }
}

/**
 * Get an AI-generated pricing strategy recommendation for a specific product.
 */
export async function getPricingStrategy(
  storeId: string,
  productId: string
): Promise<{ success: boolean; strategy: string; data?: CompetitorPrice }> {
  // Get competitor data for this product
  const competitorData = await getCompetitorPrices(storeId, productId)

  if (competitorData.length === 0) {
    return {
      success: false,
      strategy: 'No competitor price data available for this product. Add competitor prices first to get a pricing strategy.',
    }
  }

  const product = competitorData[0]

  // Use AI to generate strategy
  try {
    const { generateText } = await import('ai')
    const { getModelForTier } = await import('../model-router')
    const model = getModelForTier('fast')

    const prompt = `You are a pricing strategist for an e-commerce store. Analyze this competitive pricing data and provide a concise, actionable pricing recommendation.

Product: "${product.productTitle}"
Our Price: ${product.ourPrice.toFixed(2)}
Average Competitor Price: ${product.avgCompetitorPrice.toFixed(2)}
Price Position: ${product.pricePosition}

Competitor Prices:
${product.competitorPrices.map(c => `- ${c.source}: ${c.price.toFixed(2)}${c.url ? ` (${c.url})` : ''}`).join('\n')}

Provide:
1. A brief assessment of our competitive position (1-2 sentences)
2. A specific pricing recommendation with reasoning (1-2 sentences)
3. Any additional tactical advice (1 sentence)

Keep it under 150 words total. Be specific with numbers.`

    const result = await generateText({
      model,
      prompt,
    })

    return {
      success: true,
      strategy: result.text,
      data: product,
    }
  } catch (error) {
    // Fallback to rule-based strategy if AI fails
    const fallbackStrategy = generateFallbackStrategy(product)
    return {
      success: true,
      strategy: fallbackStrategy,
      data: product,
    }
  }
}

// ---- Helper Functions ----

/**
 * Determine price position relative to competitors.
 */
function determinePricePosition(
  ourPrice: number,
  avgCompetitorPrice: number,
  competitorPrices: Array<{ price: number }>
): CompetitorPrice['pricePosition'] {
  const allPrices = competitorPrices.map(c => c.price)
  const minCompetitor = Math.min(...allPrices)
  const maxCompetitor = Math.max(...allPrices)

  if (ourPrice < minCompetitor) return 'cheapest'
  if (ourPrice > maxCompetitor) return 'most_expensive'

  const ratio = ourPrice / avgCompetitorPrice
  if (ratio < 0.95) return 'below_avg'
  if (ratio > 1.05) return 'above_avg'
  return 'average'
}

/**
 * Generate a suggested action based on price position.
 */
function getSuggestedAction(
  position: CompetitorPrice['pricePosition'],
  ourPrice: number,
  avgCompetitorPrice: number
): string {
  const diff = Math.abs(ourPrice - avgCompetitorPrice)
  const diffPercent = ((diff / avgCompetitorPrice) * 100).toFixed(1)

  switch (position) {
    case 'cheapest':
      return `Consider raising price — you're the cheapest by ${diffPercent}%. Room to increase margins while staying competitive.`
    case 'below_avg':
      return `Good competitive position at ${diffPercent}% below average. Consider holding or small increase for better margins.`
    case 'average':
      return 'Price is competitive. Focus on value-adds (shipping, service) to differentiate.'
    case 'above_avg':
      return `Priced ${diffPercent}% above average. Ensure premium positioning justifies the difference, or consider a small reduction.`
    case 'most_expensive':
      return `Highest price in market by ${diffPercent}%. Review pricing strategy — markdown may be needed unless brand justifies premium.`
  }
}

/**
 * Generate an overall pricing strategy summary.
 */
function generateOverallStrategy(
  breakdown: Record<CompetitorPrice['pricePosition'], number>,
  totalWithData: number
): string {
  if (totalWithData === 0) {
    return 'No competitor data available. Add competitor prices for your products to get strategic recommendations.'
  }

  const parts: string[] = []

  const cheapestPct = totalWithData > 0 ? (breakdown.cheapest / totalWithData) * 100 : 0
  const expensivePct = totalWithData > 0
    ? ((breakdown.above_avg + breakdown.most_expensive) / totalWithData) * 100
    : 0

  if (cheapestPct > 50) {
    parts.push('Majority of products are priced below competitors — opportunity to increase margins.')
  } else if (expensivePct > 50) {
    parts.push('Majority of products are priced above competitors — review for potential markdowns or ensure premium positioning.')
  } else {
    parts.push('Pricing is generally competitive across the product range.')
  }

  parts.push(
    `Position breakdown: ${breakdown.cheapest} cheapest, ${breakdown.below_avg} below avg, ${breakdown.average} average, ${breakdown.above_avg} above avg, ${breakdown.most_expensive} most expensive.`
  )

  return parts.join(' ')
}

/**
 * Fallback rule-based strategy when AI is unavailable.
 */
function generateFallbackStrategy(product: CompetitorPrice): string {
  const diff = product.avgCompetitorPrice - product.ourPrice
  const diffPercent = ((diff / product.ourPrice) * 100).toFixed(1)

  switch (product.pricePosition) {
    case 'cheapest':
      return `Your price of ${product.ourPrice.toFixed(2)} is the lowest among ${product.competitorPrices.length} competitors (avg: ${product.avgCompetitorPrice.toFixed(2)}). Consider increasing by 5-10% to improve margins while remaining competitive. You have ${diffPercent}% room before reaching the competitor average.`
    case 'below_avg':
      return `Your price of ${product.ourPrice.toFixed(2)} is ${Math.abs(Number(diffPercent))}% below the competitor average of ${product.avgCompetitorPrice.toFixed(2)}. This is a strong competitive position. Hold steady or increase slightly (2-5%) to capture additional margin.`
    case 'average':
      return `Your price of ${product.ourPrice.toFixed(2)} is in line with the competitor average of ${product.avgCompetitorPrice.toFixed(2)}. Differentiate through service quality, shipping speed, or product bundling rather than price adjustments.`
    case 'above_avg':
      return `Your price of ${product.ourPrice.toFixed(2)} is ${Math.abs(Number(diffPercent))}% above the competitor average of ${product.avgCompetitorPrice.toFixed(2)}. Consider a 3-7% reduction or justify the premium with better product descriptions and social proof.`
    case 'most_expensive':
      return `Your price of ${product.ourPrice.toFixed(2)} is the highest among ${product.competitorPrices.length} competitors (avg: ${product.avgCompetitorPrice.toFixed(2)}). Strongly consider a price reduction of 5-15% to remain competitive, unless your brand commands a clear premium.`
  }
}
