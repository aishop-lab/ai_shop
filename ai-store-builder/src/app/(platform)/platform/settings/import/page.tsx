'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ExternalLink,
  Key,
  X,
} from 'lucide-react'
import { createClient as createBrowserSupabase } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StoreInfo {
  id: string
  slug: string
  name: string
}

type ImportSource = 'shopify' | 'etsy' | 'csv'
type PageView = 'sources' | 'shopify-connect' | 'etsy-connect' | 'csv-upload' | 'configuring' | 'importing' | 'results'

interface MigrationProgress {
  id: string
  platform: string
  status: string
  source_shop_name?: string
  total_products: number
  migrated_products: number
  failed_products: number
  total_collections: number
  migrated_collections: number
  failed_collections: number
  total_images: number
  migrated_images: number
  failed_images: number
  total_orders: number
  migrated_orders: number
  failed_orders: number
  total_customers: number
  migrated_customers: number
  failed_customers: number
  total_coupons: number
  migrated_coupons: number
  failed_coupons: number
  errors?: string[]
  started_at?: string
  completed_at?: string
  current_phase?: string
}

interface ImportConfig {
  import_products: boolean
  import_collections: boolean
  import_orders: boolean
  import_customers: boolean
  import_coupons: boolean
  product_status: 'draft' | 'active'
}

interface CsvResult {
  success: number
  failed: number
  errors: Array<{ row: number; error: string }>
}

// ---------------------------------------------------------------------------
// Style constants
// ---------------------------------------------------------------------------

const sectionCls =
  'rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-5 space-y-4'

const sectionTitleCls =
  'text-sm font-medium text-[var(--platform-text-primary)] flex items-center gap-2'

const inputCls =
  'w-full rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-2 text-sm text-[var(--platform-text-primary)] placeholder:text-[var(--platform-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--platform-accent)]'

const labelCls = 'text-xs font-medium text-[var(--platform-text-secondary)]'

const btnPrimaryCls =
  'rounded-lg bg-[var(--platform-accent)] px-4 py-2 text-xs font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2'

const btnSecondaryCls =
  'rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] px-4 py-2 text-xs font-medium text-[var(--platform-text-secondary)] hover:bg-[var(--platform-border)]/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2'

const btnGhostCls =
  'text-xs text-[var(--platform-text-muted)] hover:text-[var(--platform-text-secondary)] transition-colors inline-flex items-center gap-1.5'

