// Enhanced Product Image Extraction API
// Runs full processing pipeline: enhance, OCR, background removal, AI analysis

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processProductImagePipeline, type PipelineOptions } from '@/lib/products/processing-pipeline'
import { AUTO_APPLY_THRESHOLD } from '@/lib/ai/unified-ai-service'

export const maxDuration = 60 // Allow up to 60 seconds for processing

interface ExtractEnhancedRequest {
  // Either provide image as base64 or URL
  imageBase64?: string
  imageUrl?: string
  mimeType?: string
  // Processing options
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
    const body: ExtractEnhancedRequest = await request.json()

    // Validate input
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
      // Decode base64 image
      const base64Data = body.imageBase64.replace(/^data:image\/\w+;base64,/, '')
      buffer = Buffer.from(base64Data, 'base64')

      // Try to extract mime type from data URL
      const mimeMatch = body.imageBase64.match(/^data:(image\/\w+);base64,/)
      if (mimeMatch) {
        mimeType = mimeMatch[1]
      }
    } else if (body.imageUrl) {
      // Fetch image from URL
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

    // Configure pipeline options
    const options: PipelineOptions = {
      enhanceImage: body.enhanceImage !== false, // Default true
      removeBackground: body.removeBackground !== false, // Default true
      createThumbnails: true,
      runAIAnalysis: body.runAIAnalysis !== false, // Default true
      includeOCR: body.includeOCR !== false, // Default true
      includeSafeSearch: true,
      autoApplyHighConfidence: true
    }

    console.log('[ExtractEnhanced] Starting pipeline with options:', options)

    // Run the full processing pipeline
    const result = await processProductImagePipeline(buffer, mimeType, options)

    // Check safe search result
    if (!result.safeSearchPassed) {
      return NextResponse.json({
        success: false,
        error: 'Image contains inappropriate content',
        safeSearchDetails: result.safeSearchDetails
      }, { status: 400 })
    }

    // Build response
    const response = {
      success: true,

      // Processing status
      wasEnhanced: result.wasEnhanced,
      enhancementsApplied: result.enhancementsApplied,
      backgroundRemoved: result.backgroundRemoved,

      // Quality assessment
      qualityAssessment: {
        score: result.qualityAssessment.score,
        brightness: result.qualityAssessment.brightness,
        isBlurry: result.qualityAssessment.isBlurry,
        recommendations: result.qualityAssessment.recommendations
      },

      // AI suggestions (if available)
      aiSuggestions: result.aiSuggestions ? {
        title: result.aiSuggestions.ai_suggested_title,
        description: result.aiSuggestions.ai_suggested_description,
        categories: result.aiSuggestions.ai_suggested_category,
        tags: result.aiSuggestions.ai_suggested_tags,
        attributes: result.aiSuggestions.ai_suggested_attributes,
        confidence: result.aiSuggestions.confidence,
        ocrText: result.aiSuggestions.ocr_text || [],
        imageQuality: result.aiSuggestions.image_quality
      } : null,

      // Auto-apply recommendation
      shouldAutoApply: result.shouldAutoApply,
      autoApplyThreshold: AUTO_APPLY_THRESHOLD,

      // Processing stages for UI progress
      stages: result.stages,

      // Processed images as base64 (for preview before upload)
      processedImages: {
        enhanced: result.enhancedBuffer.toString('base64'),
        thumbnail: result.thumbnailBuffer.toString('base64'),
        mimeType: 'image/jpeg'
      }
    }

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
