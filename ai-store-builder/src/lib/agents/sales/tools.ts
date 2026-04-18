// src/lib/agents/sales/tools.ts
// Sales Agent tool definitions

import { z } from 'zod'
import type { AgentToolConfig, AgentExecutionContext } from '../base-agent'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { sendRecoveryEmail } from '@/lib/cart/abandoned-cart'
import { getRecommendations } from '@/lib/ai/recommendations'
import { Resend } from 'resend'
import { decrypt } from '@/lib/encryption'
import { segmentCustomers } from './segmentation'
import type { SegmentedCustomer } from './segmentation'
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

// ---------------------------------------------------------------------------
// Email helpers for campaign dispatch
// ---------------------------------------------------------------------------

const PRODUCTION_DOMAIN = process.env.NEXT_PUBLIC_PRODUCTION_DOMAIN || 'storeforge.site'
const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
const MAX_EMAILS_PER_CAMPAIGN = 100

function getCampaignStoreUrl(slug: string): string {
  if (IS_PRODUCTION) {
    return `https://${slug}.${PRODUCTION_DOMAIN}`
  }
  return `${BASE_URL}/${slug}`
}

interface CampaignResendCredentials {
  client: Resend
  fromEmail: string
  fromName: string
}

/**
 * Get Resend credentials for campaign emails using admin Supabase (no request context needed).
 * Tries per-store credentials first, then falls back to platform credentials.
 */
async function getCampaignResendCredentials(
  storeId: string,
  storeName: string
): Promise<CampaignResendCredentials | null> {
  const supabase = getSupabaseAdmin()

  try {
    const { data: store } = await supabase
      .from('stores')
      .select('resend_api_key_encrypted, resend_from_email, resend_from_name, resend_credentials_verified, email_notifications_enabled, name')
      .eq('id', storeId)
      .single()

    // Use per-store credentials if verified
    if (store?.resend_credentials_verified && store.resend_api_key_encrypted) {
      const apiKey = decrypt(store.resend_api_key_encrypted)
      return {
        client: new Resend(apiKey),
        fromEmail: store.resend_from_email || process.env.RESEND_FROM_EMAIL || 'noreply@storeforge.site',
        fromName: store.resend_from_name || store.name || storeName,
      }
    }
  } catch {
    // Fall through to platform credentials
  }

  // Fallback to platform credentials
  const platformKey = process.env.RESEND_API_KEY
  if (!platformKey) return null

  return {
    client: new Resend(platformKey),
    fromEmail: process.env.RESEND_FROM_EMAIL || 'noreply@storeforge.site',
    fromName: storeName,
  }
}

/**
 * Build campaign email HTML with store branding, message, coupon, and unsubscribe link.
 */
