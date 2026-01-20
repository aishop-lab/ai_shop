import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { shiprocket } from '@/lib/shipping/shiprocket'

// Use anon client for public access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface CheckPincodeRequest {
  pincode: string
  store_id: string
}

interface ShippingSettings {
  warehouse_pincode?: string
  serviceable_pincodes?: string[]
  default_delivery_days?: number
  shiprocket_enabled?: boolean
}

export async function POST(request: Request) {
  try {
    const body: CheckPincodeRequest = await request.json()
    const { pincode, store_id } = body

    if (!pincode || pincode.length !== 6) {
      return NextResponse.json({ error: 'Invalid pincode' }, { status: 400 })
    }

    if (!store_id) {
      return NextResponse.json({ error: 'Store ID is required' }, { status: 400 })
    }

    // Get store settings
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('settings, shipping_settings')
      .eq('id', store_id)
      .single()

    if (storeError || !store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    const shippingSettings: ShippingSettings = store.shipping_settings || {}
    const storeSettings = store.settings || {}

    // Get free shipping threshold
    const freeShippingThreshold = storeSettings.shipping?.free_shipping_threshold || 999

    // Option 1: Check against serviceable pincode list (if configured)
    if (shippingSettings.serviceable_pincodes && shippingSettings.serviceable_pincodes.length > 0) {
      const isServiceable = shippingSettings.serviceable_pincodes.includes(pincode)

      return NextResponse.json({
        available: isServiceable,
        estimated_days: isServiceable ? (shippingSettings.default_delivery_days || '3-5') : null,
        free_shipping_threshold: freeShippingThreshold,
        message: isServiceable
          ? 'Delivery available to this location'
          : 'Sorry, we don\'t deliver to this pincode yet'
      })
    }

    // Option 2: Use Shiprocket API (if integrated and warehouse pincode configured)
    if (shippingSettings.shiprocket_enabled && shippingSettings.warehouse_pincode && shiprocket.isConfigured()) {
      try {
        const couriers = await shiprocket.getServiceability({
          pickup_postcode: shippingSettings.warehouse_pincode,
          delivery_postcode: pincode,
          weight: 0.5, // Default weight
          cod: false
        })

        if (couriers && couriers.length > 0) {
          // Find the best courier (fastest with reasonable price)
          const bestCourier = couriers.reduce((best, courier) => {
            if (!best) return courier
            // Prefer faster delivery if price difference is not too high
            if (courier.estimated_delivery_days < best.estimated_delivery_days &&
                courier.rate <= best.rate * 1.5) {
              return courier
            }
            return best
          })

          return NextResponse.json({
            available: true,
            estimated_days: bestCourier.estimated_delivery_days,
            courier_name: bestCourier.name,
            shipping_cost: bestCourier.rate,
            free_shipping_threshold: freeShippingThreshold,
            cod_available: couriers.some(c => c.cod_charges !== undefined),
            message: `Delivery available via ${bestCourier.name}`
          })
        } else {
          return NextResponse.json({
            available: false,
            message: 'Sorry, delivery is not available to this pincode'
          })
        }
      } catch (error) {
        console.error('[CheckPincode] Shiprocket error:', error)
        // Fall through to default response
      }
    }

    // Option 3: Default - All India delivery (basic response)
    // For India, first 2 digits indicate state/region
    const regionCode = pincode.substring(0, 2)
    const metroRegions = ['11', '40', '56', '60', '70'] // Delhi, Mumbai, Bangalore, Chennai, Kolkata
    const isMetro = metroRegions.includes(regionCode)

    return NextResponse.json({
      available: true,
      estimated_days: isMetro ? '2-4' : '5-7',
      free_shipping_threshold: freeShippingThreshold,
      message: `Delivery available • Estimated ${isMetro ? '2-4' : '5-7'} business days`
    })
  } catch (error) {
    console.error('[CheckPincode] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check pincode' },
      { status: 500 }
    )
  }
}
