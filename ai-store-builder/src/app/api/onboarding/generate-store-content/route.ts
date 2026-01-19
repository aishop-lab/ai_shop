// Store Content Generation API
// Generates About Us, Policies, Homepage sections, and FAQs

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { vercelAI } from '@/lib/ai/vercel-ai-service'
import type { StoreContent } from '@/lib/ai/schemas'
import { z } from 'zod'

const requestSchema = z.object({
  store_name: z.string().min(1),
  brand_description: z.string().min(10),
  category: z.string().min(1),
  geography: z.enum(['india', 'local', 'international']).default('india'),
  // Optional: Generate specific sections only
  sections: z.array(z.enum(['about_us', 'policies', 'homepage', 'faqs'])).optional(),
})

export interface StoreContentResponse {
  success: boolean
  error?: string
  data?: StoreContent
  // Partial data if only specific sections requested
  partial_data?: Partial<StoreContent>
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json<StoreContentResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse and validate request
    const body = await request.json()
    const validation = requestSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json<StoreContentResponse>(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { store_name, brand_description, category, geography, sections } = validation.data

    console.log(`[StoreContent] Generating content for ${store_name} (${category})`)

    // If specific sections requested, generate only those
    if (sections && sections.length > 0) {
      const partialData: Partial<StoreContent> = {}

      // Generate requested sections in parallel
      const promises: Promise<void>[] = []

      if (sections.includes('about_us')) {
        promises.push(
          vercelAI.generateAboutUs(store_name, brand_description, category)
            .then(result => { partialData.about_us = result })
        )
      }

      if (sections.includes('policies')) {
        promises.push(
          vercelAI.generatePolicies(store_name, category, geography)
            .then(result => { partialData.policies = result })
        )
      }

      if (sections.includes('homepage')) {
        promises.push(
          vercelAI.generateHomepageSections(store_name, brand_description, category)
            .then(result => { partialData.homepage = result })
        )
      }

      if (sections.includes('faqs')) {
        promises.push(
          vercelAI.generateFAQs(store_name, category)
            .then(result => { partialData.faqs = result })
        )
      }

      await Promise.all(promises)

      console.log(`[StoreContent] Generated ${sections.length} sections for ${store_name}`)

      return NextResponse.json<StoreContentResponse>({
        success: true,
        partial_data: partialData,
      })
    }

    // Generate all content in a single call (more efficient)
    const content = await vercelAI.generateAllStoreContent(
      store_name,
      brand_description,
      category,
      geography
    )

    console.log(`[StoreContent] Generated all content for ${store_name}`)

    return NextResponse.json<StoreContentResponse>({
      success: true,
      data: content,
    })
  } catch (error) {
    console.error('[StoreContent] Error:', error)
    return NextResponse.json<StoreContentResponse>(
      { success: false, error: 'Failed to generate store content' },
      { status: 500 }
    )
  }
}
