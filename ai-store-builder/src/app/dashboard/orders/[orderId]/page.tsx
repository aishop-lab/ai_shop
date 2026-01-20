'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Download, Package, Mail, Phone, MapPin, Loader2, AlertCircle, RotateCcw, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/orders/order-status-badge'
import { RefundModal } from '@/components/orders/refund-modal'
import { ShippingActions } from '@/components/shipping/shipping-actions'
import { useToast } from '@/lib/hooks/use-toast'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import type { Order, OrderItem, ShippingAddress, Refund } from '@/lib/types/order'

interface OrderWithItems extends Order {
  order_items: OrderItem[]
  shipping_address: ShippingAddress
  refunded_at?: string
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const orderId = params.orderId as string

  const [order, setOrder] = useState<OrderWithItems | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [refunds, setRefunds] = useState<Refund[]>([])

  const [newStatus, setNewStatus] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [courierName, setCourierName] = useState('')
  const [downloadingInvoice, setDownloadingInvoice] = useState(false)

  useEffect(() => {
    fetchOrder()
  }, [orderId])

  const fetchOrder = async () => {
    setLoading(true)
    try {
      const [orderResponse, refundsResponse] = await Promise.all([
        fetch(`/api/dashboard/orders/${orderId}`),
        fetch(`/api/dashboard/orders/${orderId}/refund`)
      ])

      if (!orderResponse.ok) throw new Error('Order not found')

      const orderData = await orderResponse.json()
      setOrder(orderData.order)
      setNewStatus(orderData.order.order_status)
      setTrackingNumber(orderData.order.tracking_number || '')
      setCourierName(orderData.order.courier_name || '')

      if (refundsResponse.ok) {
        const refundsData = await refundsResponse.json()
        setRefunds(refundsData.refunds || [])
      }
    } catch (error) {
      console.error('Failed to fetch order:', error)
      toast({
        title: 'Error',
        description: 'Failed to load order details',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateOrder = async () => {
    setUpdating(true)
    try {
      const response = await fetch(`/api/dashboard/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_status: newStatus,
          tracking_number: trackingNumber || undefined,
          courier_name: courierName || undefined
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Update failed')
      }

      toast({
        title: 'Order Updated',
        description: 'Order has been updated successfully'
      })

      fetchOrder()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update order'
      toast({
        title: 'Update Failed',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleDownloadInvoice = async () => {
    if (!order) return
    setDownloadingInvoice(true)
    try {
      const response = await fetch(`/api/orders/${orderId}/invoice`)
      if (!response.ok) throw new Error('Failed to generate invoice')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice_${order.order_number}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast({
        title: 'Invoice Downloaded',
        description: 'Invoice PDF has been downloaded'
      })
    } catch (error) {
      toast({
        title: 'Download Failed',
        description: 'Failed to download invoice',
        variant: 'destructive'
      })
    } finally {
      setDownloadingInvoice(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Order not found</p>
        <Button onClick={() => router.push('/dashboard/orders')}>
          Back to Orders
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard/orders')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Order #{order.order_number}</h1>
              <OrderStatusBadge status={order.order_status} />
            </div>
            <p className="text-muted-foreground text-sm">
              {format(new Date(order.created_at), 'MMMM dd, yyyy • h:mm a')}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={handleDownloadInvoice}
          disabled={downloadingInvoice}
        >
          {downloadingInvoice ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Download Invoice
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Order details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Items ({order.order_items?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.order_items?.map((item) => (
                  <div key={item.id} className="flex gap-4 p-3 bg-muted/30 rounded-lg">
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-background flex-shrink-0">
                      {item.product_image ? (
                        <Image
                          src={item.product_image}
                          alt={item.product_title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.product_title}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.quantity} × {formatCurrency(item.unit_price, 'INR')}
                      </p>
                    </div>
                    <p className="font-semibold">
                      {formatCurrency(item.total_price, 'INR')}
                    </p>
                  </div>
                ))}

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(order.subtotal, 'INR')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>
                      {order.shipping_cost === 0
                        ? <span className="text-green-600">Free</span>
                        : formatCurrency(order.shipping_cost, 'INR')
                      }
                    </span>
                  </div>
                  {order.tax_amount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax</span>
                      <span>{formatCurrency(order.tax_amount, 'INR')}</span>
                    </div>
                  )}
                  {order.discount_amount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>-{formatCurrency(order.discount_amount, 'INR')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total</span>
                    <span className="text-primary">{formatCurrency(order.total_amount, 'INR')}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Shipping Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              {order.shipping_address ? (
                <div className="text-sm space-y-1">
                  <p className="font-medium">{order.shipping_address.name}</p>
                  <p className="text-muted-foreground">{order.shipping_address.address_line1}</p>
                  {order.shipping_address.address_line2 && (
                    <p className="text-muted-foreground">{order.shipping_address.address_line2}</p>
                  )}
                  <p className="text-muted-foreground">
                    {order.shipping_address.city}, {order.shipping_address.state} - {order.shipping_address.pincode}
                  </p>
                  <p className="text-muted-foreground pt-2">
                    <Phone className="h-3 w-3 inline mr-1" />
                    {order.shipping_address.phone}
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No shipping address</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: Status & actions */}
        <div className="space-y-6">
          {/* Customer info */}
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="font-medium">{order.customer_name}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <a href={`mailto:${order.customer_email}`} className="hover:underline">
                    {order.customer_email}
                  </a>
                </div>
                {order.customer_phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <a href={`tel:${order.customer_phone}`} className="hover:underline">
                      {order.customer_phone}
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Shiprocket Shipping */}
          {order.payment_status === 'paid' && (
            <ShippingActions order={order} onUpdate={fetchOrder} />
          )}

          {/* Payment info */}
          <Card>
            <CardHeader>
              <CardTitle>Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Method</span>
                  <span className="font-medium capitalize">{order.payment_method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <PaymentStatusBadge status={order.payment_status} />
                </div>
                {order.razorpay_payment_id && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Payment ID</span>
                    <span className="text-xs font-mono text-muted-foreground">
                      {order.razorpay_payment_id.slice(0, 15)}...
                    </span>
                  </div>
                )}
                {order.paid_at && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Paid At</span>
                    <span className="text-sm">
                      {format(new Date(order.paid_at), 'MMM dd, h:mm a')}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Refund Section */}
          {order.payment_status === 'paid' && order.razorpay_payment_id && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RotateCcw className="h-5 w-5" />
                  Refund
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Process a full or partial refund for this order
                </p>
                <Button
                  variant="outline"
                  onClick={() => setShowRefundModal(true)}
                  className="w-full"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Process Refund
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Refunded Status */}
          {order.payment_status === 'refunded' && (
            <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-red-800 dark:text-red-200">Refunded</p>
                    {order.refunded_at && (
                      <p className="text-sm text-red-700 dark:text-red-300">
                        Refunded on {format(new Date(order.refunded_at), 'MMM dd, yyyy')}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Refund History */}
          {refunds.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Refund History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {refunds.map((refund) => (
                    <div
                      key={refund.id}
                      className="flex items-center justify-between text-sm border-b pb-2 last:border-0 last:pb-0"
                    >
                      <div>
                        <p className="font-medium">{formatCurrency(refund.amount, 'INR')}</p>
                        <p className="text-xs text-muted-foreground">{refund.reason}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(refund.created_at), 'MMM dd, h:mm a')}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${refund.status === 'processed'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : refund.status === 'failed'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                          }`}
                      >
                        {refund.status}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Manual Update Order - shown when not using Shiprocket */}
          {!order.shiprocket_shipment_id && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Manual Update
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Use this for manual shipping without Shiprocket
                </p>
                <div className="space-y-2">
                  <Label htmlFor="status">Order Status</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="courier">Courier Service</Label>
                  <Select value={courierName} onValueChange={setCourierName}>
                    <SelectTrigger id="courier">
                      <SelectValue placeholder="Select courier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="delhivery">Delhivery</SelectItem>
                      <SelectItem value="bluedart">Blue Dart</SelectItem>
                      <SelectItem value="dtdc">DTDC</SelectItem>
                      <SelectItem value="ecom">Ecom Express</SelectItem>
                      <SelectItem value="xpressbees">XpressBees</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tracking">Tracking Number</Label>
                  <Input
                    id="tracking"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Enter tracking number"
                  />
                </div>

                <Button
                  onClick={handleUpdateOrder}
                  disabled={updating}
                  className="w-full"
                >
                  {updating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Order'
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
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
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Refund Modal */}
      {order && (
        <RefundModal
          order={order}
          open={showRefundModal}
          onClose={() => setShowRefundModal(false)}
          onSuccess={fetchOrder}
        />
      )}
    </div>
  )
}

function TimelineItem({
  label,
  date,
  active = false,
  variant = 'default'
}: {
  label: string
  date: string
  active?: boolean
  variant?: 'default' | 'destructive'
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={`w-2 h-2 rounded-full mt-1.5 ${active
          ? variant === 'destructive' ? 'bg-red-500' : 'bg-green-500'
          : 'bg-muted'
        }`} />
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">
          {format(new Date(date), 'MMM dd, yyyy • h:mm a')}
        </p>
      </div>
    </div>
  )
}
