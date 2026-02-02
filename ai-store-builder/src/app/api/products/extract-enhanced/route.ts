// Enhanced Product Image Extraction API
// Simplified version that uses vercel-ai-service for AI analysis

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { vercelAI, AUTO_APPLY_THRESHOLD } from '@/lib/ai/vercel-ai-service'
import sharp from 'sharp'

export const maxDuration = 60 // Allow up to 60 seconds for processing

// Max image size for AI analysis
const MAX_IMAGE_DIMENSION = 1024
const MAX_IMAGE_SIZE_BYTES = 500 * 1024 // 500KB

interface ExtractEnhancedRequest {
  imageBase64?: string
  imageUrl?: string
  mimeType?: string
  enhanceImage?: boolean
  removeBackground?: boolean
  runAIAnalysis?: boolean
  includeOCR?: boolean
}

/**
 * Optimize image for AI analysis
 */
async function optimizeImage(buffer: Buffer): Promise<Buffer> {
  try {
    if (buffer.length <= MAX_IMAGE_SIZE_BYTES) {
      return buffer
    }

    let sharpInstance = sharp(buffer)
    const metadata = await sharpInstance.metadata()

    if (metadata.width && metadata.height) {
      const maxDim = Math.max(metadata.width, metadata.height)
      if (maxDim > MAX_IMAGE_DIMENSION) {
        sharpInstance = sharpInstance.resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
          fit: 'inside',
          withoutEnlargement: true
        })
      }
    }

    return await sharpInstance.jpeg({ quality: 80 }).toBuffer()
  } catch (error) {
    console.warn('[ExtractEnhanced] Image optimization failed:', error)
    return buffer
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body: ExtractEnhancedRequest = await request.json()

    if (!body.imageBase64 && !body.imageUrl) {
      return NextResponse.json(
        { success: false, error: 'Either imageBase64 or imageUrl is required' },
        { status: 400 }
      )
    }

    // Get image buffer
    let buffer: Buffer
    let mimeType = body.mimeType || 'image/jpeg'

    if (body.imageBase64) {
      const base64Data = body.imageBase64.replace(/^data:image\/[^;]+;base64,/, '')
      buffer = Buffer.from(base64Data, 'base64')

      const mimeMatch = body.imageBase64.match(/^data:(image\/[^;]+);base64,/)
      if (mimeMatch) {
        mimeType = mimeMatch[1]
      }
    } else if (body.imageUrl) {
      const response = await fetch(body.imageUrl)
      if (!response.ok) {
        return NextResponse.json(
          { success: false, error: 'Failed to fetch image from URL' },
          { status: 400 }
        )
      }
      const arrayBuffer = await response.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
      mimeType = response.headers.get('content-type') || 'image/jpeg'
    } else {
      return NextResponse.json(
        { success: false, error: 'No image provided' },
        { status: 400 }
      )
    }

    console.log(`[ExtractEnhanced] Processing image: ${(buffer.length / 1024).toFixed(1)}KB`)

    // Optimize image for AI
    const optimizedBuffer = await optimizeImage(buffer)
    console.log(`[ExtractEnhanced] Optimized to: ${(optimizedBuffer.length / 1024).toFixed(1)}KB`)

    // Run AI analysis
    const stages: Array<{ name: string; status: 'completed' | 'processing' | 'failed'; message: string }> = [
      { name: 'upload', status: 'completed', message: 'Image received' },
      { name: 'ai_analysis', status: 'processing', message: 'Analyzing product...' }
    ]

    let aiResult
    try {
      aiResult = await vercelAI.analyzeProductImage({
        buffer: optimizedBuffer,
        mimeType
      })

      stages[1] = {
        name: 'ai_analysis',
        status: 'completed',
        message: `Confidence: ${(aiResult.confidence * 100).toFixed(0)}%`
      }
    } catch (aiError) {
      console.error('[ExtractEnhanced] AI analysis failed:', aiError)

      stages[1] = {
        name: 'ai_analysis',
        status: 'failed',
        message: aiError instanceof Error ? aiError.message : 'AI analysis failed'
      }

      return NextResponse.json({
        success: false,
        error: 'AI analysis failed. Please ensure GEMINI_API_KEY is configured.',
        details: aiError instanceof Error ? aiError.message : 'Unknown error',
        stages
      }, { status: 500 })
    }

    // Build response
    const response = {
      success: true,

      // Processing status (no actual enhancement without Vertex AI)
      wasEnhanced: false,
      enhancementsApplied: [],
      backgroundRemoved: false,

      // Quality assessment from AI
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

      // Processing stages
      stages
    }

    console.log(`[ExtractEnhanced] Analysis complete. Title: "${aiResult.title}", Confidence: ${aiResult.confidence}`)

    return NextResponse.json(response)
  } catch (error) {
    console.error('[ExtractEnhanced] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process image'
      },
      { status: 500 }
    )
  }
}
