// src/lib/agents/sales/tools.ts
// Sales Agent tool definitions

import { z } from 'zod'
import type { AgentToolConfig, AgentExecutionContext } from '../base-agent'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { sendRecoveryEmail } from '@/lib/cart/abandoned-cart'
import { getRecommendations } from '@/lib/ai/recommendations'
import { segmentCustomers } from './segmentation'
import { createCampaign, getCampaigns, updateCampaignStats } from './campaign-engine'
import {
  analyzePricingOpportunities,
  applyPriceChange,
  getPricingHistory,
} from './dynamic-pricing'
import {
  getCompetitorPrices as fetchCompetitorPrices,
  addCompetitorPrice as insertCompetitorPrice,
  analyzeCompetitivePricing as runCompetitivePricingAnalysis,
  getPricingStrategy,
} from './competitor-monitor'

// ---- Tool: getAbandonedCarts ----

const getAbandonedCartsSchema = z.object({
  storeId: z.string().describe('The store ID'),
  minValue: z.number().optional().describe('Minimum cart value to filter'),
  maxAge: z.number().optional().describe('Maximum age in hours'),
})

async function executeGetAbandonedCarts(
  args: Record<string, unknown>,
  _context: AgentExecutionContext
) {
  const { storeId, minValue, maxAge } = args as z.infer<typeof getAbandonedCartsSchema>
  const supabase = getSupabaseAdmin()

  let query = supabase
    .from('abandoned_carts')
    .select('id, email, items, subtotal, item_count, recovery_status, recovery_emails_sent, created_at, updated_at')
    .eq('store_id', storeId)
    .eq('recovery_status', 'active')
    .order('subtotal', { ascending: false })

  if (minValue) {
    query = query.gte('subtotal', minValue)
  }

  if (maxAge) {
    const cutoff = new Date(Date.now() - maxAge * 60 * 60 * 1000).toISOString()
    query = query.gte('created_at', cutoff)
  }

  const { data: carts, error } = await query.limit(50)

  if (error) {
    return { success: false, summary: `Failed to fetch abandoned carts: ${error.message}` }
  }

  const totalValue = (carts || []).reduce((sum, c) => sum + (c.subtotal || 0), 0)

  return {
    success: true,
    data: { carts: carts || [], totalValue, count: (carts || []).length },
    summary: `Found ${(carts || []).length} abandoned carts worth $${totalValue.toFixed(2)} total`,
    relatedEntityType: 'abandoned_cart',
  }
}

// ---- Tool: sendRecoveryEmailTool ----

const sendRecoveryEmailSchema = z.object({
  storeId: z.string().describe('The store ID'),
  cartId: z.string().describe('The abandoned cart ID to send recovery email for'),
  discountPercent: z.number().optional().describe('Optional discount percentage to include'),
  customSubject: z.string().optional().describe('Custom email subject line'),
})

