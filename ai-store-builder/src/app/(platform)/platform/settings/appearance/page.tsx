'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Check, Type, Paintbrush, Layout, MousePointerClick } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PlatformBreadcrumb } from '@/components/ui/breadcrumb'

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
  { name: 'Slate', value: '#64748b' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Lime', value: '#84cc16' },
]

const FONT_OPTIONS = [
  'Inter',
  'Poppins',
  'Playfair Display',
  'Montserrat',
  'Lora',
  'Raleway',
  'Merriweather',
  'Outfit',
  'Space Grotesk',
  'DM Sans',
  'Nunito',
  'Roboto Slab',
  'Josefin Sans',
  'Cormorant Garamond',
  'Libre Baskerville',
]

const THEMES = [
  {
    id: 'modern-minimal',
    name: 'Modern Minimal',
    description: 'Clean, bold, contemporary',
    accent: '#3b82f6',
  },
  {
    id: 'classic-elegant',
    name: 'Classic Elegant',
    description: 'Timeless, sophisticated, serif',
    accent: '#92400e',
  },
  {
    id: 'playful-bright',
    name: 'Playful Bright',
    description: 'Fun, colorful, energetic',
    accent: '#f43f5e',
  },
  {
    id: 'minimal-zen',
    name: 'Minimal Zen',
    description: 'Calm, spacious, balanced',
    accent: '#14b8a6',
  },
]

const RADIUS_OPTIONS = [
  { label: 'Sharp', value: '0px', preview: '0' },
  { label: 'Small', value: '4px', preview: '4px' },
  { label: 'Medium', value: '8px', preview: '8px' },
  { label: 'Round', value: '16px', preview: '16px' },
  { label: 'Pill', value: '9999px', preview: '9999px' },
]

// ---------------------------------------------------------------------------
// Color utilities (same as dynamic-styles.ts)
// ---------------------------------------------------------------------------

function createTint(color: string, amount: number = 0.9): string {
  try {
    const hex = color.replace('#', '')
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    const newR = Math.round(r + (255 - r) * amount)
    const newG = Math.round(g + (255 - g) * amount)
    const newB = Math.round(b + (255 - b) * amount)
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
  } catch {
    return '#F3F4F6'
  }
}

function adjustColor(color: string, percent: number): string {
  try {
    const hex = color.replace('#', '')
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    const adj = (c: number) => Math.min(255, Math.max(0, Math.round(c + (c * percent / 100))))
    return `#${adj(r).toString(16).padStart(2, '0')}${adj(g).toString(16).padStart(2, '0')}${adj(b).toString(16).padStart(2, '0')}`
  } catch {
    return color
  }
}

