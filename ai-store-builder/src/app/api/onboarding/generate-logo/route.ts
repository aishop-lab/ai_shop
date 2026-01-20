import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateLogo, isLogoGenerationAvailable } from '@/lib/ai/logo-generator'
import { vercelAI } from '@/lib/ai/vercel-ai-service'

// Rate limiting - simple in-memory store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 3 // 3 generations per window
const RATE_WINDOW = 60 * 1000 // 1 minute window

function checkRateLimit(userId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const userLimit = rateLimitStore.get(userId)

  if (!userLimit || userLimit.resetAt < now) {
    // Reset or new entry
    rateLimitStore.set(userId, { count: 1, resetAt: now + RATE_WINDOW })
    return { allowed: true }
  }

  if (userLimit.count >= RATE_LIMIT) {
    const retryAfter = Math.ceil((userLimit.resetAt - now) / 1000)
    return { allowed: false, retryAfter }
  }

  userLimit.count++
  return { allowed: true }
}

export async function POST(request: Request) {
  try {
    // Check if logo generation is available
    if (!isLogoGenerationAvailable()) {
      return NextResponse.json(
        { success: false, error: 'Logo generation is not configured' },
        { status: 503 }
      )
    }

    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Rate limiting
    const rateCheck = checkRateLimit(user.id)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Rate limit exceeded. Please try again in ${rateCheck.retryAfter} seconds.`,
          retry_after: rateCheck.retryAfter
        },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { business_name, business_category, description, style_preference, feedback } = body

    if (!business_name) {
      return NextResponse.json(
        { success: false, error: 'Business name is required' },
        { status: 400 }
      )
    }

    console.log('[Generate Logo] Starting generation for:', business_name, feedback ? `(with feedback: ${feedback})` : '')

    // Generate the logo
    let generatedLogo
    try {
      generatedLogo = await generateLogo({
        business_name,
        business_category,
        description,
        style_preference,
        feedback
      })
    } catch (genError: unknown) {
      console.error('[Generate Logo] Generation failed:', genError)

      // Check for content policy violations
      const errorMessage = genError instanceof Error ? genError.message : String(genError)
      if (errorMessage.includes('SAFETY') || errorMessage.includes('blocked')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Logo could not be generated due to content guidelines. Please try uploading your own logo.',
            error_type: 'content_policy'
          },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { success: false, error: 'Failed to generate logo. Please try again or upload your own.' },
        { status: 500 }
      )
    }

    // Generate unique filename
    const fileExt = generatedLogo.mimeType === 'image/png' ? 'png' : 'jpg'
    const fileName = `${user.id}/ai-generated-${Date.now()}.${fileExt}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('store-logos')
      .upload(fileName, generatedLogo.imageData, {
        contentType: generatedLogo.mimeType,
        upsert: false
      })

    if (uploadError) {
      console.error('[Generate Logo] Upload error:', uploadError)

      if (uploadError.message.includes('bucket') || uploadError.message.includes('not found')) {
        return NextResponse.json(
          { success: false, error: 'Storage not configured. Please create a "store-logos" bucket in Supabase.' },
          { status: 500 }
        )
      }

      return NextResponse.json(
        { success: false, error: 'Failed to save generated logo' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('store-logos')
      .getPublicUrl(uploadData.path)

    // Extract colors from the generated logo
    let extractedColors = null
    try {
      const colorResult = await vercelAI.extractLogoColors({
        buffer: generatedLogo.imageData,
        mimeType: generatedLogo.mimeType
      })

      if (colorResult && colorResult.suggested_primary) {
        extractedColors = {
          colors: colorResult.colors,
          suggested_primary: colorResult.suggested_primary,
          suggested_secondary: colorResult.suggested_secondary
        }
        console.log('[Generate Logo] Colors extracted:', extractedColors.suggested_primary, extractedColors.suggested_secondary)
      }
    } catch (colorError) {
      console.warn('[Generate Logo] Color extraction failed (non-critical):', colorError)
    }

    console.log('[Generate Logo] Success! URL:', urlData.publicUrl)

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: uploadData.path,
      extracted_colors: extractedColors,
      is_ai_generated: true
    })
  } catch (error) {
    console.error('[Generate Logo] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
