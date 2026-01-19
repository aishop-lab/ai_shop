// Product Image Processing Pipeline - Orchestrates enhancement, AI analysis, and upload

import {
  enhanceProductImage,
  analyzeImageQuality,
  removeBackground,
  createImageVariants,
  type ImageQualityAssessment,
  type EnhancementResult,
  type BackgroundRemovalResult
} from './image-processor'
import { unifiedAI, type UnifiedProductResult, AUTO_APPLY_THRESHOLD } from '@/lib/ai/unified-ai-service'
import { googleVision } from '@/lib/ai/google-vision-service'
import type { AIProductSuggestions } from '@/lib/ai/product-extractor'

// Pipeline configuration
export interface PipelineOptions {
  // Image processing options
  enhanceImage?: boolean
  removeBackground?: boolean
  createThumbnails?: boolean

  // AI options
  runAIAnalysis?: boolean
  includeOCR?: boolean
  includeSafeSearch?: boolean
  autoApplyHighConfidence?: boolean
}

const DEFAULT_OPTIONS: PipelineOptions = {
  enhanceImage: true,
  removeBackground: true,
  createThumbnails: true,
  runAIAnalysis: true,
  includeOCR: true,
  includeSafeSearch: true,
  autoApplyHighConfidence: true
}

// Pipeline result types
export interface ProcessingStage {
  name: string
  status: 'pending' | 'processing' | 'completed' | 'skipped' | 'failed'
  message?: string
  duration?: number
}

export interface ProcessedImageResult {
  // Buffers
  originalBuffer: Buffer
  enhancedBuffer: Buffer
  thumbnailBuffer: Buffer

  // Processing info
  wasEnhanced: boolean
  enhancementsApplied: string[]
  backgroundRemoved: boolean

  // Quality assessment
  qualityAssessment: ImageQualityAssessment

  // AI suggestions (if enabled)
  aiSuggestions?: AIProductSuggestions & {
    ocr_text?: string[]
    image_quality?: UnifiedProductResult['image_quality']
  }

  // Auto-apply flag
  shouldAutoApply: boolean

  // Processing stages for UI
  stages: ProcessingStage[]

  // Safe search result
  safeSearchPassed: boolean
  safeSearchDetails?: {
    adult: string
    violence: string
    racy: string
  }
}

// Processing stages for progress tracking
const STAGE_NAMES = {
  UPLOAD: 'Uploading image',
  ENHANCE: 'Enhancing image quality',
  BACKGROUND: 'Removing background',
  QUALITY: 'Analyzing image quality',
  OCR: 'Extracting text (OCR)',
  AI_ANALYZE: 'AI analyzing product',
  SAFE_SEARCH: 'Checking content safety',
  THUMBNAILS: 'Creating thumbnails',
  COMPLETE: 'Processing complete'
}

/**
 * Main processing pipeline for product images
 * Orchestrates: enhancement, background removal, AI analysis, OCR, thumbnails
 */
