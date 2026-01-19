import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ONBOARDING_STEPS, formatQuestion } from '@/lib/onboarding/flow'

export async function POST() {
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

    // Generate session ID
    const sessionId = crypto.randomUUID()

    // Get first step
    const firstStep = ONBOARDING_STEPS[0]
    const question = formatQuestion(firstStep, {})

    // Create initial session in database (optional - can store in memory/redis)
    // For now, we'll track state client-side and validate on completion

    return NextResponse.json({
      success: true,
      session_id: sessionId,
      current_step: 1,
      total_steps: ONBOARDING_STEPS.length,
      question: question,
      step_key: firstStep.key,
      step_type: firstStep.type,
      options: firstStep.options || null,
      required: firstStep.required,
      validation: firstStep.validation || null
    })
  } catch (error) {
    console.error('Onboarding start error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to start onboarding' },
      { status: 500 }
    )
  }
}
