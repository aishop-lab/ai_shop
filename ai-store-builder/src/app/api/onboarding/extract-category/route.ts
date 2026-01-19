import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { onboardingAgent } from '@/lib/ai/onboarding-agent'
import { extractCategorySchema } from '@/lib/validations/onboarding'

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
    const validationResult = extractCategorySchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: validationResult.error.errors[0]?.message || 'Invalid input'
        },
        { status: 400 }
      )
    }

    const { description } = validationResult.data

    // Call AI agent to extract category
    const categoryResult = await onboardingAgent.extractCategory(description)

    return NextResponse.json({
      success: true,
      ...categoryResult
    })
  } catch (error) {
    console.error('Category extraction error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to extract category' },
      { status: 500 }
    )
  }
}