export async function processProductImagePipeline(
  buffer: Buffer,
  mimeType: string,
  options: PipelineOptions = {}
): Promise<ProcessedImageResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const stages: ProcessingStage[] = []
  const startTime = Date.now()

  let currentBuffer = buffer
  let wasEnhanced = false
  let enhancementsApplied: string[] = []
  let backgroundRemoved = false
  let shouldAutoApply = false
  let safeSearchPassed = true
  let safeSearchDetails: ProcessedImageResult['safeSearchDetails'] | undefined

  // Initialize stages
  Object.values(STAGE_NAMES).forEach(name => {
    stages.push({ name, status: 'pending' })
  })

  const updateStage = (name: string, status: ProcessingStage['status'], message?: string) => {
    const stage = stages.find(s => s.name === name)
    if (stage) {
      stage.status = status
      stage.message = message
      if (status === 'completed' || status === 'failed') {
        stage.duration = Date.now() - startTime
      }
    }
  }

  try {
    // Mark upload as complete (buffer already received)
    updateStage(STAGE_NAMES.UPLOAD, 'completed')

    // 1. Safe Search Check (if enabled)
    if (opts.includeSafeSearch) {
      updateStage(STAGE_NAMES.SAFE_SEARCH, 'processing')
      try {
        const safeSearch = await googleVision.moderateImage(currentBuffer)
        safeSearchPassed = safeSearch.isAppropriate
        safeSearchDetails = {
          adult: safeSearch.adult,
          violence: safeSearch.violence,
          racy: safeSearch.racy
        }
        updateStage(
          STAGE_NAMES.SAFE_SEARCH,
          safeSearchPassed ? 'completed' : 'failed',
          safeSearchPassed ? 'Content is safe' : 'Content flagged as inappropriate'
        )

        if (!safeSearchPassed) {
          // Return early with failure
          return buildResult(
            buffer,
            buffer,
            buffer,
            {
              needsEnhancement: false,
              needsBackgroundRemoval: false,
              brightness: 'normal',
              isBlurry: false,
              score: 0,
              recommendations: ['Image flagged as inappropriate']
            },
            stages,
            { wasEnhanced: false, backgroundRemoved: false, shouldAutoApply: false, safeSearchPassed: false, safeSearchDetails }
          )
        }
      } catch (error) {
        console.warn('[Pipeline] Safe search check failed, continuing:', error)
        updateStage(STAGE_NAMES.SAFE_SEARCH, 'skipped', 'Safe search unavailable')
      }
    } else {
      updateStage(STAGE_NAMES.SAFE_SEARCH, 'skipped')
    }

    // 2. Quality Assessment
    updateStage(STAGE_NAMES.QUALITY, 'processing')
    const qualityAssessment = await analyzeImageQuality(currentBuffer)
    updateStage(STAGE_NAMES.QUALITY, 'completed', `Quality score: ${qualityAssessment.score}/10`)

    // 3. Image Enhancement (if enabled and needed)
    if (opts.enhanceImage) {
      updateStage(STAGE_NAMES.ENHANCE, 'processing')
      const enhanceResult = await enhanceProductImage(currentBuffer)
      currentBuffer = enhanceResult.buffer
      wasEnhanced = enhanceResult.wasEnhanced
      enhancementsApplied = enhanceResult.enhancementsApplied
      updateStage(
        STAGE_NAMES.ENHANCE,
        'completed',
        wasEnhanced ? `Applied: ${enhancementsApplied.join(', ')}` : 'No enhancement needed'
      )
    } else {
      updateStage(STAGE_NAMES.ENHANCE, 'skipped')
    }

    // 4. Background Removal (if enabled and recommended)
    if (opts.removeBackground && qualityAssessment.needsBackgroundRemoval) {
      updateStage(STAGE_NAMES.BACKGROUND, 'processing')
      const bgResult = await removeBackground(currentBuffer)
      if (bgResult.wasRemoved) {
        currentBuffer = bgResult.buffer
        backgroundRemoved = true
        updateStage(STAGE_NAMES.BACKGROUND, 'completed', `Detected: ${bgResult.mainObjectDetected}`)
      } else {
        updateStage(STAGE_NAMES.BACKGROUND, 'skipped', 'Background removal not needed')
      }
    } else {
      updateStage(STAGE_NAMES.BACKGROUND, 'skipped', opts.removeBackground ? 'Not recommended' : 'Disabled')
    }

    // 5. OCR Text Extraction (if enabled)
    let ocrText: string[] = []
    if (opts.includeOCR) {
      updateStage(STAGE_NAMES.OCR, 'processing')
      try {
        ocrText = await googleVision.extractText(currentBuffer)
        updateStage(STAGE_NAMES.OCR, 'completed', `Found ${ocrText.length} text blocks`)
      } catch (error) {
        console.warn('[Pipeline] OCR failed:', error)
        updateStage(STAGE_NAMES.OCR, 'skipped', 'OCR unavailable')
      }
    } else {
      updateStage(STAGE_NAMES.OCR, 'skipped')
    }

    // 6. AI Product Analysis (if enabled)
    let aiSuggestions: ProcessedImageResult['aiSuggestions'] | undefined
    if (opts.runAIAnalysis) {
      updateStage(STAGE_NAMES.AI_ANALYZE, 'processing')
      try {
        const aiResult = await unifiedAI.analyzeProductImage({
          buffer: currentBuffer,
          mimeType
        })

        aiSuggestions = {
          ai_suggested_title: aiResult.title,
          ai_suggested_description: aiResult.description,
          ai_suggested_category: aiResult.categories,
          ai_suggested_tags: aiResult.tags,
          ai_suggested_attributes: aiResult.attributes,
          confidence: aiResult.confidence,
          ocr_text: ocrText.length > 0 ? ocrText : aiResult.ocr_text,
          image_quality: aiResult.image_quality
        }

        // Determine if should auto-apply
        shouldAutoApply = !!(opts.autoApplyHighConfidence &&
          aiResult.confidence >= AUTO_APPLY_THRESHOLD)

        updateStage(
          STAGE_NAMES.AI_ANALYZE,
          'completed',
          `Confidence: ${(aiResult.confidence * 100).toFixed(0)}%${shouldAutoApply ? ' (auto-apply)' : ''}`
        )
      } catch (error) {
        console.error('[Pipeline] AI analysis failed:', error)
        updateStage(STAGE_NAMES.AI_ANALYZE, 'failed', 'AI analysis unavailable')
      }
    } else {
      updateStage(STAGE_NAMES.AI_ANALYZE, 'skipped')
    }

    // 7. Create Thumbnails
    let thumbnailBuffer = currentBuffer
    if (opts.createThumbnails) {
      updateStage(STAGE_NAMES.THUMBNAILS, 'processing')
      const variants = await createImageVariants(currentBuffer)
      currentBuffer = variants.original
      thumbnailBuffer = variants.thumbnail
      updateStage(STAGE_NAMES.THUMBNAILS, 'completed')
    } else {
      updateStage(STAGE_NAMES.THUMBNAILS, 'skipped')
    }

    // Mark complete
    updateStage(STAGE_NAMES.COMPLETE, 'completed', `Total time: ${Date.now() - startTime}ms`)

    return buildResult(
      buffer,
      currentBuffer,
      thumbnailBuffer,
      qualityAssessment,
      stages,
      {
        wasEnhanced,
        enhancementsApplied,
        backgroundRemoved,
        shouldAutoApply,
        safeSearchPassed,
        safeSearchDetails,
        aiSuggestions
      }
    )
  } catch (error) {
    console.error('[Pipeline] Processing failed:', error)

    // Mark remaining stages as failed
    stages.forEach(stage => {
      if (stage.status === 'pending' || stage.status === 'processing') {
        stage.status = 'failed'
        stage.message = 'Pipeline error'
      }
    })

    // Return original with error info
    return buildResult(
      buffer,
      buffer,
      buffer,
      {
        needsEnhancement: false,
        needsBackgroundRemoval: false,
        brightness: 'normal',
        isBlurry: false,
        score: 0,
        recommendations: ['Processing failed']
      },
      stages,
      { wasEnhanced: false, backgroundRemoved: false, shouldAutoApply: false, safeSearchPassed: true }
    )
  }
}

