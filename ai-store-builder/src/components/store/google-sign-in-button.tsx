'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

// Google Identity Services types
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

// Extend window to include Google Identity Services
declare const gisGoogle: GoogleIdentityServices | undefined

interface GoogleSignInButtonProps {
  onSuccess: (idToken: string) => void
  onError?: (error: string) => void
  disabled?: boolean
  text?: 'signin_with' | 'signup_with' | 'continue_with'
}

export function GoogleSignInButton({
  onSuccess,
  onError,
  disabled = false,
  text = 'continue_with'
}: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [scriptError, setScriptError] = useState(false)

  // Helper to get Google Identity Services from window
  const getGoogleIdentityServices = (): GoogleIdentityServices | undefined => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any).google as GoogleIdentityServices | undefined
  }

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

    if (!clientId) {
      console.error('Google Client ID not configured')
      setScriptError(true)
      setIsLoading(false)
      return
    }

    // Check if script is already loaded
    const gis = getGoogleIdentityServices()
    if (gis?.accounts?.id) {
      initializeGoogle(clientId)
      return
    }

    // Load Google Identity Services script
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true

    script.onload = () => {
      initializeGoogle(clientId)
    }

    script.onerror = () => {
      console.error('Failed to load Google Sign-In script')
      setScriptError(true)
      setIsLoading(false)
      onError?.('Failed to load Google Sign-In')
    }

    document.body.appendChild(script)

    return () => {
      // Cleanup if needed
    }
  }, [onError])

  const initializeGoogle = (clientId: string) => {
    const gis = getGoogleIdentityServices()
    if (!gis?.accounts?.id) {
      setScriptError(true)
      setIsLoading(false)
      return
    }

    try {
      gis.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true
      })

      if (buttonRef.current) {
        gis.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          shape: 'rectangular',
          text: text,
          width: 320,
          logo_alignment: 'left'
        })
      }

      setIsLoading(false)
    } catch (error) {
      console.error('Failed to initialize Google Sign-In:', error)
      setScriptError(true)
      setIsLoading(false)
    }
  }

  const handleCredentialResponse = (response: { credential: string }) => {
    if (response.credential) {
      onSuccess(response.credential)
    } else {
      onError?.('No credential received from Google')
    }
  }

  if (scriptError) {
    // Fallback: Don't show anything if Google Sign-In fails to load
    return null
  }

  return (
    <div className="w-full">
      {isLoading ? (
        <div className="flex items-center justify-center h-10 border rounded-md bg-gray-50">
          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        </div>
      ) : (
        <div
          ref={buttonRef}
          className={`flex justify-center ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
        />
      )}
    </div>
  )
}
