// Multi-Image Product Extraction API
// Analyzes multiple product images together for better accuracy

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { vercelAI, AUTO_APPLY_THRESHOLD } from '@/lib/ai/vercel-ai-service'
import sharp from 'sharp'

export const maxDuration = 90 // Allow up to 90 seconds for multi-image processing

// Max image size for AI analysis (resize larger images)
const MAX_IMAGE_DIMENSION = 1024
const MAX_IMAGE_SIZE_BYTES = 500 * 1024 // 500KB per image for AI analysis
const MAX_IMAGES_FOR_ANALYSIS = 5 // Limit images to prevent timeout

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

/**
 * Resize and optimize image for AI analysis
 */
async function optimizeImageForAnalysis(buffer: Buffer, mimeType: string): Promise<{ buffer: Buffer; mimeType: string }> {
  try {
    // If image is already small enough, return as-is
    if (buffer.length <= MAX_IMAGE_SIZE_BYTES) {
      return { buffer, mimeType }
    }

    // Use sharp to resize and compress
    let sharpInstance = sharp(buffer)
    const metadata = await sharpInstance.metadata()

    // Resize if dimensions are too large
    if (metadata.width && metadata.height) {
      const maxDim = Math.max(metadata.width, metadata.height)
      if (maxDim > MAX_IMAGE_DIMENSION) {
        sharpInstance = sharpInstance.resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
          fit: 'inside',
          withoutEnlargement: true
        })
      }
    }

    // Convert to JPEG with quality compression
    const optimizedBuffer = await sharpInstance
      .jpeg({ quality: 80 })
      .toBuffer()

    return { buffer: optimizedBuffer, mimeType: 'image/jpeg' }
  } catch (error) {
    console.warn('[ExtractMulti] Image optimization failed, using original:', error)
    return { buffer, mimeType }
  }
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

    const totalImages = body.images.length
    // Limit images for AI analysis to prevent timeout
    const imagesToAnalyze = body.images.slice(0, MAX_IMAGES_FOR_ANALYSIS)

    console.log(`[ExtractMulti] Processing ${totalImages} images (analyzing ${imagesToAnalyze.length})`)

    // Convert base64 images to buffers and optimize
    const imageBuffers: Array<{ buffer: Buffer; mimeType: string }> = []

    for (const img of imagesToAnalyze) {
      try {
        // Remove data URL prefix if present
        const base64Data = img.base64.replace(/^data:image\/[^;]+;base64,/, '')
        const buffer = Buffer.from(base64Data, 'base64')

        // Extract mime type from data URL if not provided
        let mimeType = img.mimeType
        if (!mimeType || mimeType === 'undefined') {
          const mimeMatch = img.base64.match(/^data:(image\/[^;]+);base64,/)
          mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg'
        }

        console.log(`[ExtractMulti] Image size before optimization: ${(buffer.length / 1024).toFixed(1)}KB`)

        // Optimize image for AI analysis
        const optimized = await optimizeImageForAnalysis(buffer, mimeType)

        console.log(`[ExtractMulti] Image size after optimization: ${(optimized.buffer.length / 1024).toFixed(1)}KB`)

        imageBuffers.push(optimized)
      } catch (imgError) {
        console.error('[ExtractMulti] Failed to process image:', imgError)
        // Continue with other images
      }
    }

    if (imageBuffers.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Failed to process any images' },
        { status: 400 }
      )
    }

    console.log(`[ExtractMulti] Analyzing ${imageBuffers.length} optimized images`)

    // Analyze images using AI
    let aiResult
    let suggestedPrimaryIndex = 0

    try {
      if (imageBuffers.length === 1) {
        // Single image - use single image analysis
        aiResult = await vercelAI.analyzeProductImage(imageBuffers[0])
      } else {
        // Multiple images - use multi-image analysis with primary selection
        const multiResult = await vercelAI.analyzeMultipleProductImagesWithPrimarySelection(imageBuffers)
        aiResult = multiResult.analysis
        suggestedPrimaryIndex = multiResult.suggestedPrimaryIndex
      }
    } catch (aiError) {
      console.error('[ExtractMulti] AI analysis failed:', aiError)

      // Fallback: try single image analysis on first image
      console.log('[ExtractMulti] Falling back to single image analysis')
      try {
        aiResult = await vercelAI.analyzeProductImage(imageBuffers[0])
      } catch (fallbackError) {
        console.error('[ExtractMulti] Fallback analysis also failed:', fallbackError)
        return NextResponse.json(
          {
            success: false,
            error: 'AI analysis failed. Please try with fewer or smaller images.',
            details: aiError instanceof Error ? aiError.message : 'Unknown error'
          },
          { status: 500 }
        )
      }
    }

    if (!aiResult) {
      return NextResponse.json(
        { success: false, error: 'AI analysis returned no results' },
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

      // Suggested primary image (0-indexed)
      suggestedPrimaryIndex,

      // Processing stages for UI progress
      stages: [
        { name: 'multi_image_analysis', status: 'completed' as const, message: `Analyzed ${imageBuffers.length} images` }
      ],

      // Number of images analyzed
      imagesAnalyzed: imageBuffers.length,
      totalImagesReceived: totalImages
    }

    console.log(`[ExtractMulti] Analysis complete. Confidence: ${aiResult.confidence}, Primary: ${suggestedPrimaryIndex}`)

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
