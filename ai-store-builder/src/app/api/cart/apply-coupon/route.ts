// Apply Coupon API
// Validates and applies a coupon to the cart

import { NextResponse } from 'next/server'
import { validateCoupon } from '@/lib/coupons/validate'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { store_id, coupon_code, customer_email, subtotal } = body

        // Validate required fields
        if (!store_id || !coupon_code) {
            return NextResponse.json(
                { valid: false, error: 'missing_fields', message: 'Store ID and coupon code are required' },
                { status: 400 }
            )
        }

        if (subtotal === undefined || subtotal < 0) {
            return NextResponse.json(
                { valid: false, error: 'invalid_subtotal', message: 'Valid subtotal is required' },
                { status: 400 }
            )
        }

        // Validate the coupon
        const result = await validateCoupon(
            store_id,
            coupon_code.trim(),
            customer_email || '',
            parseFloat(subtotal)
        )

        if (!result.valid) {
            return NextResponse.json({
                valid: false,
                error: result.error,
                message: result.message
            })
        }

        // Return successful validation with discount info
        return NextResponse.json({
            valid: true,
            coupon: {
                id: result.coupon.id,
                code: result.coupon.code,
                discount_type: result.coupon.discount_type,
                discount_value: result.coupon.discount_value
            },
            discount_amount: result.discount_amount,
            is_free_shipping: result.is_free_shipping,
            final_subtotal: parseFloat(subtotal) - result.discount_amount,
            message: result.message
        })

    } catch (error) {
        console.error('Apply coupon error:', error)
        return NextResponse.json(
            { valid: false, error: 'server_error', message: 'Failed to apply coupon' },
            { status: 500 }
        )
    }
}
