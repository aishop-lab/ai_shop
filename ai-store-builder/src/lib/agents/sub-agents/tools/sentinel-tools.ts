// SENTINEL (Support) Sub-Agent Tool Definitions
// AI SDK tool syntax using `tool()` from 'ai' + zod parameters

import { tool } from 'ai'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { Resend } from 'resend'

// ---------------------------------------------------------------------------
// CHAT-RESPONDER tools
// ---------------------------------------------------------------------------

const get_store_products = tool({
  description:
    'Query products for a store to answer customer product questions. ' +
    'Returns titles, descriptions, prices, and stock status.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    search: z.string().optional().describe('Optional keyword to search product titles/descriptions'),
    limit: z.number().optional().describe('Max products to return (default: 50)'),
  }),
  execute: async ({ store_id, search, limit = 50 }) => {
    const supabase = getSupabaseAdmin()

    let query = supabase
      .from('products')
      .select(
        `
        id,
        title,
        description,
        price,
        compare_at_price,
        inventory_quantity,
        status,
        category,
        tags
      `
      )
      .eq('store_id', store_id)
      .eq('status', 'active')
      .eq('is_demo', false)
      .limit(limit)

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      return { success: false, error: error.message, products: [] }
    }

    return {
      success: true,
      count: data?.length ?? 0,
      products: data ?? [],
    }
  },
})

const get_order_status = tool({
  description:
    'Look up an order by order number or customer email. ' +
    'Returns order status, items, payment status, and tracking information.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    order_number: z.string().optional().describe('Order number to look up (e.g. "ORD-1234")'),
    customer_email: z.string().email().optional().describe('Customer email to find their recent orders'),
    limit: z.number().optional().describe('When searching by email, max orders to return (default: 5)'),
  }),
  execute: async ({ store_id, order_number, customer_email, limit = 5 }) => {
    const supabase = getSupabaseAdmin()

    if (!order_number && !customer_email) {
      return { success: false, error: 'Provide either order_number or customer_email', orders: [] }
    }

    let query = supabase
      .from('orders')
      .select(
        `
        id,
        order_number,
        status,
        fulfillment_status,
        payment_status,
        total_amount,
        currency,
        tracking_number,
        courier_name,
        estimated_delivery,
        created_at,
        shipping_address,
        order_items (
          id,
          title,
          quantity,
          price
        )
      `
      )
      .eq('store_id', store_id)
      .order('created_at', { ascending: false })

    if (order_number) {
      query = query.eq('order_number', order_number).limit(1)
    } else if (customer_email) {
      query = query.eq('customer_email', customer_email).limit(limit)
    }

    const { data, error } = await query

    if (error) {
      return { success: false, error: error.message, orders: [] }
    }

    return {
      success: true,
      count: data?.length ?? 0,
      orders: data ?? [],
    }
  },
})

const get_store_policies = tool({
  description:
    'Retrieve store policies including return policy, shipping policy, and privacy policy. ' +
    'Use this to answer customer questions about returns and shipping.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
  }),
  execute: async ({ store_id }) => {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('stores')
      .select(
        `
        name,
        policies,
        blueprint
      `
      )
      .eq('id', store_id)
      .single()

    if (error) {
      return { success: false, error: error.message, policies: null }
    }

    return {
      success: true,
      store_name: data?.name,
      policies: data?.policies ?? {},
      shipping_info: (data?.blueprint as Record<string, unknown>)?.shipping ?? null,
    }
  },
})

export const CHAT_RESPONDER_TOOLS = {
  get_store_products,
  get_order_status,
  get_store_policies,
}

// ---------------------------------------------------------------------------
// EMAIL-HANDLER tools
// ---------------------------------------------------------------------------

const send_email_reply = tool({
  description:
    'Send an email reply to a customer via Resend. ' +
    'Use this to dispatch a drafted support response. Requires chief approval.',
  inputSchema: z.object({
    to_email: z.string().email().describe('Recipient email address'),
    subject: z.string().describe('Email subject line'),
    body_html: z.string().describe('HTML body of the reply'),
    store_name: z.string().describe('Store name for the From display name'),
    reply_to: z.string().email().optional().describe('Reply-to email address'),
  }),
  execute: async ({ to_email, subject, body_html, store_name, reply_to }) => {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@storeforge.site'

    const payload: Parameters<typeof resend.emails.send>[0] = {
      from: `${store_name} Support <${fromEmail}>`,
      to: to_email,
      subject,
      html: body_html,
    }
    if (reply_to) {
      payload.replyTo = reply_to
    }

    const { error } = await resend.emails.send(payload)

    if (error) {
      return { success: false, error: String(error) }
    }

    return { success: true, message: `Support reply sent to ${to_email}` }
  },
})

