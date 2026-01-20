import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { vercelAI } from '@/lib/ai/vercel-ai-service'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

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

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Allowed: JPEG, PNG, WebP, SVG' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size: 5MB' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}.${fileExt}`

    // Convert File to ArrayBuffer then to Uint8Array for upload
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('store-logos')
      .upload(fileName, uint8Array, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)

      // If bucket doesn't exist, provide helpful error
      if (uploadError.message.includes('bucket') || uploadError.message.includes('not found')) {
        return NextResponse.json(
          { success: false, error: 'Storage not configured. Please create a "store-logos" bucket in Supabase.' },
          { status: 500 }
        )
      }

      return NextResponse.json(
        { success: false, error: 'Failed to upload file' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('store-logos')
      .getPublicUrl(uploadData.path)

    // Extract colors from the uploaded logo (non-blocking, graceful failure)
    let extractedColors = null
    try {
      // Skip color extraction for SVG files (not supported by vision models)
      if (file.type !== 'image/svg+xml') {
        const colorResult = await vercelAI.extractLogoColors({
          buffer: Buffer.from(uint8Array),
          mimeType: file.type
        })

        if (colorResult && colorResult.suggested_primary) {
          extractedColors = {
            colors: colorResult.colors,
            suggested_primary: colorResult.suggested_primary,
            suggested_secondary: colorResult.suggested_secondary
          }
          console.log('[Upload Logo] Colors extracted:', extractedColors.suggested_primary, extractedColors.suggested_secondary)
        }
      }
    } catch (colorError) {
      // Log but don't fail the upload if color extraction fails
      console.warn('[Upload Logo] Color extraction failed (non-critical):', colorError)
    }

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: uploadData.path,
      extracted_colors: extractedColors
    })
  } catch (error) {
    console.error('Logo upload error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to upload logo' },
      { status: 500 }
    )
  }
}
