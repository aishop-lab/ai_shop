'use client'

import { useEffect, useRef, useState } from 'react'

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

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId) {
      setStatus('error')
      setErrorMessage('Google Sign-In is not configured for this site.')
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
        setTimeout(() => window.close(), 1200)
      } else {
        setStatus('error')
        setErrorMessage('No credential received from Google.')
      }
    }

    const initGoogle = () => {
      const gis = getGIS()
      if (!gis?.accounts?.id) {
        setStatus('error')
        setErrorMessage('Failed to load Google Sign-In.')
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
      setErrorMessage('Could not connect to Google. Please check your internet connection.')
    }
    document.body.appendChild(script)
  }, [])

  useEffect(() => {
    if (!gisReady || !buttonRef.current) return

    const gis = getGIS()
    if (!gis?.accounts?.id) return

    gis.accounts.id.renderButton(buttonRef.current, {
      theme: 'outline',
      size: 'large',
      type: 'standard',
      shape: 'pill',
      text: 'continue_with',
      width: 300,
      logo_alignment: 'left',
    })

    setStatus('ready')
  }, [gisReady])

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '360px',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04)',
          padding: '40px 32px 32px',
          textAlign: 'center',
        }}
      >
        {/* Shield icon */}
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #4285F4 0%, #34A853 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>

        <h1
          style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#1a1a1a',
            margin: '0 0 6px',
          }}
        >
          {status === 'success' ? 'You\'re all set!' : 'Sign in with Google'}
        </h1>
        <p
          style={{
            fontSize: '14px',
            color: '#6b7280',
            margin: '0 0 28px',
            lineHeight: 1.5,
          }}
        >
          {status === 'loading' && 'Preparing secure sign-in...'}
          {status === 'ready' && 'Choose your Google account to continue'}
          {status === 'success' && 'Redirecting you back to the store...'}
          {status === 'error' && errorMessage}
        </p>

        {/* Loading spinner */}
        {status === 'loading' && (
          <div style={{ padding: '8px 0' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                border: '3px solid #e5e7eb',
                borderTopColor: '#4285F4',
                borderRadius: '50%',
                margin: '0 auto',
                animation: 'spin 0.8s linear infinite',
              }}
            />
          </div>
        )}

        {/* Success checkmark */}
        {status === 'success' && (
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#dcfce7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 8px',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        )}

        {/* Error state */}
        {status === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '4px',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <button
              onClick={() => window.close()}
              style={{
                padding: '8px 20px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#4b5563',
                background: '#f3f4f6',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              Close window
            </button>
          </div>
        )}

        {/* Google button - always in DOM for ref */}
        <div
          ref={buttonRef}
          style={{
            display: status === 'ready' ? 'flex' : 'none',
            justifyContent: 'center',
          }}
        />

        {/* Footer */}
        <div
          style={{
            marginTop: '28px',
            paddingTop: '16px',
            borderTop: '1px solid #f3f4f6',
          }}
        >
          <p
            style={{
              fontSize: '12px',
              color: '#9ca3af',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Secured by StoreForge
          </p>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  )
}
