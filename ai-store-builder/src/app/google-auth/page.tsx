'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

/**
 * Google Auth Popup Page
 *
 * Runs on the main domain (storeforge.site) where Google OAuth client is authorized.
 * Subdomain store pages open this as a popup, and it posts the ID token back via postMessage.
 */

interface GoogleIdentityServices {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string
        callback: (response: { credential: string }) => void
        auto_select?: boolean
        cancel_on_tap_outside?: boolean
      }) => void
      renderButton: (
        element: HTMLElement,
        options: {
          theme?: 'outline' | 'filled_blue' | 'filled_black'
          size?: 'large' | 'medium' | 'small'
          type?: 'standard' | 'icon'
          shape?: 'rectangular' | 'pill' | 'circle' | 'square'
          text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
          width?: number
          logo_alignment?: 'left' | 'center'
        }
      ) => void
      prompt: () => void
    }
  }
}

function getGIS(): GoogleIdentityServices | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).google as GoogleIdentityServices | undefined
}

export default function GoogleAuthPopup() {
  const buttonRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [gisReady, setGisReady] = useState(false)

  // Step 1: Load the GIS script and initialize
  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId) {
      setStatus('error')
      setErrorMessage('Google Sign-In is not configured')
      return
    }

    const params = new URLSearchParams(window.location.search)
    const origin = params.get('origin') || ''

    const handleCredential = (response: { credential: string }) => {
      if (response.credential && window.opener) {
        window.opener.postMessage(
          { type: 'google-auth-success', credential: response.credential },
          origin
        )
        setStatus('success')
        setTimeout(() => window.close(), 500)
      } else {
        setStatus('error')
        setErrorMessage('No credential received')
      }
    }

    const initGoogle = () => {
      const gis = getGIS()
      if (!gis?.accounts?.id) {
        setStatus('error')
        setErrorMessage('Failed to load Google Sign-In')
        return
      }

      gis.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredential,
        auto_select: false,
        cancel_on_tap_outside: false,
      })

      setGisReady(true)
    }

    const gis = getGIS()
    if (gis?.accounts?.id) {
      initGoogle()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = initGoogle
    script.onerror = () => {
      setStatus('error')
      setErrorMessage('Failed to load Google Sign-In')
    }
    document.body.appendChild(script)
  }, [])

  // Step 2: Render the Google button once GIS is initialized AND the ref is mounted
  useEffect(() => {
    if (!gisReady || !buttonRef.current) return

    const gis = getGIS()
    if (!gis?.accounts?.id) return

    gis.accounts.id.renderButton(buttonRef.current, {
      theme: 'outline',
      size: 'large',
      type: 'standard',
      shape: 'rectangular',
      text: 'continue_with',
      width: 320,
      logo_alignment: 'left',
    })

    setStatus('ready')
  }, [gisReady])

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-6">
      <div className="text-center space-y-4 max-w-sm w-full">
        {status === 'loading' && (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
            <p className="text-gray-600 text-sm">Loading Google Sign-In...</p>
          </>
        )}

        {status === 'success' && (
          <p className="text-green-600 font-medium">Signed in! Closing...</p>
        )}

        {status === 'error' && (
          <>
            <p className="text-red-600 font-medium">Something went wrong</p>
            <p className="text-gray-500 text-sm">{errorMessage}</p>
            <button
              onClick={() => window.close()}
              className="mt-2 text-sm text-blue-600 hover:underline"
            >
              Close window
            </button>
          </>
        )}

        {/* Always in DOM so ref is available when GIS loads */}
        <div
          ref={buttonRef}
          className={`flex justify-center mt-4 ${status !== 'ready' ? 'hidden' : ''}`}
        />
      </div>
    </div>
  )
}
