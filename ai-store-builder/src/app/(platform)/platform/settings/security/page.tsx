// src/app/(platform)/platform/settings/security/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Shield,
  Loader2,
  CheckCircle2,
  Mail,
  RefreshCw,
  Lock,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TwoFactorStatus {
  enabled: boolean
  enabledAt: string | null
}

// ---------------------------------------------------------------------------
// Toast (fixed-bottom, auto-dismiss)
// ---------------------------------------------------------------------------

function Toast({
  message,
  type,
  onClose,
}: {
  message: string
  type: 'success' | 'error'
  onClose: () => void
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])

  const colors = {
    success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
    error: 'border-red-500/40 bg-red-500/10 text-red-400',
  }

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <div
        className={cn(
          'rounded-lg border px-4 py-2.5 text-xs font-medium shadow-lg backdrop-blur-sm',
          colors[type]
        )}
      >
        {message}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SecuritySettingsPage() {
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<TwoFactorStatus | null>(null)
  const [isSettingUp, setIsSettingUp] = useState(false)
  const [showVerifyDialog, setShowVerifyDialog] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [showDisableDialog, setShowDisableDialog] = useState(false)
  const [disableCode, setDisableCode] = useState('')
  const [isDisabling, setIsDisabling] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // ---------------------------------------------------------------------------
  // Toast helper
  // ---------------------------------------------------------------------------

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message })
  }, [])

  const clearToast = useCallback(() => setToast(null), [])

  // ---------------------------------------------------------------------------
  // Fetch 2FA status
  // ---------------------------------------------------------------------------

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/2fa/status')
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      }
    } catch (error) {
      console.error('Failed to fetch 2FA status:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // ---------------------------------------------------------------------------
  // Cooldown countdown
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  // ---------------------------------------------------------------------------
  // Enable 2FA: start setup
  // ---------------------------------------------------------------------------

  const handleStartSetup = async () => {
    setIsSettingUp(true)
    try {
      const response = await fetch('/api/auth/2fa/setup', { method: 'POST' })
      const data = await response.json()

      if (!response.ok) {
        if (data.cooldownRemaining) setCooldown(data.cooldownRemaining)
        throw new Error(data.error || 'Setup failed')
      }

      showToast('success', 'Verification code sent to your email')
      setVerificationCode('')
      setShowVerifyDialog(true)
      setCooldown(data.cooldownSeconds || 60)
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to start 2FA setup')
    } finally {
      setIsSettingUp(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Disable 2FA: start
  // ---------------------------------------------------------------------------

  const handleStartDisable = async () => {
    setIsDisabling(true)
    try {
      const response = await fetch('/api/auth/2fa/disable', { method: 'POST' })
      const data = await response.json()

      if (!response.ok) {
        if (data.cooldownRemaining) setCooldown(data.cooldownRemaining)
        throw new Error(data.error || 'Failed to start disable process')
      }

      showToast('success', 'Verification code sent to your email')
      setDisableCode('')
      setShowDisableDialog(true)
      setCooldown(data.cooldownSeconds || 60)
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to start disable process')
    } finally {
      setIsDisabling(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Verify code (enable)
  // ---------------------------------------------------------------------------

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      showToast('error', 'Please enter a 6-digit code')
      return
    }

    setIsVerifying(true)
    try {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verificationCode, action: 'enable' }),
      })
      const data = await response.json()

      if (!response.ok) {
        if (data.attemptsRemaining !== undefined) {
          showToast('error', `${data.error}. ${data.attemptsRemaining} attempts remaining.`)
        } else {
          throw new Error(data.error || 'Verification failed')
        }
        return
      }

      showToast('success', '2FA enabled successfully')
      setShowVerifyDialog(false)
      setVerificationCode('')
      fetchStatus()
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Verification failed')
    } finally {
      setIsVerifying(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Verify code (disable)
  // ---------------------------------------------------------------------------

  const handleDisableVerify = async () => {
    if (disableCode.length !== 6) {
      showToast('error', 'Please enter a 6-digit code')
      return
    }

    setIsVerifying(true)
    try {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: disableCode, action: 'disable' }),
      })
      const data = await response.json()

      if (!response.ok) {
        if (data.attemptsRemaining !== undefined) {
          showToast('error', `${data.error}. ${data.attemptsRemaining} attempts remaining.`)
        } else {
          throw new Error(data.error || 'Failed to disable')
        }
        return
      }

      showToast('success', '2FA disabled successfully')
      setShowDisableDialog(false)
      setDisableCode('')
      fetchStatus()
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to disable 2FA')
    } finally {
      setIsVerifying(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Resend code
  // ---------------------------------------------------------------------------

  const handleResend = async (action: 'enable' | 'disable') => {
    setIsResending(true)
    try {
      const endpoint = action === 'enable' ? '/api/auth/2fa/setup' : '/api/auth/2fa/disable'
      const response = await fetch(endpoint, { method: 'POST' })
      const data = await response.json()

      if (!response.ok) {
        if (data.cooldownRemaining) setCooldown(data.cooldownRemaining)
        throw new Error(data.error || 'Failed to resend code')
      }

      showToast('success', 'New verification code sent')
      setCooldown(data.cooldownSeconds || 60)
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to resend code')
    } finally {
      setIsResending(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Password reset
  // ---------------------------------------------------------------------------

  const handlePasswordReset = async () => {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user?.email) {
        showToast('error', 'Unable to determine your email address')
        return
      }

      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/platform/settings/security`,
      })

      if (error) throw error
      showToast('success', 'Password reset link sent to your email')
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to send reset link')
    }
  }

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="space-y-1">
          <Link
            href="/platform/settings"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--platform-text-muted)] transition-colors hover:text-[var(--platform-text-secondary)]"
          >
            <ArrowLeft className="h-3 w-3" />
            Settings
          </Link>
          <h1 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
            Security
          </h1>
          <p className="text-sm text-[var(--platform-text-secondary)]">
            Loading security settings...
          </p>
        </div>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--platform-text-muted)]" />
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <Link
          href="/platform/settings"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--platform-text-muted)] transition-colors hover:text-[var(--platform-text-secondary)]"
        >
          <ArrowLeft className="h-3 w-3" />
          Settings
        </Link>
        <h1 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
          Security
        </h1>
        <p className="text-sm text-[var(--platform-text-secondary)]">
          Manage two-factor authentication and account security
        </p>
      </div>

      {/* ================================================================== */}
      {/* Two-Factor Authentication                                          */}
      {/* ================================================================== */}
      <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-5 space-y-5">
        {/* Section header */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--platform-border)] bg-[var(--platform-bg)]">
            <Shield className="h-4 w-4 text-[var(--platform-text-secondary)]" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-medium text-[var(--platform-text-primary)]">
              Two-Factor Authentication
            </h2>
            <p className="text-xs text-[var(--platform-text-muted)]">
              Add an extra layer of security with email verification codes
            </p>
          </div>
        </div>

        {/* Status row */}
        <div className="flex items-center justify-between rounded-md border border-[var(--platform-border)] bg-[var(--platform-bg)] px-4 py-3">
          <div className="flex items-center gap-3">
            {status?.enabled ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                Enabled
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--platform-border)]/50 px-2.5 py-0.5 text-xs font-medium text-[var(--platform-text-muted)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--platform-text-muted)]" />
                Disabled
              </span>
            )}
            {status?.enabled && status.enabledAt && (
              <span className="text-xs text-[var(--platform-text-muted)]">
                since {new Date(status.enabledAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            )}
          </div>

          {status?.enabled ? (
            <button
              type="button"
              onClick={handleStartDisable}
              disabled={isDisabling}
              className={cn(
                'rounded border border-red-500/30 px-3 py-1.5 text-xs font-medium',
                'text-red-400 transition-colors hover:bg-red-500/10',
                isDisabling && 'cursor-not-allowed opacity-50'
              )}
            >
              {isDisabling ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Sending code...
                </span>
              ) : (
                'Disable 2FA'
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartSetup}
              disabled={isSettingUp}
              className={cn(
                'rounded bg-[var(--platform-accent)] px-3 py-1.5 text-xs font-medium',
                'text-white transition-colors hover:bg-[var(--platform-accent-hover)]',
                isSettingUp && 'cursor-not-allowed opacity-50'
              )}
            >
              {isSettingUp ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Sending code...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3 w-3" />
                  Enable 2FA
                </span>
              )}
            </button>
          )}
        </div>

        {/* How it works (when disabled) */}
        {!status?.enabled && (
          <div className="space-y-3 border-t border-[var(--platform-border)] pt-4">
            <p className="text-xs font-medium text-[var(--platform-text-secondary)]">
              How it works
            </p>
            <ul className="space-y-2">
              {[
                'Receive a 6-digit code via email when signing in',
                'Codes expire after 10 minutes for security',
                'No authenticator app required',
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2.5 text-xs text-[var(--platform-text-muted)]"
                >
                  <CheckCircle2 className="h-3 w-3 shrink-0 text-green-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Active description (when enabled) */}
        {status?.enabled && (
          <div className="space-y-2 border-t border-[var(--platform-border)] pt-4">
            <p className="text-xs font-medium text-[var(--platform-text-secondary)]">
              Security active
            </p>
            <p className="text-xs text-[var(--platform-text-muted)]">
              A verification code will be sent to your email each time you sign in.
              This helps protect your account even if your password is compromised.
            </p>
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* Password                                                           */}
      {/* ================================================================== */}
      <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-5 space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--platform-border)] bg-[var(--platform-bg)]">
            <Lock className="h-4 w-4 text-[var(--platform-text-secondary)]" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-medium text-[var(--platform-text-primary)]">
              Password
            </h2>
            <p className="text-xs text-[var(--platform-text-muted)]">
              Change your account password via email verification
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md border border-[var(--platform-border)] bg-[var(--platform-bg)] px-4 py-3">
          <p className="text-xs text-[var(--platform-text-muted)]">
            We will send a password reset link to your registered email address.
          </p>
          <button
            type="button"
            onClick={handlePasswordReset}
            className={cn(
              'shrink-0 rounded border border-[var(--platform-border)] px-3 py-1.5 text-xs font-medium',
              'text-[var(--platform-text-secondary)] transition-colors hover:bg-[var(--platform-surface-hover)]'
            )}
          >
            <span className="flex items-center gap-1.5">
              <ExternalLink className="h-3 w-3" />
              Reset Password
            </span>
          </button>
        </div>
      </div>

      {/* Info callout */}
      <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] px-5 py-4">
        <p className="text-xs text-[var(--platform-text-muted)]">
          Account security settings protect your merchant account. Two-factor authentication
          via email is recommended for all accounts. Verification codes are sent to your
          registered email and expire after 10 minutes.
        </p>
      </div>

      {/* ================================================================== */}
      {/* Enable Verification Dialog                                         */}
      {/* ================================================================== */}
      {showVerifyDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-6 shadow-xl space-y-5">
            <div className="space-y-1.5">
              <h3 className="text-sm font-medium text-[var(--platform-text-primary)]">
                Enter Verification Code
              </h3>
              <p className="text-xs text-[var(--platform-text-muted)]">
                We sent a 6-digit code to your email. Enter it below to enable 2FA.
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="verify-code"
                className="text-xs font-medium text-[var(--platform-text-secondary)]"
              >
                Verification Code
              </label>
              <input
                id="verify-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                autoFocus
                className="w-full rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-2.5 text-center font-mono text-lg tracking-widest text-[var(--platform-text-primary)] placeholder:text-[var(--platform-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--platform-accent)]"
              />
            </div>

            {/* Resend */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => handleResend('enable')}
                disabled={isResending || cooldown > 0}
                className={cn(
                  'inline-flex items-center gap-1.5 text-xs transition-colors',
                  isResending || cooldown > 0
                    ? 'cursor-not-allowed text-[var(--platform-text-muted)]'
                    : 'text-[var(--platform-accent)] hover:text-[var(--platform-accent-hover)]'
                )}
              >
                {isResending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
              </button>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 border-t border-[var(--platform-border)] pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowVerifyDialog(false)
                  setVerificationCode('')
                }}
                className="rounded border border-[var(--platform-border)] bg-[var(--platform-surface)] px-3 py-1.5 text-xs font-medium text-[var(--platform-text-secondary)] transition-colors hover:bg-[var(--platform-bg)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVerify}
                disabled={isVerifying || verificationCode.length !== 6}
                className={cn(
                  'rounded bg-[var(--platform-accent)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--platform-accent-hover)]',
                  (isVerifying || verificationCode.length !== 6) && 'cursor-not-allowed opacity-50'
                )}
              >
                {isVerifying ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  'Enable 2FA'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* Disable Verification Dialog                                        */}
      {/* ================================================================== */}
      {showDisableDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-6 shadow-xl space-y-5">
            <div className="space-y-1.5">
              <h3 className="text-sm font-medium text-[var(--platform-text-primary)]">
                Disable Two-Factor Authentication
              </h3>
              <p className="text-xs text-[var(--platform-text-muted)]">
                Enter the verification code sent to your email to confirm disabling 2FA.
                This will make your account less secure.
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="disable-code"
                className="text-xs font-medium text-[var(--platform-text-secondary)]"
              >
                Verification Code
              </label>
              <input
                id="disable-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
                autoFocus
                className="w-full rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-2.5 text-center font-mono text-lg tracking-widest text-[var(--platform-text-primary)] placeholder:text-[var(--platform-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--platform-accent)]"
              />
            </div>

            {/* Resend */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => handleResend('disable')}
                disabled={isResending || cooldown > 0}
                className={cn(
                  'inline-flex items-center gap-1.5 text-xs transition-colors',
                  isResending || cooldown > 0
                    ? 'cursor-not-allowed text-[var(--platform-text-muted)]'
                    : 'text-[var(--platform-accent)] hover:text-[var(--platform-accent-hover)]'
                )}
              >
                {isResending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
              </button>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 border-t border-[var(--platform-border)] pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowDisableDialog(false)
                  setDisableCode('')
                }}
                className="rounded border border-[var(--platform-border)] bg-[var(--platform-surface)] px-3 py-1.5 text-xs font-medium text-[var(--platform-text-secondary)] transition-colors hover:bg-[var(--platform-bg)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDisableVerify}
                disabled={isVerifying || disableCode.length !== 6}
                className={cn(
                  'rounded border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20',
                  (isVerifying || disableCode.length !== 6) && 'cursor-not-allowed opacity-50'
                )}
              >
                {isVerifying ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  'Disable 2FA'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={clearToast}
        />
      )}
    </div>
  )
}
