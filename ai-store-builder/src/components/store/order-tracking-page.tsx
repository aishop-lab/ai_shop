'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  MapPin,
  ArrowLeft,
  ExternalLink,
  RefreshCw,
  ShoppingBag,
  AlertCircle,
  Box,
  Home,
} from 'lucide-react'
import { useStore } from '@/lib/contexts/store-context'
import { format, formatDistanceToNow } from 'date-fns'
import type { Order, OrderItem, ShippingAddress } from '@/lib/types/order'

interface TrackingEvent {
  date: string
  status: string
  activity: string
  location: string
}

interface TrackingData {
  awb_code: string
  courier_name: string
  current_status: string
  mapped_status: string
  estimated_delivery: string | null
  delivered_date: string | null
  destination: string
  origin: string
  track_url: string
  events: TrackingEvent[]
}

interface OrderWithItems extends Order {
  order_items: OrderItem[]
  shipping_address: ShippingAddress
}

interface OrderTrackingPageProps {
  orderNumber: string
}

// Status steps for the timeline
const TRACKING_STEPS = [
  { key: 'ordered', label: 'Order Placed', icon: ShoppingBag },
  { key: 'processing', label: 'Processing', icon: Box },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: MapPin },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle },
]

// Map status to step index
function getStepIndex(status: string): number {
  const statusMap: Record<string, number> = {
    unfulfilled: 0,
    processing: 1,
    packed: 1,
    shipped: 2,
    in_transit: 2,
    out_for_delivery: 3,
    delivered: 4,
    cancelled: -1,
    returned: -1,
  }
  return statusMap[status?.toLowerCase()] ?? 0
}

