import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { shiprocket, getCheapestCourier, getFastestCourier } from '@/lib/shipping/shiprocket'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Default pickup pincode if store doesn't have one configured
const DEFAULT_PICKUP_PINCODE = process.env.DEFAULT_PICKUP_PINCODE || '110001'

/**
 * GET /api/shipping/estimate
 *
 * Quick delivery estimate for checkout
 * Returns estimated delivery days for a given pincode
 *
 * Query params:
 * - pincode: 6-digit delivery pincode (required)
 * - store_id: Store UUID (optional, for store-specific pickup location)
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = rateLimit(request, RATE_LIMITS.API)
    if (rateLimitResult) return rateLimitResult

    const { searchParams } = new URL(request.url)
    const deliveryPincode = searchParams.get('pincode')
    const storeId = searchParams.get('store_id')

    if (!deliveryPincode || deliveryPincode.length !== 6) {
      return NextResponse.json(
        { error: 'Invalid pincode', message: 'Please enter a valid 6-digit pincode' },
        { status: 400 }
      )
    }

    // Get pickup pincode from store settings or use default
    let pickupPincode = DEFAULT_PICKUP_PINCODE

    if (storeId) {
      try {
        const { data: store } = await supabase
          .from('stores')
          .select('settings')
          .eq('id', storeId)
          .single()

        if (store?.settings?.shiprocket?.pickup_pincode) {
          pickupPincode = store.settings.shiprocket.pickup_pincode
        } else if (store?.settings?.business?.pincode) {
          // Fallback to business address pincode
          pickupPincode = store.settings.business.pincode
        }
      } catch (err) {
        // Continue with default pincode
        console.log('Could not fetch store settings, using default pickup pincode')
      }
    }

    // Check if Shiprocket is configured
    if (!shiprocket.isConfigured()) {
      // Return optimistic estimate when Shiprocket not configured
      return NextResponse.json({
        serviceable: true,
        pincode: deliveryPincode,
        estimated_days: 5,
        message: 'Estimated delivery in 5-7 business days',
        fallback: true,
      })
    }

    // Get serviceability from Shiprocket
    const couriers = await shiprocket.getServiceability({
      pickup_postcode: pickupPincode,
      delivery_postcode: deliveryPincode,
      weight: 0.5, // Default weight for estimation
      cod: false,
    })

    if (!couriers.length) {
      return NextResponse.json(
        {
          serviceable: false,
          pincode: deliveryPincode,
          message: 'Delivery is not available to this pincode',
        },
        { status: 404 }
      )
    }

    // Get best options
    const cheapest = getCheapestCourier(couriers)
    const fastest = getFastestCourier(couriers)

    // Use fastest courier's estimate for customer-facing display
    const estimatedDays = fastest?.estimated_delivery_days || cheapest?.estimated_delivery_days || 5

    return NextResponse.json({
      serviceable: true,
      pincode: deliveryPincode,
      estimated_days: estimatedDays,
      courier_name: fastest?.name || cheapest?.name,
      min_rate: cheapest?.rate ? Math.ceil(cheapest.rate) : null,
      express_rate: fastest?.rate ? Math.ceil(fastest.rate) : null,
      available_couriers: couriers.length,
    })
  } catch (error) {
    console.error('Delivery estimate error:', error)

    // Return optimistic fallback on error (don't block checkout)
    return NextResponse.json({
      serviceable: true,
      pincode: request.nextUrl.searchParams.get('pincode'),
      estimated_days: 5,
      message: 'Estimated delivery in 5-7 business days',
      fallback: true,
    })
  }
}
