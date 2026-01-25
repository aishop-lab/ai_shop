import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { shiprocket, getCheapestCourier, getFastestCourier } from '@/lib/shipping/shiprocket'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

// Request validation schema
const calculateShippingSchema = z.object({
  pickup_pincode: z.string().length(6, 'Invalid pickup pincode'),
  delivery_pincode: z.string().length(6, 'Invalid delivery pincode'),
  weight: z.number().min(0.1).max(50).default(0.5), // Weight in kg
  cod: z.boolean().default(false),
  length: z.number().min(1).max(200).optional(), // cm
  breadth: z.number().min(1).max(200).optional(), // cm
  height: z.number().min(1).max(200).optional(), // cm
})

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = rateLimit(request, RATE_LIMITS.API)
    if (rateLimitResult) return rateLimitResult

    // Check if Shiprocket is configured
    if (!shiprocket.isConfigured()) {
      // Return fallback rates when Shiprocket is not configured
      return NextResponse.json({
        success: true,
        rates: {
          standard: {
            rate: 80,
            estimated_days: 5,
            courier_name: 'Standard Shipping'
          },
          express: {
            rate: 150,
            estimated_days: 3,
            courier_name: 'Express Shipping'
          }
        },
        fallback: true,
        message: 'Shipping estimates (Shiprocket not configured)'
      })
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = calculateShippingSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validationResult.error.flatten().fieldErrors
        },
        { status: 400 }
      )
    }

    const {
      pickup_pincode,
      delivery_pincode,
      weight,
      cod,
      length,
      breadth,
      height
    } = validationResult.data

    // Get available courier services
    const couriers = await shiprocket.getServiceability({
      pickup_postcode: pickup_pincode,
      delivery_postcode: delivery_pincode,
      weight,
      cod,
      length,
      breadth,
      height
    })

    if (!couriers.length) {
      return NextResponse.json(
        {
          error: 'No shipping services available',
          message: 'Delivery is not available to this pincode. Please try a different address.',
          delivery_available: false
        },
        { status: 404 }
      )
    }

    // Get cheapest and fastest options
    const cheapest = getCheapestCourier(couriers)
    const fastest = getFastestCourier(couriers)

    // Build response with rate options
    const rates: Record<string, {
      rate: number
      estimated_days: number
      courier_name: string
      courier_id: number
      cod_charges?: number
      etd: string
    }> = {}

    // Standard (cheapest) option
    if (cheapest) {
      rates.standard = {
        rate: Math.ceil(cheapest.rate),
        estimated_days: cheapest.estimated_delivery_days,
        courier_name: cheapest.name,
        courier_id: cheapest.id,
        cod_charges: cod ? cheapest.cod_charges : undefined,
        etd: cheapest.etd
      }
    }

    // Express (fastest) option - only if different from cheapest
    if (fastest && fastest.id !== cheapest?.id) {
      rates.express = {
        rate: Math.ceil(fastest.rate),
        estimated_days: fastest.estimated_delivery_days,
        courier_name: fastest.name,
        courier_id: fastest.id,
        cod_charges: cod ? fastest.cod_charges : undefined,
        etd: fastest.etd
      }
    }

    // Include all available options for selection
    const allOptions = couriers.map(courier => ({
      id: courier.id,
      name: courier.name,
      rate: Math.ceil(courier.rate),
      estimated_days: courier.estimated_delivery_days,
      etd: courier.etd,
      cod_charges: cod ? courier.cod_charges : undefined,
      rating: courier.rating,
      is_surface: courier.is_surface
    })).sort((a, b) => a.rate - b.rate) // Sort by price

    return NextResponse.json({
      success: true,
      delivery_available: true,
      rates,
      all_options: allOptions,
      pickup_pincode,
      delivery_pincode,
      weight,
      cod
    })

  } catch (error) {
    console.error('Shipping calculation error:', error)

    // Return fallback rates on error
    return NextResponse.json({
      success: true,
      rates: {
        standard: {
          rate: 80,
          estimated_days: 5,
          courier_name: 'Standard Shipping'
        }
      },
      fallback: true,
      error: 'Could not fetch live shipping rates'
    })
  }
}

// GET endpoint for quick pincode check
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = rateLimit(request, RATE_LIMITS.API)
    if (rateLimitResult) return rateLimitResult

    const { searchParams } = new URL(request.url)
    const deliveryPincode = searchParams.get('pincode')

    if (!deliveryPincode || deliveryPincode.length !== 6) {
      return NextResponse.json(
        { error: 'Invalid pincode' },
        { status: 400 }
      )
    }

    // Default pickup pincode (can be configured per store)
    const pickupPincode = searchParams.get('pickup') || process.env.DEFAULT_PICKUP_PINCODE || '110001'

    if (!shiprocket.isConfigured()) {
      // Return true when Shiprocket not configured (assume all pincodes are serviceable)
      return NextResponse.json({
        serviceable: true,
        pincode: deliveryPincode,
        message: 'Delivery available (verification pending)'
      })
    }

    // Check serviceability
    const couriers = await shiprocket.getServiceability({
      pickup_postcode: pickupPincode,
      delivery_postcode: deliveryPincode,
      weight: 0.5,
      cod: false
    })

    const serviceable = couriers.length > 0
    const cheapest = getCheapestCourier(couriers)
    const fastest = getFastestCourier(couriers)

    return NextResponse.json({
      serviceable,
      pincode: deliveryPincode,
      estimated_days: fastest?.estimated_delivery_days || null,
      min_rate: cheapest?.rate ? Math.ceil(cheapest.rate) : null,
      available_couriers: couriers.length
    })

  } catch (error) {
    console.error('Pincode check error:', error)

    // Return serviceable on error (don't block checkout)
    return NextResponse.json({
      serviceable: true,
      pincode: request.nextUrl.searchParams.get('pincode'),
      message: 'Delivery available (verification pending)'
    })
  }
}
