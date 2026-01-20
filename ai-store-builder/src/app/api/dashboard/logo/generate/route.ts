import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateLogo, isLogoGenerationAvailable } from '@/lib/ai/logo-generator'
import { vercelAI } from '@/lib/ai/vercel-ai-service'

const MAX_GENERATIONS = 3

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

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { store_id, business_name, business_category, description, style_preference, feedback } = body

    if (!store_id || !business_name) {
      return NextResponse.json(
        { success: false, error: 'Store ID and business name are required' },
        { status: 400 }
      )
    }

    // Verify ownership
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id')
      .eq('id', store_id)
      .eq('owner_id', user.id)
      .single()

    if (storeError || !store) {
      return NextResponse.json(
        { success: false, error: 'Store not found' },
        { status: 404 }
      )
    }

    // Count existing AI-generated logos (includes onboarding + dashboard)
    const { data: files } = await supabase.storage
      .from('store-logos')
      .list(user.id, {
        search: 'ai-generated-'
      })

    const currentCount = files?.length || 0

    if (currentCount >= MAX_GENERATIONS) {
      return NextResponse.json(
        { success: false, error: `Maximum ${MAX_GENERATIONS} AI logo generations reached` },
        { status: 429 }
      )
    }

    console.log('[Dashboard Logo Generate] Starting for:', business_name, `(${currentCount + 1}/${MAX_GENERATIONS})`, feedback ? `(with feedback: ${feedback})` : '')

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
      console.error('[Dashboard Logo Generate] Generation failed:', genError)

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

    // Upload to Supabase Storage
    const fileExt = generatedLogo.mimeType === 'image/png' ? 'png' : 'jpg'
    const fileName = `${user.id}/ai-generated-${Date.now()}.${fileExt}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('store-logos')
      .upload(fileName, generatedLogo.imageData, {
        contentType: generatedLogo.mimeType,
        upsert: false
      })

    if (uploadError) {
      console.error('[Dashboard Logo Generate] Upload error:', uploadError)
      return NextResponse.json(
        { success: false, error: 'Failed to save generated logo' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('store-logos')
      .getPublicUrl(uploadData.path)

    // Extract colors
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
      }
    } catch (colorError) {
      console.warn('[Dashboard Logo Generate] Color extraction failed:', colorError)
    }

    console.log('[Dashboard Logo Generate] Success! URL:', urlData.publicUrl)

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: uploadData.path,
      extracted_colors: extractedColors,
      is_ai_generated: true,
      generations_remaining: MAX_GENERATIONS - (currentCount + 1)
    })
  } catch (error) {
    console.error('[Dashboard Logo Generate] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
