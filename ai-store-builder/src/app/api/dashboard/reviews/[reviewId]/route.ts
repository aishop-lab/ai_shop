// Dashboard Review Moderation API - PATCH to approve/reject reviews

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface RouteParams {
    params: Promise<{ reviewId: string }>
}

/**
 * PATCH /api/dashboard/reviews/[reviewId] - Approve or reject a review
 */
export async function PATCH(request: Request, { params }: RouteParams) {
    try {
        const { reviewId } = await params
        const body = await request.json()

        const { status } = body

        // Validation
        if (!status || !['approved', 'rejected'].includes(status)) {
            return NextResponse.json(
                { success: false, error: 'Invalid status. Must be "approved" or "rejected"' },
                { status: 400 }
            )
        }

        const supabase = await createClient()

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Get user's store
        const { data: store, error: storeError } = await supabase
            .from('stores')
            .select('id')
            .eq('owner_id', user.id)
            .single()

        if (storeError || !store) {
            return NextResponse.json(
                { success: false, error: 'Store not found' },
                { status: 404 }
            )
        }

        // Verify the review belongs to a product in seller's store
        const { data: review, error: reviewError } = await supabase
            .from('product_reviews')
            .select(`
        id,
        product_id,
        products!inner (
          store_id
        )
      `)
            .eq('id', reviewId)
            .single()

        if (reviewError || !review) {
            return NextResponse.json(
                { success: false, error: 'Review not found' },
                { status: 404 }
            )
        }

        // Check ownership
        const productStoreId = (review.products as any)?.store_id
        if (productStoreId !== store.id) {
            return NextResponse.json(
                { success: false, error: 'You do not have permission to moderate this review' },
                { status: 403 }
            )
        }

        // Update the review status
        const { data: updatedReview, error: updateError } = await supabase
            .from('product_reviews')
            .update({
                status,
                moderated_at: new Date().toISOString(),
                moderated_by: user.id,
            })
            .eq('id', reviewId)
            .select()
            .single()

        if (updateError) {
            console.error('Error updating review:', updateError)
            return NextResponse.json(
                { success: false, error: 'Failed to update review' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            review: updatedReview,
            message: `Review ${status}`,
        })

    } catch (error) {
        console.error('Review moderation error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to moderate review' },
            { status: 500 }
        )
    }
}