async function executeSendRecoveryEmail(
  args: Record<string, unknown>,
  _context: AgentExecutionContext
) {
  const { storeId, cartId, discountPercent } = args as z.infer<typeof sendRecoveryEmailSchema>
  const supabase = getSupabaseAdmin()

  // Fetch the cart
  const { data: cart, error: cartError } = await supabase
    .from('abandoned_carts')
    .select('*')
    .eq('id', cartId)
    .eq('store_id', storeId)
    .single()

  if (cartError || !cart) {
    return { success: false, summary: `Cart ${cartId} not found` }
  }

  if (cart.recovery_emails_sent >= 3) {
    return { success: false, summary: `Cart ${cartId} has already received 3 recovery emails (max reached)` }
  }

  if (cart.recovery_status !== 'active') {
    return { success: false, summary: `Cart ${cartId} is not active (status: ${cart.recovery_status})` }
  }

  // Fetch store info
  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('id, name, slug')
    .eq('id', storeId)
    .single()

  if (storeError || !store) {
    return { success: false, summary: 'Store not found' }
  }

  const sequenceNumber = (cart.recovery_emails_sent + 1) as 1 | 2 | 3

  // Generate a discount code if a discount was specified
  let discountCode: string | undefined
  if (discountPercent) {
    discountCode = `SAVE${discountPercent}-${Date.now().toString(36).toUpperCase()}`

    // Create the coupon in the database
    await supabase.from('coupons').insert({
      store_id: storeId,
      code: discountCode,
      discount_type: 'percentage',
      discount_value: discountPercent,
      usage_limit: 1,
      active: true,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
  }

  const result = await sendRecoveryEmail({
    cart,
    store: { id: store.id, name: store.name, slug: store.slug },
    sequenceNumber,
    discountCode,
    discountPercentage: discountPercent,
  })

  if (!result.success) {
    return { success: false, summary: `Failed to send recovery email for cart ${cartId}` }
  }

  return {
    success: true,
    data: { cartId, email: cart.email, sequenceNumber, discountPercent, discountCode },
    summary: `Sent recovery email #${sequenceNumber} to ${cart.email}${discountPercent ? ` with ${discountPercent}% discount` : ''}`,
    relatedEntityType: 'abandoned_cart',
    relatedEntityId: cartId,
  }
}

// ---- Tool: createCoupon ----

const createCouponSchema = z.object({
  storeId: z.string().describe('The store ID'),
  code: z.string().describe('Coupon code'),
  discountType: z.enum(['percentage', 'fixed_amount', 'free_shipping']).describe('Type of discount'),
  discountValue: z.number().describe('Discount value (percentage or fixed amount)'),
  expiresInDays: z.number().optional().describe('Number of days until expiry'),
  usageLimit: z.number().optional().describe('Maximum number of uses'),
})

async function executeCreateCoupon(
  args: Record<string, unknown>,
  _context: AgentExecutionContext
) {
  const { storeId, code, discountType, discountValue, expiresInDays, usageLimit } =
    args as z.infer<typeof createCouponSchema>
  const supabase = getSupabaseAdmin()

  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null

  const { data: coupon, error } = await supabase
    .from('coupons')
    .insert({
      store_id: storeId,
      code: code.toUpperCase(),
      discount_type: discountType,
      discount_value: discountValue,
      usage_limit: usageLimit || null,
      usage_count: 0,
      active: true,
      expires_at: expiresAt,
    })
    .select('id, code')
    .single()

  if (error) {
    return { success: false, summary: `Failed to create coupon: ${error.message}` }
  }

  return {
    success: true,
    data: { couponId: coupon.id, code: coupon.code, discountType, discountValue, expiresAt },
    summary: `Created coupon ${coupon.code}: ${discountType === 'percentage' ? `${discountValue}%` : discountType === 'free_shipping' ? 'free shipping' : `$${discountValue}`} off${expiresInDays ? `, expires in ${expiresInDays} days` : ''}`,
    relatedEntityType: 'coupon',
    relatedEntityId: coupon.id,
  }
}

// ---- Tool: getCustomerSegments ----

const getCustomerSegmentsSchema = z.object({
  storeId: z.string().describe('The store ID'),
})

async function executeGetCustomerSegments(
  args: Record<string, unknown>,
  _context: AgentExecutionContext
) {
  const { storeId } = args as z.infer<typeof getCustomerSegmentsSchema>

  try {
    const segments = await segmentCustomers(storeId)

    const totalCustomers = segments.reduce((sum, s) => sum + s.count, 0)
    const segmentSummary = segments.map(s => `${s.segment}: ${s.count}`).join(', ')

    return {
      success: true,
      data: { segments, totalCustomers },
      summary: `Segmented ${totalCustomers} customers: ${segmentSummary}`,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, summary: `Failed to segment customers: ${msg}` }
  }
}

// ---- Tool: getProductRecommendations ----

const getProductRecommendationsSchema = z.object({
  storeId: z.string().describe('The store ID'),
  productId: z.string().optional().describe('Product ID to get recommendations for'),
  customerId: z.string().optional().describe('Customer ID for personalized recommendations'),
  limit: z.number().optional().describe('Maximum number of recommendations'),
})

async function executeGetProductRecommendations(
  args: Record<string, unknown>,
  _context: AgentExecutionContext
) {
  const { storeId, productId, customerId, limit } =
    args as z.infer<typeof getProductRecommendationsSchema>

  try {
    const recommendations = await getRecommendations({
      storeId,
      productId,
      customerId,
      limit: limit || 4,
      type: productId ? 'similar' : customerId ? 'personalized' : 'trending',
    })

    return {
      success: true,
      data: { recommendations, count: recommendations.length },
      summary: `Generated ${recommendations.length} product recommendations${productId ? ` for product ${productId}` : customerId ? ` for customer ${customerId}` : ' (trending)'}`,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, summary: `Failed to get recommendations: ${msg}` }
  }
}

// ---- Tool: analyzeCartValue ----

const analyzeCartValueSchema = z.object({
  storeId: z.string().describe('The store ID'),
})

async function executeAnalyzeCartValue(
  args: Record<string, unknown>,
  _context: AgentExecutionContext
) {
  const { storeId } = args as z.infer<typeof analyzeCartValueSchema>
  const supabase = getSupabaseAdmin()

  // Get all abandoned carts (active and recovered) for analysis
  const { data: activeCarts, error: activeError } = await supabase
    .from('abandoned_carts')
    .select('subtotal, recovery_status, recovery_emails_sent')
    .eq('store_id', storeId)

  if (activeError) {
    return { success: false, summary: `Failed to analyze cart values: ${activeError.message}` }
  }

  const carts = activeCarts || []
  if (carts.length === 0) {
    return {
      success: true,
      data: { totalCarts: 0, avgValue: 0, recoveryRate: 0, potentialRevenue: 0 },
      summary: 'No abandoned carts found for this store',
    }
  }

  const activeCounts = carts.filter(c => c.recovery_status === 'active')
  const recoveredCounts = carts.filter(c => c.recovery_status === 'recovered')
  const totalValue = activeCounts.reduce((sum, c) => sum + (c.subtotal || 0), 0)
  const avgValue = activeCounts.length > 0 ? totalValue / activeCounts.length : 0
  const recoveryRate = carts.length > 0 ? recoveredCounts.length / carts.length : 0
  const avgEmailsSent =
    carts.length > 0
      ? carts.reduce((sum, c) => sum + (c.recovery_emails_sent || 0), 0) / carts.length
      : 0

  return {
    success: true,
    data: {
      totalCarts: carts.length,
      activeCarts: activeCounts.length,
      recoveredCarts: recoveredCounts.length,
      avgValue: Math.round(avgValue * 100) / 100,
      recoveryRate: Math.round(recoveryRate * 1000) / 10,
      potentialRevenue: Math.round(totalValue * 100) / 100,
      avgEmailsSent: Math.round(avgEmailsSent * 10) / 10,
    },
    summary: `Cart analysis: ${activeCounts.length} active carts worth $${totalValue.toFixed(2)} (avg $${avgValue.toFixed(2)}), ${(recoveryRate * 100).toFixed(1)}% recovery rate`,
  }
}

// ---- Tool: sendTargetedCampaign ----

const sendTargetedCampaignSchema = z.object({
  storeId: z.string().describe('The store ID'),
  segment: z.string().describe('Target customer segment (champions, loyal, potential, at_risk, dormant, new)'),
  campaignType: z.enum(['cart_recovery', 'win_back', 'upsell', 'flash_sale']).describe('Type of campaign'),
  discountPercent: z.number().optional().describe('Discount percentage to offer'),
  subject: z.string().describe('Email subject line'),
  message: z.string().describe('Email message body'),
})

async function executeSendTargetedCampaign(
  args: Record<string, unknown>,
  _context: AgentExecutionContext
) {
  const { storeId, segment, campaignType, discountPercent, subject, message } =
    args as z.infer<typeof sendTargetedCampaignSchema>

  try {
    // Get customers in the target segment
    const segments = await segmentCustomers(storeId)
    const targetSegment = segments.find(s => s.segment === segment)

    if (!targetSegment || targetSegment.count === 0) {
      return {
        success: false,
        summary: `No customers found in segment "${segment}"`,
      }
    }

    // Create a coupon code if discount is specified
    let couponCode: string | undefined
    if (discountPercent) {
      couponCode = `${campaignType.toUpperCase().replace('_', '')}-${discountPercent}-${Date.now().toString(36).toUpperCase()}`
      const supabase = getSupabaseAdmin()
      await supabase.from('coupons').insert({
        store_id: storeId,
        code: couponCode,
        discount_type: 'percentage',
        discount_value: discountPercent,
        active: true,
        expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      })
    }

    // Create campaign record
    const campaign = await createCampaign(storeId, {
      type: campaignType,
      name: `${campaignType} - ${segment} - ${new Date().toLocaleDateString()}`,
      target_segment: segment as Parameters<typeof createCampaign>[1]['target_segment'],
      discount_percent: discountPercent,
      coupon_code: couponCode,
      subject,
      message,
      end_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    })

    // Update campaign stats with target count
    await updateCampaignStats(storeId, campaign.id, {
      sent: targetSegment.count,
    })

    return {
      success: true,
      data: {
        campaignId: campaign.id,
        segment,
        targetCount: targetSegment.count,
        campaignType,
        discountPercent,
        couponCode,
        subject,
      },
      summary: `Created ${campaignType} campaign targeting ${targetSegment.count} "${segment}" customers${discountPercent ? ` with ${discountPercent}% discount (code: ${couponCode})` : ''}`,
      relatedEntityType: 'campaign',
      relatedEntityId: campaign.id,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, summary: `Failed to create campaign: ${msg}` }
  }
}

// ---- Original tools array (new tools appended after their definitions below) ----

const _originalTools: AgentToolConfig[] = [
  {
    name: 'getAbandonedCarts',
    description: 'Retrieve abandoned carts for a store, optionally filtered by minimum value and age',
    inputSchema: getAbandonedCartsSchema,
    category: 'analysis',
    riskLevel: 'low',
    execute: executeGetAbandonedCarts,
  },
  {
    name: 'sendRecoveryEmail',
    description: 'Send a recovery email to an abandoned cart customer, optionally with a discount offer',
    inputSchema: sendRecoveryEmailSchema,
    category: 'communication',
    riskLevel: 'medium',
    execute: executeSendRecoveryEmail,
  },
  {
    name: 'createCoupon',
    description: 'Create a discount coupon for the store with configurable type, value, expiry, and usage limits',
    inputSchema: createCouponSchema,
    category: 'campaign',
    riskLevel: 'high',
    execute: executeCreateCoupon,
  },
  {
    name: 'getCustomerSegments',
    description: 'Analyze and segment customers using RFM (Recency, Frequency, Monetary) scoring into Champions, Loyal, Potential, At Risk, Dormant, and New',
    inputSchema: getCustomerSegmentsSchema,
    category: 'analysis',
    riskLevel: 'low',
    execute: executeGetCustomerSegments,
  },
  {
    name: 'getProductRecommendations',
    description: 'Get AI-powered product recommendations: similar products, personalized suggestions, or trending items',
    inputSchema: getProductRecommendationsSchema,
    category: 'analysis',
    riskLevel: 'low',
    execute: executeGetProductRecommendations,
  },
  {
    name: 'analyzeCartValue',
    description: 'Analyze abandoned cart metrics: average value, recovery rate, potential revenue, and email effectiveness',
    inputSchema: analyzeCartValueSchema,
    category: 'analysis',
    riskLevel: 'low',
    execute: executeAnalyzeCartValue,
  },
  {
    name: 'sendTargetedCampaign',
    description: 'Create and send a targeted email campaign to a specific customer segment with optional discount',
    inputSchema: sendTargetedCampaignSchema,
    category: 'campaign',
    riskLevel: 'high',
    execute: executeSendTargetedCampaign,
  },
]

// ---- Tool: analyzePricing ----

const analyzePricingSchema = z.object({
  storeId: z.string().describe('The store ID to analyze pricing for'),
})

async function executeAnalyzePricing(
  args: Record<string, unknown>,
  _context: AgentExecutionContext
) {
  const { storeId } = args as z.infer<typeof analyzePricingSchema>

  try {
    const recommendations = await analyzePricingOpportunities(storeId)

    if (recommendations.length === 0) {
      return {
        success: true,
        data: { recommendations: [], count: 0 },
        summary: 'No pricing opportunities found — all products appear optimally priced',
      }
    }

    const increases = recommendations.filter(r => r.priceChange > 0)
    const decreases = recommendations.filter(r => r.priceChange < 0)
    const totalImpact = recommendations.reduce((sum, r) => sum + Math.abs(r.priceChange), 0)

    return {
      success: true,
      data: {
        recommendations,
        count: recommendations.length,
        summary: {
          increases: increases.length,
          decreases: decreases.length,
          totalImpact: Math.round(totalImpact * 100) / 100,
        },
      },
      summary: `Found ${recommendations.length} pricing opportunities: ${increases.length} price increases, ${decreases.length} markdowns. Total potential impact: $${totalImpact.toFixed(2)}`,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, summary: `Failed to analyze pricing: ${msg}` }
  }
}

// ---- Tool: applyPriceRecommendation ----

const applyPriceRecommendationSchema = z.object({
  storeId: z.string().describe('The store ID'),
  productId: z.string().describe('The product ID to update the price for'),
  newPrice: z.number().describe('The new price to set for the product'),
  reason: z.string().optional().describe('Reason for the price change'),
})

async function executeApplyPriceRecommendation(
  args: Record<string, unknown>,
  _context: AgentExecutionContext
) {
  const { storeId, productId, newPrice, reason } =
    args as z.infer<typeof applyPriceRecommendationSchema>

  try {
    const result = await applyPriceChange(
      storeId,
      productId,
      newPrice,
      reason || 'Dynamic pricing adjustment'
    )

    return {
      success: result.success,
      data: result.data,
      summary: result.summary,
      relatedEntityType: 'product',
      relatedEntityId: productId,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, summary: `Failed to apply price change: ${msg}` }
  }
}

// ---- Tool: getCompetitorPrices ----

const getCompetitorPricesSchema = z.object({
  storeId: z.string().describe('The store ID'),
  productId: z.string().optional().describe('Optional product ID to filter competitor prices for a specific product'),
})

async function executeGetCompetitorPrices(
  args: Record<string, unknown>,
  _context: AgentExecutionContext
) {
  const { storeId, productId } = args as z.infer<typeof getCompetitorPricesSchema>

  try {
    const competitorData = await fetchCompetitorPrices(storeId, productId)

    if (competitorData.length === 0) {
      return {
        success: true,
        data: { products: [], count: 0 },
        summary: productId
          ? 'No competitor price data found for this product'
          : 'No competitor price data found. Use addCompetitorPrice to add competitor pricing data.',
      }
    }

    const positions = competitorData.reduce(
      (acc, p) => {
        acc[p.pricePosition] = (acc[p.pricePosition] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    const positionSummary = Object.entries(positions)
      .map(([pos, count]) => `${count} ${pos.replace('_', ' ')}`)
      .join(', ')

    return {
      success: true,
      data: { products: competitorData, count: competitorData.length },
      summary: `Competitor data for ${competitorData.length} products: ${positionSummary}`,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, summary: `Failed to get competitor prices: ${msg}` }
  }
}

// ---- Tool: addCompetitorPrice ----

const addCompetitorPriceSchema = z.object({
  storeId: z.string().describe('The store ID'),
  productId: z.string().describe('The product ID this competitor price is for'),
  source: z.string().describe('Name of the competitor or marketplace (e.g., "Amazon", "Flipkart", "CompetitorStore")'),
  price: z.number().describe('The competitor price for this product'),
  url: z.string().optional().describe('Optional URL to the competitor product listing'),
})

async function executeAddCompetitorPrice(
  args: Record<string, unknown>,
  _context: AgentExecutionContext
) {
  const { storeId, productId, source, price, url } =
    args as z.infer<typeof addCompetitorPriceSchema>

  try {
    const result = await insertCompetitorPrice(storeId, {
      productId,
      source,
      price,
      url,
    })

    return {
      success: result.success,
      data: { productId, source, price, url },
      summary: result.summary,
      relatedEntityType: 'product',
      relatedEntityId: productId,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, summary: `Failed to add competitor price: ${msg}` }
  }
}

// ---- Tool: analyzeCompetitivePricing ----

const analyzeCompetitivePricingSchema = z.object({
  storeId: z.string().describe('The store ID to analyze competitive pricing for'),
})

async function executeAnalyzeCompetitivePricing(
  args: Record<string, unknown>,
  _context: AgentExecutionContext
) {
  const { storeId } = args as z.infer<typeof analyzeCompetitivePricingSchema>

  try {
    const analysis = await runCompetitivePricingAnalysis(storeId)

    if (analysis.productsWithCompetitorData === 0) {
      return {
        success: true,
        data: analysis,
        summary: `No competitor data available for any of the ${analysis.totalProducts} active products. Add competitor prices first.`,
      }
    }

    const { pricePositionBreakdown: b } = analysis

    return {
      success: true,
      data: analysis,
      summary: `Competitive analysis for ${analysis.productsWithCompetitorData}/${analysis.totalProducts} products: ${b.cheapest} cheapest, ${b.below_avg} below avg, ${b.average} average, ${b.above_avg} above avg, ${b.most_expensive} most expensive. ${analysis.overallStrategy}`,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, summary: `Failed to analyze competitive pricing: ${msg}` }
  }
}

// ---- Export all tools ----

export const salesTools: AgentToolConfig[] = [
  ..._originalTools,
  {
    name: 'analyzePricing',
    description: 'Scan all active products for dynamic pricing opportunities based on demand, inventory, competitor prices, margins, and seasonality',
    inputSchema: analyzePricingSchema,
    category: 'analysis',
    riskLevel: 'low',
    execute: executeAnalyzePricing,
  },
  {
    name: 'applyPriceRecommendation',
    description: 'Apply a recommended price change to a product. Enforces constraints: max 30% increase, never below cost, max 50% off compare-at price',
    inputSchema: applyPriceRecommendationSchema,
    category: 'optimization',
    riskLevel: 'high',
    execute: executeApplyPriceRecommendation,
  },
  {
    name: 'getCompetitorPrices',
    description: 'Get stored competitor price data for products, showing price positioning and suggested actions',
    inputSchema: getCompetitorPricesSchema,
    category: 'analysis',
    riskLevel: 'low',
    execute: executeGetCompetitorPrices,
  },
  {
    name: 'addCompetitorPrice',
    description: 'Add a competitor price data point for a product from a specific source/competitor',
    inputSchema: addCompetitorPriceSchema,
    category: 'analysis',
    riskLevel: 'low',
    execute: executeAddCompetitorPrice,
  },
  {
    name: 'analyzeCompetitivePricing',
    description: 'Analyze pricing across all products vs competitors with AI-generated strategy recommendations',
    inputSchema: analyzeCompetitivePricingSchema,
    category: 'analysis',
    riskLevel: 'low',
    execute: executeAnalyzeCompetitivePricing,
  },
]
