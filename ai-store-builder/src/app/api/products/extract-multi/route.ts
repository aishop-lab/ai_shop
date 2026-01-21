// Multi-Image Product Extraction API
// Analyzes multiple product images together for better accuracy

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { vercelAI, AUTO_APPLY_THRESHOLD } from '@/lib/ai/vercel-ai-service'

export const maxDuration = 90 // Allow up to 90 seconds for multi-image processing

interface ImageData {
  base64: string
  mimeType: string
}

interface ExtractMultiRequest {
  images: ImageData[]
  enhanceImage?: boolean
  removeBackground?: boolean
  runAIAnalysis?: boolean
  includeOCR?: boolean
}

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

    // Parse request
    const body: ExtractMultiRequest = await request.json()

    // Validate input
    if (!body.images || !Array.isArray(body.images) || body.images.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one image is required' },
        { status: 400 }
      )
    }

    if (body.images.length > 10) {
      return NextResponse.json(
        { success: false, error: 'Maximum 10 images allowed' },
        { status: 400 }
      )
    }

    console.log(`[ExtractMulti] Analyzing ${body.images.length} images together`)

    // Convert base64 images to buffers
    const imageBuffers: Array<{ buffer: Buffer; mimeType: string }> = body.images.map(img => {
      const base64Data = img.base64.replace(/^data:image\/\w+;base64,/, '')
      const buffer = Buffer.from(base64Data, 'base64')

      // Extract mime type from data URL if not provided
      let mimeType = img.mimeType
      if (!mimeType) {
        const mimeMatch = img.base64.match(/^data:(image\/\w+);base64,/)
        mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg'
      }

      return { buffer, mimeType }
    })

    // Analyze all images together using AI
    const aiResult = await vercelAI.analyzeMultipleProductImages(imageBuffers)

    if (!aiResult) {
      return NextResponse.json(
        { success: false, error: 'AI analysis failed' },
        { status: 500 }
      )
    }

    // Build response (compatible with existing UI)
    const response = {
      success: true,

      // Processing status
      wasEnhanced: false,
      enhancementsApplied: [],
      backgroundRemoved: false,

      // Quality assessment (aggregate from all images)
      qualityAssessment: {
        score: aiResult.image_quality?.score || 7,
        brightness: aiResult.image_quality?.brightness || 'normal',
        isBlurry: aiResult.image_quality?.is_blurry || false,
        recommendations: aiResult.image_quality?.recommended_actions || []
      },

      // AI suggestions
      aiSuggestions: {
        title: aiResult.title,
        description: aiResult.description,
        categories: aiResult.categories,
        tags: aiResult.tags,
        attributes: aiResult.attributes,
        confidence: aiResult.confidence,
        ocrText: aiResult.ocr_text || [],
        imageQuality: aiResult.image_quality
      },

      // Auto-apply recommendation
      shouldAutoApply: aiResult.confidence >= AUTO_APPLY_THRESHOLD,
      autoApplyThreshold: AUTO_APPLY_THRESHOLD,

      // Processing stages for UI progress
      stages: [
        { name: 'multi_image_analysis', status: 'completed' as const, message: `Analyzed ${body.images.length} images` }
      ],

      // Number of images analyzed
      imagesAnalyzed: body.images.length
    }

    console.log(`[ExtractMulti] Analysis complete. Confidence: ${aiResult.confidence}, Images: ${body.images.length}`)

    return NextResponse.json(response)
  } catch (error) {
    console.error('[ExtractMulti] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process images'
      },
      { status: 500 }
    )
  }
}
