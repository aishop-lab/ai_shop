import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { onboardingAgent } from '@/lib/ai/onboarding-agent'
import { suggestNamesSchema } from '@/lib/validations/onboarding'

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
    const validationResult = suggestNamesSchema.safeParse(body)

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

    // Call AI agent to suggest names
    const suggestions = await onboardingAgent.suggestStoreNames(description)

    // Check slug availability in database
    const slugs = suggestions.map(s => s.slug)
    const { data: existingStores } = await supabase
      .from('stores')
      .select('slug')
      .in('slug', slugs)

    const existingSlugs = new Set(existingStores?.map(s => s.slug) || [])

    // Mark availability
    const suggestionsWithAvailability = suggestions.map(s => ({
      ...s,
      available: !existingSlugs.has(s.slug)
    }))

    return NextResponse.json({
      success: true,
      suggestions: suggestionsWithAvailability
    })
  } catch (error) {
    console.error('Name suggestion error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to suggest names' },
      { status: 500 }
    )
  }
}
