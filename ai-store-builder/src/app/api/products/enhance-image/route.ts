import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { vertexImagen } from '@/lib/ai/vertex-imagen'
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

    // Check if Vertex AI is available
    const isAvailable = await vertexImagen.isAvailable()

    if (!isAvailable) {
      console.log('[EnhanceImage] Vertex AI not available, providing AI recommendations instead')

      // Fallback: Analyze image and provide recommendations
      try {
        const analysisResult = await vercelAI.analyzeProductImage({
          buffer: imageBuffer,
          mimeType: 'image/jpeg'
        })

        const quality = analysisResult.image_quality
        const recommendations: string[] = []

        if (quality?.brightness === 'dark') {
          recommendations.push('Image appears dark - consider retaking with better lighting')
        } else if (quality?.brightness === 'bright') {
          recommendations.push('Image is overexposed - reduce lighting or use diffused light')
        }

        if (quality?.is_blurry) {
          recommendations.push('Image appears blurry - ensure camera is steady and in focus')
        }

        if (quality?.has_complex_background) {
          recommendations.push('Consider using a plain background for cleaner product shots')
        }

        if (recommendations.length === 0) {
          recommendations.push('Image quality is good!')
        }

        return NextResponse.json({
          success: false,
          error: 'Image enhancement service is not configured. Here are tips to improve your image manually:',
          enhancement_unavailable: true,
          recommendations,
          quality_score: quality?.score || 5,
          tip: 'Contact support to enable AI image enhancement, or follow the recommendations above.'
        }, { status: 503 })
      } catch (analysisError) {
        console.error('[EnhanceImage] Analysis fallback failed:', analysisError)
        return NextResponse.json({
          success: false,
          error: 'Image enhancement service is not configured. Please ensure your image has good lighting and a clean background.',
          enhancement_unavailable: true,
          tip: 'Set GOOGLE_CLOUD_PROJECT_ID and GOOGLE_CLOUD_CREDENTIALS environment variables to enable image enhancement.'
        }, { status: 503 })
      }
    }

    // Enhance the image using Vertex AI
    console.log('[EnhanceImage] Using Vertex AI Imagen for enhancement')

    const result = await vertexImagen.enhanceProductImage(imageBuffer, {
      removeBackground: enhanceOptions.removeBackground ?? true,
      fixLighting: enhanceOptions.fixLighting ?? true,
      improveComposition: enhanceOptions.improveComposition ?? true,
      backgroundColor: enhanceOptions.backgroundColor || '#FFFFFF'
    })

    if (!result.success || !result.enhancedImage) {
      console.error('[EnhanceImage] Enhancement failed:', result.error)

      // Provide helpful error message
      return NextResponse.json({
        success: false,
        error: result.error || 'Image enhancement did not produce a result',
        details: 'The AI enhancement service could not process this image. This can happen if the image format is unsupported or the service is temporarily unavailable.',
        suggestions: [
          'Try with a different image format (JPEG or PNG)',
          'Ensure the image is not corrupted',
          'Try again in a few moments'
        ]
      }, { status: 500 })
    }

    // Upload enhanced image to Supabase Storage
    const timestamp = Date.now()
    const fileName = `enhanced_${timestamp}.png`
    const filePath = `${user.id}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, result.enhancedImage, {
        contentType: result.mimeType || 'image/png',
        upsert: true
      })

    if (uploadError) {
      console.error('[EnhanceImage] Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload enhanced image' },
        { status: 500 }
      )
    }

    // Get public URL
    const {
      data: { publicUrl }
    } = supabase.storage.from('product-images').getPublicUrl(filePath)

    console.log('[EnhanceImage] Enhancement complete:', {
      enhancements: result.enhancementsApplied,
      url: publicUrl
    })

    return NextResponse.json({
      success: true,
      enhanced_url: publicUrl,
      enhancements_applied: result.enhancementsApplied,
      original_size: imageBuffer.length,
      enhanced_size: result.enhancedImage.length
    })
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
