'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft,
  Loader2,
  Package,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Clock,
  User,
  RotateCcw,
  XCircle,
  Truck,
  CheckCircle2,
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { PlatformBreadcrumb } from '@/components/ui/breadcrumb'
import type { Order, OrderItem, ShippingAddress, Refund } from '@/lib/types/order'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'

interface OrderWithItems extends Order {
  order_items: OrderItem[]
  shipping_address: ShippingAddress
  refunded_at?: string
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
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const STATUS_CONFIG: Record<string, { label: string; dotCls: string; badgeCls: string }> = {
  pending: {
    label: 'Pending',
    dotCls: 'bg-zinc-400',
    badgeCls: 'border-zinc-500/20 bg-zinc-500/10 text-zinc-400',
  },
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
  refunded: {
    label: 'Refunded',
    dotCls: 'bg-red-400',
    badgeCls: 'border-red-500/20 bg-red-500/10 text-red-400',
  },
}

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pending', cls: 'border-zinc-500/20 bg-zinc-500/10 text-zinc-400' },
  paid: { label: 'Paid', cls: 'border-green-500/20 bg-green-500/10 text-green-400' },
  failed: { label: 'Failed', cls: 'border-red-500/20 bg-red-500/10 text-red-400' },
  refunded: { label: 'Refunded', cls: 'border-red-500/20 bg-red-500/10 text-red-400' },
}

