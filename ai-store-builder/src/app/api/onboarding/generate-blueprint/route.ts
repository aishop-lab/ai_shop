import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { blueprintGenerator } from '@/lib/onboarding/blueprint-generator'
import { vercelAI } from '@/lib/ai/vercel-ai-service'
import { storeDataSchema } from '@/lib/validations/onboarding'
import type { StoreData } from '@/lib/types/onboarding'

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

    // Check if user already has a store - prevent duplicate store creation
    const { data: existingStores } = await supabase
      .from('stores')
      .select('id, slug, name')
      .eq('owner_id', user.id)
      .limit(1)

    if (existingStores && existingStores.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'You already have a store. Please use your existing store.',
          existing_store: existingStores[0]
        },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Log incoming data for debugging
    console.log('[Blueprint] Received store data:', JSON.stringify(body, null, 2))

    // Pre-process: ensure required fields have defaults
    const processedBody = {
      ...body,
      business_type: body.business_type || 'General',
      business_category: body.business_category || [],
      niche: body.niche || '',
      keywords: body.keywords || [],
      // Clean up empty strings for optional fields
      whatsapp: body.whatsapp || null,
      instagram: body.instagram || null,
      gstin: body.gstin || null,
      logo_url: body.logo_url || null
    }

    const validationResult = storeDataSchema.safeParse(processedBody)

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      console.error('[Blueprint] Validation errors:', errors)
      console.error('[Blueprint] Data that failed validation:', JSON.stringify(processedBody, null, 2))
      return NextResponse.json(
        { success: false, error: 'Invalid store data', details: errors },
        { status: 400 }
      )
    }

    const storeData = validationResult.data as StoreData

    // Check if slug is available and generate unique one if not
    let finalSlug = storeData.slug
    let slugAttempts = 0
    const maxAttempts = 10

    while (slugAttempts < maxAttempts) {
      const { data: existingStore } = await supabase
        .from('stores')
        .select('id')
        .eq('slug', finalSlug)
        .single()

      if (!existingStore) {
        // Slug is available
        break
      }

      // Generate a unique slug by appending a random suffix
      slugAttempts++
      const randomSuffix = Math.random().toString(36).substring(2, 6)
      finalSlug = `${storeData.slug}-${randomSuffix}`.substring(0, 30)
      console.log(`[Blueprint] Slug "${storeData.slug}" taken, trying "${finalSlug}"`)
    }

    if (slugAttempts >= maxAttempts) {
      return NextResponse.json(
        { success: false, error: 'Could not generate a unique store URL. Please try a different business name.' },
        { status: 409 }
      )
    }

    // Update storeData with the final unique slug
    storeData.slug = finalSlug

    // Use AI-generated tagline from cached analysis, or generate new one
    let tagline = ''
    const cachedAnalysis = vercelAI.getCachedOnboardingAnalysis(user.id)
    if (cachedAnalysis?.tagline) {
      tagline = cachedAnalysis.tagline
      console.log('[Blueprint] Using cached AI tagline')
    } else {
      // Fallback to generating a simple tagline
      tagline = `Welcome to ${storeData.business_name}`
    }

    storeData.tagline = tagline

    // Generate blueprint with AI content
    const { blueprint, content: aiContent } = await blueprintGenerator.generateBlueprintWithContent(storeData)

    // Validate blueprint
    const validation = blueprintGenerator.validateBlueprint(blueprint)
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: 'Invalid blueprint', details: validation.errors },
        { status: 400 }
      )
    }

    // Merge AI content into blueprint if generated
    const enhancedBlueprint = {
      ...blueprint,
      ai_content: aiContent || undefined
    }

    // Create store in database with full blueprint and AI content
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .insert({
        owner_id: user.id,
        name: storeData.business_name,
        slug: storeData.slug,
        description: storeData.description,
        tagline: tagline,
        logo_url: storeData.logo_url,
        blueprint: enhancedBlueprint,
        brand_colors: blueprint.branding.colors,
        typography: blueprint.branding.typography,
        theme_template: blueprint.theme.template,
        contact_email: blueprint.contact.email,
        contact_phone: blueprint.contact.phone,
        whatsapp_number: blueprint.contact.whatsapp,
        instagram_handle: blueprint.contact.instagram,
        status: 'draft',
        settings: blueprint.settings
      })
      .select()
      .single()

    if (storeError) {
      console.error('Store creation error:', storeError)
      
      // Provide more helpful error messages
      if (storeError.code === 'PGRST204' || storeError.message?.includes('column')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Database schema needs update. Please run the migration SQL.',
            details: storeError.message 
          },
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        { success: false, error: 'Failed to create store', details: storeError.message },
        { status: 500 }
      )
    }

    // Clear session cache after successful store creation
    vercelAI.clearSession(user.id)

    return NextResponse.json({
      success: true,
      store_id: store.id,
      slug: store.slug,
      blueprint: enhancedBlueprint,
      ai_content_generated: !!aiContent
    })
  } catch (error) {
    console.error('Blueprint generation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate blueprint' },
      { status: 500 }
    )
  }
}
