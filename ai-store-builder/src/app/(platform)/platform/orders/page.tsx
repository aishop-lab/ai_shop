'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search, ChevronDown, ShoppingBag, X, User, CreditCard, Package, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AgentBadge } from '@/components/platform/shared/agent-badge'
import type { AgentType } from '@/lib/agents/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OrderStatus = 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
type PaymentMethod = 'razorpay' | 'cod'

interface AgentActivity {
  agentType: AgentType
  message: string
  at: string
}

interface MockOrder {
  id: string
  order_number: string
  customer_name: string
  email: string
  total: number
  status: OrderStatus
  items_count: number
  created_at: string
  payment_method: PaymentMethod
  agent_activity: AgentActivity[] | null
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_ORDERS: MockOrder[] = [
  {
    id: '1',
    order_number: '1841',
    customer_name: 'Priya Sharma',
    email: 'priya.sharma@gmail.com',
    total: 3198,
    status: 'delivered',
    items_count: 2,
    created_at: '2026-03-18T09:14:00Z',
    payment_method: 'razorpay',
    agent_activity: [
      { agentType: 'support', message: 'Responded to shipping query', at: '2026-03-18T11:30:00Z' },
      { agentType: 'sales', message: 'Sent post-delivery review request', at: '2026-03-20T09:00:00Z' },
    ],
  },
  {
    id: '2',
    order_number: '1842',
    customer_name: 'Rahul Verma',
    email: 'rahul.verma@outlook.com',
    total: 1899,
    status: 'shipped',
    items_count: 1,
    created_at: '2026-03-18T14:22:00Z',
    payment_method: 'razorpay',
    agent_activity: [
      { agentType: 'support', message: 'Sent shipment tracking link via WhatsApp', at: '2026-03-19T10:05:00Z' },
    ],
  },
  {
    id: '3',
    order_number: '1843',
    customer_name: 'Anjali Mehta',
    email: 'anjali.mehta@yahoo.in',
    total: 5498,
    status: 'processing',
    items_count: 3,
    created_at: '2026-03-19T08:05:00Z',
    payment_method: 'razorpay',
    agent_activity: [
      { agentType: 'sales', message: 'Sent follow-up discount for next order', at: '2026-03-19T12:00:00Z' },
    ],
  },
  {
    id: '4',
    order_number: '1844',
    customer_name: 'Vikram Nair',
    email: 'vikram.nair@gmail.com',
    total: 449,
    status: 'confirmed',
    items_count: 1,
    created_at: '2026-03-19T11:47:00Z',
    payment_method: 'cod',
    agent_activity: null,
  },
  {
    id: '5',
    order_number: '1845',
    customer_name: 'Sunita Patel',
    email: 'sunita.patel@gmail.com',
    total: 2798,
    status: 'cancelled',
    items_count: 2,
    created_at: '2026-03-19T16:33:00Z',
    payment_method: 'razorpay',
    agent_activity: [
      { agentType: 'support', message: 'Initiated refund process after cancellation', at: '2026-03-19T17:00:00Z' },
      { agentType: 'sales', message: 'Sent win-back coupon (10% off) via email', at: '2026-03-20T09:30:00Z' },
    ],
  },
  {
    id: '6',
    order_number: '1846',
    customer_name: 'Karthik Iyer',
    email: 'karthik.iyer@hotmail.com',
    total: 799,
    status: 'delivered',
    items_count: 1,
    created_at: '2026-03-20T07:10:00Z',
    payment_method: 'cod',
    agent_activity: [
      { agentType: 'support', message: 'Responded to shipping query', at: '2026-03-20T08:45:00Z' },
    ],
  },
  {
    id: '7',
    order_number: '1847',
    customer_name: 'Deepa Krishnan',
    email: 'deepa.k@gmail.com',
    total: 4998,
    status: 'processing',
    items_count: 2,
    created_at: '2026-03-20T09:55:00Z',
    payment_method: 'razorpay',
    agent_activity: null,
  },
  {
    id: '8',
    order_number: '1848',
    customer_name: 'Amit Gupta',
    email: 'amit.gupta@gmail.com',
    total: 1249,
    status: 'confirmed',
    items_count: 1,
    created_at: '2026-03-20T12:03:00Z',
    payment_method: 'razorpay',
    agent_activity: [
      { agentType: 'sales', message: 'Sent follow-up discount for next order', at: '2026-03-20T13:00:00Z' },
    ],
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`
}

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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function OrdersPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedOrder, setSelectedOrder] = useState<MockOrder | null>(null)

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
    return MOCK_ORDERS.filter((o) => {
      const matchesSearch =
        o.order_number.includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.email.toLowerCase().includes(q)
      const matchesStatus = statusFilter === 'all' || o.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [search, statusFilter])

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                               */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
            Orders
          </h1>
          <p className="mt-0.5 text-sm text-[var(--platform-text-secondary)]">
            {MOCK_ORDERS.length} orders total
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Filter bar                                                           */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--platform-text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order # or customer…"
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
          options={[
            { value: 'all', label: 'All status' },
            { value: 'confirmed', label: 'Confirmed' },
            { value: 'processing', label: 'Processing' },
            { value: 'shipped', label: 'Shipped' },
            { value: 'delivered', label: 'Delivered' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Table                                                                */}
      {/* ------------------------------------------------------------------ */}
      <div className="rounded-xl border border-[var(--platform-border)] overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState hasFilters={search !== '' || statusFilter !== 'all'} />
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--platform-border)] bg-[var(--platform-surface)]">
                <Th>Order #</Th>
                <Th>Customer</Th>
                <Th align="right">Total</Th>
                <Th align="right">Items</Th>
                <Th>Status</Th>
                <Th>Payment</Th>
                <Th>Agent Activity</Th>
                <Th>Date</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--platform-border)] bg-[var(--platform-bg)]">
              {filtered.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  isSelected={selectedOrder?.id === order.id}
                  onClick={() =>
                    setSelectedOrder((prev) => (prev?.id === order.id ? null : order))
                  }
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {filtered.length > 0 && (
        <p className="text-center font-mono text-[10px] text-[var(--platform-text-muted)]">
          {filtered.length} of {MOCK_ORDERS.length} orders
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
        {selectedOrder && <OrderDetail order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
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

// ---------------------------------------------------------------------------
// OrderRow
// ---------------------------------------------------------------------------

interface OrderRowProps {
  order: MockOrder
  isSelected: boolean
  onClick: () => void
}

function OrderRow({ order, isSelected, onClick }: OrderRowProps) {
  const sc = STATUS_CONFIG[order.status]
  const firstActivity = order.agent_activity?.[0] ?? null

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
      {/* Order # */}
      <td className="px-4 py-3">
        <span className="font-mono text-[var(--platform-text-primary)]">#{order.order_number}</span>
      </td>

      {/* Customer */}
      <td className="px-4 py-3">
        <p className="font-medium text-[var(--platform-text-primary)]">{order.customer_name}</p>
        <p className="mt-0.5 font-mono text-[10px] text-[var(--platform-text-muted)]">{order.email}</p>
      </td>

      {/* Total */}
      <td className="px-4 py-3 text-right">
        <span className="font-mono text-[var(--platform-text-primary)]">{formatPrice(order.total)}</span>
      </td>

      {/* Items */}
      <td className="px-4 py-3 text-right">
        <span className="font-mono text-[var(--platform-text-secondary)]">{order.items_count}</span>
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

      {/* Agent Activity */}
      <td className="px-4 py-3">
        {firstActivity ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <AgentBadge agentType={firstActivity.agentType} size="sm" />
            <span className="max-w-[180px] truncate text-[var(--platform-text-muted)]">
              {firstActivity.message}
            </span>
            {(order.agent_activity?.length ?? 0) > 1 && (
              <span className="font-mono text-[10px] text-[var(--platform-text-muted)]">
                +{(order.agent_activity?.length ?? 1) - 1}
              </span>
            )}
          </div>
        ) : (
          <span className="font-mono text-[var(--platform-text-muted)]">—</span>
        )}
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
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px]',
        method === 'razorpay'
          ? 'border-indigo-500/20 bg-indigo-500/10 text-indigo-400'
          : 'border-zinc-500/20 bg-zinc-500/10 text-zinc-400',
      )}
    >
      {method === 'razorpay' ? 'Razorpay' : 'COD'}
    </span>
  )
}

// ---------------------------------------------------------------------------
// OrderDetail slide-over content
// ---------------------------------------------------------------------------

interface OrderDetailProps {
  order: MockOrder
  onClose: () => void
}

function OrderDetail({ order, onClose }: OrderDetailProps) {
  const sc = STATUS_CONFIG[order.status]

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
          <InfoRow label="Name" value={order.customer_name} mono />
          <InfoRow label="Email" value={order.email} mono />
        </Section>

        {/* Items section */}
        <Section icon={<Package className="h-3.5 w-3.5" />} title="Items">
          <InfoRow label="Item count" value={String(order.items_count)} mono />
          <InfoRow label="Order total" value={formatPrice(order.total)} mono />
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

        {/* Agent Activity section */}
        <Section icon={<Bot className="h-3.5 w-3.5" />} title="Agent Activity">
          {order.agent_activity && order.agent_activity.length > 0 ? (
            <ul className="space-y-3 pt-1">
              {order.agent_activity.map((activity, i) => (
                <li key={i} className="flex gap-2.5">
                  <div className="mt-0.5 flex-shrink-0">
                    <AgentBadge agentType={activity.agentType} size="sm" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] leading-relaxed text-[var(--platform-text-secondary)]">
                      {activity.message}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-[var(--platform-text-muted)]">
                      {formatDateTime(activity.at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-1 text-[11px] text-[var(--platform-text-muted)]">
              No agent activity for this order.
            </p>
          )}
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
}

function FilterSelect({ value, onChange, options }: FilterSelectProps) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
