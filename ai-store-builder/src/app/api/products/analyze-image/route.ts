// Enhanced Product Image Analysis API
// Analyzes product images with price suggestions and SEO optimization

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { vercelAI, AUTO_APPLY_THRESHOLD } from '@/lib/ai/vercel-ai-service'
import type { EnhancedProductAnalysis } from '@/lib/ai/schemas'
import { z } from 'zod'

const requestSchema = z.object({
  // Image can be URL or base64
  image_url: z.string().url().optional(),
  image_base64: z.string().optional(),
  image_mime_type: z.string().optional(),
  // Store context for better analysis
  store_context: z.object({
    store_name: z.string(),
    category: z.string(),
    brand_description: z.string().optional(),
  }).optional(),
}).refine(
  data => data.image_url || data.image_base64,
  { message: 'Either image_url or image_base64 is required' }
)

export interface ProductAnalysisResponse {
  success: boolean
  error?: string
  data?: EnhancedProductAnalysis & {
    auto_publish: boolean
    requires_review: boolean
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json<ProductAnalysisResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's store for context
    const { data: store } = await supabase
      .from('stores')
      .select('name, blueprint')
      .eq('owner_id', user.id)
      .single()

    // Parse and validate request
    const body = await request.json()
    const validation = requestSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json<ProductAnalysisResponse>(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { image_url, image_base64, image_mime_type, store_context } = validation.data

    // Prepare image data for analysis
    let imageData: { url: string } | { buffer: Buffer; mimeType: string }

    if (image_url) {
      imageData = { url: image_url }
    } else if (image_base64 && image_mime_type) {
      imageData = {
        buffer: Buffer.from(image_base64, 'base64'),
        mimeType: image_mime_type,
      }
    } else {
      return NextResponse.json<ProductAnalysisResponse>(
        { success: false, error: 'Invalid image data' },
        { status: 400 }
      )
    }

    // Build store context from request or database
    const context = store_context || (store ? {
      store_name: store.name,
      category: store.blueprint?.category?.business_type || 'General',
      brand_description: store.blueprint?.identity?.description,
    } : undefined)

    console.log(`[ProductAnalysis] Analyzing image for ${context?.store_name || 'unknown store'}`)

    // Call enhanced AI analysis
    const analysis = await vercelAI.analyzeProductImageEnhanced(imageData, context)

    // Determine auto-publish status based on confidence
    const autoPublish = analysis.confidence >= AUTO_APPLY_THRESHOLD
    const requiresReview = !autoPublish && analysis.confidence >= 0.6

    console.log(`[ProductAnalysis] Confidence: ${analysis.confidence}, Auto-publish: ${autoPublish}`)

    return NextResponse.json<ProductAnalysisResponse>({
      success: true,
      data: {
        ...analysis,
        auto_publish: autoPublish,
        requires_review: requiresReview,
      },
    })
  } catch (error) {
    console.error('[ProductAnalysis] Error:', error)
    return NextResponse.json<ProductAnalysisResponse>(
      { success: false, error: 'Failed to analyze product image' },
      { status: 500 }
    )
  }
}
