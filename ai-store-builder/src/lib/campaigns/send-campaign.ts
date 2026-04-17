/**
 * Campaign Execution Logic
 *
 * Handles audience selection, message sending, and stats tracking
 * for WhatsApp and Email marketing campaigns.
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { sendWhatsAppMessage } from '@/lib/whatsapp/msg91'

interface SegmentFilters {
  segment?: 'all' | 'active' | 'at_risk' | 'churned' | 'new'
  minOrders?: number
  maxOrders?: number
  minSpent?: number
  maxSpent?: number
}

interface EligibleCustomer {
  id: string
  email: string | null
  phone: string | null
  full_name: string | null
}

interface CampaignRecord {
  id: string
  store_id: string
  name: string
  channel: 'whatsapp' | 'email'
  status: string
  segment_filters: SegmentFilters
  template_name: string | null
  subject: string | null
  content: Record<string, unknown>
  target_count: number
  sent_count: number
  delivered_count: number
  failed_count: number
}

/**
 * Query customers eligible for a campaign based on channel and segment filters.
 * - WhatsApp: requires phone, marketing_consent=true, whatsapp_consent=true
 * - Email: requires email, marketing_consent=true
 */
export async function getEligibleCustomers(
  storeId: string,
  channel: 'whatsapp' | 'email',
  filters: SegmentFilters
): Promise<EligibleCustomer[]> {
  const admin = getSupabaseAdmin()

  let query = admin
    .from('customers')
    .select('id, email, phone, full_name')
    .eq('store_id', storeId)
    .eq('marketing_consent', true)

  // Channel-specific filters
  if (channel === 'whatsapp') {
    query = query.eq('whatsapp_consent', true).not('phone', 'is', null)
  } else {
    query = query.not('email', 'is', null)
  }

  // Segment filtering (same logic as customers API)
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()

  const segment = filters.segment || 'all'

  if (segment === 'active') {
    query = query.gte('last_order_at', thirtyDaysAgo)
  } else if (segment === 'at_risk') {
    query = query.lt('last_order_at', thirtyDaysAgo).gte('last_order_at', ninetyDaysAgo)
  } else if (segment === 'churned') {
    query = query.lt('last_order_at', ninetyDaysAgo)
  } else if (segment === 'new') {
    query = query.lte('total_orders', 1)
  }

  // Additional numeric filters
  if (filters.minOrders !== undefined) {
    query = query.gte('total_orders', filters.minOrders)
  }
  if (filters.maxOrders !== undefined) {
    query = query.lte('total_orders', filters.maxOrders)
  }
  if (filters.minSpent !== undefined) {
    query = query.gte('total_spent', filters.minSpent)
  }
  if (filters.maxSpent !== undefined) {
    query = query.lte('total_spent', filters.maxSpent)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching eligible customers:', error)
    throw new Error('Failed to fetch eligible customers')
  }

  return (data || []) as EligibleCustomer[]
}

/**
 * Get audience size estimate without fetching full records.
 */
export async function getAudienceEstimate(
  storeId: string,
  channel: 'whatsapp' | 'email',
  filters: SegmentFilters
): Promise<number> {
  const admin = getSupabaseAdmin()

  let query = admin
    .from('customers')
    .select('id', { count: 'exact', head: true })
    .eq('store_id', storeId)
    .eq('marketing_consent', true)

  if (channel === 'whatsapp') {
    query = query.eq('whatsapp_consent', true).not('phone', 'is', null)
  } else {
    query = query.not('email', 'is', null)
  }

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()

  const segment = filters.segment || 'all'

  if (segment === 'active') {
    query = query.gte('last_order_at', thirtyDaysAgo)
  } else if (segment === 'at_risk') {
    query = query.lt('last_order_at', thirtyDaysAgo).gte('last_order_at', ninetyDaysAgo)
  } else if (segment === 'churned') {
    query = query.lt('last_order_at', ninetyDaysAgo)
  } else if (segment === 'new') {
    query = query.lte('total_orders', 1)
  }

  if (filters.minOrders !== undefined) {
    query = query.gte('total_orders', filters.minOrders)
  }
  if (filters.maxOrders !== undefined) {
    query = query.lte('total_orders', filters.maxOrders)
  }
  if (filters.minSpent !== undefined) {
    query = query.gte('total_spent', filters.minSpent)
  }
  if (filters.maxSpent !== undefined) {
    query = query.lte('total_spent', filters.maxSpent)
  }

  const { count, error } = await query

  if (error) {
    console.error('Error estimating audience:', error)
    return 0
  }

  return count || 0
}

