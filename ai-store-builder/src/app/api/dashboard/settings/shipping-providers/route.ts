import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getStoreShippingSettings,
  saveShippingProvider,
  removeShippingProvider,
  validateProviderCredentials,
  getDecryptedCredentials,
  SHIPPING_PROVIDERS,
} from '@/lib/shipping/provider-manager'
import { ShippingProviderType } from '@/lib/shipping/types'
import { maskSecret } from '@/lib/encryption'

/**
 * GET /api/dashboard/settings/shipping-providers
 * Get configured shipping providers for the store
 */
export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the user's store
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, shipping_providers, shipping_settings')
      .eq('owner_id', user.id)
      .single()

    if (storeError || !store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    const settings = store.shipping_providers || {
      providers: [],
      defaultProvider: null,
      autoCreateShipment: false,
      preferredCourierStrategy: 'cheapest',
      defaultPackageDimensions: { length: 20, breadth: 15, height: 10, weight: 0.5 },
    }

    // Mask credentials for display
    const maskedProviders = settings.providers.map((p: any) => {
      const credentials = getDecryptedCredentials(p.credentials)
      const maskedCredentials: Record<string, string> = {}

      for (const [key, value] of Object.entries(credentials)) {
        maskedCredentials[key] = maskSecret(value as string)
      }

      return {
        provider: p.provider,
        isActive: p.isActive,
        isDefault: p.isDefault,
        pickupLocation: p.pickupLocation,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        maskedCredentials,
      }
    })

    return NextResponse.json({
      success: true,
      providers: maskedProviders,
      defaultProvider: settings.defaultProvider,
      autoCreateShipment: settings.autoCreateShipment,
      preferredCourierStrategy: settings.preferredCourierStrategy,
      defaultPackageDimensions: settings.defaultPackageDimensions,
      availableProviders: SHIPPING_PROVIDERS,
    })
  } catch (error) {
    console.error('Failed to get shipping providers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/dashboard/settings/shipping-providers
 * Add or update a shipping provider
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { provider, credentials, pickupLocation, isDefault, validate } = body

    if (!provider || !SHIPPING_PROVIDERS[provider as ShippingProviderType]) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
    }

    // Validate required fields
    const providerInfo = SHIPPING_PROVIDERS[provider as ShippingProviderType]
    for (const field of providerInfo.requiredFields) {
      if (!credentials[field.key]) {
        return NextResponse.json(
          { error: `${field.label} is required` },
          { status: 400 }
        )
      }
    }

    // Get the user's store
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (storeError || !store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // Validate credentials if requested
    if (validate !== false) {
      const validationResult = await validateProviderCredentials(
        provider as ShippingProviderType,
        credentials
      )

      if (!validationResult.valid) {
        return NextResponse.json(
          { error: validationResult.error || 'Invalid credentials' },
          { status: 400 }
        )
      }
    }

    // Save provider
    const result = await saveShippingProvider(
      store.id,
      provider as ShippingProviderType,
      credentials,
      pickupLocation,
      isDefault
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to save provider' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `${providerInfo.name} connected successfully`,
    })
  } catch (error) {
    console.error('Failed to save shipping provider:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/dashboard/settings/shipping-providers
 * Remove a shipping provider
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider')

    if (!provider) {
      return NextResponse.json({ error: 'Provider is required' }, { status: 400 })
    }

    // Get the user's store
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (storeError || !store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    const result = await removeShippingProvider(
      store.id,
      provider as ShippingProviderType
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to remove provider' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Provider removed successfully',
    })
  } catch (error) {
    console.error('Failed to remove shipping provider:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/dashboard/settings/shipping-providers
 * Update shipping settings (default provider, auto-create, etc.)
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { defaultProvider, autoCreateShipment, preferredCourierStrategy, defaultPackageDimensions } = body

    // Get the user's store
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, shipping_providers')
      .eq('owner_id', user.id)
      .single()

    if (storeError || !store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    const currentSettings = store.shipping_providers || {
      providers: [],
      defaultProvider: null,
      autoCreateShipment: false,
      preferredCourierStrategy: 'cheapest',
      defaultPackageDimensions: { length: 20, breadth: 15, height: 10, weight: 0.5 },
    }

    // Update settings
    if (defaultProvider !== undefined) {
      currentSettings.defaultProvider = defaultProvider
      // Update isDefault flags
      currentSettings.providers.forEach((p: any) => {
        p.isDefault = p.provider === defaultProvider
      })
    }

    if (autoCreateShipment !== undefined) {
      currentSettings.autoCreateShipment = autoCreateShipment
    }

    if (preferredCourierStrategy !== undefined) {
      currentSettings.preferredCourierStrategy = preferredCourierStrategy
    }

    if (defaultPackageDimensions !== undefined) {
      currentSettings.defaultPackageDimensions = {
        ...currentSettings.defaultPackageDimensions,
        ...defaultPackageDimensions,
      }
    }

    // Save to database
    const { error: updateError } = await supabase
      .from('stores')
      .update({ shipping_providers: currentSettings })
      .eq('id', store.id)

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
    })
  } catch (error) {
    console.error('Failed to update shipping settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
