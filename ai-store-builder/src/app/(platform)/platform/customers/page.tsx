'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  Phone,
  ShoppingBag,
  Calendar,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  X,
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { PlatformBreadcrumb } from '@/components/ui/breadcrumb'
import { useStoreCurrency } from '@/lib/hooks/use-store-currency'
import { createClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CustomerData {
  id: string
  store_id: string
  email: string
  full_name: string
  phone: string | null
  created_at: string
  total_orders: number
  total_spent: number
  last_order_at: string | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 30) return `${diffDays}d ago`
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20

type SortField = 'created_at' | 'total_orders' | 'total_spent' | 'last_order_at'
type SortDirection = 'asc' | 'desc'

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CustomersPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [customers, setCustomers] = useState<CustomerData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [storeId, setStoreId] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null)
  const { currency } = useStoreCurrency()

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(0)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

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
        console.error('[Customers] Failed to fetch store ID')
      }
    }
    fetchStoreId()
  }, [])

  // Fetch customers from Supabase with pagination, sorting, and search
  const fetchCustomers = useCallback(async () => {
    if (!storeId) {
      setIsLoading(false)
      return
    }
    try {
      setIsLoading(true)
      const supabase = createClient()

      const offset = page * PAGE_SIZE
      const limit = PAGE_SIZE

      let query = supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .eq('store_id', storeId)
        .order(sortField, { ascending: sortDirection === 'asc' })
        .range(offset, offset + limit - 1)

      if (debouncedSearch) {
        query = query.or(
          `full_name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%,phone.ilike.%${debouncedSearch}%`
        )
      }

      const { data, count, error } = await query

      if (error) throw error
      setCustomers((data as CustomerData[]) ?? [])
      setTotalCount(count ?? 0)
    } catch (err) {
      console.error('[Customers] Failed to fetch customers:', err)
    } finally {
      setIsLoading(false)
    }
  }, [storeId, page, sortField, sortDirection, debouncedSearch])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  // Sort handler
  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
    setPage(0)
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  // Close detail panel on Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setSelectedCustomer(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Compute stats from current result set metadata
  const stats = useMemo(() => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const newThisMonth = customers.filter(
      (c) => new Date(c.created_at) >= startOfMonth
    ).length

    const totalRevenue = customers.reduce((sum, c) => sum + Number(c.total_spent ?? 0), 0)
    const totalOrders = customers.reduce((sum, c) => sum + Number(c.total_orders ?? 0), 0)
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    return { newThisMonth, totalRevenue, totalOrders, avgOrderValue }
  }, [customers])

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  if (isLoading && customers.length === 0) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <PlatformBreadcrumb
          items={[{ label: 'Command Center', href: '/platform' }, { label: 'Customers' }]}
        />
        <div>
          <h1 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
            Customers
          </h1>
          <p className="mt-0.5 text-sm text-[var(--platform-text-secondary)]">
            Loading customers...
          </p>
        </div>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--platform-text-muted)]" />
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Main render
  // -------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PlatformBreadcrumb
        items={[{ label: 'Command Center', href: '/platform' }, { label: 'Customers' }]}
      />

      {/* ------------------------------------------------------------------ */}
      {/* Header                                                               */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
                Customers
              </h1>
              <span
                className={cn(
                  'rounded-full border border-[var(--platform-border)] px-2 py-0.5',
                  'font-mono text-[10px] text-[var(--platform-text-muted)]',
                )}
              >
                {totalCount}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-[var(--platform-text-secondary)]">
              People who have ordered from your store
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--platform-text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone..."
            aria-label="Search customers"
            className={cn(
              'w-full rounded-lg border border-[var(--platform-border)]',
              'bg-[var(--platform-bg)] px-3 py-2 pl-9',
              'text-sm text-[var(--platform-text-primary)]',
              'placeholder:text-[var(--platform-text-muted)]',
              'outline-none transition-colors',
              'hover:border-[var(--platform-border-hover)] focus:border-[var(--platform-accent)]',
            )}
          />
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Stats row                                                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Total Customers"
          value={String(totalCount)}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="New This Month"
          value={String(stats.newThisMonth)}
          icon={<Calendar className="h-4 w-4" />}
        />
        <StatCard
          label="Total Revenue"
          value={formatCurrency(stats.totalRevenue, currency)}
          icon={<ShoppingBag className="h-4 w-4" />}
        />
        <StatCard
          label="Avg Order Value"
          value={formatCurrency(stats.avgOrderValue, currency)}
          icon={<ShoppingBag className="h-4 w-4" />}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Table                                                                */}
      {/* ------------------------------------------------------------------ */}
      <div className="rounded-xl border border-[var(--platform-border)] overflow-x-auto overflow-hidden">
        {customers.length === 0 ? (
          <EmptyState hasSearch={debouncedSearch !== ''} />
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--platform-border)] bg-[var(--platform-surface)]">
                <Th>Customer</Th>
                <Th>Phone</Th>
                <SortableTh
                  field="total_orders"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                  align="right"
                >
                  Orders
                </SortableTh>
                <SortableTh
                  field="total_spent"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                  align="right"
                >
                  Total Spent
                </SortableTh>
                <SortableTh
                  field="last_order_at"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                >
                  Last Order
                </SortableTh>
                <SortableTh
                  field="created_at"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                >
                  Joined
                </SortableTh>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--platform-border)] bg-[var(--platform-bg)]">
              {customers.map((customer) => (
                <CustomerRow
                  key={customer.id}
                  customer={customer}
                  currency={currency}
                  isSelected={selectedCustomer?.id === customer.id}
                  onClick={() =>
                    setSelectedCustomer((prev) =>
                      prev?.id === customer.id ? null : customer
                    )
                  }
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Pagination                                                           */}
      {/* ------------------------------------------------------------------ */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className={cn(
              'flex items-center gap-1 rounded-lg border border-[var(--platform-border)] px-3 py-1.5 font-mono text-xs transition-colors',
              page === 0
                ? 'cursor-not-allowed text-[var(--platform-text-muted)] opacity-40'
                : 'text-[var(--platform-text-secondary)] hover:border-[var(--platform-border-hover)] hover:text-[var(--platform-text-primary)]',
            )}
          >
            <ChevronLeft className="h-3 w-3" />
            Previous
          </button>
          <span className="font-mono text-xs text-[var(--platform-text-muted)]">
            Page {page + 1} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            className={cn(
              'flex items-center gap-1 rounded-lg border border-[var(--platform-border)] px-3 py-1.5 font-mono text-xs transition-colors',
              page >= totalPages - 1
                ? 'cursor-not-allowed text-[var(--platform-text-muted)] opacity-40'
                : 'text-[var(--platform-text-secondary)] hover:border-[var(--platform-border-hover)] hover:text-[var(--platform-text-primary)]',
            )}
          >
            Next
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      )}

      {customers.length > 0 && (
        <p className="text-center font-mono text-[10px] text-[var(--platform-text-muted)]">
          {customers.length} of {totalCount} customers
        </p>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Slide-over detail panel                                              */}
      {/* ------------------------------------------------------------------ */}
      {/* Backdrop */}
      {selectedCustomer && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm sm:hidden"
          onClick={() => setSelectedCustomer(null)}
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <aside
        aria-label="Customer detail"
        className={cn(
          'fixed right-0 top-0 z-50 h-full w-full max-w-[400px]',
          'border-l border-[var(--platform-border)] bg-[var(--platform-surface)]',
          'flex flex-col overflow-hidden shadow-2xl',
          'transition-transform duration-300 ease-in-out',
          selectedCustomer ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {selectedCustomer && (
          <CustomerDetail
            customer={selectedCustomer}
            currency={currency}
            onClose={() => setSelectedCustomer(null)}
          />
        )}
      </aside>
    </div>
  )
}

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-4">
      <div className="flex items-center gap-2 text-[var(--platform-text-muted)]">
        {icon}
        <span className="font-mono text-[10px] font-medium uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="mt-2 font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
        {value}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Th helper
// ---------------------------------------------------------------------------

function Th({
  children,
  align = 'left',
}: {
  children: React.ReactNode
  align?: 'left' | 'right'
}) {
  return (
    <th
      className={cn(
        'px-4 py-2.5 font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]',
        align === 'right' ? 'text-right' : 'text-left',
      )}
    >
      {children}
    </th>
  )
}

// ---------------------------------------------------------------------------
// SortableTh
// ---------------------------------------------------------------------------

function SortableTh({
  children,
  field,
  currentField,
  direction,
  onSort,
  align = 'left',
}: {
  children: React.ReactNode
  field: SortField
  currentField: SortField
  direction: SortDirection
  onSort: (field: SortField) => void
  align?: 'left' | 'right'
}) {
  const isActive = field === currentField
  return (
    <th
      className={cn(
        'px-4 py-2.5 font-mono text-[10px] font-medium uppercase tracking-wider cursor-pointer select-none transition-colors',
        align === 'right' ? 'text-right' : 'text-left',
        isActive
          ? 'text-[var(--platform-text-primary)]'
          : 'text-[var(--platform-text-muted)] hover:text-[var(--platform-text-secondary)]',
      )}
      onClick={() => onSort(field)}
    >
      <span
        className={cn(
          'inline-flex items-center gap-1',
          align === 'right' && 'justify-end',
        )}
      >
        {children}
        {isActive ? (
          direction === 'asc' ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </span>
    </th>
  )
}

// ---------------------------------------------------------------------------
// CustomerRow
// ---------------------------------------------------------------------------

interface CustomerRowProps {
  customer: CustomerData
  currency: string
  isSelected: boolean
  onClick: () => void
}

function CustomerRow({ customer, currency, isSelected, onClick }: CustomerRowProps) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        'cursor-pointer transition-colors',
        isSelected
          ? 'bg-[var(--platform-surface-active)]'
          : 'hover:bg-[var(--platform-surface-hover)]',
      )}
    >
      {/* Customer name + email */}
      <td className="px-4 py-3">
        <p className="font-medium text-[var(--platform-text-primary)]">
          {customer.full_name || 'Unknown'}
        </p>
        <p className="mt-0.5 font-mono text-[10px] text-[var(--platform-text-muted)]">
          {customer.email}
        </p>
      </td>

      {/* Phone */}
      <td className="px-4 py-3">
        <span className="font-mono text-[var(--platform-text-secondary)]">
          {customer.phone || '---'}
        </span>
      </td>

      {/* Orders */}
      <td className="px-4 py-3 text-right">
        <span className="font-mono text-[var(--platform-text-primary)]">
          {customer.total_orders ?? 0}
        </span>
      </td>

      {/* Total Spent */}
      <td className="px-4 py-3 text-right">
        <span className="font-mono text-[var(--platform-text-primary)]">
          {formatCurrency(Number(customer.total_spent ?? 0), currency)}
        </span>
      </td>

      {/* Last Order */}
      <td className="px-4 py-3">
        <span className="font-mono text-[var(--platform-text-muted)]">
          {customer.last_order_at ? formatRelativeDate(customer.last_order_at) : '---'}
        </span>
      </td>

      {/* Joined */}
      <td className="px-4 py-3">
        <span className="font-mono text-[var(--platform-text-muted)]">
          {formatDate(customer.created_at)}
        </span>
      </td>
    </tr>
  )
}

// ---------------------------------------------------------------------------
// CustomerDetail slide-over content
// ---------------------------------------------------------------------------

interface CustomerDetailProps {
  customer: CustomerData
  currency: string
  onClose: () => void
}

function CustomerDetail({ customer, currency, onClose }: CustomerDetailProps) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--platform-border)] px-5 py-4">
        <div>
          <p className="font-mono text-xs text-[var(--platform-text-muted)]">Customer</p>
          <h2 className="font-mono text-base font-semibold text-[var(--platform-text-primary)]">
            {customer.full_name || 'Unknown'}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-md',
            'text-[var(--platform-text-muted)]',
            'hover:bg-[var(--platform-surface-hover)] hover:text-[var(--platform-text-primary)]',
            'transition-colors',
          )}
          aria-label="Close customer detail"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* Contact section */}
        <Section icon={<Mail className="h-3.5 w-3.5" />} title="Contact">
          <InfoRow label="Email" value={customer.email} mono />
          <InfoRow label="Phone" value={customer.phone || '---'} mono />
        </Section>

        {/* Orders section */}
        <Section icon={<ShoppingBag className="h-3.5 w-3.5" />} title="Orders">
          <InfoRow
            label="Total orders"
            value={String(customer.total_orders ?? 0)}
            mono
          />
          <InfoRow
            label="Total spent"
            value={formatCurrency(Number(customer.total_spent ?? 0), currency)}
            mono
          />
          <InfoRow
            label="Avg per order"
            value={
              customer.total_orders > 0
                ? formatCurrency(
                    Number(customer.total_spent ?? 0) / customer.total_orders,
                    currency,
                  )
                : '---'
            }
            mono
          />
        </Section>

        {/* Timeline section */}
        <Section icon={<Calendar className="h-3.5 w-3.5" />} title="Timeline">
          <InfoRow
            label="Customer since"
            value={formatDate(customer.created_at)}
            mono
          />
          <InfoRow
            label="Last order"
            value={
              customer.last_order_at
                ? formatRelativeDate(customer.last_order_at)
                : 'Never'
            }
            mono
          />
        </Section>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Section + InfoRow helpers