// ---------------------------------------------------------------------------
// Toast
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
    const t = setTimeout(onClose, 3500)
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
// Toggle
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
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--platform-accent)]',
        checked ? 'bg-[var(--platform-accent)]' : 'bg-[var(--platform-border)]'
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0'
        )}
      />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const supabase = createBrowserSupabase()
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` }
    }
  } catch {
    // continue
  }
  return {}
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ImportPage() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [store, setStore] = useState<StoreInfo | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [view, setView] = useState<PageView>('sources')
  const [completedPlatforms, setCompletedPlatforms] = useState<string[]>([])

  // Shopify connect state
  const [shopifyUrl, setShopifyUrl] = useState('')
  const [shopifyToken, setShopifyToken] = useState('')
  const [connecting, setConnecting] = useState(false)

  // Etsy state
  const [etsyConnecting, setEtsyConnecting] = useState(false)

  // Migration state
  const [migrationId, setMigrationId] = useState<string | null>(null)
  const [migrationPlatform, setMigrationPlatform] = useState<string | null>(null)
  const [migrationShopName, setMigrationShopName] = useState<string | null>(null)
  const [migrationProgress, setMigrationProgress] = useState<MigrationProgress | null>(null)
  const [starting, setStarting] = useState(false)

  // Import config
  const [config, setConfig] = useState<ImportConfig>({
    import_products: true,
    import_collections: true,
    import_orders: false,
    import_customers: false,
    import_coupons: false,
    product_status: 'draft',
  })

  // CSV state
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvUploading, setCsvUploading] = useState(false)
  const [csvProgress, setCsvProgress] = useState(0)
  const [csvResult, setCsvResult] = useState<CsvResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Polling ref
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // --------------------------------------------------
  // Load store & check existing migration
  // --------------------------------------------------
  useEffect(() => {
    async function load() {
      try {
        const authHeaders = await getAuthHeaders()

        const res = await fetch('/api/dashboard/settings', {
          headers: authHeaders,
          credentials: 'include',
        })

        let storeData: StoreInfo | null = null

        if (res.ok) {
          const d = await res.json()
          if (d.store) {
            storeData = { id: d.store.id, slug: d.store.slug, name: d.store.name }
          }
        }

        if (!storeData) {
          // Fallback to stats
          const statsRes = await fetch('/api/dashboard/stats', {
            headers: authHeaders,
            credentials: 'include',
          })
          if (statsRes.ok) {
            const d = await statsRes.json()
            if (d.store) {
              storeData = { id: d.store.id, slug: d.store.slug, name: d.store.name }
            }
          }
        }

        if (!storeData) {
          setLoading(false)
          return
        }

        setStore(storeData)

        // Check existing migration
        const migRes = await fetch(
          `/api/migration/status?store_id=${storeData.id}`,
          { headers: authHeaders, credentials: 'include' }
        )

        if (migRes.ok) {
          const migData = await migRes.json()

          // Track completed
          const completed = (migData.completed_migrations || [])
            .filter((m: { status: string }) => m.status === 'completed')
            .map((m: { platform: string }) => m.platform)
          setCompletedPlatforms(completed)

          if (migData.migration) {
            const m = migData.migration as MigrationProgress
            setMigrationId(m.id)
            setMigrationPlatform(m.platform)
            setMigrationShopName(m.source_shop_name || null)

            switch (m.status) {
              case 'connected':
                setView('configuring')
                break
              case 'running':
                setMigrationProgress(m)
                setView('importing')
                break
              case 'completed':
              case 'failed':
                setMigrationProgress(m)
                setView('results')
                break
              default:
                setView('sources')
            }
          }
        }
      } catch (err) {
        console.error('Failed to load:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Handle OAuth callback params
  useEffect(() => {
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')

    if (connected) {
      setToast({ message: `Connected to ${connected === 'shopify' ? 'Shopify' : 'Etsy'}`, type: 'success' })
    }
    if (error) {
      const messages: Record<string, string> = {
        missing_params: 'Authentication failed: missing parameters',
        expired_session: 'Session expired. Please try again.',
        invalid_state: 'Security check failed. Please try again.',
        invalid_hmac: 'Shopify signature validation failed.',
        store_not_found: 'Store not found.',
        callback_failed: 'Authentication callback failed.',
        etsy_denied: 'Etsy access was denied.',
      }
      setToast({ message: messages[error] || `Error: ${error}`, type: 'error' })
    }
  }, [searchParams])

  // --------------------------------------------------
  // Polling for migration progress
  // --------------------------------------------------
  useEffect(() => {
    if (view !== 'importing' || !migrationId) return

    async function poll() {
      try {
        const authHeaders = await getAuthHeaders()
        const res = await fetch(`/api/migration/status?migration_id=${migrationId}`, {
          headers: authHeaders,
          credentials: 'include',
        })
        if (!res.ok) return
        const data = await res.json()
        if (data.migration) {
          setMigrationProgress(data.migration)
          if (data.migration.status === 'completed' || data.migration.status === 'failed') {
            setView('results')
            if (pollRef.current) clearInterval(pollRef.current)
          }
        }
      } catch {
        // ignore polling errors
      }
    }

    poll()
    pollRef.current = setInterval(poll, 3000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [view, migrationId])

  // --------------------------------------------------
  // Shopify connect via access token
  // --------------------------------------------------
  const handleShopifyConnect = useCallback(async () => {
    if (!store || !shopifyUrl.trim() || !shopifyToken.trim()) return
    setConnecting(true)

    try {
      const authHeaders = await getAuthHeaders()
      const res = await fetch('/api/migration/shopify/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        credentials: 'include',
        body: JSON.stringify({
          store_id: store.id,
          shop_url: shopifyUrl.trim(),
          access_token: shopifyToken.trim(),
        }),
      })
      const data = await res.json()

      if (res.ok && data.success) {
        setToast({ message: `Connected to ${data.shop_name}`, type: 'success' })
        // Reload to pick up migration
        window.location.href = '/platform/settings/import?connected=shopify'
      } else {
        setToast({ message: data.error || 'Failed to connect', type: 'error' })
      }
    } catch (err) {
      console.error('Shopify connect error:', err)
      setToast({ message: 'Failed to connect to Shopify', type: 'error' })
    } finally {
      setConnecting(false)
    }
  }, [store, shopifyUrl, shopifyToken])

  // Shopify OAuth
  const handleShopifyOAuth = useCallback(async () => {
    if (!store || !shopifyUrl.trim()) return
    setConnecting(true)

    try {
      const authHeaders = await getAuthHeaders()
      const res = await fetch(
        `/api/migration/shopify/auth?store_id=${store.id}&shop=${encodeURIComponent(shopifyUrl.trim())}`,
        { headers: authHeaders, credentials: 'include' }
      )
      if (!res.ok) {
        const data = await res.json()
        setToast({ message: data.error || 'Failed to start OAuth', type: 'error' })
        setConnecting(false)
        return
      }
      const data = await res.json()
      if (data.authUrl) {
        window.location.href = data.authUrl
      } else {
        setToast({ message: 'Failed to get authorization URL', type: 'error' })
        setConnecting(false)
      }
    } catch {
      setToast({ message: 'Failed to start Shopify OAuth', type: 'error' })
      setConnecting(false)
    }
  }, [store, shopifyUrl])

  // --------------------------------------------------
  // Etsy connect (OAuth redirect)
  // --------------------------------------------------
  const handleEtsyConnect = useCallback(() => {
    if (!store) return
    setEtsyConnecting(true)
    window.location.href = `/api/migration/etsy/auth?store_id=${store.id}`
  }, [store])

  // --------------------------------------------------
  // Start platform migration
  // --------------------------------------------------
  const handleStartMigration = useCallback(async () => {
    if (!migrationId) return
    setStarting(true)

    try {
      const authHeaders = await getAuthHeaders()
      const res = await fetch('/api/migration/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        credentials: 'include',
        body: JSON.stringify({ migration_id: migrationId, ...config }),
      })

      if (res.ok) {
        setView('importing')
      } else {
        const data = await res.json()
        setToast({ message: data.error || 'Failed to start import', type: 'error' })
      }
    } catch {
      setToast({ message: 'Failed to start import', type: 'error' })
    } finally {
      setStarting(false)
    }
  }, [migrationId, config])

  // --------------------------------------------------
  // CSV upload
  // --------------------------------------------------
  const handleCsvUpload = useCallback(async () => {
    if (!store || !csvFile) return
    setCsvUploading(true)
    setCsvProgress(10)

    try {
      const authHeaders = await getAuthHeaders()
      const formData = new FormData()
      formData.append('file', csvFile)
      formData.append('store_id', store.id)

      const progressInterval = setInterval(() => {
        setCsvProgress(prev => (prev < 80 ? prev + Math.random() * 15 : prev))
      }, 600)

      const res = await fetch('/api/products/bulk-upload', {
        method: 'POST',
        headers: authHeaders,
        credentials: 'include',
        body: formData,
      })

      clearInterval(progressInterval)
      setCsvProgress(95)

      const data = await res.json()

      if (res.ok) {
        setCsvProgress(100)
        setCsvResult({
          success: data.success ?? data.products?.length ?? 0,
          failed: data.failed ?? 0,
          errors: data.errors ?? [],
        })
        setToast({
          message: `Imported ${data.success ?? data.products?.length ?? 0} products`,
          type: 'success',
        })
      } else {
        setToast({ message: data.error || 'Upload failed', type: 'error' })
      }
    } catch (err) {
      console.error('CSV upload error:', err)
      setToast({ message: 'Upload failed', type: 'error' })
    } finally {
      setCsvUploading(false)
    }
  }, [store, csvFile])

  // --------------------------------------------------
  // Helper: overall migration progress %
  // --------------------------------------------------
  function calcProgress(p: MigrationProgress): number {
    const totalItems =
      p.total_products + p.total_collections + p.total_images +
      p.total_orders + p.total_customers + p.total_coupons
    if (totalItems === 0) return 0
    const doneItems =
      p.migrated_products + p.failed_products +
      p.migrated_collections + p.failed_collections +
      p.migrated_images + p.failed_images +
      p.migrated_orders + p.failed_orders +
      p.migrated_customers + p.failed_customers +
      p.migrated_coupons + p.failed_coupons
    return Math.min(Math.round((doneItems / totalItems) * 100), 100)
  }

  // --------------------------------------------------
  // Render
  // --------------------------------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--platform-text-muted)]" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back link + heading */}
      <div>
        <Link
          href="/platform/settings/store"
          className={btnGhostCls + ' mb-4'}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Store Settings
        </Link>
        <h1 className="text-lg font-semibold text-[var(--platform-text-primary)]">
          Import Data
        </h1>
        <p className="text-xs text-[var(--platform-text-muted)] mt-1">
          Bring your products and store data from another platform or a CSV file.
        </p>
      </div>

      {/* Completed platform badges */}
      {completedPlatforms.length > 0 && view === 'sources' && (
        <div className="flex flex-wrap gap-2">
          {completedPlatforms.map(p => (
            <span
              key={p}
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-400"
            >
              <CheckCircle2 className="h-3 w-3" />
              {p === 'shopify' ? 'Shopify' : 'Etsy'} imported
            </span>
          ))}
        </div>
      )}

      {/* ============================== SOURCE SELECTION ============================== */}
      {view === 'sources' && (
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Shopify */}
          {!completedPlatforms.includes('shopify') && (
            <button
              onClick={() => setView('shopify-connect')}
              className={cn(
                sectionCls,
                'cursor-pointer text-left hover:border-[var(--platform-accent)]/50 transition-colors !space-y-3'
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#95BF47]/20">
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#95BF47]" fill="currentColor">
                  <path d="M15.34 15.58c-.18-.1-2.67-1.28-2.67-1.28l-1.17-4.04s-.07-.23-.24-.36c-.17-.13-.4-.13-.4-.13h-1.73s-.34 0-.47.35c0 0-1.28 3.3-1.28 3.3l-.33 1.09s-.07.23.12.35c.19.12 2.67 1.35 2.67 1.35l1.15 3.96s.08.24.27.27c.19.03.35-.12.35-.12l3.6-4.38s.18-.22.13-.36zM12.78 5.12l-1.22-.47S10.38 8.73 10.34 8.9c-.03.17.13.22.13.22l.73.35 1.58-4.35z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-[var(--platform-text-primary)]">Shopify</p>
              <p className="text-[11px] text-[var(--platform-text-muted)]">
                Import products, collections, orders & customers
              </p>
            </button>
          )}

          {/* Etsy */}
          {!completedPlatforms.includes('etsy') && (
            <button
              onClick={() => setView('etsy-connect')}
              className={cn(
                sectionCls,
                'cursor-pointer text-left hover:border-[var(--platform-accent)]/50 transition-colors !space-y-3'
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F1641E]/20">
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#F1641E]" fill="currentColor">
                  <path d="M8.56 4.85c0-.37.3-.51.86-.51h3.27c2.02 0 2.83 1.05 3.2 2.83l.17.72h.68V3.31h-.68l-.37.78c-.37-.09-1.7-.37-3.27-.37H7.85c-1.33 0-2.11.78-2.11 1.7v10.28c0 .92.78 1.7 2.11 1.7h4.58c1.57 0 2.9-.28 3.27-.37l.37.78h.68v-4.58h-.68l-.17.72c-.37 1.78-1.18 2.83-3.2 2.83H9.42c-.56 0-.86-.14-.86-.51V12.3h3.22c1.47 0 1.93.72 2.11 2.11h.68V8.78h-.68c-.18 1.39-.64 2.11-2.11 2.11H8.56V4.85z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-[var(--platform-text-primary)]">Etsy</p>
              <p className="text-[11px] text-[var(--platform-text-muted)]">
                Import listings and shop sections via OAuth
              </p>
            </button>
          )}

          {/* CSV / Excel */}
          <button
            onClick={() => setView('csv-upload')}
            className={cn(
              sectionCls,
              'cursor-pointer text-left hover:border-[var(--platform-accent)]/50 transition-colors !space-y-3'
            )}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--platform-accent)]/20">
              <FileSpreadsheet className="h-5 w-5 text-[var(--platform-accent)]" />
            </div>
            <p className="text-sm font-medium text-[var(--platform-text-primary)]">CSV / Excel</p>
            <p className="text-[11px] text-[var(--platform-text-muted)]">
              Upload a spreadsheet to bulk-import products
            </p>
          </button>
        </div>
      )}

      {/* ============================== SHOPIFY CONNECT ============================== */}
      {view === 'shopify-connect' && (
        <div className="space-y-4">
          <button onClick={() => setView('sources')} className={btnGhostCls}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to import sources
          </button>

          <div className={sectionCls}>
            <div className={sectionTitleCls}>
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#95BF47]" fill="currentColor">
                <path d="M15.34 15.58c-.18-.1-2.67-1.28-2.67-1.28l-1.17-4.04s-.07-.23-.24-.36c-.17-.13-.4-.13-.4-.13h-1.73s-.34 0-.47.35c0 0-1.28 3.3-1.28 3.3l-.33 1.09s-.07.23.12.35c.19.12 2.67 1.35 2.67 1.35l1.15 3.96s.08.24.27.27c.19.03.35-.12.35-.12l3.6-4.38s.18-.22.13-.36zM12.78 5.12l-1.22-.47S10.38 8.73 10.34 8.9c-.03.17.13.22.13.22l.73.35 1.58-4.35z" />
              </svg>
              Connect Shopify Store
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className={labelCls}>Store URL</label>
                <input
                  type="text"
                  className={inputCls}
                  placeholder="myshop.myshopify.com"
                  value={shopifyUrl}
                  onChange={e => setShopifyUrl(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>Admin API Access Token</label>
                <input
                  type="password"
                  className={inputCls}
                  placeholder="shpat_..."
                  value={shopifyToken}
                  onChange={e => setShopifyToken(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleShopifyConnect()}
                />
              </div>

              <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-bg)] p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[var(--platform-text-muted)]" />
                  <div className="text-[11px] text-[var(--platform-text-muted)] space-y-1">
                    <p className="font-medium text-[var(--platform-text-secondary)]">
                      How to get your access token:
                    </p>
                    <ol className="list-decimal ml-4 space-y-0.5">
                      <li>Shopify Admin &rarr; Settings &rarr; Apps and sales channels</li>
                      <li>Click &quot;Develop apps&quot; &rarr; &quot;Create an app&quot;</li>
                      <li>Enable scopes: <strong>read_products</strong>, <strong>read_orders</strong>, <strong>read_customers</strong>, <strong>read_discounts</strong></li>
                      <li>Install the app and copy the Admin API access token</li>
                    </ol>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleShopifyConnect}
                  disabled={!shopifyUrl.trim() || !shopifyToken.trim() || connecting}
                  className={btnPrimaryCls}
                >
                  {connecting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Key className="h-3.5 w-3.5" />
                  )}
                  Connect with Token
                </button>

                <span className="text-[10px] text-[var(--platform-text-muted)]">or</span>

                <button
                  onClick={handleShopifyOAuth}
                  disabled={!shopifyUrl.trim() || connecting}
                  className={btnSecondaryCls}
                >
                  {connecting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ExternalLink className="h-3.5 w-3.5" />
                  )}
                  OAuth
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================== ETSY CONNECT ============================== */}
      {view === 'etsy-connect' && (
        <div className="space-y-4">
          <button onClick={() => setView('sources')} className={btnGhostCls}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to import sources
          </button>

          <div className={sectionCls}>
            <div className={sectionTitleCls}>
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#F1641E]" fill="currentColor">
                <path d="M8.56 4.85c0-.37.3-.51.86-.51h3.27c2.02 0 2.83 1.05 3.2 2.83l.17.72h.68V3.31h-.68l-.37.78c-.37-.09-1.7-.37-3.27-.37H7.85c-1.33 0-2.11.78-2.11 1.7v10.28c0 .92.78 1.7 2.11 1.7h4.58c1.57 0 2.9-.28 3.27-.37l.37.78h.68v-4.58h-.68l-.17.72c-.37 1.78-1.18 2.83-3.2 2.83H9.42c-.56 0-.86-.14-.86-.51V12.3h3.22c1.47 0 1.93.72 2.11 2.11h.68V8.78h-.68c-.18 1.39-.64 2.11-2.11 2.11H8.56V4.85z" />
              </svg>
              Connect Etsy Shop
            </div>

            <p className="text-xs text-[var(--platform-text-muted)]">
              Connect your Etsy account via OAuth to import all your active listings,
              images, and shop sections.
            </p>

            <button
              onClick={handleEtsyConnect}
              disabled={etsyConnecting}
              className={btnPrimaryCls}
            >
              {etsyConnecting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ExternalLink className="h-3.5 w-3.5" />
              )}
              Connect Etsy via OAuth
            </button>
          </div>
        </div>
      )}

      {/* ============================== CSV UPLOAD ============================== */}
      {view === 'csv-upload' && (
        <div className="space-y-4">
          <button onClick={() => { setView('sources'); setCsvFile(null); setCsvResult(null); setCsvProgress(0) }} className={btnGhostCls}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to import sources
          </button>

          <div className={sectionCls}>
            <div className={sectionTitleCls}>
              <FileSpreadsheet className="h-4 w-4 text-[var(--platform-text-muted)]" />
              Upload CSV / Excel
            </div>

            <p className="text-xs text-[var(--platform-text-muted)]">
              Upload a CSV or Excel file with your products. Required columns:
              <span className="text-[var(--platform-text-secondary)]"> title, price</span>.
              Optional: description, sku, category, quantity, tags, images.
            </p>

            {/* File drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
              onDrop={e => {
                e.preventDefault()
                e.stopPropagation()
                const f = e.dataTransfer.files[0]
                if (f && (f.name.endsWith('.csv') || f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) {
                  setCsvFile(f)
                  setCsvResult(null)
                  setCsvProgress(0)
                }
              }}
              className={cn(
                'cursor-pointer rounded-lg border-2 border-dashed border-[var(--platform-border)] bg-[var(--platform-bg)] p-8 text-center transition-colors hover:border-[var(--platform-accent)]/50',
                csvFile && 'border-[var(--platform-accent)]/40'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) {
                    setCsvFile(f)
                    setCsvResult(null)
                    setCsvProgress(0)
                  }
                }}
              />
              {csvFile ? (
                <div className="flex items-center justify-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-[var(--platform-accent)]" />
                  <span className="text-sm text-[var(--platform-text-primary)]">{csvFile.name}</span>
                  <span className="text-[10px] text-[var(--platform-text-muted)]">
                    ({(csvFile.size / 1024).toFixed(1)} KB)
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); setCsvFile(null); setCsvResult(null); setCsvProgress(0) }}
                    className="ml-2 rounded p-1 hover:bg-[var(--platform-border)]/50"
                  >
                    <X className="h-3.5 w-3.5 text-[var(--platform-text-muted)]" />
                  </button>
                </div>
              ) : (
                <div>
                  <Upload className="mx-auto h-6 w-6 text-[var(--platform-text-muted)]" />
                  <p className="mt-2 text-xs text-[var(--platform-text-muted)]">
                    Click or drag a CSV / Excel file here
                  </p>
                </div>
              )}
            </div>

            {/* Progress */}
            {csvUploading && (
              <div>
                <div className="h-1.5 rounded-full bg-[var(--platform-border)]">
                  <div
                    className="h-1.5 rounded-full bg-[var(--platform-accent)] transition-all duration-300"
                    style={{ width: `${Math.round(csvProgress)}%` }}
                  />
                </div>
                <p className="text-[10px] text-[var(--platform-text-muted)] mt-1">
                  Importing products... {Math.round(csvProgress)}%
                </p>
              </div>
            )}

            {/* Results */}
            {csvResult && !csvUploading && (
              <div className="space-y-3">
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {csvResult.success} imported
                  </span>
                  {csvResult.failed > 0 && (
                    <span className="text-red-400 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {csvResult.failed} failed
                    </span>
                  )}
                </div>
                {csvResult.errors.length > 0 && (
                  <div className="max-h-32 overflow-y-auto rounded border border-red-500/20 bg-red-500/5 p-3 text-[11px] text-red-400 space-y-1">
                    {csvResult.errors.slice(0, 20).map((e, i) => (
                      <p key={i}>Row {e.row}: {e.error}</p>
                    ))}
                    {csvResult.errors.length > 20 && (
                      <p className="text-[var(--platform-text-muted)]">
                        ...and {csvResult.errors.length - 20} more
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleCsvUpload}
              disabled={!csvFile || csvUploading}
              className={btnPrimaryCls}
            >
              {csvUploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              {csvUploading ? 'Importing...' : 'Import Products'}
            </button>
          </div>
        </div>
      )}

      {/* ============================== CONFIGURE IMPORT ============================== */}
      {view === 'configuring' && migrationId && (
        <div className="space-y-4">
          <button onClick={() => setView('sources')} className={btnGhostCls}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to import sources
          </button>

          {/* Connected badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Connected to {migrationPlatform === 'shopify' ? 'Shopify' : 'Etsy'}
            {migrationShopName && <span className="text-[var(--platform-text-muted)]">({migrationShopName})</span>}
          </div>

          <div className={sectionCls}>
            <div className={sectionTitleCls}>
              Configure Import
            </div>

            <div className="space-y-3">
              {[
                { key: 'import_products' as const, label: 'Products', desc: 'Import all products with images and variants' },
                { key: 'import_collections' as const, label: 'Collections', desc: 'Import product collections and categories' },
                { key: 'import_orders' as const, label: 'Orders', desc: 'Import order history' },
                { key: 'import_customers' as const, label: 'Customers', desc: 'Import customer records' },
                { key: 'import_coupons' as const, label: 'Coupons', desc: 'Import discount codes' },
              ].map(({ key, label, desc }) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-lg border border-[var(--platform-border)] bg-[var(--platform-bg)] px-4 py-3"
                >
                  <div>
                    <p className="text-xs font-medium text-[var(--platform-text-primary)]">{label}</p>
                    <p className="text-[10px] text-[var(--platform-text-muted)] mt-0.5">{desc}</p>
                  </div>
                  <Toggle
                    checked={config[key]}
                    onChange={v => setConfig(prev => ({ ...prev, [key]: v }))}
                    label={label}
                  />
                </div>
              ))}

              {/* Product status */}
              <div className="flex items-center justify-between rounded-lg border border-[var(--platform-border)] bg-[var(--platform-bg)] px-4 py-3">
                <div>
                  <p className="text-xs font-medium text-[var(--platform-text-primary)]">
                    Product Status
                  </p>
                  <p className="text-[10px] text-[var(--platform-text-muted)] mt-0.5">
                    Imported products will be set to this status
                  </p>
                </div>
                <div className="flex items-center gap-1 rounded border border-[var(--platform-border)] bg-[var(--platform-surface)] p-0.5">
                  {(['draft', 'active'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setConfig(prev => ({ ...prev, product_status: s }))}
                      className={cn(
                        'rounded px-3 py-1 text-[11px] font-medium transition-colors',
                        config.product_status === s
                          ? 'bg-[var(--platform-accent)] text-white'
                          : 'text-[var(--platform-text-muted)] hover:text-[var(--platform-text-secondary)]'
                      )}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleStartMigration}
              disabled={starting || (!config.import_products && !config.import_collections && !config.import_orders && !config.import_customers && !config.import_coupons)}
              className={btnPrimaryCls}
            >
              {starting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              {starting ? 'Starting...' : 'Start Import'}
            </button>
          </div>
        </div>
      )}

      {/* ============================== IMPORTING (Progress) ============================== */}
      {view === 'importing' && migrationProgress && (
        <div className="space-y-4">
          <div className={sectionCls}>
            <div className={sectionTitleCls}>
              <Loader2 className="h-4 w-4 animate-spin text-[var(--platform-accent)]" />
              Importing from {migrationPlatform === 'shopify' ? 'Shopify' : 'Etsy'}
              {migrationShopName && (
                <span className="font-normal text-[var(--platform-text-muted)]">
                  ({migrationShopName})
                </span>
              )}
            </div>

            {/* Overall progress */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-[var(--platform-text-muted)]">
                  {migrationProgress.current_phase === 'done'
                    ? 'Complete'
                    : `Phase: ${migrationProgress.current_phase}`}
                </span>
                <span className="text-[11px] font-medium text-[var(--platform-text-secondary)]">
                  {calcProgress(migrationProgress)}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[var(--platform-border)]">
                <div
                  className="h-1.5 rounded-full bg-[var(--platform-accent)] transition-all duration-500"
                  style={{ width: `${calcProgress(migrationProgress)}%` }}
                />
              </div>
            </div>

            {/* Per-type breakdown */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Products', done: migrationProgress.migrated_products, failed: migrationProgress.failed_products, total: migrationProgress.total_products },
                { label: 'Collections', done: migrationProgress.migrated_collections, failed: migrationProgress.failed_collections, total: migrationProgress.total_collections },
                { label: 'Images', done: migrationProgress.migrated_images, failed: migrationProgress.failed_images, total: migrationProgress.total_images },
                { label: 'Orders', done: migrationProgress.migrated_orders, failed: migrationProgress.failed_orders, total: migrationProgress.total_orders },
                { label: 'Customers', done: migrationProgress.migrated_customers, failed: migrationProgress.failed_customers, total: migrationProgress.total_customers },
                { label: 'Coupons', done: migrationProgress.migrated_coupons, failed: migrationProgress.failed_coupons, total: migrationProgress.total_coupons },
              ]
                .filter(r => r.total > 0)
                .map(({ label, done, failed, total }) => (
                  <div
                    key={label}
                    className="rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-2"
                  >
                    <p className="text-[11px] text-[var(--platform-text-muted)]">{label}</p>
                    <p className="text-sm font-medium text-[var(--platform-text-primary)] mt-0.5">
                      {done}
                      {failed > 0 && (
                        <span className="text-red-400 text-[10px] ml-1">({failed} failed)</span>
                      )}
                      <span className="text-[var(--platform-text-muted)] text-[10px]"> / {total}</span>
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================== RESULTS ============================== */}
      {view === 'results' && migrationProgress && (
        <div className="space-y-4">
          <div className={sectionCls}>
            <div className={sectionTitleCls}>
              {migrationProgress.status === 'completed' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-400" />
              )}
              {migrationProgress.status === 'completed' ? 'Import Complete' : 'Import Failed'}
            </div>

            <p className="text-xs text-[var(--platform-text-muted)]">
              {migrationProgress.status === 'completed'
                ? `Successfully imported data from ${migrationPlatform === 'shopify' ? 'Shopify' : 'Etsy'}${migrationShopName ? ` (${migrationShopName})` : ''}.`
                : 'The import encountered errors. You can retry or import from another source.'}
            </p>

            {/* Summary grid */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Products', value: migrationProgress.migrated_products, failed: migrationProgress.failed_products },
                { label: 'Collections', value: migrationProgress.migrated_collections, failed: migrationProgress.failed_collections },
                { label: 'Images', value: migrationProgress.migrated_images, failed: migrationProgress.failed_images },
                { label: 'Orders', value: migrationProgress.migrated_orders, failed: migrationProgress.failed_orders },
                { label: 'Customers', value: migrationProgress.migrated_customers, failed: migrationProgress.failed_customers },
                { label: 'Coupons', value: migrationProgress.migrated_coupons, failed: migrationProgress.failed_coupons },
              ]
                .filter(r => r.value > 0 || r.failed > 0)
                .map(({ label, value, failed }) => (
                  <div
                    key={label}
                    className="rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-2"
                  >
                    <p className="text-[10px] text-[var(--platform-text-muted)]">{label}</p>
                    <p className="text-sm font-semibold text-[var(--platform-text-primary)]">
                      {value}
                      {failed > 0 && (
                        <span className="text-red-400 text-[10px] font-normal ml-1">
                          ({failed} failed)
                        </span>
                      )}
                    </p>
                  </div>
                ))}
            </div>

            {/* Errors */}
            {migrationProgress.errors && migrationProgress.errors.length > 0 && (
              <div className="max-h-32 overflow-y-auto rounded border border-red-500/20 bg-red-500/5 p-3 text-[11px] text-red-400 space-y-1">
                {migrationProgress.errors.slice(0, 20).map((e, i) => (
                  <p key={i}>{e}</p>
                ))}
                {migrationProgress.errors.length > 20 && (
                  <p className="text-[var(--platform-text-muted)]">
                    ...and {migrationProgress.errors.length - 20} more errors
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center gap-3">
              {migrationProgress.status === 'failed' && (
                <button
                  onClick={() => setView('configuring')}
                  className={btnPrimaryCls}
                >
                  Retry Import
                </button>
              )}
              <button
                onClick={() => {
                  setCompletedPlatforms(prev =>
                    migrationProgress.platform && !prev.includes(migrationProgress.platform)
                      ? [...prev, migrationProgress.platform]
                      : prev
                  )
                  setMigrationId(null)
                  setMigrationPlatform(null)
                  setMigrationShopName(null)
                  setMigrationProgress(null)
                  setView('sources')
                }}
                className={btnSecondaryCls}
              >
                Import from Another Source
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
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
