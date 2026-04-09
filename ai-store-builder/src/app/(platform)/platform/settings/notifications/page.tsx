// src/app/(platform)/platform/settings/notifications/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Mail,
  MessageSquare,
  Check,
  Loader2,
  ExternalLink,
  AlertCircle,
  Trash2,
  Bell,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CredentialStatus {
  configured: boolean
  verified: boolean
  verified_at: string | null
  notifications_enabled: boolean
  using_platform_credentials: boolean
}

interface EmailStatus extends CredentialStatus {
  from_email: string | null
  from_name: string | null
  api_key_masked: string | null
}

interface WhatsAppStatus extends CredentialStatus {
  whatsapp_number: string | null
  sender_id: string | null
  auth_key_masked: string | null
}

interface NotificationSettings {
  order_confirmation_email: boolean
  order_confirmation_whatsapp: boolean
  shipping_update_email: boolean
  shipping_update_whatsapp: boolean
  delivery_confirmation_email: boolean
  delivery_confirmation_whatsapp: boolean
  abandoned_cart_email: boolean
  abandoned_cart_whatsapp: boolean
  low_stock_alert_email: boolean
}

// ---------------------------------------------------------------------------
// Toggle Switch
// ---------------------------------------------------------------------------

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (val: boolean) => void
  label?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--platform-accent)]',
        checked ? 'bg-[var(--platform-accent)]' : 'bg-[var(--platform-border)]'
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NotificationsSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'email' | 'whatsapp'>('email')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Email state
  const [emailStatus, setEmailStatus] = useState<EmailStatus | null>(null)
  const [emailCredentials, setEmailCredentials] = useState({
    api_key: '',
    from_email: '',
    from_name: '',
  })
  const [skipEmailValidation, setSkipEmailValidation] = useState(false)

  // WhatsApp state
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus | null>(null)
  const [whatsappCredentials, setWhatsappCredentials] = useState({
    auth_key: '',
    whatsapp_number: '',
    sender_id: '',
  })

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    order_confirmation_email: true,
    order_confirmation_whatsapp: true,
    shipping_update_email: true,
    shipping_update_whatsapp: true,
    delivery_confirmation_email: true,
    delivery_confirmation_whatsapp: true,
    abandoned_cart_email: true,
    abandoned_cart_whatsapp: false,
    low_stock_alert_email: true,
  })

  // ---------------------------------------------------------------------------
  // Toast
  // ---------------------------------------------------------------------------

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message })
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  // ---------------------------------------------------------------------------
  // Fetch settings
  // ---------------------------------------------------------------------------

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      const [emailRes, whatsappRes] = await Promise.all([
        fetch('/api/dashboard/settings/email'),
        fetch('/api/dashboard/settings/whatsapp'),
      ])

      if (emailRes.ok) {
        const data = await emailRes.json()
        setEmailStatus(data.status)
        if (data.notification_settings) {
          setNotificationSettings((prev) => ({ ...prev, ...data.notification_settings }))
        }
      }

      if (whatsappRes.ok) {
        const data = await whatsappRes.json()
        setWhatsappStatus(data.status)
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
      showToast('error', 'Failed to load notification settings')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  // ---------------------------------------------------------------------------
  // Email credentials
  // ---------------------------------------------------------------------------

  const saveEmailCredentials = async () => {
    if (!emailCredentials.api_key || !emailCredentials.from_email) {
      showToast('error', 'API Key and From Email are required')
      return
    }

    try {
      setSaving(true)
      const response = await fetch('/api/dashboard/settings/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...emailCredentials,
          skip_validation: skipEmailValidation,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        showToast('success', 'Email credentials saved successfully')
        setEmailCredentials({ api_key: '', from_email: '', from_name: '' })
        fetchSettings()
      } else {
        showToast('error', data.error || 'Failed to save credentials')
      }
    } catch {
      showToast('error', 'Failed to save credentials')
    } finally {
      setSaving(false)
    }
  }

  const removeEmailCredentials = async () => {
    if (!confirm('Are you sure you want to remove your email credentials? Your store will use platform credentials.')) return

    try {
      const response = await fetch('/api/dashboard/settings/email', { method: 'DELETE' })
      if (response.ok) {
        showToast('success', 'Email credentials removed')
        fetchSettings()
      } else {
        showToast('error', 'Failed to remove credentials')
      }
    } catch {
      showToast('error', 'Failed to remove credentials')
    }
  }

  // ---------------------------------------------------------------------------
  // WhatsApp credentials
  // ---------------------------------------------------------------------------

  const saveWhatsAppCredentials = async () => {
    if (!whatsappCredentials.auth_key || !whatsappCredentials.whatsapp_number) {
      showToast('error', 'Auth Key and WhatsApp Number are required')
      return
    }

    try {
      setSaving(true)
      const response = await fetch('/api/dashboard/settings/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(whatsappCredentials),
      })

      const data = await response.json()

      if (response.ok) {
        showToast('success', 'WhatsApp credentials saved successfully')
        setWhatsappCredentials({ auth_key: '', whatsapp_number: '', sender_id: '' })
        fetchSettings()
      } else {
        showToast('error', data.error || 'Failed to save credentials')
      }
    } catch {
      showToast('error', 'Failed to save credentials')
    } finally {
      setSaving(false)
    }
  }

  const removeWhatsAppCredentials = async () => {
    if (!confirm('Are you sure you want to remove your WhatsApp credentials? Your store will use platform credentials.')) return

    try {
      const response = await fetch('/api/dashboard/settings/whatsapp', { method: 'DELETE' })
      if (response.ok) {
        showToast('success', 'WhatsApp credentials removed')
        fetchSettings()
      } else {
        showToast('error', 'Failed to remove credentials')
      }
    } catch {
      showToast('error', 'Failed to remove credentials')
    }
  }

  // ---------------------------------------------------------------------------
  // Notification preferences
  // ---------------------------------------------------------------------------

  const updateNotificationSetting = async (key: keyof NotificationSettings, value: boolean) => {
    // Optimistic update
    setNotificationSettings((prev) => ({ ...prev, [key]: value }))

    try {
      const isEmailSetting = key.includes('email')
      const endpoint = isEmailSetting ? '/api/dashboard/settings/email' : '/api/dashboard/settings/whatsapp'

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification_settings: { [key]: value },
        }),
      })

      if (!response.ok) {
        setNotificationSettings((prev) => ({ ...prev, [key]: !value }))
        showToast('error', 'Failed to update setting')
      }
    } catch {
      setNotificationSettings((prev) => ({ ...prev, [key]: !value }))
      showToast('error', 'Failed to update setting')
    }
  }

  const toggleNotificationsEnabled = async (type: 'email' | 'whatsapp', enabled: boolean) => {
    try {
      const endpoint = type === 'email' ? '/api/dashboard/settings/email' : '/api/dashboard/settings/whatsapp'

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifications_enabled: enabled }),
      })

      if (response.ok) {
        fetchSettings()
        showToast('success', `${type === 'email' ? 'Email' : 'WhatsApp'} notifications ${enabled ? 'enabled' : 'disabled'}`)
      } else {
        showToast('error', 'Failed to update setting')
      }
    } catch {
      showToast('error', 'Failed to update setting')
    }
  }

  // ---------------------------------------------------------------------------
  // Input class
  // ---------------------------------------------------------------------------

  const inputClass =
    'w-full rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-2 text-sm text-[var(--platform-text-primary)] placeholder:text-[var(--platform-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--platform-accent)]'

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
            Notification Settings
          </h1>
          <p className="text-sm text-[var(--platform-text-secondary)]">
            Loading notification settings...
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
          Notification Settings
        </h1>
        <p className="text-sm text-[var(--platform-text-secondary)]">
          Configure email and WhatsApp notifications for your store
        </p>
      </div>

      {/* Info callout */}
      <div className="flex items-start gap-3 rounded-lg border border-[var(--platform-accent)]/20 bg-[var(--platform-accent)]/5 px-4 py-3">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-[var(--platform-accent)]" />
        <p className="text-xs text-[var(--platform-text-secondary)]">
          Connect your own Resend (email) and MSG91 (WhatsApp) accounts for branded notifications.
          If not configured, your store will use platform credentials.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-0 border-b border-[var(--platform-border)]">
        {(['email', 'whatsapp'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-xs font-medium capitalize transition-colors border-b-2 -mb-px',
              activeTab === tab
                ? 'border-[var(--platform-accent)] text-[var(--platform-text-primary)]'
                : 'border-transparent text-[var(--platform-text-muted)] hover:text-[var(--platform-text-secondary)]'
            )}
          >
            {tab === 'email' ? (
              <>
                <Mail className="h-3.5 w-3.5" />
                Email (Resend)
              </>
            ) : (
              <>
                <MessageSquare className="h-3.5 w-3.5" />
                WhatsApp (MSG91)
              </>
            )}
          </button>
        ))}
      </div>

      {/* ================================================================== */}
      {/* Email Tab                                                          */}
      {/* ================================================================== */}
      {activeTab === 'email' && (
        <div className="space-y-6">
          {/* Credentials card */}
          <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h2 className="text-sm font-medium text-[var(--platform-text-primary)]">
                  Resend Credentials
                </h2>
                <p className="text-xs text-[var(--platform-text-muted)]">
                  Connect your Resend account to send branded emails from your domain
                </p>
              </div>
              {emailStatus?.configured && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                  Connected
                </span>
              )}
            </div>

            {emailStatus?.configured ? (
              <div className="space-y-4">
                {/* Connected info */}
                <div className="rounded-md border border-[var(--platform-border)] bg-[var(--platform-bg)] p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--platform-text-muted)]">From Email</span>
                    <span className="text-xs font-medium text-[var(--platform-text-primary)]">
                      {emailStatus.from_email}
                    </span>
                  </div>
                  {emailStatus.from_name && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[var(--platform-text-muted)]">From Name</span>
                      <span className="text-xs font-medium text-[var(--platform-text-primary)]">
                        {emailStatus.from_name}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--platform-text-muted)]">API Key</span>
                    <span className="font-mono text-xs text-[var(--platform-text-secondary)]">
                      {emailStatus.api_key_masked}
                    </span>
                  </div>
                </div>

                {/* Enable toggle */}
                <div className="flex items-center justify-between rounded-md border border-[var(--platform-border)] bg-[var(--platform-bg)] px-4 py-3">
                  <div>
                    <p className="text-sm text-[var(--platform-text-primary)]">
                      Enable Email Notifications
                    </p>
                    <p className="text-xs text-[var(--platform-text-muted)]">
                      Send transactional emails to customers
                    </p>
                  </div>
                  <Toggle
                    checked={emailStatus.notifications_enabled}
                    onChange={(val) => toggleNotificationsEnabled('email', val)}
                    label="Enable email notifications"
                  />
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={removeEmailCredentials}
                  className="inline-flex items-center gap-2 rounded border border-[var(--platform-border)] px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:border-red-500/30 hover:bg-red-500/10"
                >
                  <Trash2 className="h-3 w-3" />
                  Remove Credentials
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* API Key */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--platform-text-secondary)]">
                    API Key
                  </label>
                  <input
                    type="password"
                    placeholder="re_xxxxxxxxxxxx"
                    value={emailCredentials.api_key}
                    onChange={(e) =>
                      setEmailCredentials((prev) => ({ ...prev, api_key: e.target.value }))
                    }
                    className={inputClass}
                  />
                </div>

                {/* From Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--platform-text-secondary)]">
                    From Email
                  </label>
                  <input
                    type="email"
                    placeholder="orders@yourstore.com"
                    value={emailCredentials.from_email}
                    onChange={(e) =>
                      setEmailCredentials((prev) => ({ ...prev, from_email: e.target.value }))
                    }
                    className={inputClass}
                  />
                  <p className="text-xs text-[var(--platform-text-muted)]">
                    Must be a verified domain in Resend
                  </p>
                </div>

                {/* From Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--platform-text-secondary)]">
                    From Name
                    <span className="ml-1 font-normal text-[var(--platform-text-muted)]">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Your Store Name"
                    value={emailCredentials.from_name}
                    onChange={(e) =>
                      setEmailCredentials((prev) => ({ ...prev, from_name: e.target.value }))
                    }
                    className={inputClass}
                  />
                </div>

                {/* Skip validation toggle */}
                <div className="flex items-center gap-3 border-t border-[var(--platform-border)] pt-4">
                  <Toggle
                    checked={skipEmailValidation}
                    onChange={setSkipEmailValidation}
                    label="Skip validation"
                  />
                  <div>
                    <p className="text-sm text-[var(--platform-text-primary)]">Skip validation</p>
                    <p className="text-xs text-[var(--platform-text-muted)]">
                      Save without verifying credentials
                    </p>
                  </div>
                </div>

                {/* Save button */}
                <button
                  type="button"
                  onClick={saveEmailCredentials}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--platform-accent)] bg-[var(--platform-accent)] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[var(--platform-accent-hover)] disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  Connect Resend
                </button>
              </div>
            )}
          </div>

          {/* Email setup guide */}
          <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-5 space-y-4">
            <h3 className="text-sm font-medium text-[var(--platform-text-primary)]">Setup Guide</h3>
            <ol className="list-decimal list-inside space-y-2 text-xs text-[var(--platform-text-secondary)]">
              <li>
                Go to{' '}
                <a
                  href="https://resend.com/signup"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[var(--platform-accent)] hover:underline"
                >
                  resend.com/signup
                  <ExternalLink className="h-3 w-3" />
                </a>{' '}
                and create an account
              </li>
              <li>
                Add and verify your domain under the <strong className="text-[var(--platform-text-primary)]">Domains</strong> section
              </li>
              <li>
                Create an API key at{' '}
                <a
                  href="https://resend.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[var(--platform-accent)] hover:underline"
                >
                  resend.com/api-keys
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>Copy the API key and enter it above</li>
              <li>Use an email address from your verified domain</li>
            </ol>
            <div className="flex items-start gap-2.5 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-400" />
              <p className="text-xs text-amber-300/90">
                Free tier: 100 emails/day. For higher volume, upgrade your Resend plan.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* WhatsApp Tab                                                       */}
      {/* ================================================================== */}
      {activeTab === 'whatsapp' && (
        <div className="space-y-6">
          {/* Credentials card */}
          <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h2 className="text-sm font-medium text-[var(--platform-text-primary)]">
                  MSG91 Credentials
                </h2>
                <p className="text-xs text-[var(--platform-text-muted)]">
                  Connect your MSG91 account to send WhatsApp notifications
                </p>
              </div>
              {whatsappStatus?.configured && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                  Connected
                </span>
              )}
            </div>

            {whatsappStatus?.configured ? (
              <div className="space-y-4">
                {/* Connected info */}
                <div className="rounded-md border border-[var(--platform-border)] bg-[var(--platform-bg)] p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--platform-text-muted)]">WhatsApp Number</span>
                    <span className="text-xs font-medium text-[var(--platform-text-primary)]">
                      {whatsappStatus.whatsapp_number}
                    </span>
                  </div>
                  {whatsappStatus.sender_id && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[var(--platform-text-muted)]">Sender ID</span>
                      <span className="text-xs font-medium text-[var(--platform-text-primary)]">
                        {whatsappStatus.sender_id}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--platform-text-muted)]">Auth Key</span>
                    <span className="font-mono text-xs text-[var(--platform-text-secondary)]">
                      {whatsappStatus.auth_key_masked}
                    </span>
                  </div>
                </div>

                {/* Enable toggle */}
                <div className="flex items-center justify-between rounded-md border border-[var(--platform-border)] bg-[var(--platform-bg)] px-4 py-3">
                  <div>
                    <p className="text-sm text-[var(--platform-text-primary)]">
                      Enable WhatsApp Notifications
                    </p>
                    <p className="text-xs text-[var(--platform-text-muted)]">
                      Send order updates via WhatsApp
                    </p>
                  </div>
                  <Toggle
                    checked={whatsappStatus.notifications_enabled}
                    onChange={(val) => toggleNotificationsEnabled('whatsapp', val)}
                    label="Enable WhatsApp notifications"
                  />
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={removeWhatsAppCredentials}
                  className="inline-flex items-center gap-2 rounded border border-[var(--platform-border)] px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:border-red-500/30 hover:bg-red-500/10"
                >
                  <Trash2 className="h-3 w-3" />
                  Remove Credentials
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Auth Key */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--platform-text-secondary)]">
                    Auth Key
                  </label>
                  <input
                    type="password"
                    placeholder="Your MSG91 Auth Key"
                    value={whatsappCredentials.auth_key}
                    onChange={(e) =>
                      setWhatsappCredentials((prev) => ({ ...prev, auth_key: e.target.value }))
                    }
                    className={inputClass}
                  />
                </div>

                {/* WhatsApp Number */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--platform-text-secondary)]">
                    WhatsApp Number
                  </label>
                  <input
                    type="text"
                    placeholder="91xxxxxxxxxx"
                    value={whatsappCredentials.whatsapp_number}
                    onChange={(e) =>
                      setWhatsappCredentials((prev) => ({
                        ...prev,
                        whatsapp_number: e.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                  <p className="text-xs text-[var(--platform-text-muted)]">
                    Your MSG91 integrated WhatsApp number
                  </p>
                </div>

                {/* Sender ID */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--platform-text-secondary)]">
                    Sender ID
                    <span className="ml-1 font-normal text-[var(--platform-text-muted)]">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="STOREX"
                    value={whatsappCredentials.sender_id}
                    onChange={(e) =>
                      setWhatsappCredentials((prev) => ({ ...prev, sender_id: e.target.value }))
                    }
                    className={inputClass}
                  />
                </div>

                {/* Save button */}
                <button
                  type="button"
                  onClick={saveWhatsAppCredentials}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--platform-accent)] bg-[var(--platform-accent)] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[var(--platform-accent-hover)] disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  Connect MSG91
                </button>
              </div>
            )}
          </div>

          {/* WhatsApp setup guide */}
          <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-5 space-y-4">
            <h3 className="text-sm font-medium text-[var(--platform-text-primary)]">Setup Guide</h3>
            <ol className="list-decimal list-inside space-y-2 text-xs text-[var(--platform-text-secondary)]">
              <li>
                Go to{' '}
                <a
                  href="https://msg91.com/signup"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[var(--platform-accent)] hover:underline"
                >
                  msg91.com/signup
                  <ExternalLink className="h-3 w-3" />
                </a>{' '}
                and create an account
              </li>
              <li>
                Apply for WhatsApp Business API under the <strong className="text-[var(--platform-text-primary)]">WhatsApp</strong> section
              </li>
              <li>Complete business verification (may take 1-3 days)</li>
              <li>Create message templates and get them approved by WhatsApp</li>
              <li>
                Find your Auth Key at{' '}
                <a
                  href="https://control.msg91.com/app/settings/api-key"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[var(--platform-accent)] hover:underline"
                >
                  control.msg91.com
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>Copy your integrated WhatsApp number from the dashboard</li>
            </ol>
            <div className="flex items-start gap-2.5 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-400" />
              <p className="text-xs text-amber-300/90">
                WhatsApp templates must be pre-approved. Contact MSG91 support if you need custom templates.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* Notification Preferences (always visible)                          */}
      {/* ================================================================== */}
      <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-5 space-y-5">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-[var(--platform-text-secondary)]" />
            <h2 className="text-sm font-medium text-[var(--platform-text-primary)]">
              Notification Preferences
            </h2>
          </div>
          <p className="text-xs text-[var(--platform-text-muted)]">
            Choose which notifications to send via email and WhatsApp
          </p>
        </div>

        {/* Column headers */}
        <div className="flex items-center justify-end gap-6 px-1 pb-1">
          <div className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-[var(--platform-text-muted)]" />
            <span className="text-xs font-medium text-[var(--platform-text-muted)]">Email</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5 text-[var(--platform-text-muted)]" />
            <span className="text-xs font-medium text-[var(--platform-text-muted)]">WhatsApp</span>
          </div>
        </div>

        {/* Notification rows */}
        <div className="divide-y divide-[var(--platform-border)]">
          {[
            {
              key: 'order_confirmation',
              label: 'Order Confirmation',
              description: 'When a new order is placed',
            },
            {
              key: 'shipping_update',
              label: 'Shipping Updates',
              description: 'When order is shipped or out for delivery',
            },
            {
              key: 'delivery_confirmation',
              label: 'Delivery Confirmation',
              description: 'When order is delivered',
            },
            {
              key: 'abandoned_cart',
              label: 'Abandoned Cart',
              description: 'Reminder for abandoned carts',
            },
          ].map(({ key, label, description }) => (
            <div key={key} className="flex items-center justify-between py-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-[var(--platform-text-primary)]">{label}</p>
                <p className="text-xs text-[var(--platform-text-muted)]">{description}</p>
              </div>
              <div className="flex items-center gap-6">
                <Toggle
                  checked={notificationSettings[`${key}_email` as keyof NotificationSettings]}
                  onChange={(val) =>
                    updateNotificationSetting(`${key}_email` as keyof NotificationSettings, val)
                  }
                  label={`${label} email`}
                />
                <Toggle
                  checked={notificationSettings[`${key}_whatsapp` as keyof NotificationSettings]}
                  onChange={(val) =>
                    updateNotificationSetting(
                      `${key}_whatsapp` as keyof NotificationSettings,
                      val
                    )
                  }
                  label={`${label} WhatsApp`}
                />
              </div>
            </div>
          ))}

          {/* Low stock alerts — email only */}
          <div className="flex items-center justify-between py-3.5">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-[var(--platform-text-primary)]">Low Stock Alerts</p>
              <p className="text-xs text-[var(--platform-text-muted)]">
                Alert when products are running low
              </p>
            </div>
            <div className="flex items-center gap-6">
              <Toggle
                checked={notificationSettings.low_stock_alert_email}
                onChange={(val) => updateNotificationSetting('low_stock_alert_email', val)}
                label="Low stock alerts email"
              />
              {/* Spacer to align with the two-column layout above */}
              <div className="w-11" />
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* Toast                                                              */}
      {/* ================================================================== */}
      {toast && (
        <div
          className={cn(
            'fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border px-4 py-2 shadow-lg',
            toast.type === 'success'
              ? 'border-green-500/30 bg-green-500/10 text-green-400'
              : 'border-red-500/30 bg-red-500/10 text-red-400'
          )}
        >
          <p className="font-mono text-xs">{toast.message}</p>
        </div>
      )}
    </div>
  )
}
