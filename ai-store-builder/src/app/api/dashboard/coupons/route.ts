// Dashboard Coupons API
// CRUD operations for seller coupon management

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/dashboard/coupons - List all coupons for store
export async function GET(request: Request) {
    try {
        const supabase = await createClient()

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Get user's store
        const { data: store } = await supabase
            .from('stores')
            .select('*')
            .eq('owner_id', user.id)
            .limit(1)
            .single()

        if (!store) {
            return NextResponse.json(
                { success: false, error: 'Store not found' },
                { status: 404 }
            )
        }

        // Get coupons with usage stats
        const { data: coupons, error } = await supabase
            .from('coupons')
            .select(`
        *,
        coupon_usage (
          discount_amount
        )
      `)
            .eq('store_id', store.id)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching coupons:', error)
            return NextResponse.json(
                { success: false, error: 'Failed to fetch coupons' },
                { status: 500 }
            )
        }

        // Calculate total discount given for each coupon
        const couponsWithStats = coupons?.map(coupon => {
            const totalDiscountGiven = coupon.coupon_usage?.reduce(
                (sum: number, usage: { discount_amount: number }) => sum + Number(usage.discount_amount),
                0
            ) || 0

            const { coupon_usage, ...couponData } = coupon
            return {
                ...couponData,
                total_discount_given: totalDiscountGiven,
                orders_count: coupon_usage?.length || 0
            }
        })

        return NextResponse.json({
            success: true,
            coupons: couponsWithStats || []
        })

    } catch (error) {
        console.error('Coupons GET error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// POST /api/dashboard/coupons - Create new coupon
export async function POST(request: Request) {
    try {
        const supabase = await createClient()

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Get user's store
        const { data: store } = await supabase
            .from('stores')
            .select('*')
            .eq('owner_id', user.id)
            .limit(1)
            .single()

        if (!store) {
            return NextResponse.json(
                { success: false, error: 'Store not found' },
                { status: 404 }
            )
        }

        const body = await request.json()
        const {
            code,
            description,
            discount_type,
            discount_value,
            minimum_order_value,
            maximum_discount_amount,
            usage_limit,
            usage_limit_per_customer,
            starts_at,
            expires_at,
            active = true
        } = body

        // Validate required fields
        if (!code || !discount_type || discount_value === undefined) {
            return NextResponse.json(
                { success: false, error: 'Code, discount_type, and discount_value are required' },
                { status: 400 }
            )
        }

        // Validate discount type
        if (!['percentage', 'fixed_amount', 'free_shipping'].includes(discount_type)) {
            return NextResponse.json(
                { success: false, error: 'Invalid discount type' },
                { status: 400 }
            )
        }

        // Validate percentage value
        if (discount_type === 'percentage' && (discount_value <= 0 || discount_value > 100)) {
            return NextResponse.json(
                { success: false, error: 'Percentage must be between 1 and 100' },
                { status: 400 }
            )
        }

        // Validate fixed amount
        if (discount_type === 'fixed_amount' && discount_value <= 0) {
            return NextResponse.json(
                { success: false, error: 'Discount amount must be positive' },
                { status: 400 }
            )
        }

        // Check if code already exists for this store
        const { data: existing } = await supabase
            .from('coupons')
            .select('id')
            .eq('store_id', store.id)
            .eq('code', code.toUpperCase())
            .limit(1)

        if (existing && existing.length > 0) {
            return NextResponse.json(
                { success: false, error: 'A coupon with this code already exists' },
                { status: 400 }
            )
        }

        // Create coupon
        const { data: coupon, error } = await supabase
            .from('coupons')
            .insert({
                store_id: store.id,
                code: code.toUpperCase(),
                description,
                discount_type,
                discount_value: parseFloat(discount_value),
                minimum_order_value: minimum_order_value ? parseFloat(minimum_order_value) : null,
                maximum_discount_amount: maximum_discount_amount ? parseFloat(maximum_discount_amount) : null,
                usage_limit: usage_limit ? parseInt(usage_limit) : null,
                usage_limit_per_customer: usage_limit_per_customer ? parseInt(usage_limit_per_customer) : 1,
                starts_at: starts_at || null,
                expires_at: expires_at || null,
                active
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating coupon:', error)
            return NextResponse.json(
                { success: false, error: 'Failed to create coupon' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            coupon
        })

    } catch (error) {
        console.error('Coupons POST error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}
