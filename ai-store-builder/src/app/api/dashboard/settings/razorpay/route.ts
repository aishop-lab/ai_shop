import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { encrypt, maskSecret } from '@/lib/encryption'
import { verifyRazorpayCredentials } from '@/lib/payment/razorpay'
import type { RazorpayCredentialStatus } from '@/lib/types/store'

// Validation schema for saving credentials
const saveCredentialsSchema = z.object({
  key_id: z.string()
    .min(1, 'Key ID is required')
    .regex(/^rzp_(test|live)_[a-zA-Z0-9]+$/, 'Invalid Razorpay Key ID format'),
  key_secret: z.string()
    .min(1, 'Key Secret is required'),
  webhook_secret: z.string().optional(),
})

/**
 * GET /api/dashboard/settings/razorpay
 * Get current Razorpay credential status
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
        razorpay_key_id,
        razorpay_key_secret_encrypted,
        razorpay_webhook_secret_encrypted,
        razorpay_credentials_verified,
        razorpay_credentials_verified_at
      `)
      .eq('owner_id', user.id)
      .single()

    if (storeError || !store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // Build status response
    const status: RazorpayCredentialStatus = {
      configured: Boolean(store.razorpay_key_id && store.razorpay_key_secret_encrypted),
      verified: store.razorpay_credentials_verified || false,
      verified_at: store.razorpay_credentials_verified_at,
      key_id: store.razorpay_key_id,
      key_secret_masked: store.razorpay_key_secret_encrypted
        ? maskSecret('••••••••••••') // Show generic mask since we can't decrypt just for masking
        : null,
      webhook_secret_masked: store.razorpay_webhook_secret_encrypted
        ? maskSecret('••••••••••••')
        : null,
      using_platform_credentials: !store.razorpay_credentials_verified,
    }

    return NextResponse.json({ status })
  } catch (error) {
    console.error('Failed to get Razorpay credentials status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/dashboard/settings/razorpay
 * Save and verify new Razorpay credentials
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

    const { key_id, key_secret, webhook_secret } = validationResult.data

    // Verify credentials against Razorpay API
    const verificationResult = await verifyRazorpayCredentials({
      key_id,
      key_secret,
    })

    if (!verificationResult.valid) {
      return NextResponse.json(
        {
          error: 'Credential verification failed',
          details: verificationResult.error || 'Could not verify credentials with Razorpay',
        },
        { status: 400 }
      )
    }

    // Encrypt sensitive credentials
    const encryptedKeySecret = encrypt(key_secret)
    const encryptedWebhookSecret = webhook_secret ? encrypt(webhook_secret) : null

    // Save to database
    const { error: updateError } = await supabase
      .from('stores')
      .update({
        razorpay_key_id: key_id,
        razorpay_key_secret_encrypted: encryptedKeySecret,
        razorpay_webhook_secret_encrypted: encryptedWebhookSecret,
        razorpay_credentials_verified: true,
        razorpay_credentials_verified_at: new Date().toISOString(),
      })
      .eq('id', store.id)

    if (updateError) {
      console.error('Failed to save Razorpay credentials:', updateError)
      return NextResponse.json(
        { error: 'Failed to save credentials' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Razorpay credentials saved and verified successfully',
    })
  } catch (error) {
    console.error('Failed to save Razorpay credentials:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/dashboard/settings/razorpay
 * Remove custom Razorpay credentials (revert to platform credentials)
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
        razorpay_key_id: null,
        razorpay_key_secret_encrypted: null,
        razorpay_webhook_secret_encrypted: null,
        razorpay_credentials_verified: false,
        razorpay_credentials_verified_at: null,
      })
      .eq('id', store.id)

    if (updateError) {
      console.error('Failed to remove Razorpay credentials:', updateError)
      return NextResponse.json(
        { error: 'Failed to remove credentials' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Razorpay credentials removed. Your store will now use platform credentials.',
    })
  } catch (error) {
    console.error('Failed to remove Razorpay credentials:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
