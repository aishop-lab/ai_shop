// Brand Analysis API - AI-First Decision Making
// Analyzes brand description and auto-confirms when confidence > 80%

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { vercelAI, AUTO_APPLY_THRESHOLD } from '@/lib/ai/vercel-ai-service'
import { z } from 'zod'

const requestSchema = z.object({
  brand_description: z.string().min(10, 'Description must be at least 10 characters'),
  business_name: z.string().optional(),
})

export interface BrandAnalysisResponse {
  success: boolean
  error?: string
  data?: {
    // Category detection
    category: {
      business_type: string
      business_category: string[]
      niche: string
      keywords: string[]
      confidence: number
    }
    // Auto-selection status
    auto_selected: boolean
    requires_confirmation: boolean
    reasoning: string
    // Store name suggestions
    store_names: Array<{
      name: string
      slug: string
      reasoning: string
    }>
    // Brand colors
    brand_colors: {
      primary: string
      secondary: string
      reasoning: string
    }
    // Tagline
    tagline: string
    // Overall confidence
    overall_confidence: number
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json<BrandAnalysisResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse and validate request
    const body = await request.json()
    const validation = requestSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json<BrandAnalysisResponse>(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { brand_description, business_name } = validation.data

    // Call AI service for comprehensive brand analysis
    const analysis = await vercelAI.analyzeBusinessForOnboarding(
      brand_description,
      business_name,
      user.id // Session ID for caching
    )

    // Determine if we should auto-select based on confidence
    const autoSelected = analysis.category.confidence >= AUTO_APPLY_THRESHOLD
    const requiresConfirmation = !autoSelected

    // Build reasoning message
    let reasoning: string
    if (autoSelected) {
      reasoning = `Brand description strongly indicates ${analysis.category.business_type} with keywords: ${analysis.category.keywords.slice(0, 3).join(', ')}`
    } else {
      reasoning = `Multiple categories detected. Please confirm which best describes your store.`
    }

    console.log(`[BrandAnalysis] Category: ${analysis.category.business_type}, Confidence: ${analysis.category.confidence}, Auto-selected: ${autoSelected}`)

    return NextResponse.json<BrandAnalysisResponse>({
      success: true,
      data: {
        category: analysis.category,
        auto_selected: autoSelected,
        requires_confirmation: requiresConfirmation,
        reasoning,
        store_names: analysis.store_names,
        brand_colors: analysis.brand_colors,
        tagline: analysis.tagline,
        overall_confidence: analysis.overall_confidence,
      },
    })
  } catch (error) {
    console.error('[BrandAnalysis] Error:', error)
    return NextResponse.json<BrandAnalysisResponse>(
      { success: false, error: 'Failed to analyze brand' },
      { status: 500 }
    )
  }
}
