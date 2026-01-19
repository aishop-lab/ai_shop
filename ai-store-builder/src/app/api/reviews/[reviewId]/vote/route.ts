// Review voting API - POST to vote helpful/not helpful

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface RouteParams {
    params: Promise<{ reviewId: string }>
}

/**
 * POST /api/reviews/[reviewId]/vote - Vote on review helpfulness
 */
export async function POST(request: Request, { params }: RouteParams) {
    try {
        const { reviewId } = await params
        const body = await request.json()

        const { customer_email, vote_type } = body

        // Validation
        if (!customer_email || !vote_type) {
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
