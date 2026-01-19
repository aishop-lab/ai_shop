// Dashboard Reviews API - GET reviews for seller moderation

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/dashboard/reviews - Fetch reviews for seller's products
 * Query params: ?status=pending
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status') || 'pending'

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

        // Fetch reviews for products belonging to this store
        let query = supabase
            .from('product_reviews')
            .select(`
        *,
        products!inner (
          id,
          title,
          store_id
        )
      `)
            .eq('products.store_id', store.id)
            .order('created_at', { ascending: false })

        // Filter by status
        if (status !== 'all') {
            query = query.eq('status', status)
        }

        const { data: reviews, error: reviewsError } = await query

        if (reviewsError) {
            console.error('Error fetching reviews:', reviewsError)
            return NextResponse.json(
                { success: false, error: 'Failed to fetch reviews' },
                { status: 500 }
            )
        }

        // Transform data to include product title at top level
        const transformedReviews = reviews?.map((review: any) => ({
            ...review,
            product_title: review.products?.title,
            product_id: review.products?.id,
        })) || []

        return NextResponse.json({
            success: true,
            reviews: transformedReviews,
        })

    } catch (error) {
        console.error('Dashboard reviews fetch error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch reviews' },
            { status: 500 }
        )
    }
}