const get_order_details = tool({
  description:
    'Look up full order details by order ID for support context — items, payment, shipping, and customer info.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    order_id: z.string().describe('The order UUID to fetch details for'),
  }),
  execute: async ({ store_id, order_id }) => {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('orders')
      .select(
        `
        id,
        order_number,
        status,
        fulfillment_status,
        payment_status,
        payment_method,
        subtotal,
        total_amount,
        currency,
        shipping_address,
        billing_address,
        tracking_number,
        courier_name,
        estimated_delivery,
        notes,
        created_at,
        order_items (
          id,
          product_id,
          title,
          quantity,
          price,
          variant_title
        )
      `
      )
      .eq('id', order_id)
      .eq('store_id', store_id)
      .single()

    if (error) {
      return { success: false, error: error.message, order: null }
    }

    return { success: true, order: data }
  },
})

export const EMAIL_HANDLER_TOOLS = {
  send_email_reply,
  get_order_details,
}

// ---------------------------------------------------------------------------
// WHATSAPP-AGENT tools
// ---------------------------------------------------------------------------

const send_whatsapp_message = tool({
  description:
    'Send a WhatsApp message to a customer via MSG91. ' +
    'Logs the message intent — full MSG91 API wiring is handled by the platform layer.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    to_phone: z.string().describe('Customer phone number in international format (e.g. +919876543210)'),
    message_text: z.string().describe('The message text to send (under 200 words recommended)'),
    message_type: z.enum(['template', 'free_form']).describe('Message type per WhatsApp Business API policy'),
    template_name: z.string().optional().describe('Template name if message_type is template'),
  }),
  execute: async ({ store_id, to_phone, message_text, message_type, template_name }) => {
    // Log the send intent for the platform layer to execute via MSG91
    const supabase = getSupabaseAdmin()

    await supabase.from('agent_actions').insert({
      store_id,
      agent_type: 'support',
      sub_agent_type: 'whatsapp-agent',
      action_type: 'send_whatsapp_message',
      action_category: 'communication',
      summary: `WhatsApp ${message_type} message to ${to_phone}`,
      details: {
        to_phone,
        message_text,
        message_type,
        template_name: template_name ?? null,
        status: 'queued',
      },
      status: 'completed',
      execution_mode: 'auto',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      tokens_input: 0,
      tokens_output: 0,
      estimated_cost_usd: 0,
      api_costs: {},
    })

    return {
      success: true,
      message: `WhatsApp message queued for ${to_phone}`,
      note: 'Message logged for delivery via MSG91 integration layer',
    }
  },
})

const get_order_tracking = tool({
  description:
    'Look up shipping tracking information for an order. ' +
    'Returns courier name, tracking number, and estimated delivery.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    order_number: z.string().describe('Order number to look up tracking for'),
  }),
  execute: async ({ store_id, order_number }) => {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('orders')
      .select(
        `
        id,
        order_number,
        fulfillment_status,
        tracking_number,
        courier_name,
        estimated_delivery,
        shipped_at
      `
      )
      .eq('store_id', store_id)
      .eq('order_number', order_number)
      .single()

    if (error) {
      return { success: false, error: error.message, tracking: null }
    }

    return {
      success: true,
      tracking: {
        order_number: data?.order_number,
        fulfillment_status: data?.fulfillment_status,
        courier: data?.courier_name,
        tracking_number: data?.tracking_number,
        estimated_delivery: data?.estimated_delivery,
        shipped_at: data?.shipped_at,
      },
    }
  },
})

export const WHATSAPP_AGENT_TOOLS = {
  send_whatsapp_message,
  get_order_tracking,
}

// ---------------------------------------------------------------------------
// RETURNS-MANAGER tools
// ---------------------------------------------------------------------------

const get_order_for_return = tool({
  description:
    'Look up an order to assess return eligibility. ' +
    'Returns order details, delivery date, payment method, and store return policy.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    order_number: z.string().describe('Order number to assess for return eligibility'),
  }),
  execute: async ({ store_id, order_number }) => {
    const supabase = getSupabaseAdmin()

    // Fetch order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(
        `
        id,
        order_number,
        status,
        fulfillment_status,
        payment_status,
        payment_method,
        total_amount,
        currency,
        delivered_at,
        created_at,
        order_items (
          id,
          product_id,
          title,
          quantity,
          price,
          variant_title
        )
      `
      )
      .eq('store_id', store_id)
      .eq('order_number', order_number)
      .single()

    if (orderError) {
      return { success: false, error: orderError.message, order: null, policies: null }
    }

    // Fetch store return policy
    const { data: store } = await supabase
      .from('stores')
      .select('policies')
      .eq('id', store_id)
      .single()

    const policies = (store?.policies as Record<string, unknown>) ?? {}

    // Assess return window
    const deliveredAt = order?.delivered_at ? new Date(order.delivered_at as string) : null
    const returnWindowDays = (policies.return_window_days as number) ?? 7
    const returnDeadline = deliveredAt
      ? new Date(deliveredAt.getTime() + returnWindowDays * 24 * 60 * 60 * 1000)
      : null
    const isWithinReturnWindow = returnDeadline ? new Date() <= returnDeadline : false

    return {
      success: true,
      order,
      return_assessment: {
        is_delivered: order?.fulfillment_status === 'delivered',
        delivered_at: deliveredAt?.toISOString() ?? null,
        return_window_days: returnWindowDays,
        return_deadline: returnDeadline?.toISOString() ?? null,
        is_within_return_window: isWithinReturnWindow,
      },
      policies,
    }
  },
})

