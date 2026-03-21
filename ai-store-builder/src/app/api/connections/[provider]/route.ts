import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { disconnectMeta } from '@/lib/connections/meta'
import { disconnectGoogleAds } from '@/lib/connections/google-ads'

export const dynamic = 'force-dynamic'

const SUPPORTED_PROVIDERS = ['meta', 'google_ads'] as const
type Provider = (typeof SUPPORTED_PROVIDERS)[number]

/**
 * DELETE /api/connections/[provider]
 *
 * Disconnect a provider account from the authenticated user's store.
 * Revokes the token with the provider and removes the stored credentials.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params

    if (!SUPPORTED_PROVIDERS.includes(provider as Provider)) {
      return NextResponse.json(
        { error: `Unsupported provider: ${provider}` },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (storeError || !store) {
      return NextResponse.json({ error: 'No store found' }, { status: 404 })
    }

    let success: boolean

    switch (provider as Provider) {
      case 'meta':
        success = await disconnectMeta(store.id)
        break
      case 'google_ads':
        success = await disconnectGoogleAds(store.id)
        break
      default:
        return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 })
    }

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to disconnect account' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
