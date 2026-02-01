import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { generateStorePolicies } from '@/lib/store/policies'

// Validation schema for policy configuration
const policyConfigSchema = z.object({
  returns: z.object({
    enabled: z.boolean(),
    window_days: z.union([z.literal(7), z.literal(14), z.literal(30), z.literal(0)]),
    condition: z.enum(['unused_with_tags', 'opened_ok', 'any_condition', 'no_returns']),
    refund_method: z.enum(['original_payment', 'store_credit', 'exchange_only', 'buyer_choice'])
  }),
  shipping: z.object({
    free_shipping: z.enum(['always', 'threshold', 'never']),
    free_threshold: z.number().min(0),
    delivery_speed: z.enum(['express', 'standard', 'economy']),
    regions: z.enum(['pan_india', 'metro_only', 'specific_states']),
    specific_states: z.array(z.string()).optional(),
    processing_days: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(5)])
  })
})

// GET - Fetch current policy configuration
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get merchant's store
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, policy_config')
      .eq('owner_id', user.id)
      .single()

    if (storeError || !store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // Return default config if none exists
    const defaultConfig = {
      returns: {
        enabled: true,
        window_days: 14,
        condition: 'unused_with_tags',
        refund_method: 'original_payment'
      },
      shipping: {
        free_shipping: 'threshold',
        free_threshold: 999,
        delivery_speed: 'standard',
        regions: 'pan_india',
        processing_days: 2
      }
    }

    return NextResponse.json({
      policy_config: store.policy_config || defaultConfig
    })
  } catch (error) {
    console.error('[PolicyConfig] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update policy configuration and regenerate policies
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate the configuration
    const validationResult = policyConfigSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid configuration', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const policyConfig = validationResult.data

    // Get merchant's store
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (storeError || !store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // Update policy configuration
    const { error: updateError } = await supabase
      .from('stores')
      .update({ policy_config: policyConfig })
      .eq('id', store.id)

    if (updateError) {
      console.error('[PolicyConfig] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 })
    }

    // Regenerate policies with new configuration
    const regenerateResult = await generateStorePolicies(supabase, store.id)

    if (!regenerateResult.success) {
      console.error('[PolicyConfig] Policy regeneration failed:', regenerateResult.error)
      // Still return success for config save, just note the regeneration issue
      return NextResponse.json({
        success: true,
        policy_config: policyConfig,
        warning: 'Configuration saved but policy regeneration failed. You can manually regenerate policies.'
      })
    }

    return NextResponse.json({
      success: true,
      policy_config: policyConfig,
      message: 'Configuration saved and policies regenerated'
    })
  } catch (error) {
    console.error('[PolicyConfig] PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