function buildCampaignEmailHtml(opts: {
  storeName: string
  storeUrl: string
  subject: string
  message: string
  customerName: string | null
  couponCode?: string
  discountPercent?: number
  campaignType: string
}): string {
  const { storeName, storeUrl, subject, message, customerName, couponCode, discountPercent, campaignType } = opts
  const greeting = customerName ? `Hi ${customerName},` : 'Hi there,'

  const couponBlock = couponCode && discountPercent
    ? `
      <div style="margin:24px 0;padding:20px;background:#f0fdf4;border:2px dashed #22c55e;border-radius:12px;text-align:center;">
        <p style="margin:0 0 8px;font-size:14px;color:#166534;">Your exclusive ${discountPercent}% discount</p>
        <p style="margin:0;font-size:28px;font-weight:700;color:#15803d;letter-spacing:2px;">${couponCode}</p>
        <p style="margin:8px 0 0;font-size:12px;color:#6b7280;">Apply at checkout &bull; Valid for 14 days</p>
      </div>`
    : ''

  const ctaLabel = campaignType === 'win_back'
    ? 'Come Back &amp; Shop'
    : campaignType === 'flash_sale'
      ? 'Shop the Sale'
      : campaignType === 'upsell'
        ? 'Discover More'
        : 'Shop Now'

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <!-- Header -->
      <div style="background:#111827;padding:24px 32px;text-align:center;">
        <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:600;">${storeName}</h1>
      </div>
      <!-- Body -->
      <div style="padding:32px;">
        <p style="margin:0 0 16px;font-size:16px;color:#374151;">${greeting}</p>
        <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.6;">${message}</p>
        ${couponBlock}
        <div style="text-align:center;margin:28px 0;">
          <a href="${storeUrl}" style="display:inline-block;padding:14px 32px;background:#111827;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">${ctaLabel}</a>
        </div>
      </div>
      <!-- Footer -->
      <div style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
        <p style="margin:0 0 8px;font-size:12px;color:#9ca3af;">&copy; ${new Date().getFullYear()} ${storeName}. All rights reserved.</p>
        <p style="margin:0;font-size:12px;color:#9ca3af;">
          <a href="${storeUrl}/unsubscribe" style="color:#6b7280;text-decoration:underline;">Unsubscribe</a>
          &nbsp;&bull;&nbsp;
          <a href="${storeUrl}" style="color:#6b7280;text-decoration:underline;">Visit Store</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`
}

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
  const { storeId, minValue, maxAge } = getAbandonedCartsSchema.parse(args)
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
  const { storeId, cartId, discountPercent } = sendRecoveryEmailSchema.parse(args)
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
    createCouponSchema.parse(args)
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
  const { storeId } = getCustomerSegmentsSchema.parse(args)

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
    getProductRecommendationsSchema.parse(args)

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
  const { storeId } = analyzeCartValueSchema.parse(args)
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
    sendTargetedCampaignSchema.parse(args)

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

    // Fetch store info for branding
    const supabase = getSupabaseAdmin()
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, name, slug')
      .eq('id', storeId)
      .single()

    if (storeError || !store) {
      return { success: false, summary: 'Store not found' }
    }

    // Get Resend credentials (per-store or platform fallback)
    const credentials = await getCampaignResendCredentials(storeId, store.name)
    if (!credentials) {
      return {
        success: false,
        summary: 'Email service not configured — set RESEND_API_KEY or configure per-store Resend credentials',
      }
    }

    // Create a coupon code if discount is specified
    let couponCode: string | undefined
    if (discountPercent) {
      couponCode = `${campaignType.toUpperCase().replace('_', '')}-${discountPercent}-${Date.now().toString(36).toUpperCase()}`
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

    // ---- Dispatch emails to segmented customers ----

    const storeUrl = getCampaignStoreUrl(store.slug)
    const from = `${credentials.fromName} <${credentials.fromEmail}>`

    // Cap the number of recipients to MAX_EMAILS_PER_CAMPAIGN
    const recipients: SegmentedCustomer[] = targetSegment.customers.slice(0, MAX_EMAILS_PER_CAMPAIGN)

    // Filter out customers without a valid email
    const validRecipients = recipients.filter(c => c.email && c.email.includes('@'))

    let emailsSent = 0
    let emailsFailed = 0
    const errors: string[] = []

    if (validRecipients.length === 0) {
      await updateCampaignStats(storeId, campaign.id, { sent: 0 })
      return {
        success: true,
        data: {
          campaignId: campaign.id,
          segment,
          targetCount: targetSegment.count,
          emailsSent: 0,
          emailsFailed: 0,
          campaignType,
          discountPercent,
          couponCode,
          subject,
          warning: 'No customers in segment have valid email addresses',
        },
        summary: `Created ${campaignType} campaign but no customers in "${segment}" segment have valid email addresses`,
        relatedEntityType: 'campaign',
        relatedEntityId: campaign.id,
      }
    }

    // Build email payloads for batch sending (Resend batch supports up to 100 emails)
    const emailPayloads = validRecipients.map(customer => ({
      from,
      to: customer.email,
      subject,
      html: buildCampaignEmailHtml({
        storeName: store.name,
        storeUrl,
        subject,
        message,
        customerName: customer.full_name,
        couponCode,
        discountPercent,
        campaignType,
      }),
    }))

    // Send via Resend batch API (max 100 per call, already capped above)
    try {
      const batchResult = await credentials.client.batch.send(emailPayloads)

      if (batchResult.error) {
        // Entire batch failed
        emailsFailed = validRecipients.length
        errors.push(`Batch send failed: ${JSON.stringify(batchResult.error)}`)
        console.error('Campaign batch send failed:', batchResult.error)
      } else {
        // Batch succeeded — count individual results
        const sentIds = batchResult.data?.data ?? []
        emailsSent = sentIds.length
        emailsFailed = validRecipients.length - emailsSent
        if (emailsFailed > 0) {
          errors.push(`${emailsFailed} emails in batch did not return a send ID`)
        }
      }
    } catch (batchError) {
      // If batch API fails entirely, fall back to individual sends
      console.warn('Batch send threw, falling back to individual sends:', batchError)

      for (const payload of emailPayloads) {
        try {
          const { error: sendError } = await credentials.client.emails.send(payload)
          if (sendError) {
            emailsFailed++
            errors.push(`Failed ${payload.to}: ${sendError.message}`)
          } else {
            emailsSent++
          }
        } catch (individualError) {
          emailsFailed++
          const errMsg = individualError instanceof Error ? individualError.message : 'Unknown error'
          errors.push(`Failed ${payload.to}: ${errMsg}`)
        }
      }
    }

    // Update campaign stats with actual delivery numbers
    await updateCampaignStats(storeId, campaign.id, {
      sent: emailsSent,
    })

    const truncatedCount = targetSegment.count > MAX_EMAILS_PER_CAMPAIGN
      ? ` (capped at ${MAX_EMAILS_PER_CAMPAIGN} of ${targetSegment.count} total)`
      : ''

    const summaryParts = [
      `Sent ${campaignType} campaign to ${emailsSent}/${validRecipients.length} "${segment}" customers${truncatedCount}`,
    ]
    if (discountPercent && couponCode) {
      summaryParts.push(`with ${discountPercent}% discount (code: ${couponCode})`)
    }
    if (emailsFailed > 0) {
      summaryParts.push(`— ${emailsFailed} delivery failures`)
    }

    return {
      success: true,
      data: {
        campaignId: campaign.id,
        segment,
        targetCount: targetSegment.count,
        emailsSent,
        emailsFailed,
        campaignType,
        discountPercent,
        couponCode,
        subject,
        ...(errors.length > 0 ? { errors: errors.slice(0, 10) } : {}),
      },
      summary: summaryParts.join(' '),
      relatedEntityType: 'campaign',
      relatedEntityId: campaign.id,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, summary: `Failed to create/send campaign: ${msg}` }
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
  const { storeId } = analyzePricingSchema.parse(args)

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
    applyPriceRecommendationSchema.parse(args)

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
  const { storeId, productId } = getCompetitorPricesSchema.parse(args)

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
    addCompetitorPriceSchema.parse(args)

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
  const { storeId } = analyzeCompetitivePricingSchema.parse(args)

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
