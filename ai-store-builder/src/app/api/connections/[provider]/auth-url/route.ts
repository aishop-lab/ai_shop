import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMetaAuthUrl } from '@/lib/connections/meta'
import { getGoogleAdsAuthUrl } from '@/lib/connections/google-ads'

export const dynamic = 'force-dynamic'

const SUPPORTED_PROVIDERS = ['meta', 'google_ads'] as const
type Provider = (typeof SUPPORTED_PROVIDERS)[number]

/**
 * GET /api/connections/[provider]/auth-url
 *
 * Generates the OAuth authorization URL for the given provider.
 * The merchant's browser is then redirected to this URL to begin the consent flow.
 */
export async function GET(
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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const redirectUri = `${appUrl}/api/connections/${provider}/callback`

    let url: string

    switch (provider as Provider) {
      case 'meta':
        url = getMetaAuthUrl(store.id, redirectUri)
        break
      case 'google_ads':
        url = getGoogleAdsAuthUrl(store.id, redirectUri)
        break
      default:
        return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 })
    }

    return NextResponse.json({ url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