export default function OrderTrackingPage({ orderNumber }: OrderTrackingPageProps) {
  const { store, formatPrice } = useStore()
  const baseUrl = `/${store.slug}`

  const [order, setOrder] = useState<OrderWithItems | null>(null)
  const [tracking, setTracking] = useState<TrackingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchOrderAndTracking = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true)
    else setLoading(true)

    try {
      // Fetch order details
      const orderRes = await fetch(`/api/orders/lookup/${orderNumber}`)
      if (!orderRes.ok) {
        if (orderRes.status === 404) {
          setError('Order not found. Please check your order number.')
        } else {
          setError('Failed to load order details')
        }
        return
      }

      const orderData = await orderRes.json()
      setOrder(orderData.order)

      // Fetch tracking from public endpoint
      try {
        const trackRes = await fetch(`/api/shipping/track/public?order_number=${orderNumber}`)
        if (trackRes.ok) {
          const trackData = await trackRes.json()
          if (trackData.success) {
            setTracking(trackData.tracking)
          }
        }
      } catch (trackErr) {
        console.error('Failed to fetch tracking:', trackErr)
        // Don't set error - order can still be displayed without tracking
      }

      setError(null)
    } catch (err) {
      console.error('Failed to fetch order:', err)
      setError('Failed to load order details')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchOrderAndTracking()
  }, [orderNumber])

  const handleRefresh = () => {
    fetchOrderAndTracking(true)
  }

  // Get current status
  const currentStatus = tracking?.mapped_status || order?.fulfillment_status || 'processing'
  const currentStepIndex = getStepIndex(currentStatus)
  const isCancelled = currentStatus === 'cancelled' || currentStatus === 'returned'

  if (loading) {
    return (
      <div className="max-w-[900px] mx-auto px-4 py-12">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--color-primary)' }} />
            <p className="text-gray-600">Loading order details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-[900px] mx-auto px-4 py-12">
        <Link
          href={`${baseUrl}/orders`}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Order Lookup
        </Link>

        <div className="text-center py-12 bg-red-50 rounded-lg">
          <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-red-800 mb-2">Order Not Found</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return null
  }

  return (
    <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-8 md:py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <Link
            href={`${baseUrl}/orders`}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>
          <h1
            className="text-2xl md:text-3xl font-bold"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Track Order
          </h1>
          <p className="text-gray-600 mt-1">Order #{orderNumber}</p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Status Card */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        {/* Current Status */}
        <div className="flex items-center gap-4 mb-6">
          <div
            className={`p-3 rounded-full ${
              isCancelled
                ? 'bg-red-100'
                : currentStepIndex >= 4
                ? 'bg-green-100'
                : 'bg-blue-100'
            }`}
          >
            {isCancelled ? (
              <AlertCircle className="w-6 h-6 text-red-600" />
            ) : currentStepIndex >= 4 ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : currentStepIndex >= 2 ? (
              <Truck className="w-6 h-6 text-blue-600" />
            ) : (
              <Package className="w-6 h-6 text-blue-600" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold">
              {isCancelled
                ? 'Order Cancelled'
                : currentStepIndex >= 4
                ? 'Delivered!'
                : tracking?.current_status || 'In Progress'}
            </h2>
            {tracking?.estimated_delivery && currentStepIndex < 4 && (
              <p className="text-gray-600">
                Expected by {format(new Date(tracking.estimated_delivery), 'EEEE, MMM d')}
              </p>
            )}
            {tracking?.delivered_date && (
              <p className="text-green-600">
                Delivered on {format(new Date(tracking.delivered_date), 'EEEE, MMM d, yyyy')}
              </p>
            )}
          </div>
        </div>

        {/* Visual Timeline */}
        {!isCancelled && (
          <div className="relative">
            {/* Progress Bar */}
            <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 rounded-full mx-8 hidden sm:block">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (currentStepIndex / (TRACKING_STEPS.length - 1)) * 100)}%`,
                  backgroundColor: 'var(--color-primary)',
                }}
              />
            </div>

            {/* Steps */}
            <div className="flex flex-col sm:flex-row sm:justify-between relative">
              {TRACKING_STEPS.map((step, index) => {
                const Icon = step.icon
                const isCompleted = index <= currentStepIndex
                const isCurrent = index === currentStepIndex

                return (
                  <div
                    key={step.key}
                    className={`flex sm:flex-col items-center gap-3 sm:gap-2 py-2 sm:py-0 ${
                      index > 0 ? 'sm:flex-1' : ''
                    }`}
                  >
                    {/* Mobile connector line */}
                    {index > 0 && (
                      <div
                        className={`w-0.5 h-8 -mt-4 -mb-2 sm:hidden ${
                          isCompleted ? 'bg-[var(--color-primary)]' : 'bg-gray-200'
                        }`}
                      />
                    )}

                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center z-10 transition-all ${
                        isCompleted
                          ? isCurrent
                            ? 'bg-[var(--color-primary)] text-white ring-4 ring-[var(--color-primary-light)]'
                            : 'bg-[var(--color-primary)] text-white'
                          : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="flex-1 sm:flex-none sm:text-center">
                      <p
                        className={`text-sm font-medium ${
                          isCompleted ? 'text-gray-900' : 'text-gray-400'
                        }`}
                      >
                        {step.label}
                      </p>
                      {isCurrent && tracking?.events?.[0] && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatDistanceToNow(new Date(tracking.events[0].date), {
                            addSuffix: true,
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Courier Info */}
        {tracking?.courier_name && (
          <div className="mt-6 pt-6 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500">Shipped via</p>
              <p className="font-medium">{tracking.courier_name}</p>
              {tracking.awb_code && (
                <p className="text-sm text-gray-600">
                  Tracking: <span className="font-mono">{tracking.awb_code}</span>
                </p>
              )}
            </div>

            {tracking.track_url && (
              <a
                href={tracking.track_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                Track on {tracking.courier_name}
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* Tracking Events */}
      {tracking?.events && tracking.events.length > 0 && (
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
            Shipping Updates
          </h3>

          <div className="space-y-4">
            {tracking.events.map((event, index) => (
              <div
                key={`${event.date}-${event.status}-${index}`}
                className="flex gap-4"
              >
                {/* Timeline dot and line */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      index === 0 ? 'bg-[var(--color-primary)]' : 'bg-gray-300'
                    }`}
                  />
                  {index < tracking.events.length - 1 && (
                    <div className="w-0.5 h-full bg-gray-200 mt-1" />
                  )}
                </div>

                {/* Event content */}
                <div className="flex-1 pb-4">
                  <p className="font-medium text-sm">{event.activity || event.status}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {event.location && <span>{event.location} • </span>}
                    {format(new Date(event.date), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order Details */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
          Order Details
        </h3>

        {/* Order Items */}
        <div className="space-y-4 mb-6">
          {order.order_items?.map((item) => (
            <div key={item.id} className="flex gap-4">
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                {item.product_image ? (
                  <Image
                    src={item.product_image}
                    alt={item.product_title}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingBag className="w-6 h-6 text-gray-300" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium">{item.product_title}</p>
                <p className="text-sm text-gray-600">
                  Qty: {item.quantity} × {formatPrice(item.unit_price)}
                </p>
              </div>
              <p className="font-semibold">{formatPrice(item.total_price)}</p>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Shipping</span>
            <span>
              {order.shipping_cost === 0 ? (
                <span className="text-green-600">Free</span>
              ) : (
                formatPrice(order.shipping_cost)
              )}
            </span>
          </div>
          {order.discount_amount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount</span>
              <span>-{formatPrice(order.discount_amount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold pt-2 border-t">
            <span>Total</span>
            <span style={{ color: 'var(--color-primary)' }}>
              {formatPrice(order.total_amount)}
            </span>
          </div>
        </div>
      </div>

      {/* Shipping Address */}
      {order.shipping_address && (
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
            Shipping Address
          </h3>
          <div className="flex items-start gap-3">
            <Home className="w-5 h-5 text-gray-400 mt-0.5" />
            <div className="text-gray-700">
              <p className="font-medium">{order.shipping_address.name}</p>
              <p>{order.shipping_address.address_line1}</p>
              {order.shipping_address.address_line2 && (
                <p>{order.shipping_address.address_line2}</p>
              )}
              <p>
                {order.shipping_address.city}, {order.shipping_address.state} -{' '}
                {order.shipping_address.pincode}
              </p>
              <p className="mt-2 text-gray-600">Phone: {order.shipping_address.phone}</p>
            </div>
          </div>
        </div>
      )}

      {/* Need Help */}
      <div className="text-center text-gray-600">
        <p>Need help with your order?</p>
        <p className="mt-1">
          Contact us at{' '}
          <a
            href={`mailto:${store.contact_email}`}
            className="font-medium hover:underline"
            style={{ color: 'var(--color-primary)' }}
          >
            {store.contact_email}
          </a>
        </p>
      </div>
    </div>
  )
}
