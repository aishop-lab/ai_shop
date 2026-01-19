// Coupon Validation Logic
// Validates coupons and calculates discount amounts

import { createClient } from '@/lib/supabase/server'

// Error types for coupon validation
export type CouponError =
    | 'not_found'
    | 'inactive'
    | 'expired'
    | 'not_started'
    | 'usage_limit_reached'
    | 'usage_limit_per_customer_reached'
    | 'minimum_not_met'

export interface Coupon {
    id: string
    store_id: string
    code: string
    description: string | null
    discount_type: 'percentage' | 'fixed_amount' | 'free_shipping'
    discount_value: number
    minimum_order_value: number | null
    maximum_discount_amount: number | null
    usage_limit: number | null
    usage_count: number
    usage_limit_per_customer: number
    starts_at: string | null
    expires_at: string | null
    active: boolean
    created_at: string
    updated_at: string
}

export interface ValidationSuccess {
    valid: true
    coupon: Coupon
    discount_amount: number
    is_free_shipping: boolean
    message: string
}

export interface ValidationError {
    valid: false
    error: CouponError
    message: string
}

export type ValidationResult = ValidationSuccess | ValidationError

/**
 * Validate a coupon code and calculate the discount
 */
export async function validateCoupon(
    storeId: string,
    code: string,
    customerEmail: string,
    subtotal: number
): Promise<ValidationResult> {
    const supabase = await createClient()

    // 1. Fetch coupon by store and code
    const { data: coupon, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('store_id', storeId)
        .eq('code', code.toUpperCase())
        .single()

    if (error || !coupon) {
        return {
            valid: false,
            error: 'not_found',
            message: 'Invalid coupon code'
        }
    }

    // 2. Check if active
    if (!coupon.active) {
        return {
            valid: false,
            error: 'inactive',
            message: 'This coupon is no longer active'
        }
    }

    // 3. Check date range
    const now = new Date()

    if (coupon.starts_at && new Date(coupon.starts_at) > now) {
        return {
            valid: false,
            error: 'not_started',
            message: 'This coupon is not yet active'
        }
    }

    if (coupon.expires_at && new Date(coupon.expires_at) < now) {
        return {
            valid: false,
            error: 'expired',
            message: 'This coupon has expired'
        }
    }

    // 4. Check overall usage limit
    if (coupon.usage_limit !== null && coupon.usage_count >= coupon.usage_limit) {
        return {
            valid: false,
            error: 'usage_limit_reached',
            message: 'This coupon has reached its usage limit'
        }
    }

    // 5. Check per-customer usage limit
    if (coupon.usage_limit_per_customer && customerEmail) {
        const { count } = await supabase
            .from('coupon_usage')
            .select('*', { count: 'exact', head: true })
            .eq('coupon_id', coupon.id)
            .eq('customer_email', customerEmail.toLowerCase())

        if (count !== null && count >= coupon.usage_limit_per_customer) {
            return {
                valid: false,
                error: 'usage_limit_per_customer_reached',
                message: 'You have already used this coupon'
            }
        }
    }

    // 6. Check minimum order value
    if (coupon.minimum_order_value !== null && subtotal < coupon.minimum_order_value) {
        return {
            valid: false,
            error: 'minimum_not_met',
            message: `Minimum order value ₹${coupon.minimum_order_value.toLocaleString()} required`
        }
    }

    // 7. Calculate discount amount
    let discountAmount = 0
    let isFreeShipping = false

    if (coupon.discount_type === 'percentage') {
        discountAmount = (subtotal * coupon.discount_value) / 100

        // Apply maximum cap if set
        if (coupon.maximum_discount_amount !== null) {
            discountAmount = Math.min(discountAmount, coupon.maximum_discount_amount)
        }
    } else if (coupon.discount_type === 'fixed_amount') {
        discountAmount = coupon.discount_value

        // Don't let discount exceed subtotal
        discountAmount = Math.min(discountAmount, subtotal)
    } else if (coupon.discount_type === 'free_shipping') {
        // Free shipping doesn't affect subtotal directly
        isFreeShipping = true
        discountAmount = 0
    }

    // Round to 2 decimals
    discountAmount = Math.round(discountAmount * 100) / 100

    // Build success message
    let message = ''
    if (isFreeShipping) {
        message = 'Free shipping applied!'
    } else if (discountAmount > 0) {
        message = `Coupon applied! You saved ₹${discountAmount.toLocaleString()}`
    }

    return {
        valid: true,
        coupon: coupon as Coupon,
        discount_amount: discountAmount,
        is_free_shipping: isFreeShipping,
        message
    }
}

/**
 * Record coupon usage after an order is placed
 */
export async function recordCouponUsage(
    couponId: string,
    orderId: string,
    customerEmail: string,
    discountAmount: number
): Promise<boolean> {
    const supabase = await createClient()

    // Insert usage record
    const { error: usageError } = await supabase
        .from('coupon_usage')
        .insert({
            coupon_id: couponId,
            order_id: orderId,
            customer_email: customerEmail.toLowerCase(),
            discount_amount: discountAmount
        })

    if (usageError) {
        console.error('Failed to record coupon usage:', usageError)
        return false
    }

    // Increment usage count using RPC
    const { error: rpcError } = await supabase
        .rpc('increment_coupon_usage', { coupon_uuid: couponId })

    if (rpcError) {
        console.error('Failed to increment coupon usage:', rpcError)
        return false
    }

    return true
}

/**
 * Format discount for display
 */
export function formatDiscount(coupon: Coupon): string {
    switch (coupon.discount_type) {
        case 'percentage':
            return `${coupon.discount_value}% off`
        case 'fixed_amount':
            return `₹${coupon.discount_value.toLocaleString()} off`
        case 'free_shipping':
            return 'Free Shipping'
        default:
            return ''
    }
}

/**
 * Check if a coupon is currently valid (not expired, not reached limit)
 */
export function isCouponValid(coupon: Coupon): boolean {
    const now = new Date()

    if (!coupon.active) return false
    if (coupon.expires_at && new Date(coupon.expires_at) < now) return false
    if (coupon.starts_at && new Date(coupon.starts_at) > now) return false
    if (coupon.usage_limit !== null && coupon.usage_count >= coupon.usage_limit) return false

    return true
}