// ---------------------------------------------------------------------------

interface SectionProps {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}

function Section({ icon, title, children }: SectionProps) {
  return (
    <div className="border-b border-[var(--platform-border)] px-5 py-4">
      <div className="mb-3 flex items-center gap-1.5 text-[var(--platform-text-muted)]">
        {icon}
        <span className="font-mono text-[10px] font-medium uppercase tracking-wider">
          {title}
        </span>
      </div>
      {children}
    </div>
  )
}

interface InfoRowProps {
  label: string
  value: string
  mono?: boolean
}

function InfoRow({ label, value, mono }: InfoRowProps) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[11px] text-[var(--platform-text-muted)]">{label}</span>
      <span
        className={cn(
          'text-[11px] text-[var(--platform-text-secondary)]',
          mono && 'font-mono',
        )}
      >
        {value}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center bg-[var(--platform-surface)] py-20">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--platform-surface-hover)]">
        <Users className="h-5 w-5 text-[var(--platform-text-muted)]" />
      </div>
      <p className="font-mono text-sm text-[var(--platform-text-primary)]">
        {hasSearch ? 'No matching customers' : 'No customers yet'}
      </p>
      <p className="mt-1 text-xs text-[var(--platform-text-muted)]">
        {hasSearch
          ? 'Try adjusting your search terms'
          : 'Customers will appear here once they place their first order'}
      </p>
    </div>
  )
}
