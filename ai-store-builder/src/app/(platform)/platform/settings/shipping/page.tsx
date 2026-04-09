// src/app/(platform)/platform/settings/shipping/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Truck,
  Plus,
  Check,
  Loader2,
  Trash2,
  ExternalLink,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProviderInfo {
  name: string
  description: string
  requiredFields: { key: string; label: string; type: 'text' | 'password' }[]
}

interface ConfiguredProvider {
  provider: string
  isActive: boolean
  isDefault: boolean
  pickupLocation?: string
  createdAt: string
  updatedAt: string
  maskedCredentials: Record<string, string>
}

interface ShippingSettings {
  providers: ConfiguredProvider[]
  defaultProvider: string | null
  autoCreateShipment: boolean
  preferredCourierStrategy: 'cheapest' | 'fastest'
  defaultPackageDimensions: {
    length: number
    breadth: number
    height: number
    weight: number
  }
  availableProviders: Record<string, ProviderInfo>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getProviderIcon(provider: string) {
  switch (provider) {
    case 'shiprocket':
      return '🚀'
    case 'delhivery':
      return '📦'
    case 'bluedart':
      return '✈️'
    case 'shippo':
      return '🚢'
    case 'self':
      return '🏠'
    default:
      return '📦'
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ShippingProvidersPage() {
  const [settings, setSettings] = useState<ShippingSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showRemoveDialog, setShowRemoveDialog] = useState<string | null>(null)
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const [credentials, setCredentials] = useState<Record<string, string>>({})
  const [pickupLocation, setPickupLocation] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [skipValidation, setSkipValidation] = useState(false)
  const [validating, setValidating] = useState(false)
  const [activeGuide, setActiveGuide] = useState<string | null>(null)
  const [toast, setToast] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  // Debounce ref for dimension changes
  const [pendingDimensions, setPendingDimensions] = useState<{
    length: number
    breadth: number
    height: number
    weight: number
  } | null>(null)

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(timer)
  }, [toast])

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/dashboard/settings/shipping-providers')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      } else {
        setToast({ type: 'error', message: 'Failed to load shipping settings' })
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
      setToast({ type: 'error', message: 'Failed to load shipping settings' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const handleAddProvider = async () => {
    if (!selectedProvider || !settings) return

    const providerInfo = settings.availableProviders[selectedProvider]
    if (!providerInfo) return

    // Validate required fields
    for (const field of providerInfo.requiredFields) {
      if (!credentials[field.key]) {
        setToast({ type: 'error', message: `${field.label} is required` })
        return
      }
    }

    try {
      setValidating(true)
      const response = await fetch('/api/dashboard/settings/shipping-providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          credentials,
          pickupLocation,
          isDefault,
          validate: !skipValidation,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setToast({
          type: 'success',
          message: data.message || 'Provider connected successfully',
        })
        closeAddDialog()
        fetchSettings()
      } else {
        setToast({
          type: 'error',
          message: data.error || 'Failed to connect provider',
        })
      }
    } catch (error) {
      console.error('Failed to add provider:', error)
      setToast({ type: 'error', message: 'Failed to connect provider' })
    } finally {
      setValidating(false)
    }
  }

  const handleRemoveProvider = async (provider: string) => {
    try {
      const response = await fetch(
        `/api/dashboard/settings/shipping-providers?provider=${provider}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        setToast({ type: 'success', message: 'Provider removed successfully' })
        fetchSettings()
      } else {
        const data = await response.json()
        setToast({
          type: 'error',
          message: data.error || 'Failed to remove provider',
        })
      }
    } catch (error) {
      console.error('Failed to remove provider:', error)
      setToast({ type: 'error', message: 'Failed to remove provider' })
    } finally {
      setShowRemoveDialog(null)
    }
  }

  const handleUpdateSettings = async (updates: Record<string, unknown>) => {
    try {
      setSaving(true)
      const response = await fetch('/api/dashboard/settings/shipping-providers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        setToast({ type: 'success', message: 'Settings updated' })
        fetchSettings()
      } else {
        const data = await response.json()
        setToast({
          type: 'error',
          message: data.error || 'Failed to update settings',
        })
      }
    } catch (error) {
      console.error('Failed to update settings:', error)
      setToast({ type: 'error', message: 'Failed to update settings' })
    } finally {
      setSaving(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Dialog helpers
  // ---------------------------------------------------------------------------

  function closeAddDialog() {
    setShowAddDialog(false)
    setSelectedProvider(null)
    setCredentials({})
    setPickupLocation('')
    setIsDefault(false)
    setSkipValidation(false)
  }

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const unconfiguredProviders = settings
    ? Object.keys(settings.availableProviders).filter(
        (p) => !settings.providers.some((cp) => cp.provider === p)
      )
    : []

  // ---------------------------------------------------------------------------
  // Render: Loading
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--platform-text-muted)]" />
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Toast */}
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

      {/* Header */}
      <div className="space-y-1">
        <Link
          href="/platform/settings"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--platform-text-muted)] transition-colors hover:text-[var(--platform-text-secondary)]"
        >
          <ArrowLeft className="h-3 w-3" />
          Settings
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
              Shipping Providers
            </h1>
            <p className="mt-0.5 text-sm text-[var(--platform-text-secondary)]">
              Connect your shipping accounts for automatic shipment creation
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddDialog(true)}
            disabled={unconfiguredProviders.length === 0}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border border-[var(--platform-accent)] bg-[var(--platform-accent)] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[var(--platform-accent-hover)]',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Provider
          </button>
        </div>
      </div>

      {/* Info callout */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-500/20 bg-blue-500/5 px-5 py-4">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
        <div>
          <p className="text-xs font-medium text-blue-300">Multi-Provider Support</p>
          <p className="mt-0.5 text-xs text-blue-400/80">
            Connect multiple shipping providers and choose the best one for each order.
            You can also handle deliveries yourself without any provider.
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Connected Providers                                                  */}
      {/* ------------------------------------------------------------------- */}
      <div className="space-y-3">
        <div className="space-y-0.5">
          <h2 className="font-mono text-sm font-medium text-[var(--platform-text-primary)]">
            Connected Providers
          </h2>
          <p className="text-xs text-[var(--platform-text-muted)]">
            Your shipping accounts for creating shipments
          </p>
        </div>

        {settings?.providers.length === 0 ? (
          <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-10 text-center">
            <Truck className="mx-auto h-10 w-10 text-[var(--platform-text-muted)]" />
            <p className="mt-3 text-sm font-medium text-[var(--platform-text-secondary)]">
              No providers connected
            </p>
            <p className="mt-1 text-xs text-[var(--platform-text-muted)]">
              Add a shipping provider to enable automatic shipment creation
            </p>
            <button
              type="button"
              onClick={() => setShowAddDialog(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-[var(--platform-accent)] bg-[var(--platform-accent)] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[var(--platform-accent-hover)]"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Provider
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {settings?.providers.map((provider) => (
              <div
                key={provider.provider}
                className={cn(
                  'rounded-lg border bg-[var(--platform-surface)] p-5',
                  provider.isDefault
                    ? 'border-[var(--platform-accent)]/40'
                    : 'border-[var(--platform-border)]'
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-xl leading-none">
                      {getProviderIcon(provider.provider)}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-medium text-[var(--platform-text-primary)]">
                          {settings?.availableProviders[provider.provider]?.name ||
                            provider.provider}
                        </h3>
                        {provider.isDefault && (
                          <span className="rounded-full bg-[var(--platform-accent)]/15 px-2 py-0.5 text-[10px] font-medium text-[var(--platform-accent)]">
                            Default
                          </span>
                        )}
                        {provider.isActive ? (
                          <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-400">
                            Active
                          </span>
                        ) : (
                          <span className="rounded-full bg-[var(--platform-border)] px-2 py-0.5 text-[10px] font-medium text-[var(--platform-text-muted)]">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-[var(--platform-text-muted)]">
                        {settings?.availableProviders[provider.provider]?.description}
                      </p>
                      {provider.pickupLocation && (
                        <p className="mt-0.5 text-xs text-[var(--platform-text-muted)]">
                          Pickup: {provider.pickupLocation}
                        </p>
                      )}
                      {Object.keys(provider.maskedCredentials).length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-3">
                          {Object.entries(provider.maskedCredentials).map(
                            ([key, value]) => (
                              <span
                                key={key}
                                className="font-mono text-[10px] text-[var(--platform-text-muted)]"
                              >
                                {key}: {value}
                              </span>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {!provider.isDefault && (
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateSettings({
                            defaultProvider: provider.provider,
                          })
                        }
                        disabled={saving}
                        className="rounded border border-[var(--platform-border)] px-3 py-1.5 text-xs font-medium text-[var(--platform-text-secondary)] transition-colors hover:border-[var(--platform-accent)]/30 hover:text-[var(--platform-accent)] disabled:opacity-50"
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowRemoveDialog(provider.provider)}
                      className="rounded border border-transparent p-1.5 text-[var(--platform-text-muted)] transition-colors hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Shipping Settings                                                    */}
      {/* ------------------------------------------------------------------- */}
      <div className="space-y-3">
        <div className="space-y-0.5">
          <h2 className="font-mono text-sm font-medium text-[var(--platform-text-primary)]">
            Shipping Settings
          </h2>
          <p className="text-xs text-[var(--platform-text-muted)]">
            Configure how shipments are created for your orders
          </p>
        </div>

        <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-5 space-y-6">
          {/* Auto Create Shipment */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[var(--platform-text-primary)]">
                Auto-create Shipments
              </p>
              <p className="mt-0.5 text-xs text-[var(--platform-text-muted)]">
                Automatically create shipments when orders are placed
              </p>
              {!settings?.providers.length && (
                <p className="mt-1 text-[10px] text-amber-400">
                  Add a shipping provider first to enable this feature
                </p>
              )}
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings?.autoCreateShipment || false}
              onClick={() =>
                handleUpdateSettings({
                  autoCreateShipment: !settings?.autoCreateShipment,
                })
              }
              disabled={saving || !settings?.providers.length}
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                settings?.autoCreateShipment
                  ? 'bg-[var(--platform-accent)]'
                  : 'bg-[var(--platform-border)]'
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
                  settings?.autoCreateShipment
                    ? 'translate-x-5'
                    : 'translate-x-0'
                )}
              />
            </button>
          </div>

          <div className="border-t border-[var(--platform-border)]" />

          {/* Courier Strategy */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--platform-text-primary)]">
              Courier Selection Strategy
            </p>
            <p className="text-xs text-[var(--platform-text-muted)]">
              How to select courier when multiple options are available
            </p>
            <select
              value={settings?.preferredCourierStrategy || 'cheapest'}
              onChange={(e) =>
                handleUpdateSettings({
                  preferredCourierStrategy: e.target.value as
                    | 'cheapest'
                    | 'fastest',
                })
              }
              disabled={saving}
              className="rounded border border-[var(--platform-border)] bg-[var(--platform-surface)] px-2 py-1.5 text-xs text-[var(--platform-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--platform-accent)] disabled:opacity-50"
            >
              <option value="cheapest">Cheapest Rate</option>
              <option value="fastest">Fastest Delivery</option>
            </select>
          </div>

          <div className="border-t border-[var(--platform-border)]" />

          {/* Default Package Dimensions */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-[var(--platform-text-primary)]">
              Default Package Dimensions
            </p>
            <p className="text-xs text-[var(--platform-text-muted)]">
              Used when product dimensions are not specified
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                {
                  key: 'length' as const,
                  label: 'Length (cm)',
                  fallback: 20,
                },
                {
                  key: 'breadth' as const,
                  label: 'Breadth (cm)',
                  fallback: 15,
                },
                {
                  key: 'height' as const,
                  label: 'Height (cm)',
                  fallback: 10,
                },
                {
                  key: 'weight' as const,
                  label: 'Weight (kg)',
                  fallback: 0.5,
                  step: '0.1',
                },
              ].map((dim) => (
                <div key={dim.key} className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-[var(--platform-text-muted)]">
                    {dim.label}
                  </label>
                  <input
                    type="number"
                    step={dim.step || undefined}
                    value={
                      (pendingDimensions || settings?.defaultPackageDimensions)?.[
                        dim.key
                      ] ?? dim.fallback
                    }
                    onChange={(e) => {
                      const val = parseFloat(e.target.value)
                      const updated = {
                        ...(pendingDimensions ||
                          settings?.defaultPackageDimensions || {
                            length: 20,
                            breadth: 15,
                            height: 10,
                            weight: 0.5,
                          }),
                        [dim.key]: val,
                      }
                      setPendingDimensions(updated)
                    }}
                    onBlur={() => {
                      if (pendingDimensions) {
                        handleUpdateSettings({
                          defaultPackageDimensions: pendingDimensions,
                        })
                        setPendingDimensions(null)
                      }
                    }}
                    disabled={saving}
                    className="w-full rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-2 text-sm text-[var(--platform-text-primary)] placeholder:text-[var(--platform-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--platform-accent)] disabled:opacity-50"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Setup Guides                                                         */}
      {/* ------------------------------------------------------------------- */}
      <div className="space-y-3">
        <div className="space-y-0.5">
          <h2 className="font-mono text-sm font-medium text-[var(--platform-text-primary)]">
            Setup Guides
          </h2>
          <p className="text-xs text-[var(--platform-text-muted)]">
            Step-by-step instructions to get credentials for each shipping provider
          </p>
        </div>

        <div className="space-y-2">
          {/* Shiprocket */}
          <SetupGuideItem
            icon="🚀"
            name="Shiprocket"
            badge="Easiest Setup"
            badgeColor="text-green-400 bg-green-500/10"
            isOpen={activeGuide === 'shiprocket'}
            onToggle={() =>
              setActiveGuide(activeGuide === 'shiprocket' ? null : 'shiprocket')
            }
          >
            <p className="text-xs text-[var(--platform-text-muted)]">
              Shiprocket is the easiest to set up -- just use your login credentials.
            </p>
            <div className="mt-3 rounded-lg border border-[var(--platform-border)] bg-[var(--platform-bg)] p-4 space-y-2">
              <p className="text-xs font-medium text-[var(--platform-text-primary)]">
                Steps:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-xs text-[var(--platform-text-secondary)]">
                <li>
                  Go to{' '}
                  <a
                    href="https://app.shiprocket.in/register"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-400 hover:underline"
                  >
                    app.shiprocket.in/register
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>{' '}
                  and create an account
                </li>
                <li>Complete phone/email verification</li>
                <li>
                  Add your pickup address in Shiprocket dashboard under{' '}
                  <strong className="text-[var(--platform-text-primary)]">
                    Settings &rarr; Pickup Address
                  </strong>
                </li>
                <li>
                  Come back here and enter your{' '}
                  <strong className="text-[var(--platform-text-primary)]">
                    Shiprocket login email
                  </strong>{' '}
                  and{' '}
                  <strong className="text-[var(--platform-text-primary)]">
                    password
                  </strong>
                </li>
                <li>
                  Enter the pickup location name exactly as you created it in
                  Shiprocket
                </li>
              </ol>
            </div>
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
              <p className="text-[11px] text-amber-400/90">
                Use the same email and password you use to login to Shiprocket. No
                API key required.
              </p>
            </div>
          </SetupGuideItem>

          {/* Delhivery */}
          <SetupGuideItem
            icon="📦"
            name="Delhivery"
            badge="Requires Approval"
            badgeColor="text-blue-400 bg-blue-500/10"
            isOpen={activeGuide === 'delhivery'}
            onToggle={() =>
              setActiveGuide(activeGuide === 'delhivery' ? null : 'delhivery')
            }
          >
            <p className="text-xs text-[var(--platform-text-muted)]">
              Delhivery requires you to apply for a business account and get
              approved for API access.
            </p>
            <div className="mt-3 rounded-lg border border-[var(--platform-border)] bg-[var(--platform-bg)] p-4 space-y-2">
              <p className="text-xs font-medium text-[var(--platform-text-primary)]">
                Steps:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-xs text-[var(--platform-text-secondary)]">
                <li>
                  Go to{' '}
                  <a
                    href="https://www.delhivery.com/seller-signup"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-400 hover:underline"
                  >
                    delhivery.com/seller-signup
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>{' '}
                  and register as a seller
                </li>
                <li>Complete KYC verification (PAN, GST, bank details)</li>
                <li>Wait for account approval (usually 2-3 business days)</li>
                <li>
                  Once approved, login to{' '}
                  <a
                    href="https://track.delhivery.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-400 hover:underline"
                  >
                    track.delhivery.com
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </li>
                <li>
                  Go to{' '}
                  <strong className="text-[var(--platform-text-primary)]">
                    Settings &rarr; API Setup
                  </strong>{' '}
                  or contact support to get your API Token
                </li>
                <li>
                  Copy your{' '}
                  <strong className="text-[var(--platform-text-primary)]">
                    Client Name
                  </strong>{' '}
                  from the dashboard
                </li>
                <li>Come back here and enter your API Token and Client Name</li>
              </ol>
            </div>
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-400" />
              <p className="text-[11px] text-blue-400/90">
                If you can&apos;t find API settings, email{' '}
                <strong>support@delhivery.com</strong> or call{' '}
                <strong>011-4891-1111</strong> and request API access.
              </p>
            </div>
          </SetupGuideItem>

          {/* Blue Dart */}
          <SetupGuideItem
            icon="✈️"
            name="Blue Dart"
            badge="Enterprise"
            badgeColor="text-purple-400 bg-purple-500/10"
            isOpen={activeGuide === 'bluedart'}
            onToggle={() =>
              setActiveGuide(activeGuide === 'bluedart' ? null : 'bluedart')
            }
          >
            <p className="text-xs text-[var(--platform-text-muted)]">
              Blue Dart provides API access for business accounts with regular
              shipping volume.
            </p>
            <div className="mt-3 rounded-lg border border-[var(--platform-border)] bg-[var(--platform-bg)] p-4 space-y-2">
              <p className="text-xs font-medium text-[var(--platform-text-primary)]">
                Steps:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-xs text-[var(--platform-text-secondary)]">
                <li>
                  Visit{' '}
                  <a
                    href="https://www.bluedart.com/customer-service-contact-us"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-400 hover:underline"
                  >
                    bluedart.com/contact-us
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>{' '}
                  and fill the inquiry form
                </li>
                <li>
                  Select &quot;I want to ship with Blue Dart&quot; as inquiry type
                </li>
                <li>
                  A sales representative will contact you within 24-48 hours
                </li>
                <li>
                  After signing the service agreement, request API access
                </li>
                <li>
                  Blue Dart will provide:{' '}
                  <strong className="text-[var(--platform-text-primary)]">
                    API Key
                  </strong>
                  ,{' '}
                  <strong className="text-[var(--platform-text-primary)]">
                    Client Code
                  </strong>
                  ,{' '}
                  <strong className="text-[var(--platform-text-primary)]">
                    License Key
                  </strong>
                  , and{' '}
                  <strong className="text-[var(--platform-text-primary)]">
                    Login ID
                  </strong>
                </li>
                <li>Come back here and enter all four credentials</li>
              </ol>
            </div>
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-purple-400" />
              <p className="text-[11px] text-purple-400/90">
                You can also call Blue Dart at{' '}
                <strong>1860-233-1234</strong> for faster onboarding. Mention you
                need NetConnect API access.
              </p>
            </div>
          </SetupGuideItem>

          {/* Shippo */}
          <SetupGuideItem
            icon="🚢"
            name="Shippo"
            badge="US Shipping"
            badgeColor="text-indigo-400 bg-indigo-500/10"
            isOpen={activeGuide === 'shippo'}
            onToggle={() =>
              setActiveGuide(activeGuide === 'shippo' ? null : 'shippo')
            }
          >
            <p className="text-xs text-[var(--platform-text-muted)]">
              Shippo connects you to USPS, UPS, FedEx, and DHL with a single API
              token. Best for US-based stores.
            </p>
            <div className="mt-3 rounded-lg border border-[var(--platform-border)] bg-[var(--platform-bg)] p-4 space-y-2">
              <p className="text-xs font-medium text-[var(--platform-text-primary)]">
                Steps:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-xs text-[var(--platform-text-secondary)]">
                <li>
                  Go to{' '}
                  <a
                    href="https://apps.goshippo.com/register"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-400 hover:underline"
                  >
                    apps.goshippo.com/register
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>{' '}
                  and create a free account
                </li>
                <li>Verify your email address</li>
                <li>
                  Add your{' '}
                  <strong className="text-[var(--platform-text-primary)]">
                    warehouse / pickup address
                  </strong>{' '}
                  in Shippo under{' '}
                  <strong className="text-[var(--platform-text-primary)]">
                    Settings &rarr; Addresses
                  </strong>
                </li>
                <li>
                  Go to{' '}
                  <a
                    href="https://apps.goshippo.com/settings/api"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-400 hover:underline"
                  >
                    Settings &rarr; API
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>{' '}
                  and copy your{' '}
                  <strong className="text-[var(--platform-text-primary)]">
                    Live API Token
                  </strong>{' '}
                  (starts with{' '}
                  <code className="rounded bg-[var(--platform-bg)] px-1 text-[var(--platform-text-secondary)]">
                    shippo_live_
                  </code>
                  )
                </li>
                <li>Come back here and paste the API Token</li>
                <li>
                  (Optional) Connect your own USPS, UPS, or FedEx carrier accounts
                  in Shippo for negotiated rates
                </li>
              </ol>
            </div>
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-400" />
              <p className="text-[11px] text-indigo-400/90">
                Shippo offers free USPS rates out of the box. For UPS/FedEx
                discounted rates, connect your carrier accounts in the{' '}
                <a
                  href="https://apps.goshippo.com/settings/carriers"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Shippo Carriers settings
                </a>
                . For testing, use a token starting with{' '}
                <code className="rounded bg-[var(--platform-bg)] px-1">
                  shippo_test_
                </code>
                .
              </p>
            </div>
          </SetupGuideItem>

          {/* Self Delivery */}
          <SetupGuideItem
            icon="🏠"
            name="Self Delivery"
            badge="No Setup Required"
            badgeColor="text-[var(--platform-text-muted)] bg-[var(--platform-border)]"
            isOpen={activeGuide === 'self'}
            onToggle={() =>
              setActiveGuide(activeGuide === 'self' ? null : 'self')
            }
          >
            <p className="text-xs text-[var(--platform-text-muted)]">
              Handle deliveries yourself without any shipping provider. Perfect for
              local deliveries, in-store pickup, or if you have your own delivery
              staff.
            </p>
            <p className="mt-2 text-xs text-[var(--platform-text-muted)]">
              Just select &quot;Self Delivery&quot; when adding a provider -- no
              credentials needed.
            </p>
          </SetupGuideItem>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Add Provider Dialog                                                  */}
      {/* ------------------------------------------------------------------- */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-6 shadow-xl">
            {/* Header */}
            <div className="mb-5">
              <h3 className="font-mono text-sm font-semibold text-[var(--platform-text-primary)]">
                Add Shipping Provider
              </h3>
              <p className="mt-0.5 text-xs text-[var(--platform-text-muted)]">
                Connect a shipping provider to enable automatic shipment creation
              </p>
            </div>

            <div className="space-y-4">
              {/* Provider Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--platform-text-secondary)]">
                  Select Provider
                </label>
                <select
                  value={selectedProvider || ''}
                  onChange={(e) => {
                    setSelectedProvider(e.target.value || null)
                    setCredentials({})
                    setPickupLocation('')
                  }}
                  className="w-full rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-2 text-sm text-[var(--platform-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--platform-accent)]"
                >
                  <option value="">Choose a provider</option>
                  {unconfiguredProviders.map((provider) => (
                    <option key={provider} value={provider}>
                      {getProviderIcon(provider)}{' '}
                      {settings?.availableProviders[provider]?.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Credential Fields */}
              {selectedProvider &&
                settings?.availableProviders[selectedProvider] && (
                  <>
                    {settings.availableProviders[
                      selectedProvider
                    ].requiredFields.map((field) => (
                      <div key={field.key} className="space-y-1.5">
                        <label className="text-xs font-medium text-[var(--platform-text-secondary)]">
                          {field.label}
                        </label>
                        <input
                          type={field.type}
                          value={credentials[field.key] || ''}
                          onChange={(e) =>
                            setCredentials({
                              ...credentials,
                              [field.key]: e.target.value,
                            })
                          }
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                          className="w-full rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-2 text-sm text-[var(--platform-text-primary)] placeholder:text-[var(--platform-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--platform-accent)]"
                        />
                      </div>
                    ))}

                    {/* Pickup Location */}
                    {selectedProvider !== 'self' && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[var(--platform-text-secondary)]">
                          Pickup Location Name
                        </label>
                        <input
                          type="text"
                          value={pickupLocation}
                          onChange={(e) => setPickupLocation(e.target.value)}
                          placeholder="Primary"
                          className="w-full rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-2 text-sm text-[var(--platform-text-primary)] placeholder:text-[var(--platform-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--platform-accent)]"
                        />
                        <p className="text-[10px] text-[var(--platform-text-muted)]">
                          Name of your pickup location as configured in{' '}
                          {
                            settings.availableProviders[selectedProvider]
                              .name
                          }
                        </p>
                      </div>
                    )}

                    {/* Set as Default */}
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isDefault}
                        onClick={() => setIsDefault(!isDefault)}
                        className={cn(
                          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                          isDefault
                            ? 'bg-[var(--platform-accent)]'
                            : 'bg-[var(--platform-border)]'
                        )}
                      >
                        <span
                          className={cn(
                            'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
                            isDefault ? 'translate-x-5' : 'translate-x-0'
                          )}
                        />
                      </button>
                      <span className="text-xs text-[var(--platform-text-secondary)]">
                        Set as default provider
                      </span>
                    </div>

                    {/* Skip Validation */}
                    <div className="border-t border-[var(--platform-border)] pt-4">
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={skipValidation}
                          onClick={() => setSkipValidation(!skipValidation)}
                          className={cn(
                            'relative mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                            skipValidation
                              ? 'bg-[var(--platform-accent)]'
                              : 'bg-[var(--platform-border)]'
                          )}
                        >
                          <span
                            className={cn(
                              'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
                              skipValidation
                                ? 'translate-x-5'
                                : 'translate-x-0'
                            )}
                          />
                        </button>
                        <div>
                          <span className="text-xs text-[var(--platform-text-secondary)]">
                            Skip credential validation
                          </span>
                          <p className="mt-0.5 text-[10px] text-[var(--platform-text-muted)]">
                            Save without testing the connection (useful if API
                            is temporarily unavailable)
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
            </div>

            {/* Footer */}
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeAddDialog}
                className="rounded-lg border border-[var(--platform-border)] px-4 py-2 text-xs font-medium text-[var(--platform-text-secondary)] transition-colors hover:bg-[var(--platform-surface-hover)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddProvider}
                disabled={!selectedProvider || validating}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg border border-[var(--platform-accent)] bg-[var(--platform-accent)] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[var(--platform-accent-hover)]',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              >
                {validating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Connect
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* Remove Provider Confirmation Dialog                                  */}
      {/* ------------------------------------------------------------------- */}
      {showRemoveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-6 shadow-xl">
            <h3 className="font-mono text-sm font-semibold text-[var(--platform-text-primary)]">
              Remove Provider?
            </h3>
            <p className="mt-2 text-xs text-[var(--platform-text-muted)]">
              Are you sure you want to remove{' '}
              <strong className="text-[var(--platform-text-secondary)]">
                {settings?.availableProviders[showRemoveDialog]?.name ||
                  showRemoveDialog}
              </strong>
              ? This will delete the stored credentials and disable automatic
              shipment creation for this provider.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRemoveDialog(null)}
                className="rounded-lg border border-[var(--platform-border)] px-4 py-2 text-xs font-medium text-[var(--platform-text-secondary)] transition-colors hover:bg-[var(--platform-surface-hover)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRemoveProvider(showRemoveDialog)}
                className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Setup Guide Accordion Item
// ---------------------------------------------------------------------------

function SetupGuideItem({
  icon,
  name,
  badge,
  badgeColor,
  isOpen,
  onToggle,
  children,
}: {
  icon: string
  name: string
  badge: string
  badgeColor: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-[var(--platform-surface-hover)]"
      >
        <span className="text-lg leading-none">{icon}</span>
        <span className="text-sm font-medium text-[var(--platform-text-primary)]">
          {name}
        </span>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-medium',
            badgeColor
          )}
        >
          {badge}
        </span>
        <svg
          className={cn(
            'ml-auto h-4 w-4 shrink-0 text-[var(--platform-text-muted)] transition-transform',
            isOpen && 'rotate-180'
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="border-t border-[var(--platform-border)] px-5 py-4">
          {children}
        </div>
      )}
    </div>
  )
}
