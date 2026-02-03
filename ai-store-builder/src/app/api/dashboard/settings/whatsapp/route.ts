import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { encrypt, maskSecret } from '@/lib/encryption'
import { clearMSG91CredentialsCache } from '@/lib/whatsapp/msg91'

// Validation schema for saving credentials
const saveCredentialsSchema = z.object({
  auth_key: z.string().min(1, 'Auth Key is required'),
  whatsapp_number: z.string().min(10, 'WhatsApp number is required'),
  sender_id: z.string().optional(),
})

interface MSG91CredentialStatus {
  configured: boolean
  verified: boolean
  verified_at: string | null
  whatsapp_number: string | null
  sender_id: string | null
  auth_key_masked: string | null
  notifications_enabled: boolean
  using_platform_credentials: boolean
}

/**
 * GET /api/dashboard/settings/whatsapp
 * Get current MSG91 credential status
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
        msg91_auth_key_encrypted,
        msg91_whatsapp_number,
        msg91_sender_id,
        msg91_credentials_verified,
        msg91_credentials_verified_at,
        whatsapp_notifications_enabled,
        notification_settings
      `)
      .eq('owner_id', user.id)
      .single()

    if (storeError || !store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // Build status response
    const status: MSG91CredentialStatus = {
      configured: Boolean(store.msg91_auth_key_encrypted && store.msg91_whatsapp_number),
      verified: store.msg91_credentials_verified || false,
      verified_at: store.msg91_credentials_verified_at,
      whatsapp_number: store.msg91_whatsapp_number,
      sender_id: store.msg91_sender_id,
      auth_key_masked: store.msg91_auth_key_encrypted
        ? maskSecret('••••••••••••')
        : null,
      notifications_enabled: store.whatsapp_notifications_enabled ?? true,
      using_platform_credentials: !store.msg91_credentials_verified,
    }

    return NextResponse.json({
      status,
      notification_settings: store.notification_settings,
    })
  } catch (error) {
    console.error('Failed to get MSG91 credentials status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/dashboard/settings/whatsapp
 * Save MSG91 credentials
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

    const { auth_key, whatsapp_number, sender_id } = validationResult.data

    // Encrypt sensitive credentials
    const encryptedAuthKey = encrypt(auth_key)

    // Save to database (skip validation for now - MSG91 doesn't have a simple validation endpoint)
    const { error: updateError } = await supabase
      .from('stores')
      .update({
        msg91_auth_key_encrypted: encryptedAuthKey,
        msg91_whatsapp_number: whatsapp_number,
        msg91_sender_id: sender_id || null,
        msg91_credentials_verified: true, // Mark as verified (user responsibility)
        msg91_credentials_verified_at: new Date().toISOString(),
      })
      .eq('id', store.id)

    if (updateError) {
      console.error('Failed to save MSG91 credentials:', updateError)
      return NextResponse.json(
        { error: 'Failed to save credentials' },
        { status: 500 }
      )
    }

    // Clear cached credentials
    clearMSG91CredentialsCache(store.id)

    return NextResponse.json({
      success: true,
      message: 'MSG91 credentials saved successfully',
    })
  } catch (error) {
    console.error('Failed to save MSG91 credentials:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/dashboard/settings/whatsapp
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
      updates.whatsapp_notifications_enabled = body.notifications_enabled
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
      console.error('Failed to update WhatsApp settings:', updateError)
      return NextResponse.json(
        { error: 'Failed to update settings' },
        { status: 500 }
      )
    }

    // Clear cached credentials
    clearMSG91CredentialsCache(store.id)

    return NextResponse.json({
      success: true,
      message: 'WhatsApp settings updated',
    })
  } catch (error) {
    console.error('Failed to update WhatsApp settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/dashboard/settings/whatsapp
 * Remove custom MSG91 credentials (revert to platform credentials)
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
        msg91_auth_key_encrypted: null,
        msg91_whatsapp_number: null,
        msg91_sender_id: null,
        msg91_credentials_verified: false,
        msg91_credentials_verified_at: null,
      })
      .eq('id', store.id)

    if (updateError) {
      console.error('Failed to remove MSG91 credentials:', updateError)
      return NextResponse.json(
        { error: 'Failed to remove credentials' },
        { status: 500 }
      )
    }

    // Clear cached credentials
    clearMSG91CredentialsCache(store.id)

    return NextResponse.json({
      success: true,
      message: 'MSG91 credentials removed. Your store will now use platform credentials.',
    })
  } catch (error) {
    console.error('Failed to remove MSG91 credentials:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
