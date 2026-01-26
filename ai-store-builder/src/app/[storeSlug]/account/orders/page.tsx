'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCustomer } from '@/lib/contexts/customer-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Package, Loader2, ExternalLink } from 'lucide-react'

interface OrderItem {
  id: string
  product_title: string
  quantity: number
  unit_price: number
  total_price: number
  variant_title?: string
  product?: {
    slug: string
    product_images: { url: string; alt_text: string }[]
  }
}

interface Order {
  id: string
  order_number: string
  order_status: string
  payment_status: string
  payment_method: string
  total_amount: number
  shipping_city: string
  shipping_state: string
  tracking_number?: string
  courier_name?: string
  created_at: string
  shipped_at?: string
  delivered_at?: string
  order_items: OrderItem[]
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-purple-100 text-purple-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  out_for_delivery: 'bg-cyan-100 text-cyan-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800'
}

export default function CustomerOrdersPage() {
  const params = useParams()
  const router = useRouter()
  const storeSlug = params.storeSlug as string
  const { customer, isLoading: customerLoading, isAuthenticated } = useCustomer()

  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (!customerLoading && !isAuthenticated) {
      router.push(`/${storeSlug}/account/login?redirect=/${storeSlug}/account/orders`)
    }
  }, [customerLoading, isAuthenticated, router, storeSlug])

  useEffect(() => {
    async function fetchOrders() {
      if (!isAuthenticated) return

      setIsLoading(true)
      try {
        const response = await fetch(`/api/customer/orders?page=${page}&limit=10`)
        if (response.ok) {
          const data = await response.json()
          setOrders(data.orders || [])
          setTotalPages(data.pagination?.totalPages || 1)
        }
      } catch (error) {
        console.error('Failed to fetch orders:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrders()
  }, [isAuthenticated, page])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  if (customerLoading || !isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/${storeSlug}/account`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">My Orders</h1>
          <p className="text-muted-foreground">Track and manage your orders</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No orders yet</h3>
            <p className="text-muted-foreground mb-4">
              Start shopping to see your orders here
            </p>
            <Link href={`/${storeSlug}`}>
              <Button>Browse Products</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono text-sm">{order.order_number}</span>
                      <Badge className={statusColors[order.order_status] || 'bg-gray-100'}>
                        {order.order_status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Placed on {formatDate(order.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{formatCurrency(order.total_amount)}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.order_items.length} item{order.order_items.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {/* Order Items Preview */}
                <div className="border-t pt-4">
                  <div className="flex flex-wrap gap-4">
                    {order.order_items.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center gap-3">
                        {item.product?.product_images?.[0] && (
                          <img
                            src={item.product.product_images[0].url}
                            alt={item.product_title}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div>
                          <p className="text-sm font-medium line-clamp-1">{item.product_title}</p>
                          <p className="text-xs text-muted-foreground">
                            Qty: {item.quantity} × {formatCurrency(item.unit_price)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {order.order_items.length > 3 && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        +{order.order_items.length - 3} more
                      </div>
                    )}
                  </div>
                </div>

                {/* Tracking Info */}
                {order.tracking_number && (
                  <div className="border-t mt-4 pt-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Tracking: </span>
                        <span className="font-mono">{order.tracking_number}</span>
                        {order.courier_name && (
                          <span className="text-muted-foreground"> via {order.courier_name}</span>
                        )}
                      </div>
                      <a
                        href={`https://shiprocket.co/tracking/${order.tracking_number}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        Track <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="flex items-center px-4 text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