function getContrastColor(hex: string): string {
  try {
    const c = hex.replace('#', '')
    const r = parseInt(c.slice(0, 2), 16)
    const g = parseInt(c.slice(2, 4), 16)
    const b = parseInt(c.slice(4, 6), 16)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.5 ? '#000000' : '#ffffff'
  } catch {
    return '#ffffff'
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AppearanceData {
  theme_template: string
  primary_color: string
  secondary_color: string
  heading_font: string
  body_font: string
  button_radius: string
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AppearancePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [storeName, setStoreName] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const [form, setForm] = useState<AppearanceData>({
    theme_template: 'modern-minimal',
    primary_color: '#3b82f6',
    secondary_color: '#64748b',
    heading_font: 'Inter',
    body_font: 'Inter',
    button_radius: '8px',
  })

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  // Fetch current settings
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/dashboard/settings')
        if (!res.ok) return
        const data = await res.json()
        const store = data.store
        if (!store) return
        setStoreName(store.name || 'My Store')
        setForm({
          theme_template: store.theme || 'modern-minimal',
          primary_color: store.brand_colors?.primary || '#3b82f6',
          secondary_color: store.brand_colors?.secondary || '#64748b',
          heading_font: store.blueprint?.branding?.typography?.heading_font || 'Inter',
          body_font: store.blueprint?.branding?.typography?.body_font || 'Inter',
          button_radius: store.blueprint?.button_radius || '8px',
        })
      } catch {
        showToast('Failed to load settings', 'error')
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [showToast])

  // Save
  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/dashboard/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_colors: {
            primary: form.primary_color,
            secondary: form.secondary_color,
          },
          typography: {
            heading_font: form.heading_font,
            body_font: form.body_font,
          },
          theme_template: form.theme_template,
          button_radius: form.button_radius,
        }),
      })
      if (res.ok) {
        showToast('Appearance saved! Changes are live on your storefront.')
      } else {
        showToast('Failed to save', 'error')
      }
    } catch {
      showToast('Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Google Fonts URL for preview
  const fontsUrl = useMemo(() => {
    const fonts = [...new Set([form.heading_font, form.body_font])]
    const params = fonts.map((f) => `family=${f.replace(/ /g, '+')}:wght@400;600;700`).join('&')
    return `https://fonts.googleapis.com/css2?${params}&display=swap`
  }, [form.heading_font, form.body_font])

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <PlatformBreadcrumb
          items={[
            { label: 'Command Center', href: '/platform' },
            { label: 'Settings', href: '/platform/settings' },
            { label: 'Appearance' },
          ]}
        />
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--platform-text-muted)]" />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={fontsUrl} />

      <PlatformBreadcrumb
        items={[
          { label: 'Command Center', href: '/platform' },
          { label: 'Settings', href: '/platform/settings' },
          { label: 'Appearance' },
        ]}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/platform/settings/store"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--platform-text-muted)] transition-colors hover:text-[var(--platform-text-secondary)] mb-2"
          >
            <ArrowLeft className="h-3 w-3" />
            Store Settings
          </Link>
          <h1 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
            Appearance
          </h1>
          <p className="mt-0.5 text-sm text-[var(--platform-text-secondary)]">
            Customize your storefront theme, colors, and typography
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-[var(--platform-accent)] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[var(--platform-accent-hover)] disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left: Controls (3/5) */}
        <div className="lg:col-span-3 space-y-5">
          {/* Theme Selection */}
          <section className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Layout className="h-4 w-4 text-[var(--platform-text-muted)]" />
              <h2 className="text-sm font-medium text-[var(--platform-text-primary)]">Theme</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, theme_template: theme.id }))}
                  className={cn(
                    'group relative rounded-lg border p-4 text-left transition-all',
                    form.theme_template === theme.id
                      ? 'border-[var(--platform-accent)] bg-[var(--platform-accent)]/5 ring-1 ring-[var(--platform-accent)]'
                      : 'border-[var(--platform-border)] hover:border-[var(--platform-border-hover)]'
                  )}
                >
                  {/* Mini layout preview */}
                  <div className="mb-3 flex h-16 items-end gap-1 rounded bg-[var(--platform-bg)] p-2">
                    <div className="h-full w-6 rounded-sm" style={{ backgroundColor: theme.accent, opacity: 0.3 }} />
                    <div className="flex-1 space-y-1">
                      <div className="h-2 w-3/4 rounded-sm" style={{ backgroundColor: theme.accent, opacity: 0.5 }} />
                      <div className="h-1.5 w-1/2 rounded-sm bg-[var(--platform-border)]" />
                      <div className="flex gap-1">
                        <div className="h-5 w-5 rounded-sm bg-[var(--platform-border)]" />
                        <div className="h-5 w-5 rounded-sm bg-[var(--platform-border)]" />
                        <div className="h-5 w-5 rounded-sm bg-[var(--platform-border)]" />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs font-medium text-[var(--platform-text-primary)]">{theme.name}</p>
                  <p className="text-[10px] text-[var(--platform-text-muted)]">{theme.description}</p>
                  {form.theme_template === theme.id && (
                    <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--platform-accent)]">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* Colors */}
          <section className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Paintbrush className="h-4 w-4 text-[var(--platform-text-muted)]" />
              <h2 className="text-sm font-medium text-[var(--platform-text-primary)]">Colors</h2>
            </div>

            {/* Primary Color */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--platform-text-secondary)]">Primary Color</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, primary_color: color.value }))}
                    className={cn(
                      'h-8 w-8 rounded-full border-2 transition-transform hover:scale-110',
                      form.primary_color === color.value
                        ? 'border-white ring-2 ring-[var(--platform-accent)] scale-110'
                        : 'border-transparent'
                    )}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
                <div className="relative">
                  <input
                    type="color"
                    value={form.primary_color}
                    onChange={(e) => setForm((p) => ({ ...p, primary_color: e.target.value }))}
                    className="absolute inset-0 h-8 w-8 cursor-pointer opacity-0"
                  />
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-[var(--platform-border)] text-[var(--platform-text-muted)]"
                    style={{ backgroundColor: form.primary_color }}
                  >
                    <span className="text-[8px] font-bold" style={{ color: getContrastColor(form.primary_color) }}>+</span>
                  </div>
                </div>
              </div>
              <input
                type="text"
                value={form.primary_color}
                onChange={(e) => {
                  if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) {
                    setForm((p) => ({ ...p, primary_color: e.target.value }))
                  }
                }}
                className="w-28 rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] px-2 py-1 font-mono text-xs text-[var(--platform-text-primary)]"
                placeholder="#3b82f6"
              />
            </div>

            {/* Secondary Color */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--platform-text-secondary)]">Secondary Color</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.slice(0, 8).map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, secondary_color: color.value }))}
                    className={cn(
                      'h-7 w-7 rounded-full border-2 transition-transform hover:scale-110',
                      form.secondary_color === color.value
                        ? 'border-white ring-2 ring-[var(--platform-accent)] scale-110'
                        : 'border-transparent'
                    )}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Color Preview Strip */}
            <div className="flex gap-2 pt-2">
              {[
                { label: 'Primary', color: form.primary_color },
                { label: 'Dark', color: adjustColor(form.primary_color, -15) },
                { label: 'Light', color: createTint(form.primary_color, 0.9) },
                { label: 'Secondary', color: form.secondary_color },
              ].map((swatch) => (
                <div key={swatch.label} className="flex-1 text-center">
                  <div
                    className="h-8 rounded"
                    style={{ backgroundColor: swatch.color }}
                  />
                  <p className="mt-1 text-[9px] text-[var(--platform-text-muted)]">{swatch.label}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Typography */}
          <section className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Type className="h-4 w-4 text-[var(--platform-text-muted)]" />
              <h2 className="text-sm font-medium text-[var(--platform-text-primary)]">Typography</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--platform-text-secondary)]">Heading Font</label>
                <select
                  value={form.heading_font}
                  onChange={(e) => setForm((p) => ({ ...p, heading_font: e.target.value }))}
                  className="w-full rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-2 text-sm text-[var(--platform-text-primary)] cursor-pointer"
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--platform-text-secondary)]">Body Font</label>
                <select
                  value={form.body_font}
                  onChange={(e) => setForm((p) => ({ ...p, body_font: e.target.value }))}
                  className="w-full rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-2 text-sm text-[var(--platform-text-primary)] cursor-pointer"
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>
            {/* Font preview */}
            <div className="rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] p-4 space-y-2">
              <p
                className="text-lg font-semibold text-[var(--platform-text-primary)]"
                style={{ fontFamily: `"${form.heading_font}", system-ui, sans-serif` }}
              >
                {storeName || 'Your Store Name'}
              </p>
              <p
                className="text-sm text-[var(--platform-text-secondary)] leading-relaxed"
                style={{ fontFamily: `"${form.body_font}", system-ui, sans-serif` }}
              >
                This is how your product descriptions and body text will look on your storefront. Choose fonts that match your brand personality.
              </p>
            </div>
          </section>

          {/* Button Style */}
          <section className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <MousePointerClick className="h-4 w-4 text-[var(--platform-text-muted)]" />
              <h2 className="text-sm font-medium text-[var(--platform-text-primary)]">Button Style</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {RADIUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, button_radius: opt.value }))}
                  className={cn(
                    'px-5 py-2 text-xs font-medium transition-all',
                    form.button_radius === opt.value
                      ? 'text-white'
                      : 'border border-[var(--platform-border)] text-[var(--platform-text-secondary)] hover:border-[var(--platform-border-hover)]'
                  )}
                  style={{
                    borderRadius: opt.preview,
                    ...(form.button_radius === opt.value
                      ? { backgroundColor: form.primary_color, color: getContrastColor(form.primary_color) }
                      : {}),
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Right: Live Preview (2/5) */}
        <div className="lg:col-span-2">
          <div className="sticky top-24 space-y-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
              Live Preview
            </p>
            <div className="overflow-hidden rounded-lg border border-[var(--platform-border)] bg-white shadow-lg">
              {/* Mock Header */}
              <div
                className="flex items-center justify-between px-4 py-3 border-b"
                style={{ borderColor: '#e5e7eb' }}
              >
                <p
                  className="text-sm font-bold"
                  style={{
                    fontFamily: `"${form.heading_font}", system-ui, sans-serif`,
                    color: '#111827',
                  }}
                >
                  {storeName || 'My Store'}
                </p>
                <div className="flex gap-3 text-[10px] text-gray-500">
                  <span>Home</span>
                  <span>Products</span>
                  <span>About</span>
                </div>
              </div>

              {/* Mock Hero */}
              <div
                className="px-6 py-8 text-center"
                style={{ backgroundColor: createTint(form.primary_color, 0.92) }}
              >
                <p
                  className="text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: form.primary_color }}
                >
                  New Collection
                </p>
                <h2
                  className="text-xl font-bold mb-2"
                  style={{
                    fontFamily: `"${form.heading_font}", system-ui, sans-serif`,
                    color: '#111827',
                  }}
                >
                  Welcome to {storeName || 'My Store'}
                </h2>
                <p
                  className="text-xs text-gray-500 mb-4"
                  style={{ fontFamily: `"${form.body_font}", system-ui, sans-serif` }}
                >
                  Discover our curated collection of premium products
                </p>
                <button
                  className="px-5 py-2 text-xs font-medium text-white"
                  style={{
                    backgroundColor: form.primary_color,
                    borderRadius: form.button_radius,
                    color: getContrastColor(form.primary_color),
                  }}
                >
                  Shop Now
                </button>
              </div>

              {/* Mock Product Grid */}
              <div className="p-4">
                <p
                  className="text-xs font-semibold mb-3"
                  style={{
                    fontFamily: `"${form.heading_font}", system-ui, sans-serif`,
                    color: '#111827',
                  }}
                >
                  Featured Products
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="rounded-lg border border-gray-200 overflow-hidden">
                      <div className="h-20 bg-gray-100" />
                      <div className="p-2 space-y-1">
                        <p
                          className="text-[10px] font-medium text-gray-800"
                          style={{ fontFamily: `"${form.body_font}", system-ui, sans-serif` }}
                        >
                          Product {i}
                        </p>
                        <div className="flex items-center justify-between">
                          <p
                            className="text-[10px] font-bold"
                            style={{ color: form.primary_color }}
                          >
                            {'\u20b9'}999
                          </p>
                          <button
                            className="px-2 py-0.5 text-[8px] font-medium"
                            style={{
                              backgroundColor: form.primary_color,
                              color: getContrastColor(form.primary_color),
                              borderRadius: form.button_radius,
                            }}
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mock Footer */}
              <div
                className="px-4 py-3 text-center border-t"
                style={{
                  backgroundColor: form.secondary_color,
                  borderColor: adjustColor(form.secondary_color, -10),
                }}
              >
                <p
                  className="text-[9px]"
                  style={{ color: getContrastColor(form.secondary_color) }}
                >
                  {'\u00a9'} 2026 {storeName || 'My Store'}
                </p>
              </div>
            </div>

            {/* Save (mobile) */}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full rounded-lg bg-[var(--platform-accent)] px-4 py-2.5 text-xs font-medium text-white transition-colors hover:bg-[var(--platform-accent-hover)] disabled:opacity-50 lg:hidden"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={cn(
            'fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border px-4 py-2.5 shadow-lg',
            toast.type === 'success'
              ? 'border-emerald-500/20 bg-emerald-950 text-emerald-300'
              : 'border-red-500/20 bg-red-950 text-red-300'
          )}
        >
          <p className="text-xs font-medium">{toast.message}</p>
        </div>
      )}
    </div>
  )
}
