// Review voting API - POST to vote helpful/not helpful

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateSession } from '@/lib/customer/auth'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

interface RouteParams {
    params: Promise<{ reviewId: string }>
}

/**
 * POST /api/reviews/[reviewId]/vote - Vote on review helpfulness
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        // Rate limit votes
        const rateLimitResult = rateLimit(request, RATE_LIMITS.AUTH)
        if (rateLimitResult) return rateLimitResult

        const { reviewId } = await params
        const body = await request.json()

        const { vote_type } = body

        // Require customer session authentication
        const customerToken = request.cookies.get('customer_session')?.value
        if (!customerToken) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            )
        }

        const sessionResult = await validateSession(customerToken)
        if (!sessionResult.success || !sessionResult.customer) {
            return NextResponse.json(
                { success: false, error: 'Session expired' },
                { status: 401 }
            )
        }

        const customer_email = sessionResult.customer.email

        // Validation
        if (!vote_type) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            )
        }

        if (!['helpful', 'not_helpful'].includes(vote_type)) {
            return NextResponse.json(
                { success: false, error: 'Invalid vote type' },
                { status: 400 }
            )
        }

        const supabase = await createClient()

        // Check if review exists
        const { data: review, error: reviewError } = await supabase
            .from('product_reviews')
            .select('id')
            .eq('id', reviewId)
            .single()

        if (reviewError || !review) {
            return NextResponse.json(
                { success: false, error: 'Review not found' },
                { status: 404 }
            )
        }

        // Upsert vote (update if exists, insert if not)
        const { error: voteError } = await supabase
            .from('review_votes')
            .upsert(
                {
                    review_id: reviewId,
                    customer_email,
                    vote_type,
                },
                {
                    onConflict: 'review_id,customer_email'
                }
            )

        if (voteError) {
            console.error('Error recording vote:', voteError)
            return NextResponse.json(
                { success: false, error: 'Failed to record vote' },
                { status: 500 }
            )
        }

        // The trigger will automatically update helpful_count/not_helpful_count
        // Fetch updated counts
        const { data: updatedReview } = await supabase
            .from('product_reviews')
            .select('helpful_count, not_helpful_count')
            .eq('id', reviewId)
            .single()

        return NextResponse.json({
            success: true,
            helpful_count: updatedReview?.helpful_count || 0,
            not_helpful_count: updatedReview?.not_helpful_count || 0,
        })

    } catch (error) {
        console.error('Vote submission error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to submit vote' },
            { status: 500 }
        )
    }
}
