'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Search, ChevronDown, ChevronUp, ShoppingBag, X, User, CreditCard, Package, Loader2, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { PlatformBreadcrumb } from '@/components/ui/breadcrumb'
import { useStoreCurrency } from '@/lib/hooks/use-store-currency'
import { createClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OrderStatus = 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
type PaymentMethod = 'razorpay' | 'cod' | 'stripe'

interface OrderData {
  id: string
  order_number: string
  customer_name: string
  customer_email: string
  total_amount: number
  order_status: OrderStatus
  created_at: string
  payment_method: PaymentMethod
  order_items: { id: string }[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; dotCls: string; badgeCls: string }> = {
  confirmed: {
    label: 'Confirmed',
    dotCls: 'bg-blue-400',
    badgeCls: 'border-blue-500/20 bg-blue-500/10 text-blue-400',
  },
  processing: {
    label: 'Processing',
    dotCls: 'bg-amber-400',
    badgeCls: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
  },
  shipped: {
    label: 'Shipped',
    dotCls: 'bg-purple-400',
    badgeCls: 'border-purple-500/20 bg-purple-500/10 text-purple-400',
  },
  delivered: {
    label: 'Delivered',
    dotCls: 'bg-green-400',
    badgeCls: 'border-green-500/20 bg-green-500/10 text-green-400',
  },
  cancelled: {
    label: 'Cancelled',
    dotCls: 'bg-red-400',
    badgeCls: 'border-red-500/20 bg-red-500/10 text-red-400',
  },
}

type StatusFilter = 'all' | OrderStatus

// PL-04: Pagination constants
const PAGE_SIZE = 20

// PL-05: Sort types
type SortField = 'created_at' | 'total_amount' | 'order_status'
type SortDirection = 'asc' | 'desc'

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function OrdersPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null)
  const [orders, setOrders] = useState<OrderData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [storeId, setStoreId] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkUpdating, setBulkUpdating] = useState(false)
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
        console.error('[Orders] Failed to fetch store ID')
      }
    }
    fetchStoreId()
  }, [])

  // Fetch orders from Supabase with pagination and sorting
  const fetchOrders = useCallback(async () => {
    if (!storeId) {
      setIsLoading(false)
      return
    }
    try {
      setIsLoading(true)
      const supabase = createClient()

      // First get total count
      const { count } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', storeId)

      setTotalCount(count ?? 0)

      const from = page * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, customer_name, customer_email, total_amount, order_status, created_at, payment_method, order_items(id)')
        .eq('store_id', storeId)
        .order(sortField, { ascending: sortDirection === 'asc' })
        .range(from, to)

      if (error) throw error
      setOrders((data as OrderData[]) ?? [])
    } catch (err) {
      console.error('[Orders] Failed to fetch orders:', err)
    } finally {
      setIsLoading(false)
    }
  }, [storeId, page, sortField, sortDirection])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // PL-05: Sort handler
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

  // Close panel on Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setSelectedOrder(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return orders.filter((o) => {
      const matchesSearch =
        (o.order_number?.toString() ?? '').includes(q) ||
        (o.customer_name ?? '').toLowerCase().includes(q) ||
        (o.customer_email ?? '').toLowerCase().includes(q)
      const matchesStatus = statusFilter === 'all' || o.order_status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [search, statusFilter, orders])

  // Status counts for tab badges
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length }
    for (const o of orders) {
      counts[o.order_status] = (counts[o.order_status] || 0) + 1
    }
    return counts
  }, [orders])

  // Bulk selection helpers
  function toggleSelectAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map((o) => o.id)))
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Bulk status update
  async function handleBulkStatusUpdate(newStatus: OrderStatus) {
    if (selectedIds.size === 0 || !storeId) return
    setBulkUpdating(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('orders')
        .update({ order_status: newStatus })
        .in('id', Array.from(selectedIds))
        .eq('store_id', storeId)
      if (!error) {
        setSelectedIds(new Set())
        fetchOrders()
      }
    } catch {
      console.error('[Orders] Bulk update failed')
    } finally {
      setBulkUpdating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <PlatformBreadcrumb items={[{ label: 'Command Center', href: '/platform' }, { label: 'Orders' }]} />
        <div>
          <h1 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
            Orders
          </h1>
          <p className="mt-0.5 text-sm text-[var(--platform-text-secondary)]">
            Loading orders...
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
      <PlatformBreadcrumb items={[{ label: 'Command Center', href: '/platform' }, { label: 'Orders' }]} />
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                               */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
            Orders
          </h1>
          <p className="mt-0.5 text-sm text-[var(--platform-text-secondary)]">
            {orders.length} orders total
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Status tab bar                                                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex gap-0 border-b border-[var(--platform-border)] overflow-x-auto">
        {([
          { value: 'all', label: 'All' },
          { value: 'confirmed', label: 'Confirmed' },
          { value: 'processing', label: 'Processing' },
          { value: 'shipped', label: 'Shipped' },
          { value: 'delivered', label: 'Delivered' },
          { value: 'cancelled', label: 'Cancelled' },
        ] as const).map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => { setStatusFilter(tab.value); setPage(0); setSelectedIds(new Set()) }}
            className={cn(
              'flex items-center gap-1.5 whitespace-nowrap px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px',
              statusFilter === tab.value
                ? 'border-[var(--platform-accent)] text-[var(--platform-text-primary)]'
                : 'border-transparent text-[var(--platform-text-muted)] hover:text-[var(--platform-text-secondary)]'
            )}
          >
            {tab.label}
            {(statusCounts[tab.value] ?? 0) > 0 && (
              <span className={cn(
                'rounded-full px-1.5 py-px font-mono text-[9px]',
                statusFilter === tab.value
                  ? 'bg-[var(--platform-accent)]/15 text-[var(--platform-accent)]'
                  : 'bg-[var(--platform-surface-hover)] text-[var(--platform-text-muted)]'
              )}>
                {statusCounts[tab.value]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Search + Bulk actions bar                                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--platform-text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order # or customer…"
            aria-label="Search orders"
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

        {/* Bulk actions — shown when orders are selected */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-[var(--platform-text-muted)]">
              {selectedIds.size} selected
            </span>
            <button
              type="button"
              disabled={bulkUpdating}
              onClick={() => handleBulkStatusUpdate('processing')}
              className="rounded border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-medium text-amber-400 transition-colors hover:bg-amber-500/20 disabled:opacity-50"
            >
              Mark Processing
            </button>
            <button
              type="button"
              disabled={bulkUpdating}
              onClick={() => handleBulkStatusUpdate('shipped')}
              className="rounded border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-[10px] font-medium text-purple-400 transition-colors hover:bg-purple-500/20 disabled:opacity-50"
            >
              Mark Shipped
            </button>
            <button
              type="button"
              disabled={bulkUpdating}
              onClick={() => handleBulkStatusUpdate('delivered')}
              className="rounded border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-[10px] font-medium text-green-400 transition-colors hover:bg-green-500/20 disabled:opacity-50"
            >
              Mark Delivered
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="rounded border border-[var(--platform-border)] px-2.5 py-1 text-[10px] font-medium text-[var(--platform-text-muted)] transition-colors hover:text-[var(--platform-text-secondary)]"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Table                                                                */}
      {/* ------------------------------------------------------------------ */}
      <div className="rounded-xl border border-[var(--platform-border)] overflow-x-auto overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState hasFilters={search !== '' || statusFilter !== 'all'} />
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--platform-border)] bg-[var(--platform-surface)]">
                <th className="w-10 px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedIds.size === filtered.length}
                    onChange={toggleSelectAll}
                    className="h-3.5 w-3.5 rounded border-[var(--platform-border)] accent-[var(--platform-accent)] cursor-pointer"
                    aria-label="Select all orders"
                  />
                </th>
                <Th>Order #</Th>
                <Th>Customer</Th>
                <SortableTh field="total_amount" currentField={sortField} direction={sortDirection} onSort={handleSort} align="right">Total</SortableTh>
                <Th align="right">Items</Th>
                <SortableTh field="order_status" currentField={sortField} direction={sortDirection} onSort={handleSort}>Status</SortableTh>
                <Th>Payment</Th>
                <SortableTh field="created_at" currentField={sortField} direction={sortDirection} onSort={handleSort}>Date</SortableTh>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--platform-border)] bg-[var(--platform-bg)]">
              {filtered.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  currency={currency}
                  isSelected={selectedOrder?.id === order.id}
                  isChecked={selectedIds.has(order.id)}
                  onCheck={() => toggleSelect(order.id)}
                  onClick={() =>
                    setSelectedOrder((prev) => (prev?.id === order.id ? null : order))
                  }
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* PL-04: Pagination controls */}
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
                : 'text-[var(--platform-text-secondary)] hover:border-[var(--platform-border-hover)] hover:text-[var(--platform-text-primary)]'
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
                : 'text-[var(--platform-text-secondary)] hover:border-[var(--platform-border-hover)] hover:text-[var(--platform-text-primary)]'
            )}
          >
            Next
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      )}

      {filtered.length > 0 && (
        <p className="text-center font-mono text-[10px] text-[var(--platform-text-muted)]">
          {filtered.length} of {totalCount} orders
        </p>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Slide-over detail panel                                              */}
      {/* ------------------------------------------------------------------ */}
      {/* Backdrop */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm sm:hidden"
          onClick={() => setSelectedOrder(null)}
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <aside
        aria-label="Order detail"
        className={cn(
          'fixed right-0 top-0 z-50 h-full w-full max-w-[400px]',
          'border-l border-[var(--platform-border)] bg-[var(--platform-surface)]',
          'flex flex-col overflow-hidden shadow-2xl',
          'transition-transform duration-300 ease-in-out',
          selectedOrder ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {selectedOrder && <OrderDetail order={selectedOrder} currency={currency} storeId={storeId} onClose={() => setSelectedOrder(null)} onStatusUpdate={() => { setSelectedOrder(null); fetchOrders() }} />}
      </aside>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Th helper
// ---------------------------------------------------------------------------

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
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

// PL-05: Sortable table header
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
        isActive ? 'text-[var(--platform-text-primary)]' : 'text-[var(--platform-text-muted)] hover:text-[var(--platform-text-secondary)]',
      )}
      onClick={() => onSort(field)}
    >
      <span className={cn('inline-flex items-center gap-1', align === 'right' && 'justify-end')}>
        {children}
        {isActive ? (
          direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </span>
    </th>
  )
}

// ---------------------------------------------------------------------------
// OrderRow
// ---------------------------------------------------------------------------

interface OrderRowProps {
  order: OrderData
  currency: string
  isSelected: boolean
  isChecked: boolean
  onCheck: () => void
  onClick: () => void
}

function OrderRow({ order, currency, isSelected, isChecked, onCheck, onClick }: OrderRowProps) {
  const sc = STATUS_CONFIG[order.order_status] ?? STATUS_CONFIG.confirmed

  return (
    <tr
      onClick={onClick}
      className={cn(
        'cursor-pointer transition-colors',
        isSelected
          ? 'bg-[var(--platform-surface-active)]'
          : isChecked
            ? 'bg-[var(--platform-accent)]/5'
            : 'hover:bg-[var(--platform-surface-hover)]',
      )}
    >
      {/* Checkbox */}
      <td className="w-10 px-3 py-3" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isChecked}
          onChange={onCheck}
          className="h-3.5 w-3.5 rounded border-[var(--platform-border)] accent-[var(--platform-accent)] cursor-pointer"
          aria-label={`Select order ${order.order_number}`}
        />
      </td>
      {/* Order # */}
      <td className="px-4 py-3">
        <span className="font-mono text-[var(--platform-text-primary)]">#{order.order_number}</span>
      </td>

      {/* Customer */}
      <td className="px-4 py-3">
        <p className="font-medium text-[var(--platform-text-primary)]">{order.customer_name}</p>
        <p className="mt-0.5 font-mono text-[10px] text-[var(--platform-text-muted)]">{order.customer_email}</p>
      </td>

      {/* Total */}
      <td className="px-4 py-3 text-right">
        <span className="font-mono text-[var(--platform-text-primary)]">{formatCurrency(order.total_amount, currency)}</span>
      </td>

      {/* Items */}
      <td className="px-4 py-3 text-right">
        <span className="font-mono text-[var(--platform-text-secondary)]">{order.order_items?.length ?? 0}</span>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px]',
            sc.badgeCls,
          )}
        >
          <span className={cn('inline-block h-1.5 w-1.5 rounded-full', sc.dotCls)} />
          {sc.label}
        </span>
      </td>

      {/* Payment */}
      <td className="px-4 py-3">
        <PaymentBadge method={order.payment_method} />
      </td>

      {/* Date */}
      <td className="px-4 py-3">
        <span className="font-mono text-[var(--platform-text-muted)]">{formatDate(order.created_at)}</span>
      </td>
    </tr>
  )
}

