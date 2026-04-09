'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Loader2,
  Mail,
  Phone,
  Calendar,
  ShoppingBag,
  CreditCard,
  MapPin,
  User,
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
  email: string
  full_name: string
  phone: string | null
  created_at: string
  total_orders: number
  total_spent: number
  last_order_at: string | null
  addresses?: Array<{
    id: string
    full_name: string
    address_line1: string
    address_line2?: string
    city: string
    state: string
    pincode: string
    phone?: string
    is_default: boolean
  }>
}

interface OrderData {
  id: string
  order_number: string
  total_amount: number
  order_status: string
  payment_method: string
  created_at: string
  order_items: { id: string }[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const STATUS_STYLES: Record<string, string> = {
  confirmed: 'border-blue-500/20 bg-blue-500/10 text-blue-400',
  processing: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
  shipped: 'border-purple-500/20 bg-purple-500/10 text-purple-400',
  delivered: 'border-green-500/20 bg-green-500/10 text-green-400',
  cancelled: 'border-red-500/20 bg-red-500/10 text-red-400',
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CustomerDetailPage() {
  const params = useParams()
  const customerId = params.id as string
  const { currency } = useStoreCurrency()

  const [customer, setCustomer] = useState<CustomerData | null>(null)
  const [orders, setOrders] = useState<OrderData[]>([])
  const [storeId, setStoreId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch store ID
  useEffect(() => {
    async function fetchStoreId() {
      try {
        const response = await fetch('/api/dashboard/stats')
        if (response.ok) {
          const data = await response.json()
          if (data.store?.id) setStoreId(data.store.id)
        }
      } catch {
        console.error('[CustomerDetail] Failed to fetch store ID')
      }
    }
    fetchStoreId()
  }, [])

  // Fetch customer + orders
  useEffect(() => {
    if (!storeId || !customerId) return

    async function fetchData() {
      try {
        const supabase = createClient()

        const [customerRes, ordersRes, addressesRes] = await Promise.all([
          supabase
            .from('customers')
            .select('*')
            .eq('id', customerId)
            .eq('store_id', storeId)
            .single(),
          supabase
            .from('orders')
            .select('id, order_number, total_amount, order_status, payment_method, created_at, order_items(id)')
            .eq('store_id', storeId)
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false })
            .limit(20),
          supabase
            .from('customer_addresses')
            .select('*')
            .eq('customer_id', customerId)
            .order('is_default', { ascending: false }),
        ])

        if (customerRes.data) {
          setCustomer({
            ...customerRes.data,
            addresses: addressesRes.data ?? [],
          } as CustomerData)
        }
        setOrders((ordersRes.data as OrderData[]) ?? [])
      } catch {
        console.error('[CustomerDetail] Failed to fetch customer')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [storeId, customerId])

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <PlatformBreadcrumb
          items={[
            { label: 'Command Center', href: '/platform' },
            { label: 'Customers', href: '/platform/customers' },
            { label: 'Customer' },
          ]}
        />
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--platform-text-muted)]" />
        </div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <PlatformBreadcrumb
          items={[
            { label: 'Command Center', href: '/platform' },
            { label: 'Customers', href: '/platform/customers' },
            { label: 'Not Found' },
          ]}
        />
        <div className="flex flex-col items-center py-20 text-center">
          <User className="h-8 w-8 text-[var(--platform-text-muted)] mb-3" />
          <h2 className="font-mono text-sm font-semibold text-[var(--platform-text-primary)]">
            Customer not found
          </h2>
          <Link
            href="/platform/customers"
            className="mt-4 text-xs text-[var(--platform-accent)] hover:underline"
          >
            Back to Customers
          </Link>
        </div>
      </div>
    )
  }

  const avgOrderValue = customer.total_orders > 0
    ? customer.total_spent / customer.total_orders
    : 0

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PlatformBreadcrumb
        items={[
          { label: 'Command Center', href: '/platform' },
          { label: 'Customers', href: '/platform/customers' },
          { label: customer.full_name || customer.email },
        ]}
      />

      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          href="/platform/customers"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--platform-border)] text-[var(--platform-text-muted)] hover:border-[var(--platform-border-hover)] hover:text-[var(--platform-text-primary)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
            {customer.full_name || 'Unknown Customer'}
          </h1>
          <p className="mt-0.5 text-sm text-[var(--platform-text-muted)]">
            {customer.email}
          </p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Total Orders" value={String(customer.total_orders)} />
        <MetricCard label="Total Spent" value={formatCurrency(customer.total_spent, currency)} />
        <MetricCard label="Avg Order" value={formatCurrency(avgOrderValue, currency)} />
        <MetricCard
          label="Customer Since"
          value={formatDate(customer.created_at)}
        />
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left — Orders (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xs font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
            Order History ({orders.length})
          </h2>

          {orders.length === 0 ? (
            <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] py-12 text-center">
              <ShoppingBag className="mx-auto h-6 w-6 text-[var(--platform-text-muted)] mb-2" />
              <p className="text-xs text-[var(--platform-text-muted)]">No orders yet</p>
            </div>
          ) : (
            <div className="rounded-lg border border-[var(--platform-border)] overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--platform-border)] bg-[var(--platform-surface)]">
                    <th className="px-4 py-2.5 text-left font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
                      Order
                    </th>
                    <th className="px-4 py-2.5 text-right font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
                      Total
                    </th>
                    <th className="px-4 py-2.5 text-left font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
                      Status
                    </th>
                    <th className="px-4 py-2.5 text-left font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--platform-border)] bg-[var(--platform-bg)]">
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-[var(--platform-surface-hover)] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-[var(--platform-text-primary)]">
                          #{order.order_number}
                        </span>
                        <span className="ml-2 text-[var(--platform-text-muted)]">
                          ({order.order_items?.length ?? 0} items)
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-mono text-[var(--platform-text-primary)]">
                          {formatCurrency(order.total_amount, currency)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] capitalize',
                            STATUS_STYLES[order.order_status] ?? STATUS_STYLES.confirmed
                          )}
                        >
                          {order.order_status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-[var(--platform-text-muted)]">
                          {formatDateTime(order.created_at)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right — Info (1 col) */}
        <div className="space-y-4">
          {/* Contact */}
          <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-4 space-y-3">
            <h3 className="text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
              Contact
            </h3>
            <InfoItem icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={customer.email} />
            {customer.phone && (
              <InfoItem icon={<Phone className="h-3.5 w-3.5" />} label="Phone" value={customer.phone} />
            )}
            <InfoItem
              icon={<Calendar className="h-3.5 w-3.5" />}
              label="Joined"
              value={formatDate(customer.created_at)}
            />
            {customer.last_order_at && (
              <InfoItem
                icon={<ShoppingBag className="h-3.5 w-3.5" />}
                label="Last Order"
                value={formatDate(customer.last_order_at)}
              />
            )}
          </div>

          {/* Addresses */}
          {customer.addresses && customer.addresses.length > 0 && (
            <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-4 space-y-3">
              <h3 className="text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
                Addresses ({customer.addresses.length})
              </h3>
              {customer.addresses.map((addr) => (
                <div
                  key={addr.id}
                  className={cn(
                    'rounded border p-3 text-xs space-y-0.5',
                    addr.is_default
                      ? 'border-[var(--platform-accent)]/30 bg-[var(--platform-accent)]/5'
                      : 'border-[var(--platform-border)]'
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 text-[var(--platform-text-muted)]" />
                    <span className="font-medium text-[var(--platform-text-primary)]">
                      {addr.full_name}
                    </span>
                    {addr.is_default && (
                      <span className="rounded bg-[var(--platform-accent)]/10 px-1.5 py-px text-[9px] text-[var(--platform-accent)]">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-[var(--platform-text-secondary)] pl-[18px]">
                    {addr.address_line1}
                    {addr.address_line2 && `, ${addr.address_line2}`}
                  </p>
                  <p className="text-[var(--platform-text-muted)] pl-[18px]">
                    {addr.city}, {addr.state} {addr.pincode}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Quick Stats */}
          <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-4 space-y-3">
            <h3 className="text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
              Insights
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-[var(--platform-text-muted)]">Avg order value</span>
                <span className="font-mono text-[var(--platform-text-primary)]">
                  {formatCurrency(avgOrderValue, currency)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[var(--platform-text-muted)]">Payment preference</span>
                <span className="font-mono text-[var(--platform-text-primary)]">
                  {orders.length > 0
                    ? orders[0].payment_method === 'cod' ? 'COD' : orders[0].payment_method
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[var(--platform-text-muted)]">Lifetime value</span>
                <span className="font-mono text-[var(--platform-text-primary)]">
                  {formatCurrency(customer.total_spent, currency)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
        {label}
      </p>
      <p className="mt-1 font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
        {value}
      </p>
    </div>
  )
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 text-[var(--platform-text-muted)]">{icon}</div>
      <div>
        <p className="text-[10px] text-[var(--platform-text-muted)]">{label}</p>
        <p className="text-xs text-[var(--platform-text-primary)] break-all">{value}</p>
      </div>
    </div>
  )
}
