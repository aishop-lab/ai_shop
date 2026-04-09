'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  CreditCard,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Info,
  ExternalLink,
  Trash2,
} from 'lucide-react'
import type { RazorpayCredentialStatus, StripeCredentialStatus } from '@/lib/types/store'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PaymentsSettingsPage() {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const [loading, setLoading] = useState(true)

  // Razorpay
  const [razorpayStatus, setRazorpayStatus] = useState<RazorpayCredentialStatus | null>(null)
  const [razorpaySaving, setRazorpaySaving] = useState(false)
  const [razorpayDeleting, setRazorpayDeleting] = useState(false)
  const [razorpayConfirmDelete, setRazorpayConfirmDelete] = useState(false)
  const [keyId, setKeyId] = useState('')
  const [keySecret, setKeySecret] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [showKeySecret, setShowKeySecret] = useState(false)
  const [showWebhookSecret, setShowWebhookSecret] = useState(false)

  // Stripe
  const [stripeStatus, setStripeStatus] = useState<StripeCredentialStatus | null>(null)
  const [stripeSaving, setStripeSaving] = useState(false)
  const [stripeDeleting, setStripeDeleting] = useState(false)
  const [stripeConfirmDelete, setStripeConfirmDelete] = useState(false)
  const [stripePublishableKey, setStripePublishableKey] = useState('')
  const [stripeSecretKey, setStripeSecretKey] = useState('')
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState('')
  const [showStripeSecretKey, setShowStripeSecretKey] = useState(false)
  const [showStripeWebhookSecret, setShowStripeWebhookSecret] = useState(false)

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  // ---------------------------------------------------------------------------
  // Fetch status
  // ---------------------------------------------------------------------------

  useEffect(() => {
    fetchStatus()
  }, [])

  async function fetchStatus() {
    try {
      const [razorpayRes, stripeRes] = await Promise.all([
        fetch('/api/dashboard/settings/razorpay'),
        fetch('/api/dashboard/settings/stripe'),
      ])

      if (razorpayRes.ok) {
        const data = await razorpayRes.json()
        setRazorpayStatus(data.status)
        if (data.status?.key_id) {
          setKeyId(data.status.key_id)
        }
      }

      if (stripeRes.ok) {
        const data = await stripeRes.json()
        setStripeStatus(data.status)
        if (data.status?.publishable_key) {
          setStripePublishableKey(data.status.publishable_key)
        }
      }
    } catch (error) {
      console.error('Failed to fetch payment settings:', error)
      setToast({ type: 'error', message: 'Failed to load payment settings' })
    } finally {
      setLoading(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Razorpay handlers
  // ---------------------------------------------------------------------------

  async function handleRazorpaySave() {
    if (!keyId || !keySecret) {
      setToast({ type: 'error', message: 'Key ID and Key Secret are required' })
      return
    }

    if (!keyId.match(/^rzp_(test|live)_[a-zA-Z0-9]+$/)) {
      setToast({ type: 'error', message: 'Invalid Key ID format. Should start with rzp_test_ or rzp_live_' })
      return
    }

    setRazorpaySaving(true)
    try {
      const response = await fetch('/api/dashboard/settings/razorpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key_id: keyId,
          key_secret: keySecret,
          webhook_secret: webhookSecret || undefined,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setToast({ type: 'success', message: 'Razorpay credentials saved and verified' })
        setKeySecret('')
        setWebhookSecret('')
        await fetchStatus()
      } else {
        setToast({ type: 'error', message: data.error || data.details || 'Failed to save credentials' })
      }
    } catch (error) {
      console.error('Failed to save credentials:', error)
      setToast({ type: 'error', message: 'Failed to save credentials' })
    } finally {
      setRazorpaySaving(false)
    }
  }

  async function handleRazorpayDelete() {
    setRazorpayDeleting(true)
    try {
      const response = await fetch('/api/dashboard/settings/razorpay', {
        method: 'DELETE',
      })

      if (response.ok) {
        setToast({ type: 'success', message: 'Razorpay credentials removed. Using platform credentials.' })
        setKeyId('')
        setKeySecret('')
        setWebhookSecret('')
        setRazorpayConfirmDelete(false)
        await fetchStatus()
      } else {
        const data = await response.json()
        setToast({ type: 'error', message: data.error || 'Failed to remove credentials' })
      }
    } catch (error) {
      console.error('Failed to remove credentials:', error)
      setToast({ type: 'error', message: 'Failed to remove credentials' })
    } finally {
      setRazorpayDeleting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Stripe handlers
  // ---------------------------------------------------------------------------

  async function handleStripeSave() {
    if (!stripePublishableKey || !stripeSecretKey) {
      setToast({ type: 'error', message: 'Publishable Key and Secret Key are required' })
      return
    }

    if (!stripePublishableKey.match(/^pk_(test|live)_[a-zA-Z0-9]+$/)) {
      setToast({ type: 'error', message: 'Invalid Publishable Key format. Should start with pk_test_ or pk_live_' })
      return
    }

    if (!stripeSecretKey.match(/^sk_(test|live)_[a-zA-Z0-9]+$/)) {
      setToast({ type: 'error', message: 'Invalid Secret Key format. Should start with sk_test_ or sk_live_' })
      return
    }

    setStripeSaving(true)
    try {
      const response = await fetch('/api/dashboard/settings/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publishable_key: stripePublishableKey,
          secret_key: stripeSecretKey,
          webhook_secret: stripeWebhookSecret || undefined,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setToast({ type: 'success', message: 'Stripe credentials saved and verified' })
        setStripeSecretKey('')
        setStripeWebhookSecret('')
        await fetchStatus()
      } else {
        setToast({ type: 'error', message: data.error || data.details || 'Failed to save Stripe credentials' })
      }
    } catch (error) {
      console.error('Failed to save Stripe credentials:', error)
      setToast({ type: 'error', message: 'Failed to save Stripe credentials' })
    } finally {
      setStripeSaving(false)
    }
  }

  async function handleStripeDelete() {
    setStripeDeleting(true)
    try {
      const response = await fetch('/api/dashboard/settings/stripe', {
        method: 'DELETE',
      })

      if (response.ok) {
        setToast({ type: 'success', message: 'Stripe credentials removed. Using platform credentials.' })
        setStripePublishableKey('')
        setStripeSecretKey('')
        setStripeWebhookSecret('')
        setStripeConfirmDelete(false)
        await fetchStatus()
      } else {
        const data = await response.json()
        setToast({ type: 'error', message: data.error || 'Failed to remove Stripe credentials' })
      }
    } catch (error) {
      console.error('Failed to remove Stripe credentials:', error)
      setToast({ type: 'error', message: 'Failed to remove Stripe credentials' })
    } finally {
      setStripeDeleting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--platform-text-muted)]" />
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] px-4 py-2 shadow-lg">
          <p className={`font-mono text-xs ${toast.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
            {toast.message}
          </p>
        </div>
      )}

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
          Payment Settings
        </h1>
        <p className="text-sm text-[var(--platform-text-secondary)]">
          Configure payment gateways for your store
        </p>
      </div>

      {/* ================================================================== */}
      {/* RAZORPAY SECTION                                                   */}
      {/* ================================================================== */}

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--platform-border)] bg-[var(--platform-bg)]">
            <span className="font-mono text-[10px] font-bold text-blue-400">RP</span>
          </div>
          <div>
            <h2 className="font-mono text-sm font-semibold text-[var(--platform-text-primary)]">Razorpay</h2>
            <p className="text-xs text-[var(--platform-text-muted)]">
              For INR payments. Auto-selected when store currency is INR.
            </p>
          </div>
          <div className="ml-auto">
            {razorpayStatus?.configured && razorpayStatus?.verified ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400">
                <CheckCircle2 className="h-3 w-3" />
                Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--platform-surface-hover)] px-2 py-0.5 text-xs text-[var(--platform-text-muted)]">
                <Info className="h-3 w-3" />
                Platform credentials
              </span>
            )}
          </div>
        </div>

        {razorpayStatus?.verified && razorpayStatus?.verified_at && (
          <p className="text-[11px] text-[var(--platform-text-muted)]">
            Verified on {new Date(razorpayStatus.verified_at).toLocaleDateString()}
          </p>
        )}

        {/* Razorpay credentials form */}
        <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-5 space-y-4">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-[var(--platform-text-muted)]" />
            <h3 className="text-xs font-medium text-[var(--platform-text-secondary)]">
              Razorpay API Credentials
            </h3>
          </div>
          <p className="text-xs text-[var(--platform-text-muted)]">
            Credentials are encrypted with AES-256-GCM before storage.
          </p>

          {/* Key ID */}
          <div className="space-y-1.5">
            <label htmlFor="rp_key_id" className="text-xs font-medium text-[var(--platform-text-secondary)]">
              Key ID <span className="text-red-400">*</span>
            </label>
            <input
              id="rp_key_id"
              type="text"
              value={keyId}
              onChange={(e) => setKeyId(e.target.value)}
              placeholder="rzp_live_xxxxxxxxxxxxxxxx"
              className="w-full rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-2 text-sm text-[var(--platform-text-primary)] placeholder:text-[var(--platform-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--platform-accent)]"
            />
            <p className="text-[11px] text-[var(--platform-text-muted)]">
              Found in Razorpay Dashboard &rarr; Settings &rarr; API Keys
            </p>
          </div>

          {/* Key Secret */}
          <div className="space-y-1.5">
            <label htmlFor="rp_key_secret" className="text-xs font-medium text-[var(--platform-text-secondary)]">
              Key Secret <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                id="rp_key_secret"
                type={showKeySecret ? 'text' : 'password'}
                value={keySecret}
                onChange={(e) => setKeySecret(e.target.value)}
                placeholder={razorpayStatus?.configured ? '••••••••••••' : 'Enter your Key Secret'}
                className="w-full rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-2 pr-10 text-sm text-[var(--platform-text-primary)] placeholder:text-[var(--platform-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--platform-accent)]"
              />
              <button
                type="button"
                onClick={() => setShowKeySecret(!showKeySecret)}
                className="absolute right-0 top-0 flex h-full items-center px-3 text-[var(--platform-text-muted)] transition-colors hover:text-[var(--platform-text-secondary)]"
              >
                {showKeySecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            <p className="text-[11px] text-[var(--platform-text-muted)]">
              Generated once when you create API keys. Keep it secure.
            </p>
          </div>

          {/* Webhook Secret */}
          <div className="space-y-1.5">
            <label htmlFor="rp_webhook" className="text-xs font-medium text-[var(--platform-text-secondary)]">
              Webhook Secret <span className="text-[var(--platform-text-muted)]">(optional)</span>
            </label>
            <div className="relative">
              <input
                id="rp_webhook"
                type={showWebhookSecret ? 'text' : 'password'}
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder={razorpayStatus?.webhook_secret_masked || 'Enter your Webhook Secret'}
                className="w-full rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-2 pr-10 text-sm text-[var(--platform-text-primary)] placeholder:text-[var(--platform-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--platform-accent)]"
              />
              <button
                type="button"
                onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                className="absolute right-0 top-0 flex h-full items-center px-3 text-[var(--platform-text-muted)] transition-colors hover:text-[var(--platform-text-secondary)]"
              >
                {showWebhookSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            <p className="text-[11px] text-[var(--platform-text-muted)]">
              Required for payment webhooks. Found in Dashboard &rarr; Webhooks &rarr; Setup
            </p>
          </div>

          {/* Webhook URL callout */}
          <div className="rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-2.5">
            <p className="text-[11px] text-[var(--platform-text-muted)] mb-1">Webhook URL for Razorpay:</p>
            <code className="block text-xs font-mono text-[var(--platform-text-secondary)] overflow-x-auto">
              https://storeforge.site/api/webhooks/razorpay
            </code>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleRazorpaySave}
              disabled={razorpaySaving || !keyId || !keySecret}
              className="rounded-lg border border-[var(--platform-accent)] bg-[var(--platform-accent)] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[var(--platform-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {razorpaySaving ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Verifying...
                </span>
              ) : (
                'Save & Verify'
              )}
            </button>

            {razorpayStatus?.configured && !razorpayConfirmDelete && (
              <button
                type="button"
                onClick={() => setRazorpayConfirmDelete(true)}
                className="rounded-lg border border-[var(--platform-border)] px-4 py-2 text-xs font-medium text-red-400 transition-colors hover:border-red-500/30 hover:bg-red-500/10"
              >
                <span className="flex items-center gap-1.5">
                  <Trash2 className="h-3 w-3" />
                  Remove
                </span>
              </button>
            )}

            {razorpayConfirmDelete && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2">
                <p className="text-xs text-red-400">
                  Remove Razorpay credentials? Your store will use platform credentials.
                </p>
                <button
                  type="button"
                  onClick={handleRazorpayDelete}
                  disabled={razorpayDeleting}
                  className="shrink-0 rounded border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {razorpayDeleting ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Removing
                    </span>
                  ) : (
                    'Confirm'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setRazorpayConfirmDelete(false)}
                  className="shrink-0 rounded border border-[var(--platform-border)] px-3 py-1 text-xs font-medium text-[var(--platform-text-muted)] transition-colors hover:text-[var(--platform-text-secondary)]"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Razorpay help links */}
        <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] px-5 py-4 space-y-2.5">
          <p className="text-xs font-medium text-[var(--platform-text-secondary)]">Razorpay Resources</p>
          <div className="space-y-2">
            <a
              href="https://razorpay.com/docs/api/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-[var(--platform-text-muted)] transition-colors hover:text-[var(--platform-accent)]"
            >
              <ExternalLink className="h-3 w-3" />
              API Documentation
            </a>
            <a
              href="https://dashboard.razorpay.com/app/website-app-settings/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-[var(--platform-text-muted)] transition-colors hover:text-[var(--platform-accent)]"
            >
              <ExternalLink className="h-3 w-3" />
              Dashboard - API Keys
            </a>
            <a
              href="https://razorpay.com/docs/webhooks/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-[var(--platform-text-muted)] transition-colors hover:text-[var(--platform-accent)]"
            >
              <ExternalLink className="h-3 w-3" />
              Webhooks Setup Guide
            </a>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-[var(--platform-border)]" />

      {/* ================================================================== */}
      {/* STRIPE SECTION                                                     */}
      {/* ================================================================== */}

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--platform-border)] bg-[var(--platform-bg)]">
            <span className="font-mono text-[10px] font-bold text-purple-400">ST</span>
          </div>
          <div>
            <h2 className="font-mono text-sm font-semibold text-[var(--platform-text-primary)]">Stripe</h2>
            <p className="text-xs text-[var(--platform-text-muted)]">
              For international payments (USD, EUR, GBP). Auto-selected for non-INR currencies.
            </p>
          </div>
          <div className="ml-auto">
            {stripeStatus?.configured && stripeStatus?.verified ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400">
                <CheckCircle2 className="h-3 w-3" />
                Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--platform-surface-hover)] px-2 py-0.5 text-xs text-[var(--platform-text-muted)]">
                <Info className="h-3 w-3" />
                Platform credentials
              </span>
            )}
          </div>
        </div>

        {stripeStatus?.verified && stripeStatus?.verified_at && (
          <p className="text-[11px] text-[var(--platform-text-muted)]">
            Verified on {new Date(stripeStatus.verified_at).toLocaleDateString()}
          </p>
        )}

        {/* Stripe credentials form */}
        <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-5 space-y-4">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-[var(--platform-text-muted)]" />
            <h3 className="text-xs font-medium text-[var(--platform-text-secondary)]">
              Stripe API Credentials
            </h3>
          </div>
          <p className="text-xs text-[var(--platform-text-muted)]">
            Credentials are encrypted with AES-256-GCM before storage.
          </p>

          {/* Publishable Key */}
          <div className="space-y-1.5">
            <label htmlFor="st_pk" className="text-xs font-medium text-[var(--platform-text-secondary)]">
              Publishable Key <span className="text-red-400">*</span>
            </label>
            <input
              id="st_pk"
              type="text"
              value={stripePublishableKey}
              onChange={(e) => setStripePublishableKey(e.target.value)}
              placeholder="pk_live_xxxxxxxxxxxxxxxx"
              className="w-full rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-2 text-sm text-[var(--platform-text-primary)] placeholder:text-[var(--platform-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--platform-accent)]"
            />
            <p className="text-[11px] text-[var(--platform-text-muted)]">
              Found in Stripe Dashboard &rarr; Developers &rarr; API Keys
            </p>
          </div>

          {/* Secret Key */}
          <div className="space-y-1.5">
            <label htmlFor="st_sk" className="text-xs font-medium text-[var(--platform-text-secondary)]">
              Secret Key <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                id="st_sk"
                type={showStripeSecretKey ? 'text' : 'password'}
                value={stripeSecretKey}
                onChange={(e) => setStripeSecretKey(e.target.value)}
                placeholder={stripeStatus?.configured ? '••••••••••••' : 'sk_live_xxxxxxxxxxxxxxxx'}
                className="w-full rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-2 pr-10 text-sm text-[var(--platform-text-primary)] placeholder:text-[var(--platform-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--platform-accent)]"
              />
              <button
                type="button"
                onClick={() => setShowStripeSecretKey(!showStripeSecretKey)}
                className="absolute right-0 top-0 flex h-full items-center px-3 text-[var(--platform-text-muted)] transition-colors hover:text-[var(--platform-text-secondary)]"
              >
                {showStripeSecretKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Webhook Secret */}
          <div className="space-y-1.5">
            <label htmlFor="st_wh" className="text-xs font-medium text-[var(--platform-text-secondary)]">
              Webhook Secret <span className="text-[var(--platform-text-muted)]">(optional)</span>
            </label>
            <div className="relative">
              <input
                id="st_wh"
                type={showStripeWebhookSecret ? 'text' : 'password'}
                value={stripeWebhookSecret}
                onChange={(e) => setStripeWebhookSecret(e.target.value)}
                placeholder={stripeStatus?.webhook_secret_masked || 'whsec_xxxxxxxxxxxxxxxx'}
                className="w-full rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-2 pr-10 text-sm text-[var(--platform-text-primary)] placeholder:text-[var(--platform-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--platform-accent)]"
              />
              <button
                type="button"
                onClick={() => setShowStripeWebhookSecret(!showStripeWebhookSecret)}
                className="absolute right-0 top-0 flex h-full items-center px-3 text-[var(--platform-text-muted)] transition-colors hover:text-[var(--platform-text-secondary)]"
              >
                {showStripeWebhookSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            <p className="text-[11px] text-[var(--platform-text-muted)]">
              Found in Stripe Dashboard &rarr; Developers &rarr; Webhooks
            </p>
          </div>

          {/* Webhook URL callout */}
          <div className="rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-2.5">
            <p className="text-[11px] text-[var(--platform-text-muted)] mb-1">Webhook URL for Stripe:</p>
            <code className="block text-xs font-mono text-[var(--platform-text-secondary)] overflow-x-auto">
              https://storeforge.site/api/webhooks/stripe
            </code>
            <p className="text-[11px] text-[var(--platform-text-muted)] mt-1.5">
              Subscribe to: checkout.session.completed, checkout.session.expired, charge.refunded
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleStripeSave}
              disabled={stripeSaving || !stripePublishableKey || !stripeSecretKey}
              className="rounded-lg border border-[var(--platform-accent)] bg-[var(--platform-accent)] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[var(--platform-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {stripeSaving ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Verifying...
                </span>
              ) : (
                'Save & Verify'
              )}
            </button>

            {stripeStatus?.configured && !stripeConfirmDelete && (
              <button
                type="button"
                onClick={() => setStripeConfirmDelete(true)}
                className="rounded-lg border border-[var(--platform-border)] px-4 py-2 text-xs font-medium text-red-400 transition-colors hover:border-red-500/30 hover:bg-red-500/10"
              >
                <span className="flex items-center gap-1.5">
                  <Trash2 className="h-3 w-3" />
                  Remove
                </span>
              </button>
            )}

            {stripeConfirmDelete && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2">
                <p className="text-xs text-red-400">
                  Remove Stripe credentials? Your store will use platform credentials.
                </p>
                <button
                  type="button"
                  onClick={handleStripeDelete}
                  disabled={stripeDeleting}
                  className="shrink-0 rounded border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {stripeDeleting ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Removing
                    </span>
                  ) : (
                    'Confirm'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setStripeConfirmDelete(false)}
                  className="shrink-0 rounded border border-[var(--platform-border)] px-3 py-1 text-xs font-medium text-[var(--platform-text-muted)] transition-colors hover:text-[var(--platform-text-secondary)]"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stripe help links */}
        <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] px-5 py-4 space-y-2.5">
          <p className="text-xs font-medium text-[var(--platform-text-secondary)]">Stripe Resources</p>
          <div className="space-y-2">
            <a
              href="https://stripe.com/docs/api"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-[var(--platform-text-muted)] transition-colors hover:text-[var(--platform-accent)]"
            >
              <ExternalLink className="h-3 w-3" />
              API Documentation
            </a>
            <a
              href="https://dashboard.stripe.com/apikeys"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-[var(--platform-text-muted)] transition-colors hover:text-[var(--platform-accent)]"
            >
              <ExternalLink className="h-3 w-3" />
              Dashboard - API Keys
            </a>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* SECURITY NOTE                                                      */}
      {/* ================================================================== */}

      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-5 py-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div>
            <p className="text-xs font-medium text-amber-400">Security Note</p>
            <p className="mt-1 text-xs text-[var(--platform-text-muted)]">
              All secrets are encrypted with AES-256-GCM before storage. We never store or transmit
              these values in plaintext. Credentials are verified against the provider API before being saved.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
