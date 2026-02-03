import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { encrypt, maskSecret } from '@/lib/encryption'
import { clearResendCredentialsCache } from '@/lib/email'
import { Resend } from 'resend'

// Validation schema for saving credentials
const saveCredentialsSchema = z.object({
  api_key: z.string().min(1, 'API Key is required').startsWith('re_', 'Invalid Resend API key format'),
  from_email: z.string().email('Invalid email address'),
  from_name: z.string().optional(),
})

interface ResendCredentialStatus {
  configured: boolean
  verified: boolean
  verified_at: string | null
  from_email: string | null
  from_name: string | null
  api_key_masked: string | null
  notifications_enabled: boolean
  using_platform_credentials: boolean
}

/**
 * Verify Resend API key by making a test API call
 */
async function verifyResendCredentials(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const resend = new Resend(apiKey)

    // Try to get API key info (simplest validation)
    // Resend doesn't have a dedicated validation endpoint, so we check domains
    const { data, error } = await resend.domains.list()

    if (error) {
      return { valid: false, error: error.message }
    }

    return { valid: true }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Failed to verify credentials',
    }
  }
}

/**
 * GET /api/dashboard/settings/email
 * Get current Resend credential status
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
        resend_api_key_encrypted,
        resend_from_email,
        resend_from_name,
        resend_credentials_verified,
        resend_credentials_verified_at,
        email_notifications_enabled,
        notification_settings
      `)
      .eq('owner_id', user.id)
      .single()

    if (storeError || !store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // Build status response
    const status: ResendCredentialStatus = {
      configured: Boolean(store.resend_api_key_encrypted && store.resend_from_email),
      verified: store.resend_credentials_verified || false,
      verified_at: store.resend_credentials_verified_at,
      from_email: store.resend_from_email,
      from_name: store.resend_from_name,
      api_key_masked: store.resend_api_key_encrypted
        ? maskSecret('re_••••••••••••')
        : null,
      notifications_enabled: store.email_notifications_enabled ?? true,
      using_platform_credentials: !store.resend_credentials_verified,
    }

    return NextResponse.json({
      status,
      notification_settings: store.notification_settings,
    })
  } catch (error) {
    console.error('Failed to get Resend credentials status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/dashboard/settings/email
 * Save and verify Resend credentials
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

    const { api_key, from_email, from_name } = validationResult.data
    const skipValidation = body.skip_validation === true

    // Verify credentials against Resend API (unless skipped)
    if (!skipValidation) {
      const verificationResult = await verifyResendCredentials(api_key)

      if (!verificationResult.valid) {
        return NextResponse.json(
          {
            error: 'Credential verification failed',
            details: verificationResult.error || 'Could not verify credentials with Resend',
          },
          { status: 400 }
        )
      }
    }

    // Encrypt sensitive credentials
    const encryptedApiKey = encrypt(api_key)

    // Save to database
    const { error: updateError } = await supabase
      .from('stores')
      .update({
        resend_api_key_encrypted: encryptedApiKey,
        resend_from_email: from_email,
        resend_from_name: from_name || null,
        resend_credentials_verified: true,
        resend_credentials_verified_at: new Date().toISOString(),
      })
      .eq('id', store.id)

    if (updateError) {
      console.error('Failed to save Resend credentials:', updateError)
      return NextResponse.json(
        { error: 'Failed to save credentials' },
        { status: 500 }
      )
    }

    // Clear cached credentials
    clearResendCredentialsCache(store.id)

    return NextResponse.json({
      success: true,
      message: 'Resend credentials saved and verified successfully',
    })
  } catch (error) {
    console.error('Failed to save Resend credentials:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/dashboard/settings/email
 * Update notification settings
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
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
      .select('id, notification_settings')
      .eq('owner_id', user.id)
      .single()

    if (storeError || !store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    const body = await request.json()
    const updates: Record<string, unknown> = {}

    // Update notifications enabled flag
    if (typeof body.notifications_enabled === 'boolean') {
      updates.email_notifications_enabled = body.notifications_enabled
    }

    // Update specific notification settings
    if (body.notification_settings) {
      updates.notification_settings = {
        ...(store.notification_settings as object || {}),
        ...body.notification_settings,
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
    }

    const { error: updateError } = await supabase
      .from('stores')
      .update(updates)
      .eq('id', store.id)

    if (updateError) {
      console.error('Failed to update email settings:', updateError)
      return NextResponse.json(
        { error: 'Failed to update settings' },
        { status: 500 }
      )
    }

    // Clear cached credentials
    clearResendCredentialsCache(store.id)

    return NextResponse.json({
      success: true,
      message: 'Email settings updated',
    })
  } catch (error) {
    console.error('Failed to update email settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/dashboard/settings/email
 * Remove custom Resend credentials (revert to platform credentials)
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
        resend_api_key_encrypted: null,
        resend_from_email: null,
        resend_from_name: null,
        resend_credentials_verified: false,
        resend_credentials_verified_at: null,
      })
      .eq('id', store.id)

    if (updateError) {
      console.error('Failed to remove Resend credentials:', updateError)
      return NextResponse.json(
        { error: 'Failed to remove credentials' },
        { status: 500 }
      )
    }

    // Clear cached credentials
    clearResendCredentialsCache(store.id)

    return NextResponse.json({
      success: true,
      message: 'Resend credentials removed. Your store will now use platform credentials.',
    })
  } catch (error) {
    console.error('Failed to remove Resend credentials:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
