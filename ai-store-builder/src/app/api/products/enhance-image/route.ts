import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enhanceProductImage, isRemoveBgConfigured } from '@/lib/image/enhance'
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
    const optionsStr = formData.get('options') as string | null

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
    const options = optionsStr ? JSON.parse(optionsStr) : {}

    console.log('[EnhanceImage] Processing image, size:', imageBuffer.length, 'options:', options)

    // Check if Remove.bg is configured
    if (!isRemoveBgConfigured()) {
      console.log('[EnhanceImage] Remove.bg not configured, returning recommendations')

      // Fallback to AI recommendations
      try {
        const analysisResult = await vercelAI.analyzeProductImage({
          buffer: imageBuffer,
          mimeType: 'image/jpeg'
        })

        const quality = analysisResult.image_quality
        const recommendations: string[] = []

        if (quality?.brightness === 'dark') {
          recommendations.push('Image appears dark - retake with better lighting')
        } else if (quality?.brightness === 'bright') {
          recommendations.push('Image is overexposed - use softer lighting')
        }

        if (quality?.is_blurry) {
          recommendations.push('Image is blurry - hold camera steady and tap to focus')
        }

        if (quality?.has_complex_background) {
          recommendations.push('Busy background detected - use a plain white background')
        }

        recommendations.push('Set REMOVE_BG_API_KEY in environment to enable auto-enhancement')

        return NextResponse.json({
          success: false,
          enhanced: false,
          error: 'Enhancement service not configured',
          message: 'Add REMOVE_BG_API_KEY to enable automatic background removal',
          recommendations,
          quality_score: quality?.score || 5,
          setup_instructions: {
            step1: 'Sign up at https://www.remove.bg/api',
            step2: 'Get your API key',
            step3: 'Add REMOVE_BG_API_KEY=your_key to .env.local',
            step4: 'Restart the development server'
          }
        }, { status: 503 })
      } catch {
        return NextResponse.json({
          success: false,
          error: 'Enhancement service not configured',
          setup_instructions: {
            step1: 'Sign up at https://www.remove.bg/api',
            step2: 'Add REMOVE_BG_API_KEY to .env.local'
          }
        }, { status: 503 })
      }
    }

    // Run the enhancement pipeline
    console.log('[EnhanceImage] Running enhancement pipeline...')

    const result = await enhanceProductImage(imageBuffer, {
      removeBackground: options.removeBackground ?? true,
      autoRotate: options.autoRotate ?? true,
      fixLighting: options.fixLighting ?? true,
      centerAndPad: options.centerAndPad ?? true,
      sharpen: options.sharpen ?? true,
      backgroundColor: options.backgroundColor || '#FFFFFF',
      outputSize: options.outputSize || 1024,
      outputFormat: options.outputFormat || 'png',
      quality: options.quality || 90,
    })

    if (!result.success || !result.enhancedBuffer) {
      console.error('[EnhanceImage] Enhancement failed:', result.error)
      return NextResponse.json({
        success: false,
        error: result.error || 'Enhancement failed',
        transformations_attempted: result.transformationsApplied,
      }, { status: 500 })
    }

    // Upload enhanced image to Supabase Storage
    const timestamp = Date.now()
    const extension = result.mimeType?.split('/')[1] || 'png'
    const fileName = `enhanced_${timestamp}.${extension}`
    const filePath = `${user.id}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, result.enhancedBuffer, {
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

    console.log('[EnhanceImage] Enhancement complete!')
    console.log('[EnhanceImage] Transformations:', result.transformationsApplied)
    console.log('[EnhanceImage] URL:', publicUrl)

    return NextResponse.json({
      success: true,
      enhanced: true,
      enhanced_url: publicUrl,
      transformations_applied: result.transformationsApplied,
      details: result.details,
      original_size: imageBuffer.length,
      enhanced_size: result.enhancedBuffer.length,
    })
  } catch (error) {
    console.error('[EnhanceImage] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Enhancement failed',
      },
      { status: 500 }
    )
  }
}

/**
 * GET: Check enhancement service status and analyze image quality
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

    // Check service status
    const serviceStatus = {
      remove_bg_configured: isRemoveBgConfigured(),
      sharp_available: true, // Sharp is always available as a dependency
    }

    // If no image URL, just return service status
    if (!imageUrl) {
      return NextResponse.json({
        success: true,
        service_status: serviceStatus,
        enhancement_available: serviceStatus.remove_bg_configured,
      })
    }

    // Fetch and analyze image
    const response = await fetch(imageUrl)
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: 400 })
    }
    const arrayBuffer = await response.arrayBuffer()
    const imageBuffer = Buffer.from(arrayBuffer)

    // Get AI analysis
    try {
      const analysisResult = await vercelAI.analyzeProductImage({
        buffer: imageBuffer,
        mimeType: 'image/jpeg'
      })

      const quality = analysisResult.image_quality

      return NextResponse.json({
        success: true,
        service_status: serviceStatus,
        enhancement_available: serviceStatus.remove_bg_configured,
        quality: {
          score: quality?.score || 5,
          brightness: quality?.brightness || 'normal',
          is_blurry: quality?.is_blurry || false,
          has_complex_background: quality?.has_complex_background || true,
          recommended_actions: quality?.recommended_actions || [],
        },
        recommendations: {
          needs_background_removal: quality?.has_complex_background || true,
          needs_lighting_fix: quality?.brightness !== 'normal',
          needs_sharpening: quality?.is_blurry || false,
        },
      })
    } catch {
      return NextResponse.json({
        success: true,
        service_status: serviceStatus,
        enhancement_available: serviceStatus.remove_bg_configured,
      })
    }
  } catch (error) {
    console.error('[EnhanceImage] GET Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    )
  }
}
