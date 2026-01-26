import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getRecommendations } from '@/lib/ai/recommendations'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

const querySchema = z.object({
  storeId: z.string().uuid(),
  productId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  customerEmail: z.string().email().optional(),
  limit: z.coerce.number().int().min(1).max(20).optional().default(4),
  type: z.enum(['similar', 'complementary', 'trending', 'personalized']).optional().default('similar')
})

export async function GET(request: NextRequest) {
  try {
    // Rate limit
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const rateLimitResult = await checkRateLimit(`recommendations:${ip}`, RATE_LIMITS.API)

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      )
    }

    const { searchParams } = new URL(request.url)
    const params = {
      storeId: searchParams.get('storeId'),
      productId: searchParams.get('productId') || undefined,
      customerId: searchParams.get('customerId') || undefined,
      customerEmail: searchParams.get('customerEmail') || undefined,
      limit: searchParams.get('limit') || undefined,
      type: searchParams.get('type') || undefined
    }

    const validation = querySchema.safeParse(params)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const recommendations = await getRecommendations(validation.data)

    // Format response with product details
    const formattedRecommendations = recommendations.map(rec => ({
      productId: rec.product_id,
      score: rec.score,
      reason: rec.reason,
      product: rec.product ? {
        id: rec.product.id,
        title: rec.product.title,
        price: rec.product.price,
        categories: rec.product.categories,
        tags: rec.product.tags
      } : null
    }))

    return NextResponse.json({
      success: true,
      recommendations: formattedRecommendations,
      type: validation.data.type
    })
  } catch (error) {
    console.error('Recommendations error:', error)
    return NextResponse.json(
      { error: 'Failed to get recommendations' },
      { status: 500 }
    )
  }
}
