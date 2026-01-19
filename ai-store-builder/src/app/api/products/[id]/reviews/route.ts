// Reviews API for specific product - GET (fetch reviews) and POST (submit review)

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface RouteParams {
    params: Promise<{ id: string }>
}

/**
 * GET /api/products/[id]/reviews - Fetch reviews for a product
 * Query params: ?status=approved&sort=recent&page=1
 */
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { id: productId } = await params
        const { searchParams } = new URL(request.url)

        const status = searchParams.get('status') || 'approved'
        const sort = searchParams.get('sort') || 'recent'
        const page = parseInt(searchParams.get('page') || '1')
        const limit = 20

        const supabase = await createClient()

        // Build base query for reviews
        let reviewsQuery = supabase
            .from('product_reviews')
            .select('*')
            .eq('product_id', productId)

        // Filter by status
        if (status !== 'all') {
            reviewsQuery = reviewsQuery.eq('status', status)
        }

        // Apply sorting
        switch (sort) {
            case 'highest_rated':
                reviewsQuery = reviewsQuery.order('rating', { ascending: false })
                break
            case 'most_helpful':
                reviewsQuery = reviewsQuery.order('helpful_count', { ascending: false })
                break
            case 'recent':
            default:
                reviewsQuery = reviewsQuery.order('created_at', { ascending: false })
                break
        }

        // Apply pagination
        const offset = (page - 1) * limit
        reviewsQuery = reviewsQuery.range(offset, offset + limit - 1)

        const { data: reviews, error: reviewsError } = await reviewsQuery

        if (reviewsError) {
            console.error('Error fetching reviews:', reviewsError)
            return NextResponse.json(
                { success: false, error: 'Failed to fetch reviews' },
                { status: 500 }
            )
        }

        // Get review statistics
        const { data: stats, error: statsError } = await supabase
            .from('product_reviews')
            .select('rating')
            .eq('product_id', productId)
            .eq('status', 'approved')

        if (statsError) {
            console.error('Error fetching stats:', statsError)
        }

        // Calculate rating distribution
        const ratingDistribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
        let totalRating = 0

        if (stats) {
            stats.forEach((review: { rating: number }) => {
                ratingDistribution[review.rating] = (ratingDistribution[review.rating] || 0) + 1
                totalRating += review.rating
            })
        }

        const totalReviews = stats?.length || 0
        const averageRating = totalReviews > 0 ? (totalRating / totalReviews).toFixed(2) : '0.00'

        return NextResponse.json({
            success: true,
            reviews: reviews || [],
            stats: {
                total_reviews: totalReviews,
                average_rating: parseFloat(averageRating),
                rating_distribution: ratingDistribution,
            },
        })

    } catch (error) {
        console.error('Reviews fetch error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch reviews' },
            { status: 500 }
        )
    }
}

/**
 * POST /api/products/[id]/reviews - Submit a new review
 */
export async function POST(request: Request, { params }: RouteParams) {
    try {
        const { id: productId } = await params
        const body = await request.json()

        const {
            order_id,
            customer_name,
            customer_email,
            rating,
            title,
            review_text
        } = body

        // Validation
        if (!order_id || !customer_name || !customer_email || !rating || !review_text) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            )
        }

        if (rating < 1 || rating > 5) {
            return NextResponse.json(
                { success: false, error: 'Rating must be between 1 and 5' },
                { status: 400 }
            )
        }

        const supabase = await createClient()

        // Verify the order exists and belongs to this customer
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('id, customer_email, order_status')
            .eq('id', order_id)
            .single()

        if (orderError || !order) {
            return NextResponse.json(
                { success: false, error: 'Order not found' },
                { status: 404 }
            )
        }

        if (order.customer_email !== customer_email) {
            return NextResponse.json(
                { success: false, error: 'Order does not belong to this customer' },
                { status: 403 }
            )
        }

        // Check if order is delivered
        if (order.order_status !== 'delivered') {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Can only review products from delivered orders'
                },
                { status: 400 }
            )
        }

        // Check if customer already reviewed this product
        const { data: existingReview } = await supabase
            .from('product_reviews')
            .select('id')
            .eq('product_id', productId)
            .eq('customer_email', customer_email)
            .single()

        if (existingReview) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'You have already reviewed this product'
                },
                { status: 409 }
            )
        }

        // Insert the review
        const { data: newReview, error: insertError } = await supabase
            .from('product_reviews')
            .insert({
                product_id: productId,
                order_id,
                customer_name,
                customer_email,
                rating,
                title: title || null,
                review_text,
                status: 'pending', // Reviews need approval
                verified_purchase: true,
            })
            .select()
            .single()

        if (insertError) {
            console.error('Error inserting review:', insertError)

            // Check for unique constraint violation
            if (insertError.code === '23505') {
                return NextResponse.json(
                    { success: false, error: 'You have already reviewed this product' },
                    { status: 409 }
                )
            }

            return NextResponse.json(
                { success: false, error: 'Failed to submit review' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            review: newReview,
            message: 'Thank you! Your review is pending approval and will appear shortly.',
        })

    } catch (error) {
        console.error('Review submission error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to submit review' },
            { status: 500 }
        )
    }
}