const process_refund = tool({
  description:
    'Initiate a refund for an order. Marks the order as refund_initiated in the database. ' +
    'IMPORTANT: Always requires merchant approval before calling. ' +
    'Actual payment gateway refund (Razorpay/Stripe) is triggered by the platform layer.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    order_id: z.string().describe('The order UUID to refund'),
    refund_amount: z.number().positive().describe('Amount to refund'),
    currency: z.string().describe('Currency code (e.g. INR, USD)'),
    refund_reason: z.string().describe('Reason for the refund'),
    refund_type: z
      .enum(['full', 'partial'])
      .describe('Whether this is a full or partial refund'),
  }),
  execute: async ({ store_id, order_id, refund_amount, currency, refund_reason, refund_type }) => {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('orders')
      .update({
        fulfillment_status: 'refund_initiated',
        notes: `Refund initiated: ${refund_type} refund of ${currency} ${refund_amount}. Reason: ${refund_reason}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order_id)
      .eq('store_id', store_id)
      .select('id, order_number, fulfillment_status')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return {
      success: true,
      order: data,
      refund_details: {
        amount: refund_amount,
        currency,
        type: refund_type,
        reason: refund_reason,
        status: 'refund_initiated',
        note: 'Payment gateway refund will be processed by platform layer',
      },
    }
  },
})

const update_order_status = tool({
  description:
    'Update the fulfillment_status of an order (e.g. processing → shipped → delivered → returned).',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    order_id: z.string().describe('The order UUID to update'),
    new_status: z
      .enum([
        'pending',
        'confirmed',
        'processing',
        'shipped',
        'out_for_delivery',
        'delivered',
        'cancelled',
        'returned',
        'refund_initiated',
        'refunded',
      ])
      .describe('New fulfillment status'),
    note: z.string().optional().describe('Optional note to append to order notes'),
  }),
  execute: async ({ store_id, order_id, new_status, note }) => {
    const supabase = getSupabaseAdmin()

    const updatePayload: Record<string, unknown> = {
      fulfillment_status: new_status,
      updated_at: new Date().toISOString(),
    }
    if (note) {
      updatePayload.notes = note
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', order_id)
      .eq('store_id', store_id)
      .select('id, order_number, fulfillment_status')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return {
      success: true,
      order: data,
      message: `Order ${data?.order_number} status updated to ${new_status}`,
    }
  },
})

export const RETURNS_MANAGER_TOOLS = {
  get_order_for_return,
  process_refund,
  update_order_status,
}

// ---------------------------------------------------------------------------
// REVIEW-CURATOR tools
// ---------------------------------------------------------------------------

const get_pending_reviews = tool({
  description:
    'Query product reviews that have not yet received a merchant response. ' +
    'Returns reviews sorted by rating (lowest first, as they need urgent attention).',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    min_rating: z.number().min(1).max(5).optional().describe('Minimum star rating filter (default: 1)'),
    max_rating: z.number().min(1).max(5).optional().describe('Maximum star rating filter (default: 5)'),
    limit: z.number().optional().describe('Max reviews to return (default: 50)'),
  }),
  execute: async ({ store_id, min_rating = 1, max_rating = 5, limit = 50 }) => {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('product_reviews')
      .select(
        `
        id,
        product_id,
        customer_name,
        rating,
        title,
        body,
        merchant_reply,
        created_at,
        products (
          title
        )
      `
      )
      .eq('store_id', store_id)
      .is('merchant_reply', null)
      .gte('rating', min_rating)
      .lte('rating', max_rating)
      .order('rating', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      return { success: false, error: error.message, reviews: [] }
    }

    return {
      success: true,
      count: data?.length ?? 0,
      reviews: data ?? [],
    }
  },
})

const post_review_response = tool({
  description:
    'Insert a merchant response to a product review. ' +
    'Requires merchant approval before posting publicly.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    review_id: z.string().describe('The review UUID to respond to'),
    response_text: z.string().max(500).describe('The merchant response text (max 500 characters)'),
  }),
  execute: async ({ store_id, review_id, response_text }) => {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('product_reviews')
      .update({
        merchant_reply: response_text,
        merchant_reply_at: new Date().toISOString(),
      })
      .eq('id', review_id)
      .eq('store_id', store_id)
      .select('id, rating, merchant_reply')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return {
      success: true,
      review: data,
      message: `Response posted to review ${review_id}`,
    }
  },
})

export const REVIEW_CURATOR_TOOLS = {
  get_pending_reviews,
  post_review_response,
}
