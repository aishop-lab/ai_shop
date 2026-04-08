'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  ArrowRight,
  Store,
  Palette,
  Truck,
  CreditCard,
  Save,
  Loader2,
  ExternalLink,
  FileText,
  Database,
  Shield,
  AlertTriangle,
  Globe,
  Import,
} from 'lucide-react'
import { LogoEditor } from '@/components/dashboard/logo-editor'
import { ColorAccessibilityChecker } from '@/components/ui/color-accessibility-checker'
import { RebuildStoreDialog } from '@/components/dashboard/rebuild-store-dialog'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRESET_COLORS = [
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Blue', value: '#3b82f6' },
] as const

const CURRENCIES = [
  { value: 'INR', label: 'Indian Rupee (\u20b9)' },
  { value: 'USD', label: 'US Dollar ($)' },
  { value: 'EUR', label: 'Euro (\u20ac)' },
  { value: 'GBP', label: 'British Pound (\u00a3)' },
  { value: 'AED', label: 'UAE Dirham (AED)' },
  { value: 'SGD', label: 'Singapore Dollar (S$)' },
  { value: 'AUD', label: 'Australian Dollar (A$)' },
  { value: 'CAD', label: 'Canadian Dollar (C$)' },
]

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StoreSettings {
  id: string
  name: string
  slug: string
  description: string | null
  tagline: string | null
  logo_url: string | null
  contact_email: string | null
  contact_phone: string | null
  whatsapp_number: string | null
  instagram_handle: string | null
  brand_colors: {
    primary: string
    secondary: string
  }
  settings: {
    checkout?: {
      guest_checkout_enabled?: boolean
      phone_required?: boolean
    }
    shipping?: {
      free_shipping_threshold?: number
      flat_rate_national?: number
      cod_enabled?: boolean
      cod_fee?: number
    }
    payments?: {
      razorpay_enabled?: boolean
      stripe_enabled?: boolean
      upi_enabled?: boolean
    }
    ai_logo_generations?: number
  }
  status: string
  blueprint?: {
    business_category?: string[]
    brand_vibe?: string
    location?: {
      currency?: string
      target_geography?: string
    }
  }
}

// ---------------------------------------------------------------------------
// Shared style constants
// ---------------------------------------------------------------------------

const inputCls =
  'w-full rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-2 text-sm text-[var(--platform-text-primary)] placeholder:text-[var(--platform-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--platform-accent)]'

const selectCls =
  'rounded border border-[var(--platform-border)] bg-[var(--platform-surface)] px-3 py-2 text-sm text-[var(--platform-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--platform-accent)]'

const labelCls = 'text-xs font-medium text-[var(--platform-text-secondary)]'

const helperCls = 'text-[10px] text-[var(--platform-text-muted)] mt-1'

const sectionCls =
  'rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-5 space-y-4'

const sectionTitleCls =
  'text-sm font-medium text-[var(--platform-text-primary)] flex items-center gap-2'

// ---------------------------------------------------------------------------
// Toggle Component
// ---------------------------------------------------------------------------

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
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
// Toast Component
// ---------------------------------------------------------------------------