// Helper to build result object
function buildResult(
  originalBuffer: Buffer,
  enhancedBuffer: Buffer,
  thumbnailBuffer: Buffer,
  qualityAssessment: ImageQualityAssessment,
  stages: ProcessingStage[],
  extras: {
    wasEnhanced: boolean
    enhancementsApplied?: string[]
    backgroundRemoved: boolean
    shouldAutoApply: boolean
    safeSearchPassed: boolean
    safeSearchDetails?: ProcessedImageResult['safeSearchDetails']
    aiSuggestions?: ProcessedImageResult['aiSuggestions']
  }
): ProcessedImageResult {
  return {
    originalBuffer,
    enhancedBuffer,
    thumbnailBuffer,
    wasEnhanced: extras.wasEnhanced,
    enhancementsApplied: extras.enhancementsApplied || [],
    backgroundRemoved: extras.backgroundRemoved,
    qualityAssessment,
    aiSuggestions: extras.aiSuggestions,
    shouldAutoApply: extras.shouldAutoApply,
    stages,
    safeSearchPassed: extras.safeSearchPassed,
    safeSearchDetails: extras.safeSearchDetails
  }
}

/**
 * Quick analysis without full processing
 * Useful for preview/validation before full pipeline
 */
export async function quickAnalyzeImage(buffer: Buffer): Promise<{
  quality: ImageQualityAssessment
  needsProcessing: boolean
  recommendations: string[]
}> {
  const quality = await analyzeImageQuality(buffer)

  return {
    quality,
    needsProcessing: quality.needsEnhancement || quality.needsBackgroundRemoval,
    recommendations: quality.recommendations
  }
}

/**
 * Get processing stages for progress tracking
 */
export function getProcessingStages(): string[] {
  return Object.values(STAGE_NAMES)
}

// Export types
export type { EnhancementResult, BackgroundRemovalResult, ImageQualityAssessment }
