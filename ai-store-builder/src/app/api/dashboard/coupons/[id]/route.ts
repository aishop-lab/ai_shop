// Dashboard Coupon by ID API
// Get, Update, Delete single coupon

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
    params: Promise<{ id: string }>
}

// GET /api/dashboard/coupons/[id] - Get single coupon
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params
        const supabase = await createClient()

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Get coupon with store ownership check
        const { data: coupon, error } = await supabase
            .from('coupons')
            .select(`
        stores!inner (owner_id)
      `)
            .eq('id', id)
            .single()

        if (error || !coupon) {
            return NextResponse.json(
                { success: false, error: 'Coupon not found' },
                { status: 404 }
            )
        }

        const storeData = Array.isArray(coupon.stores) ? coupon.stores[0] : coupon.stores
        if (storeData?.owner_id !== user.id) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            )
        }

        const { stores, ...couponData } = coupon

        return NextResponse.json({
            success: true,
            coupon: couponData
        })

    } catch (error) {
        console.error('Coupon GET error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// PATCH /api/dashboard/coupons/[id] - Update coupon
export async function PATCH(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params
        const supabase = await createClient()

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Get coupon with store ownership check
        const { data: existing, error: fetchError } = await supabase
            .from('coupons')
            .select(`
        *,
        stores!inner (owner_id)
      `)
            .eq('id', id)
            .single()

        if (fetchError || !existing) {
            return NextResponse.json(
                { success: false, error: 'Coupon not found' },
                { status: 404 }
            )
        }

        const existingStoreData = Array.isArray(existing.stores) ? existing.stores[0] : existing.stores
        if (existingStoreData?.owner_id !== user.id) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            )
        }

        const body = await request.json()
        const updateData: Record<string, unknown> = {}

        // Only update provided fields
        if (body.description !== undefined) updateData.description = body.description
        if (body.discount_type !== undefined) updateData.discount_type = body.discount_type
        if (body.discount_value !== undefined) updateData.discount_value = parseFloat(body.discount_value)
        if (body.minimum_order_value !== undefined) updateData.minimum_order_value = body.minimum_order_value ? parseFloat(body.minimum_order_value) : null
        if (body.maximum_discount_amount !== undefined) updateData.maximum_discount_amount = body.maximum_discount_amount ? parseFloat(body.maximum_discount_amount) : null
        if (body.usage_limit !== undefined) updateData.usage_limit = body.usage_limit ? parseInt(body.usage_limit) : null
        if (body.usage_limit_per_customer !== undefined) updateData.usage_limit_per_customer = parseInt(body.usage_limit_per_customer)
        if (body.starts_at !== undefined) updateData.starts_at = body.starts_at || null
        if (body.expires_at !== undefined) updateData.expires_at = body.expires_at || null
        if (body.active !== undefined) updateData.active = body.active

        // Code update requires uniqueness check
        if (body.code !== undefined && body.code !== existing.code) {
            const { data: codeExists } = await supabase
                .from('coupons')
                .select('id')
                .eq('store_id', existing.store_id)
                .eq('code', body.code.toUpperCase())
                .neq('id', id)
                .limit(1)

            if (codeExists && codeExists.length > 0) {
                return NextResponse.json(
                    { success: false, error: 'A coupon with this code already exists' },
                    { status: 400 }
                )
            }
            updateData.code = body.code.toUpperCase()
        }

        // Update coupon
        const { data: coupon, error } = await supabase
            .from('coupons')
            .update(updateData)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Error updating coupon:', error)
            return NextResponse.json(
                { success: false, error: 'Failed to update coupon' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            coupon
        })

    } catch (error) {
        console.error('Coupon PATCH error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// DELETE /api/dashboard/coupons/[id] - Delete coupon
export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params
        const supabase = await createClient()

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Get coupon with store ownership check
        const { data: existing, error: fetchError } = await supabase
            .from('coupons')
            .select(`
        stores!inner (owner_id)
      `)
            .eq('id', id)
            .single()

        if (fetchError || !existing) {
            return NextResponse.json(
                { success: false, error: 'Coupon not found' },
                { status: 404 }
            )
        }

        const deleteStoreData = Array.isArray(existing.stores) ? existing.stores[0] : existing.stores
        if (deleteStoreData?.owner_id !== user.id) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            )
        }

        // Delete coupon (cascade will delete usage records)
        const { error } = await supabase
            .from('coupons')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting coupon:', error)
            return NextResponse.json(
                { success: false, error: 'Failed to delete coupon' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'Coupon deleted successfully'
        })

    } catch (error) {
        console.error('Coupon DELETE error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}
