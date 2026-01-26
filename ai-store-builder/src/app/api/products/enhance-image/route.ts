import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { vercelAI } from '@/lib/ai/vercel-ai-service'

export const maxDuration = 60 // Allow up to 60 seconds for image processing

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const imageFile = formData.get('image') as File | null
    const imageUrl = formData.get('image_url') as string | null
    const options = formData.get('options') as string | null

    let imageBuffer: Buffer

    if (imageFile) {
      // Handle file upload
      const arrayBuffer = await imageFile.arrayBuffer()
      imageBuffer = Buffer.from(arrayBuffer)
    } else if (imageUrl) {
      // Fetch image from URL
      const response = await fetch(imageUrl)
      if (!response.ok) {
        return NextResponse.json({ error: 'Failed to fetch image' }, { status: 400 })
      }
      const arrayBuffer = await response.arrayBuffer()
      imageBuffer = Buffer.from(arrayBuffer)
    } else {
      return NextResponse.json(
        { error: 'No image provided. Send either "image" file or "image_url"' },
        { status: 400 }
      )
    }

    // Parse enhancement options
    const enhanceOptions = options ? JSON.parse(options) : {}

    console.log('[EnhanceImage] Processing image, options:', enhanceOptions)

    // Analyze the image to provide recommendations
    console.log('[EnhanceImage] Analyzing image for recommendations')

    try {
      const analysisResult = await vercelAI.analyzeProductImage({
        buffer: imageBuffer,
        mimeType: 'image/jpeg'
      })

      const quality = analysisResult.image_quality
      const recommendations: string[] = []

      if (quality?.brightness === 'dark') {
        recommendations.push('Image appears dark - retake with better lighting or near a window')
      } else if (quality?.brightness === 'bright') {
        recommendations.push('Image is overexposed - reduce lighting or use diffused/soft light')
      }

      if (quality?.is_blurry) {
        recommendations.push('Image appears blurry - hold camera steady, tap to focus, or use a tripod')
      }

      if (quality?.has_complex_background) {
        recommendations.push('Use a plain white/neutral background for cleaner product shots')
      }

      // Add general tips
      recommendations.push('Take photos in natural daylight for best results')
      recommendations.push('Keep the product centered and fill 70-80% of the frame')

      if ((quality?.score || 5) >= 7) {
        recommendations.unshift('Your image quality is good! Minor improvements suggested below:')
      }

      return NextResponse.json({
        success: true,
        enhanced: false,
        message: 'Image analyzed. Automatic enhancement is coming soon. Follow these tips for better product photos:',
        recommendations,
        quality_score: quality?.score || 5,
        quality_details: {
          brightness: quality?.brightness || 'normal',
          is_blurry: quality?.is_blurry || false,
          has_complex_background: quality?.has_complex_background || false
        }
      })
    } catch (analysisError) {
      console.error('[EnhanceImage] Analysis failed:', analysisError)
      return NextResponse.json({
        success: true,
        enhanced: false,
        message: 'Tips for better product photos:',
        recommendations: [
          'Use natural daylight or soft, diffused lighting',
          'Place product on a plain white or neutral background',
          'Keep the camera steady and tap to focus',
          'Center the product and fill 70-80% of the frame',
          'Take multiple angles for best results'
        ],
        quality_score: 5
      })
    }

  } catch (error) {
    console.error('[EnhanceImage] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Enhancement failed',
        details: 'An unexpected error occurred during image enhancement.'
      },
      { status: 500 }
    )
  }
}

/**
 * Analyze image quality without enhancing
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const imageUrl = searchParams.get('image_url')

    if (!imageUrl) {
      return NextResponse.json({ error: 'image_url is required' }, { status: 400 })
    }

    // Fetch image
    const response = await fetch(imageUrl)
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: 400 })
    }
    const arrayBuffer = await response.arrayBuffer()
    const imageBuffer = Buffer.from(arrayBuffer)

    // Get vision analysis first (uses existing AI service)
    let visionAnalysis
    try {
      const analysisResult = await vercelAI.analyzeProductImage({
        buffer: imageBuffer,
        mimeType: 'image/png'
      })
      visionAnalysis = {
        brightness: (analysisResult.image_quality?.brightness === 'dark' ? 'dark' : 'normal') as 'dark' | 'normal' | 'bright',
        isBlurry: analysisResult.image_quality?.is_blurry || false,
        score: analysisResult.image_quality?.score || 5,
        hasComplexBackground: analysisResult.image_quality?.has_complex_background ?? true
      }
    } catch {
      // If vision analysis fails, use defaults
      visionAnalysis = undefined
    }

    // Analyze quality
    const quality = await vertexImagen.analyzeImageQuality(imageBuffer, visionAnalysis)

    // Determine if enhancement is recommended
    const needsEnhancement =
      quality.hasBackgroundIssues ||
      quality.hasLightingIssues ||
      quality.hasCompositionIssues ||
      quality.isBlurry

    // Check if enhancement service is available
    const enhancementAvailable = await vertexImagen.isAvailable()

    return NextResponse.json({
      success: true,
      quality: {
        score: quality.overallScore,
        needs_enhancement: needsEnhancement,
        enhancement_available: enhancementAvailable,
        issues: {
          background: quality.hasBackgroundIssues,
          lighting: quality.hasLightingIssues,
          composition: quality.hasCompositionIssues,
          blurry: quality.isBlurry
        },
        recommendations: quality.recommendations
      }
    })
  } catch (error) {
    console.error('[AnalyzeImage] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    )
  }
}