// ---------------------------------------------------------------------------
// PaymentBadge
// ---------------------------------------------------------------------------

function PaymentBadge({ method }: { method: PaymentMethod }) {
  const config = method === 'razorpay'
    ? { cls: 'border-indigo-500/20 bg-indigo-500/10 text-indigo-400', label: 'Razorpay' }
    : method === 'stripe'
    ? { cls: 'border-purple-500/20 bg-purple-500/10 text-purple-400', label: 'Stripe' }
    : { cls: 'border-zinc-500/20 bg-zinc-500/10 text-zinc-400', label: 'COD' }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px]',
        config.cls,
      )}
    >
      {config.label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// OrderDetail slide-over content
// ---------------------------------------------------------------------------

interface OrderDetailProps {
  order: OrderData
  currency: string
  storeId: string | null
  onClose: () => void
  onStatusUpdate: () => void
}

function OrderDetail({ order, currency, storeId, onClose, onStatusUpdate }: OrderDetailProps) {
  const sc = STATUS_CONFIG[order.order_status] ?? STATUS_CONFIG.confirmed
  const [updatingStatus, setUpdatingStatus] = useState(false)

  async function handleStatusChange(newStatus: OrderStatus) {
    if (!storeId || updatingStatus) return
    setUpdatingStatus(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('orders')
        .update({ order_status: newStatus })
        .eq('id', order.id)
        .eq('store_id', storeId)
      if (!error) {
        onStatusUpdate()
      }
    } catch {
      console.error('[Orders] Status update failed')
    } finally {
      setUpdatingStatus(false)
    }
  }

  // Determine available next statuses based on current
  const nextStatuses: { status: OrderStatus; label: string; cls: string }[] = (() => {
    switch (order.order_status) {
      case 'confirmed':
        return [
          { status: 'processing', label: 'Start Processing', cls: 'border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' },
          { status: 'cancelled', label: 'Cancel Order', cls: 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20' },
        ]
      case 'processing':
        return [
          { status: 'shipped', label: 'Mark Shipped', cls: 'border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20' },
          { status: 'cancelled', label: 'Cancel Order', cls: 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20' },
        ]
      case 'shipped':
        return [
          { status: 'delivered', label: 'Mark Delivered', cls: 'border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20' },
        ]
      default:
        return []
    }
  })()

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--platform-border)] px-5 py-4">
        <div>
          <p className="font-mono text-xs text-[var(--platform-text-muted)]">Order</p>
          <h2 className="font-mono text-base font-semibold text-[var(--platform-text-primary)]">
            #{order.order_number}
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
          aria-label="Close order detail"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* Customer section */}
        <Section icon={<User className="h-3.5 w-3.5" />} title="Customer">
          <InfoRow label="Name" value={order.customer_name ?? '—'} mono />
          <InfoRow label="Email" value={order.customer_email ?? '—'} mono />
        </Section>

        {/* Items section */}
        <Section icon={<Package className="h-3.5 w-3.5" />} title="Items">
          <InfoRow label="Item count" value={String(order.order_items?.length ?? 0)} mono />
          <InfoRow label="Order total" value={formatCurrency(order.total_amount, currency)} mono />
        </Section>

        {/* Payment + Status section */}
        <Section icon={<CreditCard className="h-3.5 w-3.5" />} title="Payment & Status">
          <div className="flex items-center justify-between py-1.5">
            <span className="text-[11px] text-[var(--platform-text-muted)]">Status</span>
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px]',
                sc.badgeCls,
              )}
            >
              <span className={cn('inline-block h-1.5 w-1.5 rounded-full', sc.dotCls)} />
              {sc.label}
            </span>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-[11px] text-[var(--platform-text-muted)]">Payment</span>
            <PaymentBadge method={order.payment_method} />
          </div>
          <InfoRow label="Placed at" value={formatDateTime(order.created_at)} mono />
        </Section>

        {/* Actions section */}
        {nextStatuses.length > 0 && (
          <Section icon={<Package className="h-3.5 w-3.5" />} title="Actions">
            <div className="flex flex-wrap gap-2 py-1">
              {nextStatuses.map((ns) => (
                <button
                  key={ns.status}
                  type="button"
                  disabled={updatingStatus}
                  onClick={() => handleStatusChange(ns.status)}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50',
                    ns.cls
                  )}
                >
                  {updatingStatus ? (
                    <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
                  ) : null}
                  {ns.label}
                </button>
              ))}
            </div>
          </Section>
        )}

        {/* View Full Order link */}
        <div className="px-5 py-4">
          <Link
            href={`/platform/orders/${order.id}`}
            className="flex items-center justify-center gap-2 rounded-lg border border-[var(--platform-accent)] px-4 py-2 text-xs font-medium text-[var(--platform-accent)] transition-colors hover:bg-[var(--platform-accent)]/10"
          >
            View Full Order
          </Link>
        </div>
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
        <span className="font-mono text-[10px] font-medium uppercase tracking-wider">{title}</span>
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
// FilterSelect
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
// EmptyState
// ---------------------------------------------------------------------------

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center bg-[var(--platform-surface)] py-20">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--platform-surface-hover)]">
        <ShoppingBag className="h-5 w-5 text-[var(--platform-text-muted)]" />
      </div>
      <p className="font-mono text-sm text-[var(--platform-text-primary)]">
        {hasFilters ? 'No matching orders' : 'No orders yet'}
      </p>
      <p className="mt-1 text-xs text-[var(--platform-text-muted)]">
        {hasFilters ? 'Try adjusting your filters' : 'Orders will appear here once customers start buying'}
      </p>
    </div>
  )
}
