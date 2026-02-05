import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

interface RouteParams {
  params: Promise<{ orderNumber: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { orderNumber } = await params

    if (!orderNumber) {
      return NextResponse.json(
        { error: 'Order number is required' },
        { status: 400 }
      )
    }

    // Fetch order with items
    const { data: order, error } = await getSupabaseAdmin()
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .eq('order_number', orderNumber)
      .single()

    if (error || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Return order details (excluding sensitive payment info)
    // Map database column names to API response format
    return NextResponse.json({
      order: {
        id: order.id,
        order_number: order.order_number,
        store_id: order.store_id,
        customer_name: order.customer_name,
        customer_email: order.email,
        customer_phone: order.phone,
        shipping_address: order.shipping_address,
        subtotal: order.subtotal,
        shipping_cost: order.shipping_amount,
        tax_amount: order.tax_amount,
        discount_amount: order.discount_amount,
        total_amount: order.total,
        payment_method: order.payment_method,
        payment_status: order.payment_status,
        order_status: order.fulfillment_status,
        fulfillment_status: order.fulfillment_status,
        awb_code: order.awb_code,
        shiprocket_shipment_id: order.shiprocket_shipment_id,
        tracking_number: order.tracking_number,
        courier_name: order.courier_name,
        estimated_delivery_date: order.estimated_delivery_date,
        created_at: order.created_at,
        shipped_at: order.shipped_at,
        delivered_at: order.delivered_at,
        order_items: (order.order_items || []).map((item: Record<string, unknown>) => ({
          id: item.id,
          order_id: item.order_id,
          product_id: item.product_id,
          variant_id: item.variant_id,
          variant_attributes: item.variant_attributes,
          variant_sku: item.variant_sku,
          product_title: item.title,
          product_image: item.image_url,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total,
        }))
      }
    })
  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