const PAYMENT_METHOD_CONFIG: Record<string, { label: string; cls: string }> = {
  razorpay: { label: 'Razorpay', cls: 'border-indigo-500/20 bg-indigo-500/10 text-indigo-400' },
  stripe: { label: 'Stripe', cls: 'border-purple-500/20 bg-purple-500/10 text-purple-400' },
  cod: { label: 'COD', cls: 'border-zinc-500/20 bg-zinc-500/10 text-zinc-400' },
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

interface Toast {
  id: number
  message: string
  type: 'success' | 'error'
}

let toastId = 0

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function OrderDetailPage() {
  const params = useParams()
  const orderId = params.orderId as string

  const [order, setOrder] = useState<OrderWithItems | null>(null)
  const [loading, setLoading] = useState(true)
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [refundModalOpen, setRefundModalOpen] = useState(false)
  const [refundAmount, setRefundAmount] = useState('')
  const [refundReason, setRefundReason] = useState('')
  const [refundProcessing, setRefundProcessing] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])

  // Toast helpers
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }, [])

  // Fetch order data
  const fetchOrder = useCallback(async () => {
    try {
      const [orderRes, refundsRes] = await Promise.all([
        fetch(`/api/dashboard/orders/${orderId}`),
        fetch(`/api/dashboard/orders/${orderId}/refund`),
      ])

      if (!orderRes.ok) throw new Error('Order not found')

      const orderData = await orderRes.json()
      setOrder(orderData.order)

      if (refundsRes.ok) {
        const refundsData = await refundsRes.json()
        setRefunds(refundsData.refunds || [])
      }
    } catch {
      console.error('[OrderDetail] Failed to fetch order')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    fetchOrder()
  }, [fetchOrder])

  // Update order status
  async function handleStatusUpdate(newStatus: OrderStatus) {
    if (actionLoading) return
    setActionLoading(newStatus)
    try {
      const response = await fetch(`/api/dashboard/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_status: newStatus }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Update failed')
      }

      const statusLabel = STATUS_CONFIG[newStatus]?.label ?? newStatus
      showToast(`Order marked as ${statusLabel}`, 'success')
      fetchOrder()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to update order'
      showToast(msg, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  // Process refund
  async function handleRefund() {
    if (refundProcessing || !order) return
    const amount = parseFloat(refundAmount)
    if (isNaN(amount) || amount <= 0) {
      showToast('Enter a valid refund amount', 'error')
      return
    }
    if (amount > order.total_amount) {
      showToast('Refund amount exceeds order total', 'error')
      return
    }

    setRefundProcessing(true)
    try {
      const response = await fetch(`/api/dashboard/orders/${orderId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          reason: refundReason || 'Merchant initiated refund',
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Refund failed')
      }

      showToast('Refund processed successfully', 'success')
      setRefundModalOpen(false)
      setRefundAmount('')
      setRefundReason('')
      fetchOrder()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to process refund'
      showToast(msg, 'error')
    } finally {
      setRefundProcessing(false)
    }
  }

  // Determine available actions based on current status
  function getAvailableActions(): Array<{
    status: OrderStatus
    label: string
    icon: React.ReactNode
    cls: string
    destructive?: boolean
  }> {
    if (!order) return []

    switch (order.order_status) {
      case 'pending':
      case 'confirmed':
        return [
          {
            status: 'processing',
            label: 'Start Processing',
            icon: <Package className="h-3.5 w-3.5" />,
            cls: 'border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20',
          },
          {
            status: 'shipped',
            label: 'Mark as Shipped',
            icon: <Truck className="h-3.5 w-3.5" />,
            cls: 'border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20',
          },
          {
            status: 'cancelled',
            label: 'Cancel Order',
            icon: <XCircle className="h-3.5 w-3.5" />,
            cls: 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20',
            destructive: true,
          },
        ]
      case 'processing':
        return [
          {
            status: 'shipped',
            label: 'Mark as Shipped',
            icon: <Truck className="h-3.5 w-3.5" />,
            cls: 'border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20',
          },
          {
            status: 'cancelled',
            label: 'Cancel Order',
            icon: <XCircle className="h-3.5 w-3.5" />,
            cls: 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20',
            destructive: true,
          },
        ]
      case 'shipped':
        return [
          {
            status: 'delivered',
            label: 'Mark as Delivered',
            icon: <CheckCircle2 className="h-3.5 w-3.5" />,
            cls: 'border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20',
          },
        ]
      default:
        return []
    }
  }

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <PlatformBreadcrumb
          items={[
            { label: 'Command Center', href: '/platform' },
            { label: 'Orders', href: '/platform/orders' },
            { label: 'Loading...' },
          ]}
        />
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--platform-text-muted)]" />
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Not found
  // -------------------------------------------------------------------------

  if (!order) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <PlatformBreadcrumb
          items={[
            { label: 'Command Center', href: '/platform' },
            { label: 'Orders', href: '/platform/orders' },
            { label: 'Not Found' },
          ]}
        />
        <div className="flex flex-col items-center py-20 text-center">
          <Package className="h-8 w-8 text-[var(--platform-text-muted)] mb-3" />
          <h2 className="font-mono text-sm font-semibold text-[var(--platform-text-primary)]">
            Order not found
          </h2>
          <Link
            href="/platform/orders"
            className="mt-4 text-xs text-[var(--platform-accent)] hover:underline"
          >
            Back to Orders
          </Link>
        </div>
      </div>
    )
  }

  const sc = STATUS_CONFIG[order.order_status] ?? STATUS_CONFIG.confirmed
  const ps = PAYMENT_STATUS_CONFIG[order.payment_status] ?? PAYMENT_STATUS_CONFIG.pending
  const pm = PAYMENT_METHOD_CONFIG[order.payment_method] ?? PAYMENT_METHOD_CONFIG.cod
  const actions = getAvailableActions()

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PlatformBreadcrumb
        items={[
          { label: 'Command Center', href: '/platform' },
          { label: 'Orders', href: '/platform/orders' },
          { label: `#${order.order_number}` },
        ]}
      />

      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          href="/platform/orders"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--platform-border)] text-[var(--platform-text-muted)] hover:border-[var(--platform-border-hover)] hover:text-[var(--platform-text-primary)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
              Order #{order.order_number}
            </h1>
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px]',
                sc.badgeCls,
              )}
            >
              <span className={cn('inline-block h-1.5 w-1.5 rounded-full', sc.dotCls)} />
              {sc.label}
            </span>
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px]',
                ps.cls,
              )}
            >
              {ps.label}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-[var(--platform-text-muted)]">
            Placed on {formatDateTime(order.created_at)}
          </p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column — order items + timeline (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Order items */}
          <div className="rounded-lg border border-[var(--platform-border)] overflow-hidden">
            <div className="flex items-center gap-1.5 border-b border-[var(--platform-border)] bg-[var(--platform-surface)] px-4 py-3">
              <Package className="h-3.5 w-3.5 text-[var(--platform-text-muted)]" />
              <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
                Order Items ({order.order_items?.length ?? 0})
              </span>
            </div>

            {/* Items table */}
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--platform-border)] bg-[var(--platform-surface)]">
                  <th className="px-4 py-2.5 text-left font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
                    Product
                  </th>
                  <th className="px-4 py-2.5 text-right font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
                    Qty
                  </th>
                  <th className="px-4 py-2.5 text-right font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
                    Price
                  </th>
                  <th className="px-4 py-2.5 text-right font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--platform-border)] bg-[var(--platform-bg)]">
                {order.order_items?.map((item) => (
                  <tr key={item.id} className="hover:bg-[var(--platform-surface-hover)] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-[var(--platform-border)] bg-[var(--platform-surface)]">
                          {item.product_image ? (
                            <Image
                              src={item.product_image}
                              alt={item.product_title}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Package className="h-4 w-4 text-[var(--platform-text-muted)]" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-[var(--platform-text-primary)] truncate">
                            {item.product_title}
                          </p>
                          {item.variant_attributes && Object.keys(item.variant_attributes).length > 0 && (
                            <p className="mt-0.5 font-mono text-[10px] text-[var(--platform-text-muted)]">
                              {Object.entries(item.variant_attributes).map(([k, v]) => `${k}: ${v}`).join(' / ')}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono text-[var(--platform-text-secondary)]">
                        {item.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono text-[var(--platform-text-secondary)]">
                        {formatCurrency(item.unit_price, order.currency || 'INR')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono text-[var(--platform-text-primary)]">
                        {formatCurrency(item.total_price, order.currency || 'INR')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Amount summary */}
            <div className="border-t border-[var(--platform-border)] bg-[var(--platform-surface)] px-4 py-3 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-[var(--platform-text-muted)]">Subtotal</span>
                <span className="font-mono text-[var(--platform-text-secondary)]">
                  {formatCurrency(order.subtotal, order.currency || 'INR')}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[var(--platform-text-muted)]">Shipping</span>
                <span className="font-mono text-[var(--platform-text-secondary)]">
                  {order.shipping_cost === 0 ? (
                    <span className="text-green-400">Free</span>
                  ) : (
                    formatCurrency(order.shipping_cost, order.currency || 'INR')
                  )}
                </span>
              </div>
              {order.tax_amount > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--platform-text-muted)]">Tax</span>
                  <span className="font-mono text-[var(--platform-text-secondary)]">
                    {formatCurrency(order.tax_amount, order.currency || 'INR')}
                  </span>
                </div>
              )}
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-green-400">Discount</span>
                  <span className="font-mono text-green-400">
                    -{formatCurrency(order.discount_amount, order.currency || 'INR')}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t border-[var(--platform-border)] pt-2 text-sm font-semibold">
                <span className="text-[var(--platform-text-primary)]">Total</span>
                <span className="font-mono text-[var(--platform-accent)]">
                  {formatCurrency(order.total_amount, order.currency || 'INR')}
                </span>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-lg border border-[var(--platform-border)] overflow-hidden">
            <div className="flex items-center gap-1.5 border-b border-[var(--platform-border)] bg-[var(--platform-surface)] px-4 py-3">
              <Clock className="h-3.5 w-3.5 text-[var(--platform-text-muted)]" />
              <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
                Timeline
              </span>
            </div>
            <div className="bg-[var(--platform-bg)] px-4 py-4 space-y-0">
              <TimelineItem
                label="Order Created"
                date={order.created_at}
                active
              />
              {order.paid_at && (
                <TimelineItem
                  label="Payment Received"
                  date={order.paid_at}
                  active
                />
              )}
              {order.shipped_at && (
                <TimelineItem
                  label="Shipped"
                  date={order.shipped_at}
                  active
                />
              )}
              {order.delivered_at && (
                <TimelineItem
                  label="Delivered"
                  date={order.delivered_at}
                  active
                />
              )}
              {order.cancelled_at && (
                <TimelineItem
                  label="Cancelled"
                  date={order.cancelled_at}
                  active
                  variant="destructive"
                />
              )}
              {order.refunded_at && (
                <TimelineItem
                  label="Refunded"
                  date={order.refunded_at}
                  active
                  variant="destructive"
                />
              )}
            </div>
          </div>

          {/* Refund history */}
          {refunds.length > 0 && (
            <div className="rounded-lg border border-[var(--platform-border)] overflow-hidden">
              <div className="flex items-center gap-1.5 border-b border-[var(--platform-border)] bg-[var(--platform-surface)] px-4 py-3">
                <RotateCcw className="h-3.5 w-3.5 text-[var(--platform-text-muted)]" />
                <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
                  Refund History
                </span>
              </div>
              <div className="divide-y divide-[var(--platform-border)] bg-[var(--platform-bg)]">
                {refunds.map((refund) => (
                  <div key={refund.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="font-mono text-xs font-medium text-[var(--platform-text-primary)]">
                        {formatCurrency(refund.amount, order.currency || 'INR')}
                      </p>
                      {refund.reason && (
                        <p className="mt-0.5 text-[10px] text-[var(--platform-text-muted)]">
                          {refund.reason}
                        </p>
                      )}
                      <p className="text-[10px] text-[var(--platform-text-muted)]">
                        {formatDateTime(refund.created_at)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'rounded-full border px-2 py-0.5 font-mono text-[10px] capitalize',
                        refund.status === 'processed'
                          ? 'border-green-500/20 bg-green-500/10 text-green-400'
                          : refund.status === 'failed'
                            ? 'border-red-500/20 bg-red-500/10 text-red-400'
                            : 'border-amber-500/20 bg-amber-500/10 text-amber-400',
                      )}
                    >
                      {refund.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column — customer, shipping, payment, actions (1 col) */}
        <div className="space-y-4">
          {/* Customer */}
          <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-4 space-y-3">
            <div className="flex items-center gap-1.5 text-[var(--platform-text-muted)]">
              <User className="h-3.5 w-3.5" />
              <span className="font-mono text-[10px] font-medium uppercase tracking-wider">Customer</span>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-[var(--platform-text-primary)]">
                {order.customer_name}
              </p>
              <div className="flex items-center gap-2 text-[var(--platform-text-muted)]">
                <Mail className="h-3 w-3 shrink-0" />
                <a
                  href={`mailto:${order.customer_email}`}
                  className="text-[11px] text-[var(--platform-text-secondary)] hover:text-[var(--platform-accent)] transition-colors truncate"
                >
                  {order.customer_email}
                </a>
              </div>
              {order.customer_phone && (
                <div className="flex items-center gap-2 text-[var(--platform-text-muted)]">
                  <Phone className="h-3 w-3 shrink-0" />
                  <a
                    href={`tel:${order.customer_phone}`}
                    className="text-[11px] text-[var(--platform-text-secondary)] hover:text-[var(--platform-accent)] transition-colors"
                  >
                    {order.customer_phone}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Shipping address */}
          <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-4 space-y-3">
            <div className="flex items-center gap-1.5 text-[var(--platform-text-muted)]">
              <MapPin className="h-3.5 w-3.5" />
              <span className="font-mono text-[10px] font-medium uppercase tracking-wider">Shipping Address</span>
            </div>
            {order.shipping_address ? (
              <div className="space-y-0.5 text-xs">
                <p className="font-medium text-[var(--platform-text-primary)]">
                  {order.shipping_address.name}
                </p>
                <p className="text-[var(--platform-text-secondary)]">
                  {order.shipping_address.address_line1}
                </p>
                {order.shipping_address.address_line2 && (
                  <p className="text-[var(--platform-text-secondary)]">
                    {order.shipping_address.address_line2}
                  </p>
                )}
                <p className="text-[var(--platform-text-muted)]">
                  {order.shipping_address.city}, {order.shipping_address.state} - {order.shipping_address.pincode}
                </p>
                {order.shipping_address.country && (
                  <p className="text-[var(--platform-text-muted)]">
                    {order.shipping_address.country}
                  </p>
                )}
                {order.shipping_address.phone && (
                  <p className="mt-1.5 text-[var(--platform-text-muted)]">
                    <Phone className="mr-1 inline h-3 w-3" />
                    {order.shipping_address.phone}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-[var(--platform-text-muted)]">No shipping address</p>
            )}
          </div>

          {/* Payment */}
          <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-4 space-y-3">
            <div className="flex items-center gap-1.5 text-[var(--platform-text-muted)]">
              <CreditCard className="h-3.5 w-3.5" />
              <span className="font-mono text-[10px] font-medium uppercase tracking-wider">Payment</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[var(--platform-text-muted)]">Method</span>
                <span
                  className={cn(
                    'inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px]',
                    pm.cls,
                  )}
                >
                  {pm.label}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[var(--platform-text-muted)]">Status</span>
                <span
                  className={cn(
                    'inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px]',
                    ps.cls,
                  )}
                >
                  {ps.label}
                </span>
              </div>
              {order.razorpay_payment_id && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[var(--platform-text-muted)]">Payment ID</span>
                  <span className="font-mono text-[10px] text-[var(--platform-text-muted)]">
                    {order.razorpay_payment_id.slice(0, 16)}...
                  </span>
                </div>
              )}
              {order.stripe_payment_intent_id && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[var(--platform-text-muted)]">Payment ID</span>
                  <span className="font-mono text-[10px] text-[var(--platform-text-muted)]">
                    {order.stripe_payment_intent_id.slice(0, 16)}...
                  </span>
                </div>
              )}
              {order.paid_at && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[var(--platform-text-muted)]">Paid</span>
                  <span className="font-mono text-[10px] text-[var(--platform-text-secondary)]">
                    {formatDateTime(order.paid_at)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Tracking info */}
          {(order.tracking_number || order.awb_code) && (
            <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-4 space-y-3">
              <div className="flex items-center gap-1.5 text-[var(--platform-text-muted)]">
                <Truck className="h-3.5 w-3.5" />
                <span className="font-mono text-[10px] font-medium uppercase tracking-wider">Tracking</span>
              </div>
              <div className="space-y-2">
                {order.courier_name && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[var(--platform-text-muted)]">Courier</span>
                    <span className="font-mono text-[10px] text-[var(--platform-text-secondary)] capitalize">
                      {order.courier_name}
                    </span>
                  </div>
                )}
                {(order.tracking_number || order.awb_code) && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[var(--platform-text-muted)]">Tracking #</span>
                    <span className="font-mono text-[10px] text-[var(--platform-text-secondary)]">
                      {order.awb_code || order.tracking_number}
                    </span>
                  </div>
                )}
                {order.estimated_delivery_date && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[var(--platform-text-muted)]">Est. Delivery</span>
                    <span className="font-mono text-[10px] text-[var(--platform-text-secondary)]">
                      {formatDate(order.estimated_delivery_date)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          {actions.length > 0 && (
            <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-4 space-y-3">
              <div className="flex items-center gap-1.5 text-[var(--platform-text-muted)]">
                <Package className="h-3.5 w-3.5" />
                <span className="font-mono text-[10px] font-medium uppercase tracking-wider">Actions</span>
              </div>
              <div className="flex flex-col gap-2">
                {actions.map((action) => (
                  <button
                    key={action.status}
                    type="button"
                    disabled={actionLoading !== null}
                    onClick={() => handleStatusUpdate(action.status)}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50',
                      action.cls,
                    )}
                  >
                    {actionLoading === action.status ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      action.icon
                    )}
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Refund */}
          {order.payment_status === 'paid' && (order.razorpay_payment_id || order.stripe_payment_intent_id) && (
            <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-4 space-y-3">
              <div className="flex items-center gap-1.5 text-[var(--platform-text-muted)]">
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="font-mono text-[10px] font-medium uppercase tracking-wider">Refund</span>
              </div>
              <p className="text-[11px] text-[var(--platform-text-muted)]">
                Process a full or partial refund for this order.
              </p>
              <button
                type="button"
                onClick={() => {
                  setRefundAmount(String(order.total_amount))
                  setRefundModalOpen(true)
                }}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20"
              >
                <CreditCard className="h-3.5 w-3.5" />
                Process Refund
              </button>
            </div>
          )}

          {/* Refunded status card */}
          {order.payment_status === 'refunded' && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
              <div className="flex items-start gap-3">
                <XCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-red-400">Refunded</p>
                  {order.refunded_at && (
                    <p className="mt-0.5 text-[11px] text-red-400/70">
                      Refunded on {formatDate(order.refunded_at)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Refund modal */}
      {refundModalOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setRefundModalOpen(false)}
          />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)] p-6 shadow-2xl">
            <h3 className="font-mono text-sm font-semibold text-[var(--platform-text-primary)]">
              Process Refund
            </h3>
            <p className="mt-1 text-xs text-[var(--platform-text-muted)]">
              Order #{order.order_number} — Total: {formatCurrency(order.total_amount, order.currency || 'INR')}
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label
                  htmlFor="refundAmount"
                  className="mb-1 block text-[11px] font-medium text-[var(--platform-text-secondary)]"
                >
                  Refund Amount
                </label>
                <input
                  id="refundAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={order.total_amount}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className={cn(
                    'w-full rounded-lg border border-[var(--platform-border)]',
                    'bg-[var(--platform-bg)] px-3 py-2',
                    'font-mono text-xs text-[var(--platform-text-primary)]',
                    'placeholder:text-[var(--platform-text-muted)]',
                    'outline-none transition-colors',
                    'hover:border-[var(--platform-border-hover)] focus:border-[var(--platform-accent)]',
                  )}
                />
              </div>

              <div>
                <label
                  htmlFor="refundReason"
                  className="mb-1 block text-[11px] font-medium text-[var(--platform-text-secondary)]"
                >
                  Reason (optional)
                </label>
                <input
                  id="refundReason"
                  type="text"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Customer requested refund"
                  className={cn(
                    'w-full rounded-lg border border-[var(--platform-border)]',
                    'bg-[var(--platform-bg)] px-3 py-2',
                    'font-mono text-xs text-[var(--platform-text-primary)]',
                    'placeholder:text-[var(--platform-text-muted)]',
                    'outline-none transition-colors',
                    'hover:border-[var(--platform-border-hover)] focus:border-[var(--platform-accent)]',
                  )}
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRefundModalOpen(false)}
                className="rounded-lg border border-[var(--platform-border)] px-4 py-2 text-xs font-medium text-[var(--platform-text-secondary)] transition-colors hover:border-[var(--platform-border-hover)]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={refundProcessing}
                onClick={handleRefund}
                className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
              >
                {refundProcessing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Process Refund
              </button>
            </div>
          </div>
        </>
      )}

      {/* Toast container */}
      <div className="fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'rounded-lg border px-4 py-2.5 text-xs font-medium shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300',
              toast.type === 'success'
                ? 'border-green-500/20 bg-green-500/10 text-green-400'
                : 'border-red-500/20 bg-red-500/10 text-red-400',
            )}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Timeline sub-component
// ---------------------------------------------------------------------------

function TimelineItem({
  label,
  date,
  active = false,
  variant = 'default',
}: {
  label: string
  date: string
  active?: boolean
  variant?: 'default' | 'destructive'
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="relative mt-1 flex flex-col items-center">
        <div
          className={cn(
            'h-2 w-2 rounded-full',
            active
              ? variant === 'destructive'
                ? 'bg-red-400'
                : 'bg-green-400'
              : 'bg-[var(--platform-text-muted)]',
          )}
        />
      </div>
      <div>
        <p className="text-xs font-medium text-[var(--platform-text-primary)]">{label}</p>
        <p className="font-mono text-[10px] text-[var(--platform-text-muted)]">
          {formatDateTime(date)}
        </p>
      </div>
    </div>
  )
}
