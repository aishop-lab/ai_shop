import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { vercelAI } from '@/lib/ai/vercel-ai-service'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const storeId = formData.get('storeId') as string

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!storeId) {
      return NextResponse.json(
        { success: false, error: 'Store ID is required' },
        { status: 400 }
      )
    }

    // Verify ownership
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id')
      .eq('id', storeId)
      .eq('owner_id', user.id)
      .single()

    if (storeError || !store) {
      return NextResponse.json(
        { success: false, error: 'Store not found' },
        { status: 404 }
      )
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Please upload JPEG, PNG, WebP, or SVG.' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      )
    }

    // Convert to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Generate filename
    const fileExt = file.name.split('.').pop() || 'png'
    const fileName = `${user.id}/${Date.now()}.${fileExt}`

    // Upload to Supabase
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('store-logos')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('[Dashboard Logo Upload] Upload error:', uploadError)
      return NextResponse.json(
        { success: false, error: 'Failed to upload logo' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('store-logos')
      .getPublicUrl(uploadData.path)

    // Extract colors (skip for SVG)
    let extractedColors = null
    if (file.type !== 'image/svg+xml') {
      try {
        const colorResult = await vercelAI.extractLogoColors({
          buffer,
          mimeType: file.type
        })

        if (colorResult && colorResult.suggested_primary) {
          extractedColors = {
            colors: colorResult.colors,
            suggested_primary: colorResult.suggested_primary,
            suggested_secondary: colorResult.suggested_secondary
          }
        }
      } catch (colorError) {
        console.warn('[Dashboard Logo Upload] Color extraction failed:', colorError)
      }
    }

    // Update store with new logo URL
    const { error: updateError } = await supabase
      .from('stores')
      .update({ logo_url: urlData.publicUrl })
      .eq('id', storeId)

    if (updateError) {
      console.error('[Dashboard Logo Upload] Failed to update store:', updateError)
      // Don't fail the request, logo is uploaded
    }

    console.log('[Dashboard Logo Upload] Success! URL:', urlData.publicUrl)

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: uploadData.path,
      extracted_colors: extractedColors
    })
  } catch (error) {
    console.error('[Dashboard Logo Upload] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
