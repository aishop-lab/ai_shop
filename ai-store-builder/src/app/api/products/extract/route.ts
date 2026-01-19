// AI Product Extraction API Route

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { productExtractor } from '@/lib/ai/product-extractor'
import { vercelAI, AUTO_APPLY_THRESHOLD } from '@/lib/ai/vercel-ai-service'
import { USE_VERCEL_AI } from '@/lib/ai/provider'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

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

    // Parse multipart form data
    const formData = await request.formData()
    const imageFile = formData.get('image') as File | null

    if (!imageFile) {
      return NextResponse.json(
        { success: false, error: 'No image provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!validTypes.includes(imageFile.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid image type' },
        { status: 400 }
      )
    }

    // Upload image temporarily to get a URL for AI processing
    const timestamp = Date.now()
    const filename = `temp_extract_${user.id}_${timestamp}.jpg`
    const path = `temp/${filename}`

    // Read file as buffer
    const arrayBuffer = await imageFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(path, buffer, {
        contentType: 'image/jpeg',
        cacheControl: '300', // Short cache for temp files
        upsert: true
      })

    if (uploadError) {
      console.error('Temp upload error:', uploadError)
      return NextResponse.json(
        { success: false, error: 'Failed to process image' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(path)

    const imageUrl = urlData.publicUrl

    // Extract product info using AI
    let suggestions

    if (USE_VERCEL_AI) {
      // Use new Vercel AI SDK service
      const aiResult = await vercelAI.analyzeProductImage({ url: imageUrl })
      suggestions = {
        ai_suggested_title: aiResult.title,
        ai_suggested_description: aiResult.description,
        ai_suggested_category: aiResult.categories,
        ai_suggested_tags: aiResult.tags,
        ai_suggested_attributes: aiResult.attributes,
        ocr_text: aiResult.ocr_text,
        confidence: aiResult.confidence,
        should_auto_apply: aiResult.confidence >= AUTO_APPLY_THRESHOLD
      }
      console.log(`[Extract] Vercel AI analysis complete. Confidence: ${aiResult.confidence}`)
    } else {
      // Use legacy product extractor
      const basicResult = await productExtractor.getProductSuggestions(
        imageUrl,
        undefined, // No existing title
        undefined  // No existing description
      )
      suggestions = {
        ai_suggested_title: basicResult.ai_suggested_title,
        ai_suggested_description: basicResult.ai_suggested_description,
        ai_suggested_category: basicResult.ai_suggested_category,
        ai_suggested_tags: basicResult.ai_suggested_tags,
        confidence: basicResult.confidence
      }
      console.log(`[Extract] Legacy AI analysis complete. Confidence: ${basicResult.confidence}`)
    }

    // Clean up temp file (async, don't wait)
    supabase.storage
      .from('product-images')
      .remove([path])
      .catch(err => console.error('Failed to clean up temp file:', err))

    return NextResponse.json({
      success: true,
      suggestions
    })

  } catch (error) {
    console.error('AI extraction error:', error)
    return NextResponse.json(
      { success: false, error: 'AI extraction failed' },
      { status: 500 }
    )
  }
}
