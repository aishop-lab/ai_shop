import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { encrypt, maskSecret } from '@/lib/encryption'
import { verifyStripeCredentials } from '@/lib/payment/stripe'
import type { StripeCredentialStatus } from '@/lib/types/store'

// Validation schema for saving credentials
const saveCredentialsSchema = z.object({
  publishable_key: z.string()
    .min(1, 'Publishable Key is required')
    .regex(/^pk_(test|live)_[a-zA-Z0-9]+$/, 'Invalid Stripe Publishable Key format'),
  secret_key: z.string()
    .min(1, 'Secret Key is required')
    .regex(/^sk_(test|live)_[a-zA-Z0-9]+$/, 'Invalid Stripe Secret Key format'),
  webhook_secret: z.string().optional(),
})

/**
 * GET /api/dashboard/settings/stripe
 * Get current Stripe credential status
 */
export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's store
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select(`
        id,
        stripe_publishable_key,
        stripe_secret_key_encrypted,
        stripe_webhook_secret_encrypted,
        stripe_credentials_verified,
        stripe_credentials_verified_at
      `)
      .eq('owner_id', user.id)
      .single()

    if (storeError || !store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // Build status response
    const status: StripeCredentialStatus = {
      configured: Boolean(store.stripe_publishable_key && store.stripe_secret_key_encrypted),
      verified: store.stripe_credentials_verified || false,
      verified_at: store.stripe_credentials_verified_at,
      publishable_key: store.stripe_publishable_key,
      secret_key_masked: store.stripe_secret_key_encrypted
        ? maskSecret('••••••••••••')
        : null,
      webhook_secret_masked: store.stripe_webhook_secret_encrypted
        ? maskSecret('••••••••••••')
        : null,
      using_platform_credentials: !store.stripe_credentials_verified,
    }

    return NextResponse.json({ status })
  } catch (error) {
    console.error('Failed to get Stripe credentials status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/dashboard/settings/stripe
 * Save and verify new Stripe credentials
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's store
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (storeError || !store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = saveCredentialsSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { publishable_key, secret_key, webhook_secret } = validationResult.data

    // Verify credentials against Stripe API
    const verificationResult = await verifyStripeCredentials({
      publishable_key,
      secret_key,
    })

    if (!verificationResult.valid) {
      return NextResponse.json(
        {
          error: 'Credential verification failed',
          details: verificationResult.error || 'Could not verify credentials with Stripe',
        },
        { status: 400 }
      )
    }

    // Encrypt sensitive credentials
    const encryptedSecretKey = encrypt(secret_key)
    const encryptedWebhookSecret = webhook_secret ? encrypt(webhook_secret) : null

    // Save to database
    const { error: updateError } = await supabase
      .from('stores')
      .update({
        stripe_publishable_key: publishable_key,
        stripe_secret_key_encrypted: encryptedSecretKey,
        stripe_webhook_secret_encrypted: encryptedWebhookSecret,
        stripe_credentials_verified: true,
        stripe_credentials_verified_at: new Date().toISOString(),
      })
      .eq('id', store.id)

    if (updateError) {
      console.error('Failed to save Stripe credentials:', updateError)
      return NextResponse.json(
        { error: 'Failed to save credentials' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Stripe credentials saved and verified successfully',
    })
  } catch (error) {
    console.error('Failed to save Stripe credentials:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/dashboard/settings/stripe
 * Remove custom Stripe credentials (revert to platform credentials)
 */
export async function DELETE(): Promise<NextResponse> {
  try {
    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's store
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (storeError || !store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // Clear credentials
    const { error: updateError } = await supabase
      .from('stores')
      .update({
        stripe_publishable_key: null,
        stripe_secret_key_encrypted: null,
        stripe_webhook_secret_encrypted: null,
        stripe_credentials_verified: false,
        stripe_credentials_verified_at: null,
      })
      .eq('id', store.id)

    if (updateError) {
      console.error('Failed to remove Stripe credentials:', updateError)
      return NextResponse.json(
        { error: 'Failed to remove credentials' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Stripe credentials removed. Your store will now use platform credentials.',
    })
  } catch (error) {
    console.error('Failed to remove Stripe credentials:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
