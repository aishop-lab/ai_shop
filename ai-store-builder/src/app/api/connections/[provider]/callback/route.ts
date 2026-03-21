import { NextRequest, NextResponse } from 'next/server'
import { handleMetaCallback } from '@/lib/connections/meta'
import { handleGoogleAdsCallback } from '@/lib/connections/google-ads'

export const dynamic = 'force-dynamic'

const SUPPORTED_PROVIDERS = ['meta', 'google_ads'] as const
type Provider = (typeof SUPPORTED_PROVIDERS)[number]

/**
 * GET /api/connections/[provider]/callback
 *
 * OAuth callback handler. Called by the provider after the merchant authorizes.
 * Exchanges the authorization code for tokens and stores encrypted credentials.
 * Redirects back to the connections settings page on completion.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params
  const { searchParams } = new URL(request.url)

  const code = searchParams.get('code')
  const state = searchParams.get('state') // storeId
  const errorParam = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  const settingsUrl = '/platform/settings/connections'

  // Handle provider-side errors (user denied, etc.)
  if (errorParam) {
    const message = errorDescription || errorParam
    return NextResponse.redirect(
      new URL(`${settingsUrl}?error=${encodeURIComponent(message)}`, request.url)
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL(`${settingsUrl}?error=${encodeURIComponent('Missing authorization code or state')}`, request.url)
    )
  }

  if (!SUPPORTED_PROVIDERS.includes(provider as Provider)) {
    return NextResponse.redirect(
      new URL(`${settingsUrl}?error=${encodeURIComponent(`Unsupported provider: ${provider}`)}`, request.url)
    )
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const redirectUri = `${appUrl}/api/connections/${provider}/callback`
  const storeId = state

  try {
    let result: { success: boolean; error?: string }

    switch (provider as Provider) {
      case 'meta':
        result = await handleMetaCallback({ storeId, code, redirectUri })
        break
      case 'google_ads':
        result = await handleGoogleAdsCallback({ storeId, code, redirectUri })
        break
      default:
        result = { success: false, error: 'Unsupported provider' }
    }

    if (result.success) {
      return NextResponse.redirect(
        new URL(`${settingsUrl}?connected=${encodeURIComponent(provider)}`, request.url)
      )
    }

    return NextResponse.redirect(
      new URL(
        `${settingsUrl}?error=${encodeURIComponent(result.error || 'Connection failed')}`,
        request.url
      )
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred'
    return NextResponse.redirect(
      new URL(`${settingsUrl}?error=${encodeURIComponent(message)}`, request.url)
    )
  }
}
