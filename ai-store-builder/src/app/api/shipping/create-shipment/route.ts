import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  shiprocket,
  buildShiprocketOrder,
  getCheapestCourier
} from '@/lib/shipping/shiprocket'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Check if Shiprocket is configured
    if (!shiprocket.isConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Shiprocket is not configured. Please add credentials.' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { order_id, courier_preference = 'cheapest' } = body

    if (!order_id) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      )
    }

    // Get the order with items
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    // Verify user owns this order's store
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, owner_id, shipping_settings')
      .eq('id', order.store_id)
      .single()

    if (storeError || !store || store.owner_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Check if shipment already exists
    if (order.shiprocket_shipment_id) {
      return NextResponse.json(
        { success: false, error: 'Shipment already created for this order' },
        { status: 400 }
      )
    }

    // Check order status - must be confirmed or processing
    if (!['confirmed', 'processing'].includes(order.order_status)) {
      return NextResponse.json(
        { success: false, error: `Cannot create shipment for order with status: ${order.order_status}` },
        { status: 400 }
      )
    }

    // Get shipping settings
    const shippingSettings = store.shipping_settings || {}
    const pickupLocation = shippingSettings.pickup_location || 'Primary'
    const packageDimensions = shippingSettings.default_package_dimensions || {
      length: 20,
      breadth: 15,
      height: 10,
      weight: 0.5
    }

    console.log('[Shipping] Creating shipment for order:', order.order_number)

    // Get pickup locations to validate and get pincode
    let pickupPincode = '110001' // Default Delhi pincode
    try {
      const pickupLocations = await shiprocket.getPickupLocations()
      const location = pickupLocations.find(
        (loc) => loc.pickup_location === pickupLocation
      )
      if (location) {
        pickupPincode = location.pin_code
      }
    } catch (error) {
      console.warn('[Shipping] Could not fetch pickup locations:', error)
    }

    // Get available couriers
    const couriers = await shiprocket.getServiceability({
      pickup_postcode: pickupPincode,
      delivery_postcode: order.shipping_address.pincode,
      weight: packageDimensions.weight,
      cod: order.payment_method === 'cod',
      length: packageDimensions.length,
      breadth: packageDimensions.breadth,
      height: packageDimensions.height
    })

    if (!couriers.length) {
      return NextResponse.json(
        {
          success: false,
          error: 'No courier services available for this destination'
        },
        { status: 400 }
      )
    }

    // Select courier based on preference
    const selectedCourier =
      courier_preference === 'fastest'
        ? couriers.reduce((a, b) =>
            a.estimated_delivery_days < b.estimated_delivery_days ? a : b
          )
        : getCheapestCourier(couriers)

    if (!selectedCourier) {
      return NextResponse.json(
        { success: false, error: 'Could not select a courier' },
        { status: 500 }
      )
    }

    // Build Shiprocket order
    const shiprocketOrderData = buildShiprocketOrder(
      {
        order_number: order.order_number,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        customer_phone: order.customer_phone,
        shipping_address: order.shipping_address,
        order_items: order.order_items,
        payment_method: order.payment_method,
        subtotal: order.subtotal,
        created_at: order.created_at
      },
      pickupLocation,
      packageDimensions
    )

    // Create order in Shiprocket
    const shiprocketOrder = await shiprocket.createOrder(shiprocketOrderData)

    let awbCode = shiprocketOrder.awb_code
    let courierName = shiprocketOrder.courier_name

    // If AWB wasn't auto-assigned, generate it
    if (!awbCode && shiprocketOrder.shipment_id) {
      const awbData = await shiprocket.generateAWB(
        shiprocketOrder.shipment_id,
        selectedCourier.id
      )
      awbCode = awbData.awb_code
      courierName = awbData.courier_name
    }

    // Generate shipping label
    let labelUrl = ''
    try {
      labelUrl = await shiprocket.generateLabel([shiprocketOrder.shipment_id])
    } catch (error) {
      console.warn('[Shipping] Label generation failed:', error)
    }

    // Calculate estimated delivery date
    const estimatedDeliveryDate = new Date()
    estimatedDeliveryDate.setDate(
      estimatedDeliveryDate.getDate() + selectedCourier.estimated_delivery_days
    )

    // Update order with shipping info
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        shiprocket_order_id: shiprocketOrder.order_id,
        shiprocket_shipment_id: shiprocketOrder.shipment_id,
        awb_code: awbCode,
        tracking_number: awbCode, // Use AWB as tracking number
        courier_name: courierName?.toLowerCase(),
        label_url: labelUrl,
        estimated_delivery_date: estimatedDeliveryDate.toISOString().split('T')[0],
        shipping_provider: 'shiprocket',
        order_status: 'processing'
      })
      .eq('id', order_id)

    if (updateError) {
      console.error('[Shipping] Failed to update order:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update order with shipping info' },
        { status: 500 }
      )
    }

    // Log shipment event
    await supabase.from('shipment_events').insert({
      order_id: order_id,
      awb_code: awbCode,
      event_date: new Date().toISOString(),
      status: 'LABEL_GENERATED',
      activity: 'Shipping label generated via Shiprocket',
      location: pickupLocation
    })

    console.log('[Shipping] Shipment created successfully:', {
      order_id: shiprocketOrder.order_id,
      shipment_id: shiprocketOrder.shipment_id,
      awb_code: awbCode,
      courier: courierName
    })

    return NextResponse.json({
      success: true,
      shipment: {
        shiprocket_order_id: shiprocketOrder.order_id,
        shipment_id: shiprocketOrder.shipment_id,
        awb_code: awbCode,
        tracking_number: awbCode,
        courier_name: courierName,
        courier_rate: selectedCourier.rate,
        label_url: labelUrl,
        estimated_delivery_days: selectedCourier.estimated_delivery_days,
        estimated_delivery_date: estimatedDeliveryDate.toISOString().split('T')[0]
      },
      available_couriers: couriers.map((c) => ({
        id: c.id,
        name: c.name,
        rate: c.rate,
        etd: c.etd,
        estimated_days: c.estimated_delivery_days
      }))
    })
  } catch (error) {
    console.error('[Shipping] Create shipment error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create shipment'
      },
      { status: 500 }
    )
  }
}
