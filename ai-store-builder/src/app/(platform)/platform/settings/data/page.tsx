'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  Download,
  Loader2,
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  CheckCircle2,
  Shield,
  FileText,
  Database,
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

interface DataCounts {
  products: number
  orders: number
  customers: number
}

type ExportCategory = 'products' | 'orders' | 'customers' | 'analytics'
type ExportFormat = 'csv' | 'json'

interface ExportJob {
  category: ExportCategory
  format: ExportFormat
  progress: number // 0-100
  status: 'idle' | 'exporting' | 'done' | 'error'
  error?: string
}

// ---------------------------------------------------------------------------
// Style constants
// ---------------------------------------------------------------------------

const sectionCls =
  'rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-5 space-y-4'

const sectionTitleCls =
  'text-sm font-medium text-[var(--platform-text-primary)] flex items-center gap-2'

const btnPrimaryCls =
  'rounded-lg bg-[var(--platform-accent)] px-4 py-2 text-xs font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2'

const btnSecondaryCls =
  'rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] px-3 py-1.5 text-xs font-medium text-[var(--platform-text-secondary)] hover:bg-[var(--platform-border)]/50 transition-colors disabled:opacity-40'

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
// Helper: auth headers
// ---------------------------------------------------------------------------

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const supabase = createBrowserSupabase()
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` }
    }
  } catch {
    // continue without token
  }
  return {}
}

// ---------------------------------------------------------------------------
// Category metadata
// ---------------------------------------------------------------------------

const CATEGORIES: {
  key: ExportCategory
  label: string
  icon: typeof Package
  iconColor: string
  description: string
  formats: ExportFormat[]
}[] = [
  {
    key: 'products',
    label: 'Products',
    icon: Package,
    iconColor: 'text-orange-400',
    description: 'Titles, descriptions, pricing, inventory, images, variants',
    formats: ['csv', 'json'],
  },
  {
    key: 'orders',
    label: 'Orders',
    icon: ShoppingCart,
    iconColor: 'text-emerald-400',
    description: 'Order history, items, shipping, payment & delivery status',
    formats: ['csv', 'json'],
  },
  {
    key: 'customers',
    label: 'Customers',
    icon: Users,
    iconColor: 'text-blue-400',
    description: 'Names, emails, phones, addresses, order count, total spent',
    formats: ['csv', 'json'],
  },
  {
    key: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    iconColor: 'text-purple-400',
    description: 'Revenue summary, daily sales, top products, order stats',
    formats: ['json'],
  },
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DataExportPage() {
  const [loading, setLoading] = useState(true)
  const [store, setStore] = useState<StoreInfo | null>(null)
  const [counts, setCounts] = useState<DataCounts>({ products: 0, orders: 0, customers: 0 })
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [exportAllProgress, setExportAllProgress] = useState<number | null>(null)

  // Per-category export jobs
  const [jobs, setJobs] = useState<Record<string, ExportJob>>({})

  // --------------------------------------------------
  // Fetch store info & data counts
  // --------------------------------------------------
  useEffect(() => {
    async function load() {
      try {
        const authHeaders = await getAuthHeaders()

        // Fetch store info
        const statsRes = await fetch('/api/dashboard/stats', {
          headers: authHeaders,
          credentials: 'include',
        })
        if (!statsRes.ok) {
          setLoading(false)
          return
        }
        const statsData = await statsRes.json()
        if (!statsData.store) {
          setLoading(false)
          return
        }
        setStore({
          id: statsData.store.id,
          slug: statsData.store.slug,
          name: statsData.store.name,
        })
        setCounts(prev => ({ ...prev, products: statsData.productCount || 0 }))

        // Fetch order + customer counts in parallel
        const [ordersRes, customersRes] = await Promise.all([
          fetch('/api/dashboard/orders?count_only=true', {
            headers: authHeaders,
            credentials: 'include',
          }).catch(() => null),
          fetch('/api/dashboard/customers?count_only=true', {
            headers: authHeaders,
            credentials: 'include',
          }).catch(() => null),
        ])

        if (ordersRes?.ok) {
          const d = await ordersRes.json()
          setCounts(prev => ({ ...prev, orders: d.totalCount ?? d.count ?? 0 }))
        }
        if (customersRes?.ok) {
          const d = await customersRes.json()
          setCounts(prev => ({ ...prev, customers: d.totalCount ?? d.count ?? 0 }))
        }
      } catch (err) {
        console.error('Failed to load store data:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // --------------------------------------------------
  // Export a single category
  // --------------------------------------------------
  const handleExportCategory = useCallback(
    async (category: ExportCategory, format: ExportFormat) => {
      if (!store) return
      const jobKey = `${category}-${format}`

      setJobs(prev => ({
        ...prev,
        [jobKey]: { category, format, progress: 10, status: 'exporting' },
      }))

      try {
        const authHeaders = await getAuthHeaders()

        // Simulate progress
        const progressInterval = setInterval(() => {
          setJobs(prev => {
            const job = prev[jobKey]
            if (!job || job.status !== 'exporting') {
              clearInterval(progressInterval)
              return prev
            }
            const next = Math.min(job.progress + Math.random() * 20, 85)
            return { ...prev, [jobKey]: { ...job, progress: next } }
          })
        }, 400)

        const response = await fetch('/api/dashboard/export-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          credentials: 'include',
          body: JSON.stringify({ type: category, format }),
        })

        clearInterval(progressInterval)

        if (!response.ok) {
          const errData = await response.json().catch(() => ({ error: 'Export failed' }))
          throw new Error(errData.error || 'Export failed')
        }

        setJobs(prev => ({
          ...prev,
          [jobKey]: { ...prev[jobKey], progress: 95, status: 'exporting' },
        }))

        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const dateStr = new Date().toISOString().split('T')[0]

        // Determine file extension from content-type or requested format
        const contentDisposition = response.headers.get('content-disposition')
        let filename: string
        if (contentDisposition?.includes('filename=')) {
          filename = contentDisposition.split('filename=')[1].replace(/"/g, '')
        } else {
          const ext = response.headers.get('content-type')?.includes('zip') ? 'zip' : format
          filename = `${store.slug}_${category}_${dateStr}.${ext}`
        }

        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)

        setJobs(prev => ({
          ...prev,
          [jobKey]: { ...prev[jobKey], progress: 100, status: 'done' },
        }))
        setToast({ message: `${category} exported as ${format.toUpperCase()}`, type: 'success' })

        // Reset after a moment
        setTimeout(() => {
          setJobs(prev => {
            const copy = { ...prev }
            delete copy[jobKey]
            return copy
          })
        }, 2000)
      } catch (err) {
        console.error(`Export ${category} failed:`, err)
        setJobs(prev => ({
          ...prev,
          [jobKey]: {
            ...prev[jobKey],
            progress: 0,
            status: 'error',
            error: err instanceof Error ? err.message : 'Export failed',
          },
        }))
        setToast({
          message: err instanceof Error ? err.message : 'Export failed',
          type: 'error',
        })
      }
    },
    [store]
  )

  // --------------------------------------------------
  // Export ALL data (ZIP bundle)
  // --------------------------------------------------
  const handleExportAll = useCallback(async () => {
    if (!store) return
    setExportAllProgress(5)

    try {
      const authHeaders = await getAuthHeaders()

      const progressInterval = setInterval(() => {
        setExportAllProgress(prev =>
          prev !== null && prev < 85 ? prev + Math.random() * 12 : prev
        )
      }, 500)

      const response = await fetch('/api/dashboard/export-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        credentials: 'include',
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Export failed' }))
        throw new Error(errData.error || 'Export failed')
      }

      setExportAllProgress(90)

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const dateStr = new Date().toISOString().split('T')[0]
      a.download = `${store.slug}_data_${dateStr}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      setExportAllProgress(100)
      setToast({ message: 'All data exported successfully', type: 'success' })
      setTimeout(() => setExportAllProgress(null), 2000)
    } catch (err) {
      console.error('Export all failed:', err)
      setExportAllProgress(null)
      setToast({
        message: err instanceof Error ? err.message : 'Export failed',
        type: 'error',
      })
    }
  }, [store])

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
          className="inline-flex items-center gap-1.5 text-xs text-[var(--platform-text-muted)] hover:text-[var(--platform-text-secondary)] transition-colors mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Store Settings
        </Link>
        <h1 className="text-lg font-semibold text-[var(--platform-text-primary)]">
          Data Export
        </h1>
        <p className="text-xs text-[var(--platform-text-muted)] mt-1">
          Download your store data in CSV or JSON format. No lock-in, ever.
        </p>
      </div>

      {/* Data counts overview */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Products', count: counts.products, icon: Package, color: 'text-orange-400' },
          { label: 'Orders', count: counts.orders, icon: ShoppingCart, color: 'text-emerald-400' },
          { label: 'Customers', count: counts.customers, icon: Users, color: 'text-blue-400' },
        ].map(({ label, count, icon: Icon, color }) => (
          <div key={label} className={sectionCls}>
            <div className="flex items-center gap-2">
              <Icon className={cn('h-4 w-4', color)} />
              <span className="text-xs text-[var(--platform-text-muted)]">{label}</span>
            </div>
            <p className="text-xl font-semibold text-[var(--platform-text-primary)]">
              {count.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Per-category export */}
      <div className={sectionCls}>
        <div className={sectionTitleCls}>
          <Database className="h-4 w-4 text-[var(--platform-text-muted)]" />
          Export by Category
        </div>

        <div className="space-y-3">
          {CATEGORIES.map(({ key, label, icon: Icon, iconColor, description, formats }) => {
            return (
              <div
                key={key}
                className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-bg)] p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', iconColor)} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--platform-text-primary)]">
                        {label}
                      </p>
                      <p className="text-[11px] text-[var(--platform-text-muted)] mt-0.5">
                        {description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {formats.map(fmt => {
                      const jobKey = `${key}-${fmt}`
                      const job = jobs[jobKey]
                      const isExporting = job?.status === 'exporting'
                      const isDone = job?.status === 'done'
                      return (
                        <button
                          key={fmt}
                          onClick={() => handleExportCategory(key, fmt)}
                          disabled={isExporting || !store}
                          className={cn(
                            btnSecondaryCls,
                            isDone && 'border-emerald-500/40 text-emerald-400'
                          )}
                        >
                          {isExporting ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : isDone ? (
                            <CheckCircle2 className="inline h-3 w-3 mr-1" />
                          ) : (
                            <Download className="inline h-3 w-3 mr-1" />
                          )}
                          {fmt.toUpperCase()}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Progress bar for active exports */}
                {Object.entries(jobs)
                  .filter(
                    ([jk, j]) => jk.startsWith(`${key}-`) && j.status === 'exporting'
                  )
                  .map(([jk, j]) => (
                    <div key={jk} className="mt-3">
                      <div className="h-1.5 rounded-full bg-[var(--platform-border)]">
                        <div
                          className="h-1.5 rounded-full bg-[var(--platform-accent)] transition-all duration-300"
                          style={{ width: `${Math.round(j.progress)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-[var(--platform-text-muted)] mt-1">
                        Exporting {j.format.toUpperCase()}... {Math.round(j.progress)}%
                      </p>
                    </div>
                  ))}
              </div>
            )
          })}
        </div>
      </div>

      {/* Export All */}
      <div className={sectionCls}>
        <div className={sectionTitleCls}>
          <FileText className="h-4 w-4 text-[var(--platform-text-muted)]" />
          Export Everything
        </div>
        <p className="text-xs text-[var(--platform-text-muted)]">
          Download a ZIP archive with all your data: products, orders, customers,
          analytics, and store settings.
        </p>

        {exportAllProgress !== null && (
          <div>
            <div className="h-1.5 rounded-full bg-[var(--platform-border)]">
              <div
                className="h-1.5 rounded-full bg-[var(--platform-accent)] transition-all duration-300"
                style={{ width: `${Math.round(exportAllProgress)}%` }}
              />
            </div>
            <p className="text-[10px] text-[var(--platform-text-muted)] mt-1">
              {exportAllProgress >= 100
                ? 'Done!'
                : `Preparing archive... ${Math.round(exportAllProgress)}%`}
            </p>
          </div>
        )}

        <button
          onClick={handleExportAll}
          disabled={exportAllProgress !== null || !store}
          className={btnPrimaryCls}
        >
          {exportAllProgress !== null && exportAllProgress < 100 ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          Download All Data (.zip)
        </button>
      </div>

      {/* Data Ownership */}
      <div className={sectionCls}>
        <div className={sectionTitleCls}>
          <Shield className="h-4 w-4 text-[var(--platform-text-muted)]" />
          Data Ownership
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              title: 'Full Data Portability',
              desc: 'Export all data in standard formats (CSV, JSON)',
            },
            {
              title: 'No Vendor Lock-in',
              desc: 'Migrate to any platform anytime with your complete data',
            },
            {
              title: 'GDPR Compliant',
              desc: 'Meet data protection requirements with easy exports',
            },
            {
              title: 'Unlimited Exports',
              desc: 'Export your data as many times as you need',
            },
          ].map(({ title, desc }) => (
            <div key={title} className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-[var(--platform-text-primary)]">
                  {title}
                </p>
                <p className="text-[11px] text-[var(--platform-text-muted)] mt-0.5">
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

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
