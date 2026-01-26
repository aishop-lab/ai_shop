import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { completeOnboardingSchema } from '@/lib/validations/onboarding'
import { getDemoProducts, getDemoProductImageUrl } from '@/lib/products/demo-products'
import { vercelAI } from '@/lib/ai/vercel-ai-service'
import { sendWelcomeMerchantEmail } from '@/lib/email/merchant-notifications'

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

    const body = await request.json()
    const validationResult = completeOnboardingSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid store ID' },
        { status: 400 }
      )
    }

    const { store_id } = validationResult.data

    // Verify store belongs to user and get all needed fields
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, slug, name, owner_id, status, blueprint, description, tagline')
      .eq('id', store_id)
      .single()

    if (storeError || !store) {
      return NextResponse.json(
        { success: false, error: 'Store not found' },
        { status: 404 }
      )
    }

    if (store.owner_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Update store status to active
    const { error: updateStoreError } = await supabase
      .from('stores')
      .update({
        status: 'active',
        activated_at: new Date().toISOString()
      })
      .eq('id', store_id)

    if (updateStoreError) {
      console.error('Store activation error:', updateStoreError)
      return NextResponse.json(
        { success: false, error: 'Failed to activate store' },
        { status: 500 }
      )
    }

    // Generate legal policies for the store
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
      await fetch(`${baseUrl}/api/onboarding/generate-policies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id })
      })
      console.log('[Complete] Legal policies generated for store:', store_id)
    } catch (policyError) {
      console.error('[Complete] Policy generation failed (non-blocking):', policyError)
      // Don't fail the whole request - policies can be regenerated later
    }

    // Generate AI personalized content (About Us story and tagline)
    try {
      const blueprint = store.blueprint as {
        identity?: { description?: string; tagline?: string }
        category?: { primary?: string; niche?: string }
        branding?: { brand_vibe?: string }
      } | null

      const brandDescription = blueprint?.identity?.description || store.description || ''
      const category = blueprint?.category?.primary || blueprint?.category?.niche || 'General'
      const brandVibe = (blueprint?.branding?.brand_vibe as 'warm' | 'professional' | 'playful') || 'warm'

      console.log(`[Complete] Generating AI content for store: ${store.name}`)

      // Generate About Us content
      const aboutUs = await vercelAI.generateAboutUs(
        store.name,
        brandDescription,
        category,
        brandVibe
      )

      // Build a rich description from the About Us content
      const richDescription = `${aboutUs.story}\n\n${aboutUs.mission}`

      // Generate a tagline if not provided
      let tagline = store.tagline || blueprint?.identity?.tagline
      if (!tagline) {
        // Use the headline from About Us as tagline, or create a simple one
        tagline = aboutUs.headline || `Quality ${category} for everyone`
      }

      // Update store with AI-generated content
      await supabase
        .from('stores')
        .update({
          description: richDescription,
          tagline: tagline
        })
        .eq('id', store_id)

      console.log('[Complete] AI content generated and saved successfully')
    } catch (aiError) {
      console.error('[Complete] AI content generation failed (non-blocking):', aiError)
      // Don't fail the whole request - store works without AI content
    }

    // Create demo products for the store
    try {
      const blueprint = store.blueprint as { business_category?: string[] } | null
      const category = blueprint?.business_category?.[0]
      const demoProducts = getDemoProducts(category)

      console.log(`[Complete] Creating ${demoProducts.length} demo products for store: ${store_id}`)

      for (let i = 0; i < demoProducts.length; i++) {
        const demo = demoProducts[i]

        // Create the product
        const { data: product, error: productError } = await supabase
          .from('products')
          .insert({
            store_id: store_id,
            title: demo.title,
            description: demo.description,
            price: demo.price,
            compare_at_price: demo.compare_at_price || null,
            categories: demo.categories,
            tags: demo.tags,
            status: 'published',
            is_demo: true,
            quantity: 100,
            track_quantity: false,
            featured: i === 0 // Make first demo product featured
          })
          .select('id')
          .single()

        if (productError) {
          console.error(`[Complete] Failed to create demo product ${i + 1}:`, productError)
          continue
        }

        // Create product image
        const imageUrl = getDemoProductImageUrl(i)
        await supabase
          .from('product_images')
          .insert({
            product_id: product.id,
            url: imageUrl,
            alt_text: demo.title,
            position: 0
          })
      }

      console.log('[Complete] Demo products created successfully')
    } catch (demoError) {
      console.error('[Complete] Demo product creation failed (non-blocking):', demoError)
      // Don't fail the whole request - demo products are optional
    }

    // Update profile - mark onboarding as completed
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        onboarding_completed: true,
        onboarding_current_step: 10,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (profileError) {
      console.error('Profile update error:', profileError)
      // Don't fail the whole request - store is already active
    }

    // Send welcome email to merchant
    try {
      // Get merchant profile for name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      const merchantName = profile?.full_name || user.email?.split('@')[0] || 'Merchant'
      const merchantEmail = user.email

      if (merchantEmail) {
        await sendWelcomeMerchantEmail({
          merchantEmail,
          merchantName,
          storeName: store.name,
          storeSlug: store.slug
        })
        console.log('[Complete] Welcome email sent to merchant:', merchantEmail)
      }
    } catch (emailError) {
      console.error('[Complete] Welcome email failed (non-blocking):', emailError)
      // Don't fail the whole request - store is already active
    }

    // Generate subdomain URL
    const PRODUCTION_DOMAIN = process.env.NEXT_PUBLIC_PRODUCTION_DOMAIN || 'storeforge.site'
    const subdomain = `${store.slug}.${PRODUCTION_DOMAIN}`
    const storeUrl = `https://${subdomain}`

    return NextResponse.json({
      success: true,
      message: 'Store activated successfully!',
      store_id: store_id,
      subdomain: subdomain,
      store_url: storeUrl,
      redirect_url: '/dashboard'
    })
  } catch (error) {
    console.error('Onboarding complete error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to complete onboarding' },
      { status: 500 }
    )
  }
}
