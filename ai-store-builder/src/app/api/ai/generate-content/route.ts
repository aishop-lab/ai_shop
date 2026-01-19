// AI Content Generation API
// Generates various types of content: collection descriptions, meta tags, FAQs, etc.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { vercelAI } from '@/lib/ai/vercel-ai-service'
import { z } from 'zod'

const requestSchema = z.discriminatedUnion('type', [
  // Collection description
  z.object({
    type: z.literal('collection_description'),
    collection_name: z.string(),
    store_name: z.string(),
    product_titles: z.array(z.string()),
    brand_voice: z.string().optional(),
  }),
  // Meta description
  z.object({
    type: z.literal('meta_description'),
    page_title: z.string(),
    page_content: z.string(),
    keywords: z.array(z.string()),
  }),
  // FAQ generation
  z.object({
    type: z.literal('faq'),
    store_name: z.string(),
    category: z.string(),
    product_types: z.array(z.string()).optional(),
  }),
  // Product description enhancement
  z.object({
    type: z.literal('enhance_description'),
    description: z.string(),
    title: z.string(),
    category: z.string(),
  }),
  // Product title generation
  z.object({
    type: z.literal('generate_title'),
    product_info: z.string(),
    category: z.string(),
    attributes: z.record(z.string()),
  }),
])

export interface ContentGenerationResponse {
  success: boolean
  error?: string
  content?: unknown
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json<ContentGenerationResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse and validate request
    const body = await request.json()
    const validation = requestSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json<ContentGenerationResponse>(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const data = validation.data

    console.log(`[ContentGeneration] Generating ${data.type}`)

    let content: unknown

    switch (data.type) {
      case 'collection_description':
        content = await vercelAI.generateCollectionDescription(
          data.collection_name,
          data.store_name,
          data.product_titles,
          data.brand_voice
        )
        break

      case 'meta_description':
        content = await vercelAI.generateMetaDescription(
          data.page_title,
          data.page_content,
          data.keywords
        )
        break

      case 'faq':
        content = await vercelAI.generateFAQs(
          data.store_name,
          data.category,
          data.product_types
        )
        break

      case 'enhance_description':
        content = await vercelAI.enhanceDescription(
          data.description,
          data.title,
          data.category
        )
        break

      case 'generate_title':
        content = await vercelAI.generateProductTitle(
          data.product_info,
          data.category,
          data.attributes
        )
        break

      default:
        return NextResponse.json<ContentGenerationResponse>(
          { success: false, error: 'Unknown content type' },
          { status: 400 }
        )
    }

    console.log(`[ContentGeneration] Successfully generated ${data.type}`)

    return NextResponse.json<ContentGenerationResponse>({
      success: true,
      content,
    })
  } catch (error) {
    console.error('[ContentGeneration] Error:', error)
    return NextResponse.json<ContentGenerationResponse>(
      { success: false, error: 'Failed to generate content' },
      { status: 500 }
    )
  }
}
