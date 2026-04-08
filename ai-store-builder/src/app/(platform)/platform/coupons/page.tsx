'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import {
  Ticket,
  Plus,
  Search,
  Loader2,
  Percent,
  DollarSign,
  Calendar,
  ChevronDown,
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { PlatformBreadcrumb } from '@/components/ui/breadcrumb'
import { useStoreCurrency } from '@/lib/hooks/use-store-currency'
import { createClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Coupon {
  id: string
  store_id: string
  code: string
  description: string | null
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  minimum_amount: number | null
  max_uses: number | null
  used_count: number
  is_active: boolean
  expires_at: string | null
  created_at: string
}

type StatusFilter = 'all' | 'active' | 'expired' | 'disabled'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCouponStatus(coupon: Coupon): 'active' | 'expired' | 'disabled' {
  if (!coupon.is_active) return 'disabled'
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return 'expired'
  return 'active'
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CouponsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [storeId, setStoreId] = useState<string | null>(null)
  const { currency } = useStoreCurrency()

  // Fetch the merchant's store ID
  useEffect(() => {
    async function fetchStoreId() {
      try {
        const response = await fetch('/api/dashboard/stats')
        if (response.ok) {
          const data = await response.json()
          if (data.store?.id) setStoreId(data.store.id)
        }
      } catch {
        console.error('[Coupons] Failed to fetch store ID')
      }
    }
    fetchStoreId()
  }, [])

  // Fetch coupons from Supabase
  useEffect(() => {
    if (!storeId) {
      setIsLoading(false)
      return
    }
    async function fetchCoupons() {
      try {
        setIsLoading(true)
        const supabase = createClient()
        const { data, error } = await supabase
          .from('coupons')
          .select('*')
          .eq('store_id', storeId)
          .order('created_at', { ascending: false })

        if (error) throw error
        setCoupons((data as Coupon[]) ?? [])
      } catch (err) {
        console.error('[Coupons] Failed to fetch coupons:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchCoupons()
  }, [storeId])

  // Filter coupons by search and status
  const filtered = useMemo(() => {
    return coupons.filter((c) => {
      const matchesSearch = c.code.toLowerCase().includes(search.toLowerCase())
      if (statusFilter === 'all') return matchesSearch
      return matchesSearch && getCouponStatus(c) === statusFilter
    })
  }, [search, statusFilter, coupons])

  // Loading state
  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <PlatformBreadcrumb
          items={[{ label: 'Command Center', href: '/platform' }, { label: 'Coupons' }]}
        />
        <div>
          <h1 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
            Coupons
          </h1>
          <p className="mt-0.5 text-sm text-[var(--platform-text-secondary)]">
            Loading coupons...
          </p>
        </div>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--platform-text-muted)]" />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PlatformBreadcrumb
        items={[{ label: 'Command Center', href: '/platform' }, { label: 'Coupons' }]}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Header                                                             */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
            Coupons
          </h1>
          <p className="mt-0.5 text-sm text-[var(--platform-text-secondary)]">
            {coupons.length} {coupons.length === 1 ? 'coupon' : 'coupons'} in your store
          </p>
        </div>
        <Link
          href="/dashboard/coupons/create"
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3 py-1.5',
            'bg-[var(--platform-accent)] text-white text-xs font-medium',
            'hover:opacity-90 transition-opacity',
          )}
        >
          <Plus className="h-3.5 w-3.5" />
          Create Coupon
        </Link>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Filter bar                                                         */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--platform-text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code..."
            aria-label="Search coupons"
            className={cn(
              'w-full rounded-lg border border-[var(--platform-border)]',
              'bg-[var(--platform-surface)] pl-8 pr-3 py-1.5',
              'font-mono text-xs text-[var(--platform-text-primary)]',
              'placeholder:text-[var(--platform-text-muted)]',
              'outline-none transition-colors',
              'hover:border-[var(--platform-border-hover)] focus:border-[var(--platform-accent)]',
            )}
          />
        </div>

        {/* Status filter */}
        <FilterSelect
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as StatusFilter)}
          aria-label="Filter by status"
          options={[
            { value: 'all', label: 'All status' },
            { value: 'active', label: 'Active' },
            { value: 'expired', label: 'Expired' },
            { value: 'disabled', label: 'Disabled' },
          ]}
        />
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Table                                                              */}
      {/* ----------------------------------------------------------------- */}
      <div className="rounded-xl border border-[var(--platform-border)] overflow-x-auto overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            hasFilters={search !== '' || statusFilter !== 'all'}
            totalCoupons={coupons.length}
          />
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--platform-border)] bg-[var(--platform-surface)]">
                <th className="px-4 py-2.5 text-left font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
                  Code
                </th>
                <th className="px-4 py-2.5 text-left font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
                  Discount
                </th>
                <th className="px-4 py-2.5 text-right font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
                  Min. Order
                </th>
                <th className="px-4 py-2.5 text-right font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
                  Usage
                </th>
                <th className="px-4 py-2.5 text-left font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
                  Status
                </th>
                <th className="px-4 py-2.5 text-left font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
                  Expires
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--platform-border)] bg-[var(--platform-bg)]">
              {filtered.map((coupon) => (
                <CouponRow key={coupon.id} coupon={coupon} currency={currency} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Count footer */}
      {filtered.length > 0 && (
        <p className="text-center font-mono text-[10px] text-[var(--platform-text-muted)]">
          {filtered.length} of {coupons.length} coupons
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface CouponRowProps {
  coupon: Coupon
  currency: string
}

function CouponRow({ coupon, currency }: CouponRowProps) {
  const status = getCouponStatus(coupon)

  const discountLabel =
    coupon.discount_type === 'percentage'
      ? `${coupon.discount_value}% off`
      : `${formatCurrency(coupon.discount_value, currency)} off`

  const DiscountIcon = coupon.discount_type === 'percentage' ? Percent : DollarSign

  return (
    <tr className="transition-colors hover:bg-[var(--platform-surface-hover)]">
      {/* Code + description */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-[var(--platform-surface)] border border-[var(--platform-border)]">
            <Ticket className="h-3.5 w-3.5 text-[var(--platform-text-muted)]" />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-sm font-medium text-[var(--platform-text-primary)]">
              {coupon.code}
            </p>
            {coupon.description && (
              <p className="mt-0.5 truncate max-w-[220px] text-[10px] text-[var(--platform-text-muted)]">
                {coupon.description}
              </p>
            )}
          </div>
        </div>
      </td>

      {/* Discount */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <DiscountIcon className="h-3 w-3 text-[var(--platform-text-muted)]" />
          <span className="font-mono text-[var(--platform-text-primary)]">{discountLabel}</span>
        </div>
      </td>

      {/* Min. order */}
      <td className="px-4 py-3 text-right">
        <span className="font-mono text-[var(--platform-text-secondary)]">
          {coupon.minimum_amount
            ? formatCurrency(coupon.minimum_amount, currency)
            : '\u2014'}
        </span>
      </td>

      {/* Usage */}
      <td className="px-4 py-3 text-right">
        <span className="font-mono text-[var(--platform-text-secondary)]">
          {coupon.used_count}
          {' / '}
          {coupon.max_uses ?? 'Unlimited'}
        </span>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <StatusBadge status={status} />
      </td>

      {/* Expires */}
      <td className="px-4 py-3">
        <span className="flex items-center gap-1.5 font-mono text-[var(--platform-text-muted)]">
          <Calendar className="h-3 w-3" />
          {coupon.expires_at ? formatDate(coupon.expires_at) : 'No expiry'}
        </span>
      </td>
    </tr>
  )
}

// ---------------------------------------------------------------------------

interface StatusBadgeProps {
  status: 'active' | 'expired' | 'disabled'
}

function StatusBadge({ status }: StatusBadgeProps) {
  const styles: Record<typeof status, string> = {
    active: 'bg-green-500/10 text-green-400',
    expired: 'bg-red-500/10 text-red-400',
    disabled: 'bg-[var(--platform-surface-hover)] text-[var(--platform-text-muted)]',
  }

  const labels: Record<typeof status, string> = {
    active: 'Active',
    expired: 'Expired',
    disabled: 'Disabled',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
        styles[status],
      )}
    >
      <span
        className={cn(
          'inline-block h-1.5 w-1.5 rounded-full',
          status === 'active' && 'bg-green-400',
          status === 'expired' && 'bg-red-400',
          status === 'disabled' && 'bg-[var(--platform-text-muted)]',
        )}
      />
      {labels[status]}
    </span>
  )
}

// ---------------------------------------------------------------------------

interface FilterSelectProps {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  'aria-label'?: string
}

function FilterSelect({ value, onChange, options, 'aria-label': ariaLabel }: FilterSelectProps) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        className={cn(
          'appearance-none rounded-lg border border-[var(--platform-border)]',
          'bg-[var(--platform-surface)] px-3 py-1.5 pr-7',
          'font-mono text-xs text-[var(--platform-text-secondary)]',
          'cursor-pointer outline-none transition-colors',
          'hover:border-[var(--platform-border-hover)] focus:border-[var(--platform-accent)]',
        )}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--platform-text-muted)]" />
    </div>
  )
}

// ---------------------------------------------------------------------------

interface EmptyStateProps {
  hasFilters: boolean
  totalCoupons: number
}

function EmptyState({ hasFilters, totalCoupons }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 bg-[var(--platform-surface)]">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--platform-surface-hover)]">
        <Ticket className="h-5 w-5 text-[var(--platform-text-muted)]" />
      </div>
      <p className="font-mono text-sm text-[var(--platform-text-primary)]">
        {hasFilters ? 'No matching coupons' : 'No coupons yet'}
      </p>
      <p className="mt-1 text-xs text-[var(--platform-text-muted)]">
        {hasFilters
          ? 'Try adjusting your filters'
          : 'Create your first coupon to start offering discounts'}
      </p>
      {!hasFilters && totalCoupons === 0 && (
        <Link
          href="/dashboard/coupons/create"
          className={cn(
            'mt-4 flex items-center gap-1.5 rounded-lg px-3 py-1.5',
            'bg-[var(--platform-accent)] text-white text-xs font-medium',
            'hover:opacity-90 transition-opacity',
          )}
        >
          <Plus className="h-3.5 w-3.5" />
          Create Coupon
        </Link>
      )}
    </div>
  )
}