function Toast({
  message,
  type,
  onClose,
}: {
  message: string
  type: 'success' | 'error' | 'info'
  onClose: () => void
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])

  const colors = {
    success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
    error: 'border-red-500/40 bg-red-500/10 text-red-400',
    info: 'border-blue-500/40 bg-blue-500/10 text-blue-400',
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
// Page Component
// ---------------------------------------------------------------------------

export default function StoreSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [store, setStore] = useState<StoreSettings | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  // Currency confirmation dialog
  const [showCurrencyDialog, setShowCurrencyDialog] = useState(false)
  const [pendingCurrency, setPendingCurrency] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    tagline: '',
    description: '',
    contact_email: '',
    contact_phone: '',
    whatsapp_number: '',
    instagram_handle: '',
    primary_color: '#3B82F6',
    currency: 'INR',
    free_shipping_threshold: 999,
    flat_rate_national: 49,
    cod_enabled: true,
    cod_fee: 20,
    guest_checkout_enabled: true,
    phone_required: true,
  })

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      setToast({ message, type })
    },
    []
  )

  const clearToast = useCallback(() => setToast(null), [])

  // Fetch store data
  useEffect(() => {
    async function fetchStore() {
      try {
        const response = await fetch('/api/dashboard/settings')
        if (response.ok) {
          const data = await response.json()
          if (data.store) {
            setStore(data.store)
            setFormData({
              name: data.store.name || '',
              tagline: data.store.tagline || '',
              description: data.store.description || '',
              contact_email: data.store.contact_email || '',
              contact_phone: data.store.contact_phone || '',
              whatsapp_number: data.store.whatsapp_number || '',
              instagram_handle: data.store.instagram_handle || '',
              primary_color: data.store.brand_colors?.primary || '#3B82F6',
              currency: data.store.blueprint?.location?.currency || 'INR',
              free_shipping_threshold: data.store.settings?.shipping?.free_shipping_threshold || 999,
              flat_rate_national: data.store.settings?.shipping?.flat_rate_national || 49,
              cod_enabled: data.store.settings?.shipping?.cod_enabled ?? true,
              cod_fee: data.store.settings?.shipping?.cod_fee || 20,
              guest_checkout_enabled: data.store.settings?.checkout?.guest_checkout_enabled ?? true,
              phone_required: data.store.settings?.checkout?.phone_required ?? true,
            })
          }
        }
      } catch (error) {
        console.error('Failed to fetch store:', error)
        showToast('Failed to load settings', 'error')
      } finally {
        setLoading(false)
      }
    }
    fetchStore()
  }, [showToast])

  // Save handler
  const handleSave = async () => {
    if (!store) return
    setSaving(true)

    try {
      const response = await fetch('/api/dashboard/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          tagline: formData.tagline,
          description: formData.description,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone,
          whatsapp_number: formData.whatsapp_number,
          instagram_handle: formData.instagram_handle,
          logo_url: store.logo_url,
          currency: formData.currency,
          brand_colors: {
            primary: formData.primary_color,
            secondary: store.brand_colors?.secondary || '#6B7280',
          },
          settings: {
            ...store.settings,
            checkout: {
              guest_checkout_enabled: formData.guest_checkout_enabled,
              phone_required: formData.phone_required,
            },
            shipping: {
              free_shipping_threshold: formData.free_shipping_threshold,
              flat_rate_national: formData.flat_rate_national,
              cod_enabled: formData.cod_enabled,
              cod_fee: formData.cod_fee,
            },
          },
        }),
      })

      if (response.ok) {
        showToast('Settings saved successfully', 'success')
      } else {
        const data = await response.json()
        showToast(data.error || 'Failed to save settings', 'error')
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      showToast('Failed to save settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Currency change with confirmation
  const handleCurrencyChange = (newCurrency: string) => {
    if (newCurrency !== formData.currency) {
      setPendingCurrency(newCurrency)
      setShowCurrencyDialog(true)
    }
  }

  const confirmCurrencyChange = () => {
    if (pendingCurrency) {
      setFormData((prev) => ({ ...prev, currency: pendingCurrency }))
    }
    setShowCurrencyDialog(false)
    setPendingCurrency(null)
  }

  const cancelCurrencyChange = () => {
    setShowCurrencyDialog(false)
    setPendingCurrency(null)
  }

  // -----------------------------------------------------------------------
  // Loading State
  // -----------------------------------------------------------------------
  if (loading) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--platform-text-muted)]" />
        </div>
      </div>
    )
  }

  // -----------------------------------------------------------------------
  // No Store State
  // -----------------------------------------------------------------------
  if (!store) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Store className="h-10 w-10 text-[var(--platform-text-muted)] mb-4" />
          <h2 className="text-sm font-medium text-[var(--platform-text-primary)] mb-1">No Store Found</h2>
          <p className="text-xs text-[var(--platform-text-muted)] mb-4">
            Create a store first to access settings.
          </p>
          <Link
            href="/onboarding"
            className="rounded bg-[var(--platform-accent)] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[var(--platform-accent-hover)]"
          >
            Create Store
          </Link>
        </div>
      </div>
    )
  }

  // -----------------------------------------------------------------------
  // Main Render
  // -----------------------------------------------------------------------
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <Link
          href="/platform/settings"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--platform-text-muted)] transition-colors hover:text-[var(--platform-text-secondary)]"
        >
          <ArrowLeft className="h-3 w-3" /> Settings
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
              Store Settings
            </h1>
            <p className="text-sm text-[var(--platform-text-secondary)]">
              Manage your store configuration and branding
            </p>
          </div>
          <Link
            href={`/${store.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded border border-[var(--platform-border)] bg-[var(--platform-surface)] px-3 py-1.5 text-xs font-medium text-[var(--platform-text-secondary)] transition-colors hover:border-[var(--platform-border-hover)] hover:text-[var(--platform-text-primary)]"
          >
            View Store
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Store Information */}
      {/* ----------------------------------------------------------------- */}
      <div className={sectionCls}>
        <h2 className={sectionTitleCls}>
          <Store className="h-4 w-4 text-[var(--platform-text-muted)]" />
          Store Information
        </h2>

        <div className="space-y-1.5">
          <label htmlFor="name" className={labelCls}>Store Name</label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
            placeholder="My Store"
            className={inputCls}
          />
          <p className={helperCls}>Your store&apos;s display name</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="tagline" className={labelCls}>Tagline</label>
          <input
            id="tagline"
            type="text"
            value={formData.tagline}
            onChange={(e) => setFormData((p) => ({ ...p, tagline: e.target.value }))}
            placeholder="Your store tagline"
            className={inputCls}
          />
          <p className={helperCls}>A short phrase shown on your store homepage</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="description" className={labelCls}>Description</label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
            placeholder="Describe your store..."
            rows={3}
            className={cn(inputCls, 'resize-none')}
          />
          <p className={helperCls}>Used for SEO and your store&apos;s about section</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="contact_email" className={labelCls}>Contact Email</label>
            <input
              id="contact_email"
              type="email"
              value={formData.contact_email}
              onChange={(e) => setFormData((p) => ({ ...p, contact_email: e.target.value }))}
              placeholder="contact@store.com"
              className={inputCls}
            />
            <p className={helperCls}>Customer inquiries will be sent here</p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="contact_phone" className={labelCls}>Contact Phone</label>
            <input
              id="contact_phone"
              type="text"
              value={formData.contact_phone}
              onChange={(e) => setFormData((p) => ({ ...p, contact_phone: e.target.value }))}
              placeholder="+91 98765 43210"
              className={inputCls}
            />
            <p className={helperCls}>Shown on your store for customer support</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="whatsapp" className={labelCls}>WhatsApp</label>
            <input
              id="whatsapp"
              type="text"
              value={formData.whatsapp_number}
              onChange={(e) => setFormData((p) => ({ ...p, whatsapp_number: e.target.value }))}
              placeholder="+91 98765 43210"
              className={inputCls}
            />
            <p className={helperCls}>Adds a WhatsApp chat button to your store</p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="instagram" className={labelCls}>Instagram</label>
            <input
              id="instagram"
              type="text"
              value={formData.instagram_handle}
              onChange={(e) => setFormData((p) => ({ ...p, instagram_handle: e.target.value }))}
              placeholder="@yourstore"
              className={inputCls}
            />
            <p className={helperCls}>Links to your Instagram profile</p>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Currency */}
      {/* ----------------------------------------------------------------- */}
      <div className={sectionCls}>
        <h2 className={sectionTitleCls}>
          <Globe className="h-4 w-4 text-[var(--platform-text-muted)]" />
          Currency
        </h2>

        <div className="space-y-1.5">
          <label htmlFor="currency" className={labelCls}>Display Currency</label>
          <select
            id="currency"
            value={formData.currency}
            onChange={(e) => handleCurrencyChange(e.target.value)}
            className={cn(selectCls, 'w-full')}
          >
            {CURRENCIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <p className={helperCls}>
            Currency displayed for product prices. Affects how prices appear on your store.
          </p>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Branding */}
      {/* ----------------------------------------------------------------- */}
      <div className={sectionCls}>
        <h2 className={sectionTitleCls}>
          <Palette className="h-4 w-4 text-[var(--platform-text-muted)]" />
          Branding
        </h2>

        {/* Primary Color */}
        <div className="space-y-3">
          <label className={labelCls}>Primary Color</label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => setFormData((p) => ({ ...p, primary_color: color.value }))}
                aria-label={color.name}
                aria-pressed={formData.primary_color === color.value}
                title={color.name}
                className={cn(
                  'h-8 w-8 rounded-full border-2 transition-transform hover:scale-110',
                  formData.primary_color === color.value
                    ? 'border-[var(--platform-text-primary)] scale-110'
                    : 'border-transparent'
                )}
                style={{ backgroundColor: color.value }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div
              className="h-8 w-8 shrink-0 cursor-pointer rounded-full border-2 border-[var(--platform-border)]"
              style={{ backgroundColor: formData.primary_color }}
              onClick={() => document.getElementById('color-picker')?.click()}
            />
            <input
              id="color-picker"
              type="color"
              value={formData.primary_color}
              onChange={(e) => setFormData((p) => ({ ...p, primary_color: e.target.value }))}
              className="h-8 w-14 cursor-pointer rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] p-0.5"
            />
            <input
              type="text"
              value={formData.primary_color}
              onChange={(e) => setFormData((p) => ({ ...p, primary_color: e.target.value }))}
              placeholder="#3B82F6"
              className={cn(inputCls, 'flex-1')}
            />
          </div>
          <p className={helperCls}>Pick a preset or enter a custom hex color</p>
          <ColorAccessibilityChecker primaryColor={formData.primary_color} className="mt-1" />
        </div>

        {/* Logo */}
        <div className="space-y-2 pt-2 border-t border-[var(--platform-border)]">
          <label className={labelCls}>Store Logo</label>
          <LogoEditor
            currentLogoUrl={store.logo_url}
            storeId={store.id}
            businessName={store.name}
            businessCategory={store.blueprint?.business_category?.[0]}
            description={store.description || undefined}
            brandVibe={store.blueprint?.brand_vibe}
            onLogoChange={(url) => {
              setStore((prev) => prev ? { ...prev, logo_url: url } : prev)
              showToast('Logo updated successfully', 'success')
            }}
            onColorSuggestion={(colors) => {
              setFormData((p) => ({ ...p, primary_color: colors.suggested_primary }))
              showToast('Brand color updated from logo', 'info')
            }}
          />
        </div>

        {/* Store URL (read-only) */}
        <div className="space-y-1.5 pt-2 border-t border-[var(--platform-border)]">
          <label className={cn(labelCls, 'text-[var(--platform-text-muted)]')}>
            Store URL (cannot be changed)
          </label>
          <input
            type="text"
            value={`${store.slug}.storeforge.site`}
            readOnly
            className={cn(inputCls, 'cursor-not-allowed opacity-60')}
          />
          <p className={helperCls}>
            Your store is accessible at this URL. Use Custom Domain settings to add your own domain.
          </p>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Shipping */}
      {/* ----------------------------------------------------------------- */}
      <div className={sectionCls}>
        <h2 className={sectionTitleCls}>
          <Truck className="h-4 w-4 text-[var(--platform-text-muted)]" />
          Shipping
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="free_shipping" className={labelCls}>Free Shipping Threshold</label>
            <input
              id="free_shipping"
              type="number"
              value={formData.free_shipping_threshold}
              onChange={(e) => setFormData((p) => ({ ...p, free_shipping_threshold: parseInt(e.target.value) || 0 }))}
              className={inputCls}
            />
            <p className={helperCls}>Orders above this amount qualify for free shipping. Set to 0 to disable.</p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="flat_rate" className={labelCls}>Flat Rate Shipping</label>
            <input
              id="flat_rate"
              type="number"
              value={formData.flat_rate_national}
              onChange={(e) => setFormData((p) => ({ ...p, flat_rate_national: parseInt(e.target.value) || 0 }))}
              className={inputCls}
            />
            <p className={helperCls}>Standard shipping cost for orders below the free shipping threshold</p>
          </div>
        </div>

        {/* COD Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-[var(--platform-text-primary)]">Cash on Delivery</p>
            <p className="text-[10px] text-[var(--platform-text-muted)]">Allow customers to pay on delivery</p>
          </div>
          <Toggle
            checked={formData.cod_enabled}
            onChange={(v) => setFormData((p) => ({ ...p, cod_enabled: v }))}
            label="Cash on Delivery"
          />
        </div>

        {formData.cod_enabled && (
          <div className="space-y-1.5">
            <label htmlFor="cod_fee" className={labelCls}>COD Fee</label>
            <input
              id="cod_fee"
              type="number"
              value={formData.cod_fee}
              onChange={(e) => setFormData((p) => ({ ...p, cod_fee: parseInt(e.target.value) || 0 }))}
              className={inputCls}
            />
            <p className={helperCls}>Additional fee charged for cash on delivery orders</p>
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Checkout */}
      {/* ----------------------------------------------------------------- */}
      <div className={sectionCls}>
        <h2 className={sectionTitleCls}>
          <CreditCard className="h-4 w-4 text-[var(--platform-text-muted)]" />
          Checkout
        </h2>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-[var(--platform-text-primary)]">Guest Checkout</p>
            <p className="text-[10px] text-[var(--platform-text-muted)]">Allow checkout without account</p>
          </div>
          <Toggle
            checked={formData.guest_checkout_enabled}
            onChange={(v) => setFormData((p) => ({ ...p, guest_checkout_enabled: v }))}
            label="Guest Checkout"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-[var(--platform-text-primary)]">Require Phone Number</p>
            <p className="text-[10px] text-[var(--platform-text-muted)]">Phone required for orders</p>
          </div>
          <Toggle
            checked={formData.phone_required}
            onChange={(v) => setFormData((p) => ({ ...p, phone_required: v }))}
            label="Require Phone Number"
          />
        </div>

        {/* Payment status */}
        <div className="pt-3 border-t border-[var(--platform-border)] space-y-2">
          <p className="text-xs font-medium text-[var(--platform-text-primary)]">Payment Methods</p>
          <div className="space-y-1.5">
            <p className="flex items-center gap-2 text-[10px] text-[var(--platform-text-muted)]">
              <span className={cn('h-1.5 w-1.5 rounded-full', store.settings?.payments?.razorpay_enabled ? 'bg-emerald-500' : 'bg-[var(--platform-border)]')} />
              Razorpay {store.settings?.payments?.razorpay_enabled ? '(Enabled)' : '(Disabled)'}
            </p>
            <p className="flex items-center gap-2 text-[10px] text-[var(--platform-text-muted)]">
              <span className={cn('h-1.5 w-1.5 rounded-full', store.settings?.payments?.upi_enabled ? 'bg-emerald-500' : 'bg-[var(--platform-border)]')} />
              UPI {store.settings?.payments?.upi_enabled ? '(Enabled)' : '(Disabled)'}
            </p>
            <p className="flex items-center gap-2 text-[10px] text-[var(--platform-text-muted)]">
              <span className={cn('h-1.5 w-1.5 rounded-full', store.settings?.payments?.stripe_enabled ? 'bg-emerald-500' : 'bg-[var(--platform-border)]')} />
              Stripe {store.settings?.payments?.stripe_enabled ? '(Enabled)' : '(Disabled)'}
            </p>
          </div>
          <Link
            href="/platform/settings/payments"
            className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[var(--platform-accent)] transition-colors hover:text-[var(--platform-accent-hover)]"
          >
            Configure Payments <ArrowRight className="h-2.5 w-2.5" />
          </Link>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* More Settings (sub-page links) */}
      {/* ----------------------------------------------------------------- */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-[var(--platform-text-primary)]">More Settings</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {/* Policies - legacy */}
          <Link
            href="/dashboard/settings/policies"
            className="flex items-center gap-3 rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-4 transition-colors hover:border-[var(--platform-border-hover)]"
          >
            <FileText className="h-4 w-4 text-[var(--platform-text-muted)]" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[var(--platform-text-primary)]">Legal Policies</p>
              <p className="text-[10px] text-[var(--platform-text-muted)]">Return, privacy, terms, shipping policies (opens legacy page)</p>
            </div>
            <ArrowRight className="h-3 w-3 shrink-0 text-[var(--platform-text-muted)]" />
          </Link>

          {/* Shipping Providers - platform */}
          <Link
            href="/platform/settings/shipping"
            className="flex items-center gap-3 rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-4 transition-colors hover:border-[var(--platform-border-hover)]"
          >
            <Truck className="h-4 w-4 text-[var(--platform-text-muted)]" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[var(--platform-text-primary)]">Shipping Providers</p>
              <p className="text-[10px] text-[var(--platform-text-muted)]">Shiprocket, Delhivery, Blue Dart, Shippo</p>
            </div>
            <ArrowRight className="h-3 w-3 shrink-0 text-[var(--platform-text-muted)]" />
          </Link>

          {/* Data Export - legacy */}
          <Link
            href="/dashboard/settings/data"
            className="flex items-center gap-3 rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-4 transition-colors hover:border-[var(--platform-border-hover)]"
          >
            <Database className="h-4 w-4 text-[var(--platform-text-muted)]" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[var(--platform-text-primary)]">Data &amp; Privacy</p>
              <p className="text-[10px] text-[var(--platform-text-muted)]">Export your data, no lock-in (opens legacy page)</p>
            </div>
            <ArrowRight className="h-3 w-3 shrink-0 text-[var(--platform-text-muted)]" />
          </Link>

          {/* Security - legacy */}
          <Link
            href="/dashboard/settings/security"
            className="flex items-center gap-3 rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-4 transition-colors hover:border-[var(--platform-border-hover)]"
          >
            <Shield className="h-4 w-4 text-[var(--platform-text-muted)]" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[var(--platform-text-primary)]">Security</p>
              <p className="text-[10px] text-[var(--platform-text-muted)]">Two-factor authentication settings (opens legacy page)</p>
            </div>
            <ArrowRight className="h-3 w-3 shrink-0 text-[var(--platform-text-muted)]" />
          </Link>

          {/* Notifications - platform */}
          <Link
            href="/platform/settings/notifications"
            className="flex items-center gap-3 rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-4 transition-colors hover:border-[var(--platform-border-hover)]"
          >
            <svg className="h-4 w-4 text-[var(--platform-text-muted)]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[var(--platform-text-primary)]">Notifications</p>
              <p className="text-[10px] text-[var(--platform-text-muted)]">Email, WhatsApp, and push notification preferences</p>
            </div>
            <ArrowRight className="h-3 w-3 shrink-0 text-[var(--platform-text-muted)]" />
          </Link>

          {/* Domain - legacy */}
          <Link
            href="/dashboard/settings/domain"
            className="flex items-center gap-3 rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-4 transition-colors hover:border-[var(--platform-border-hover)]"
          >
            <Globe className="h-4 w-4 text-[var(--platform-text-muted)]" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[var(--platform-text-primary)]">Custom Domain</p>
              <p className="text-[10px] text-[var(--platform-text-muted)]">Connect your own domain (opens legacy page)</p>
            </div>
            <ArrowRight className="h-3 w-3 shrink-0 text-[var(--platform-text-muted)]" />
          </Link>

          {/* Import / Migration - legacy */}
          <Link
            href="/dashboard/migrate"
            className="flex items-center gap-3 rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-4 transition-colors hover:border-[var(--platform-border-hover)]"
          >
            <Import className="h-4 w-4 text-[var(--platform-text-muted)]" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[var(--platform-text-primary)]">Import Products</p>
              <p className="text-[10px] text-[var(--platform-text-muted)]">Migrate from Shopify or Etsy (opens legacy page)</p>
            </div>
            <ArrowRight className="h-3 w-3 shrink-0 text-[var(--platform-text-muted)]" />
          </Link>

          {/* Connections - platform */}
          <Link
            href="/platform/settings/connections"
            className="flex items-center gap-3 rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-4 transition-colors hover:border-[var(--platform-border-hover)]"
          >
            <svg className="h-4 w-4 text-[var(--platform-text-muted)]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[var(--platform-text-primary)]">Connected Accounts</p>
              <p className="text-[10px] text-[var(--platform-text-muted)]">Meta, Google Ads, Google Analytics, and more</p>
            </div>
            <ArrowRight className="h-3 w-3 shrink-0 text-[var(--platform-text-muted)]" />
          </Link>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Danger Zone */}
      {/* ----------------------------------------------------------------- */}
      <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-5 space-y-4">
        <h2 className="text-sm font-medium text-red-400 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Danger Zone
        </h2>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-[var(--platform-text-primary)]">
              Rebuild Store from Scratch
            </p>
            <p className="text-[10px] text-[var(--platform-text-muted)]">
              Delete your current store and start fresh with the onboarding wizard. All products, orders, and settings will be permanently deleted.
            </p>
          </div>
          <RebuildStoreDialog storeName={store.name} storeSlug={store.slug} />
        </div>
      </div>

      {/* Spacer for sticky save bar */}
      <div className="h-20" />

      {/* ----------------------------------------------------------------- */}
      {/* Sticky Save Bar */}
      {/* ----------------------------------------------------------------- */}
      <div className="sticky bottom-0 z-10 -mx-4 lg:-mx-6 px-4 lg:px-6 py-4 border-t border-[var(--platform-border)] bg-[var(--platform-bg)]/95 backdrop-blur-sm">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={cn(
              'inline-flex items-center gap-2 rounded bg-[var(--platform-accent)] px-4 py-2 text-xs font-medium text-white transition-colors',
              saving
                ? 'cursor-not-allowed opacity-60'
                : 'hover:bg-[var(--platform-accent-hover)]'
            )}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save Changes
          </button>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Currency Change Confirmation Dialog */}
      {/* ----------------------------------------------------------------- */}
      {showCurrencyDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-medium text-[var(--platform-text-primary)]">
              Change Currency?
            </h3>
            <p className="text-xs text-[var(--platform-text-muted)]">
              Changing currency will affect how all product prices are displayed on your store.
              This does not convert existing prices -- you may need to update product prices manually.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={cancelCurrencyChange}
                className="rounded border border-[var(--platform-border)] bg-[var(--platform-surface)] px-3 py-1.5 text-xs font-medium text-[var(--platform-text-secondary)] transition-colors hover:bg-[var(--platform-bg)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmCurrencyChange}
                className="rounded bg-[var(--platform-accent)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--platform-accent-hover)]"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Toast */}
      {/* ----------------------------------------------------------------- */}
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