/**
 * Execute a campaign: send messages to all eligible customers.
 *
 * Flow:
 * 1. Load campaign, verify it's in draft/scheduled status
 * 2. Update status to 'sending'
 * 3. Get eligible customers
 * 4. Iterate and send via appropriate channel
 * 5. Create campaign_messages records
 * 6. Update campaign stats on completion
 */
export async function executeCampaign(campaignId: string): Promise<{
  success: boolean
  sent: number
  failed: number
  error?: string
}> {
  const admin = getSupabaseAdmin()

  // 1. Load campaign
  const { data: campaign, error: loadError } = await admin
    .from('marketing_campaigns')
    .select('*')
    .eq('id', campaignId)
    .single()

  if (loadError || !campaign) {
    return { success: false, sent: 0, failed: 0, error: 'Campaign not found' }
  }

  const c = campaign as CampaignRecord

  if (!['draft', 'scheduled'].includes(c.status)) {
    return { success: false, sent: 0, failed: 0, error: `Campaign cannot be sent from status: ${c.status}` }
  }

  // 2. Update status to 'sending'
  await admin
    .from('marketing_campaigns')
    .update({ status: 'sending', started_at: new Date().toISOString() })
    .eq('id', campaignId)

  try {
    // 3. Get eligible customers
    const customers = await getEligibleCustomers(
      c.store_id,
      c.channel,
      (c.segment_filters || {}) as SegmentFilters
    )

    // Update target count
    await admin
      .from('marketing_campaigns')
      .update({ target_count: customers.length })
      .eq('id', campaignId)

    if (customers.length === 0) {
      await admin
        .from('marketing_campaigns')
        .update({ status: 'sent', completed_at: new Date().toISOString() })
        .eq('id', campaignId)
      return { success: true, sent: 0, failed: 0 }
    }

    let sentCount = 0
    let failedCount = 0
    let deliveredCount = 0

    // 4. Iterate and send
    if (c.channel === 'whatsapp') {
      const templateName = c.template_name || 'marketing_campaign'
      const templateParams = (c.content?.template_params as Record<string, string>) || {}

      for (const customer of customers) {
        if (!customer.phone) continue

        const result = await sendWhatsAppMessage({
          to: customer.phone,
          templateName,
          templateParams: {
            ...templateParams,
            customer_name: customer.full_name || 'Customer',
          },
          storeId: c.store_id,
        })

        // 5. Create campaign_message record
        const messageStatus = result.success ? 'sent' : 'failed'
        await admin.from('campaign_messages').insert({
          campaign_id: campaignId,
          customer_id: customer.id,
          channel: 'whatsapp',
          recipient: customer.phone,
          status: messageStatus,
          sent_at: result.success ? new Date().toISOString() : null,
          failed_at: result.success ? null : new Date().toISOString(),
          error_message: result.error || null,
          external_message_id: result.messageId || null,
        })

        if (result.success) {
          sentCount++
          // In dev mode (messageId=dev-mode), mark as delivered immediately
          if (result.messageId === 'dev-mode') {
            deliveredCount++
          }
        } else {
          failedCount++
        }
      }
    } else {
      // Email channel - placeholder for future email campaign support
      // For now, mark all as failed since email campaigns aren't implemented yet
      for (const customer of customers) {
        if (!customer.email) continue

        await admin.from('campaign_messages').insert({
          campaign_id: campaignId,
          customer_id: customer.id,
          channel: 'email',
          recipient: customer.email,
          status: 'failed',
          failed_at: new Date().toISOString(),
          error_message: 'Email campaigns not yet implemented',
        })

        failedCount++
      }
    }

    // 6. Update campaign stats
    await admin
      .from('marketing_campaigns')
      .update({
        status: 'sent',
        completed_at: new Date().toISOString(),
        sent_count: sentCount,
        delivered_count: deliveredCount,
        failed_count: failedCount,
      })
      .eq('id', campaignId)

    return { success: true, sent: sentCount, failed: failedCount }
  } catch (error) {
    console.error('Campaign execution error:', error)

    // Mark campaign as failed/cancelled on error
    await admin
      .from('marketing_campaigns')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
      })
      .eq('id', campaignId)

    return {
      success: false,
      sent: 0,
      failed: 0,
      error: error instanceof Error ? error.message : 'Campaign execution failed',
    }
  }
}
