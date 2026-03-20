// src/lib/agents/support/tools.ts
import { z } from 'zod'
import type { AgentToolConfig } from '../base-agent'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { registerTools } from '../tool-registry'

// ---- Tool: lookupOrder ----

const lookupOrderTool: AgentToolConfig = {
  name: 'lookupOrder',
  description: 'Look up an order by order number. Returns status, items, shipping info, and tracking details.',
  inputSchema: z.object({
    order_number: z.string().describe('The order number to look up (e.g. "ORD-1234")'),
    store_id: z.string().describe('The store ID to scope the lookup'),
  }),
  category: 'communication',
  riskLevel: 'low',
  execute: async (args) => {
    const { order_number, store_id } = args as { order_number: string; store_id: string }
    const supabase = getSupabaseAdmin()

    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        payment_status,
        total_amount,
        currency,
        shipping_address,
        tracking_number,
        courier_name,
        estimated_delivery,
        created_at,
        order_items (
          id,
          product_id,
          quantity,
          price,
          title
        )
      `)
      .eq('store_id', store_id)
      .eq('order_number', order_number)
      .single()

    if (error || !order) {
      return {
        success: false,
        summary: `Order ${order_number} not found`,
        data: { error: 'Order not found' },
      }
    }

    return {
      success: true,
      summary: `Found order ${order_number}: status=${order.status}, payment=${order.payment_status}`,
      data: order,
      relatedEntityType: 'order',
      relatedEntityId: order.id,
    }
  },
}

// ---- Tool: lookupProduct ----

const lookupProductTool: AgentToolConfig = {
  name: 'lookupProduct',
  description: 'Look up product details by title keyword or product ID. Returns availability, price, and description.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID to scope the lookup'),
    product_id: z.string().optional().describe('Exact product ID (UUID)'),
    title_keyword: z.string().optional().describe('Keyword to search in product titles'),
  }),
  category: 'communication',
  riskLevel: 'low',
  execute: async (args) => {
    const { store_id, product_id, title_keyword } = args as {
      store_id: string
      product_id?: string
      title_keyword?: string
    }
    const supabase = getSupabaseAdmin()

    if (!product_id && !title_keyword) {
      return {
        success: false,
        summary: 'Must provide either product_id or title_keyword',
        data: { error: 'Missing search parameter' },
      }
    }

    let query = supabase
      .from('products')
      .select('id, title, description, price, compare_at_price, quantity, status, categories, tags')
      .eq('store_id', store_id)

    if (product_id) {
      query = query.eq('id', product_id)
    } else if (title_keyword) {
      query = query.ilike('title', `%${title_keyword}%`)
    }

    const { data: products, error } = await query.limit(5)

    if (error || !products || products.length === 0) {
      return {
        success: false,
        summary: `No products found matching the search`,
        data: { error: 'Product not found' },
      }
    }

    return {
      success: true,
      summary: `Found ${products.length} product(s) matching search`,
      data: products,
      relatedEntityType: 'product',
      relatedEntityId: products[0]?.id,
    }
  },
}

// ---- Tool: checkShippingStatus ----

const checkShippingStatusTool: AgentToolConfig = {
  name: 'checkShippingStatus',
  description: 'Check the shipping status and tracking info for an order.',
  inputSchema: z.object({
    order_id: z.string().describe('The order UUID to check shipping status for'),
    store_id: z.string().describe('The store ID to scope the lookup'),
  }),
  category: 'communication',
  riskLevel: 'low',
  execute: async (args) => {
    const { order_id, store_id } = args as { order_id: string; store_id: string }
    const supabase = getSupabaseAdmin()

    const { data: order, error } = await supabase
      .from('orders')
      .select('id, order_number, status, tracking_number, courier_name, estimated_delivery, shipping_address')
      .eq('id', order_id)
      .eq('store_id', store_id)
      .single()

    if (error || !order) {
      return {
        success: false,
        summary: `Order ${order_id} not found`,
        data: { error: 'Order not found' },
      }
    }

    if (!order.tracking_number) {
      return {
        success: true,
        summary: `Order ${order.order_number} has no tracking number yet (status: ${order.status})`,
        data: {
          order_number: order.order_number,
          status: order.status,
          tracking_number: null,
          message: 'Shipment not yet dispatched',
        },
        relatedEntityType: 'order',
        relatedEntityId: order.id,
      }
    }

    return {
      success: true,
      summary: `Order ${order.order_number}: shipped via ${order.courier_name ?? 'courier'}, tracking ${order.tracking_number}`,
      data: {
        order_number: order.order_number,
        status: order.status,
        tracking_number: order.tracking_number,
        courier_name: order.courier_name,
        estimated_delivery: order.estimated_delivery,
        shipping_address: order.shipping_address,
      },
      relatedEntityType: 'order',
      relatedEntityId: order.id,
    }
  },
}

// ---- Tool: sendReply ----

const sendReplyTool: AgentToolConfig = {
  name: 'sendReply',
  description: 'Send a reply message to the customer via the specified channel.',
  inputSchema: z.object({
    message: z.string().describe('The reply message to send to the customer'),
    channel: z
      .enum(['website_chat', 'email', 'whatsapp'])
      .describe('The channel through which to send the reply'),
    conversation_id: z.string().optional().describe('The conversation ID to attach the reply to'),
    customer_identifier: z.string().optional().describe('Email or phone number of the customer'),
  }),
  category: 'communication',
  riskLevel: 'low',
  execute: async (args, context) => {
    const { message, channel, conversation_id, customer_identifier } = args as {
      message: string
      channel: 'website_chat' | 'email' | 'whatsapp'
      conversation_id?: string
      customer_identifier?: string
    }

    // Log the reply — actual sending is implemented with the chat widget
    logger.info(`[SupportAgent] sendReply via ${channel}`, {
      storeId: context.storeId,
      channel,
      conversation_id,
      customer_identifier,
      messageLength: message.length,
    })

    // If a conversation_id is provided, persist the agent message to the DB
    if (conversation_id) {
      const supabase = getSupabaseAdmin()
      await supabase.from('conversation_messages').insert({
        conversation_id,
        role: 'agent',
        content: message,
        metadata: { channel, sent_by: 'support_agent' },
        created_at: new Date().toISOString(),
      })
    }

    return {
      success: true,
      summary: `Sent reply via ${channel} (${message.length} chars)`,
      data: { channel, message, conversation_id, customer_identifier },
      relatedEntityType: conversation_id ? 'conversation' : undefined,
      relatedEntityId: conversation_id,
    }
  },
}

// ---- Tool: escalateToMerchant ----

const escalateToMerchantTool: AgentToolConfig = {
  name: 'escalateToMerchant',
  description: 'Escalate a customer issue to the merchant for review. Creates a pending approval request.',
  inputSchema: z.object({
    reason: z.string().describe('Why this issue is being escalated'),
    conversation_summary: z.string().describe('Summary of the conversation context'),
    customer_identifier: z.string().optional().describe('Email or phone number of the customer'),
    related_order_number: z.string().optional().describe('Order number if the issue is order-related'),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal').describe('Priority of the escalation'),
  }),
  category: 'communication',
  riskLevel: 'medium',
  execute: async (args, context) => {
    const { reason, conversation_summary, customer_identifier, related_order_number, priority } = args as {
      reason: string
      conversation_summary: string
      customer_identifier?: string
      related_order_number?: string
      priority: 'low' | 'normal' | 'high' | 'urgent'
    }

    const supabase = getSupabaseAdmin()

    const { data: approval, error } = await supabase
      .from('agent_approvals')
      .insert({
        store_id: context.storeId,
        agent_type: 'support',
        action_type: 'escalateToMerchant',
        summary: `Customer escalation: ${reason}`,
        reasoning: conversation_summary,
        details: {
          reason,
          conversation_summary,
          customer_identifier,
          related_order_number,
        },
        priority,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single()

    if (error || !approval) {
      logger.error('[SupportAgent] Failed to create escalation approval', error instanceof Error ? error : undefined)
      return {
        success: false,
        summary: `Failed to escalate: ${error?.message ?? 'unknown error'}`,
        data: { errorMessage: error?.message },
      }
    }

    return {
      success: true,
      summary: `Escalated to merchant: ${reason} (priority: ${priority})`,
      data: { approval_id: approval.id, reason, priority },
      relatedEntityType: 'approval',
      relatedEntityId: approval.id,
    }
  },
}

// ---- Tool: createReturnRequest ----

const createReturnRequestTool: AgentToolConfig = {
  name: 'createReturnRequest',
  description:
    'Create a return or refund request for an order. Always requires merchant approval since it involves money.',
  inputSchema: z.object({
    order_id: z.string().describe('The order UUID for the return/refund request'),
    order_number: z.string().describe('Human-readable order number'),
    reason: z.string().describe('Reason for the return or refund request'),
    refund_amount: z.number().optional().describe('Requested refund amount in the store currency'),
    return_type: z.enum(['return', 'refund', 'exchange']).default('refund').describe('Type of resolution requested'),
    customer_identifier: z.string().optional().describe('Email or phone number of the customer'),
  }),
  category: 'communication',
  riskLevel: 'high',
  execute: async (args, context) => {
    const { order_id, order_number, reason, refund_amount, return_type, customer_identifier } = args as {
      order_id: string
      order_number: string
      reason: string
      refund_amount?: number
      return_type: 'return' | 'refund' | 'exchange'
      customer_identifier?: string
    }

    const supabase = getSupabaseAdmin()

    // Verify the order belongs to this store
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, total_amount, currency, status')
      .eq('id', order_id)
      .eq('store_id', context.storeId)
      .single()

    if (orderError || !order) {
      return {
        success: false,
        summary: `Order ${order_number} not found or does not belong to this store`,
        data: { error: 'Order not found' },
      }
    }

    // Create an approval request — merchant must approve all return/refund requests
    const amountDisplay = refund_amount != null
      ? ` for ₹${refund_amount}`
      : ` (full order: ₹${order.total_amount})`

    const { data: approval, error } = await supabase
      .from('agent_approvals')
      .insert({
        store_id: context.storeId,
        agent_type: 'support',
        action_type: 'createReturnRequest',
        summary: `${return_type.charAt(0).toUpperCase() + return_type.slice(1)} request for order ${order_number}${amountDisplay}`,
        reasoning: `Customer requested ${return_type}. Reason: ${reason}`,
        details: {
          order_id,
          order_number,
          reason,
          refund_amount,
          return_type,
          customer_identifier,
          order_total: order.total_amount,
          currency: order.currency,
          order_status: order.status,
        },
        priority: 'high',
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single()

    if (error || !approval) {
      logger.error('[SupportAgent] Failed to create return request approval', error instanceof Error ? error : undefined)
      return {
        success: false,
        summary: `Failed to create ${return_type} request: ${error?.message ?? 'unknown error'}`,
        data: { errorMessage: error?.message },
      }
    }

    return {
      success: true,
      summary: `Created ${return_type} request for order ${order_number} — pending merchant approval`,
      data: {
        approval_id: approval.id,
        order_number,
        return_type,
        refund_amount,
        reason,
      },
      relatedEntityType: 'order',
      relatedEntityId: order_id,
    }
  },
}

// ---- Register and Export ----

const SUPPORT_TOOLS: AgentToolConfig[] = [
  lookupOrderTool,
  lookupProductTool,
  checkShippingStatusTool,
  sendReplyTool,
  escalateToMerchantTool,
  createReturnRequestTool,
]

// Register with the tool registry
registerTools(
  SUPPORT_TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    agentType: 'support' as const,
    riskLevel: t.riskLevel,
    requiresApproval: (autonomyLevel: number) => {
      if (t.riskLevel === 'high') return true
      if (t.riskLevel === 'medium') return autonomyLevel < 4
      return autonomyLevel < 3
    },
  }))
)

export function getSupportTools(): AgentToolConfig[] {
  return SUPPORT_TOOLS
}
