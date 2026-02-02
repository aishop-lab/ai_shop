'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  RotateCcw,
  Package,
  Truck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  Loader2,
  ExternalLink,
  Filter,
  ArrowLeft,
  PackageX,
  MapPin,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { formatCurrency, cn } from '@/lib/utils'
import { format, formatDistanceToNow } from 'date-fns'

interface RTOOrder {
  id: string
  order_number: string
  customer_name: string
  customer_email: string
  customer_phone: string
  total: number
  fulfillment_status: string
  rto_reason?: string
  awb_code?: string
  courier_name?: string
  created_at: string
  shipped_at?: string
  rto_initiated_at?: string
  rto_delivered_at?: string
  shipping_address: {
    city: string
    state: string
    pincode: string
  }
}

interface RTOStats {
  total_rto: number
  rto_in_transit: number
  rto_delivered: number
  rto_rate: number  // Percentage of orders that became RTO
  total_rto_value: number
}

function ReturnsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [orders, setOrders] = useState<RTOOrder[]>([])
  const [stats, setStats] = useState<RTOStats>({
    total_rto: 0,
    rto_in_transit: 0,
    rto_delivered: 0,
    rto_rate: 0,
    total_rto_value: 0,
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<string>(searchParams.get('status') || 'all')

  useEffect(() => {
    fetchRTOOrders()
  }, [activeTab])

  const fetchRTOOrders = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true)
    else setLoading(true)

    try {
      const params = new URLSearchParams()
      if (activeTab !== 'all') params.set('status', activeTab)
      if (searchQuery) params.set('search', searchQuery)

      const response = await fetch(`/api/dashboard/returns?${params}`)
      if (response.ok) {
        const data = await response.json()
        setOrders(data.orders || [])
        setStats(data.stats || stats)
      } else {
        toast.error('Failed to load return orders')
      }
    } catch (error) {
      console.error('Failed to fetch RTO orders:', error)
      toast.error('Failed to load return orders')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchRTOOrders()
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string; icon: typeof Package }> = {
      rto_initiated: {
        label: 'RTO Initiated',
        className: 'bg-orange-100 text-orange-800',
        icon: RotateCcw,
      },
      rto_in_transit: {
        label: 'RTO In Transit',
        className: 'bg-blue-100 text-blue-800',
        icon: Truck,
      },
      rto_delivered: {
        label: 'RTO Received',
        className: 'bg-green-100 text-green-800',
        icon: CheckCircle,
      },
      returned: {
        label: 'Returned',
        className: 'bg-gray-100 text-gray-800',
        icon: PackageX,
      },
      cancelled: {
        label: 'Cancelled',
        className: 'bg-red-100 text-red-800',
        icon: XCircle,
      },
    }

    const config = statusConfig[status] || statusConfig.returned
    const Icon = config.icon

    return (
      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', config.className)}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Returns & RTO</h1>
            <p className="text-gray-600 mt-1">
              Manage return-to-origin shipments and customer returns
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => fetchRTOOrders(true)}
          disabled={refreshing}
        >
          <RefreshCw className={cn('w-4 h-4 mr-2', refreshing && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <RotateCcw className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total RTO</p>
                <p className="text-2xl font-bold">{stats.total_rto}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Truck className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">In Transit</p>
                <p className="text-2xl font-bold">{stats.rto_in_transit}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Received Back</p>
                <p className="text-2xl font-bold">{stats.rto_delivered}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">RTO Rate</p>
                <p className="text-2xl font-bold">{stats.rto_rate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RTO Value Alert */}
      {stats.total_rto_value > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-orange-800">
                  Total RTO Value: {formatCurrency(stats.total_rto_value)}
                </p>
                <p className="text-sm text-orange-700">
                  This represents the total order value of all RTO shipments. Consider analyzing RTO reasons to reduce returns.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="rto_initiated">Initiated</TabsTrigger>
            <TabsTrigger value="rto_in_transit">In Transit</TabsTrigger>
            <TabsTrigger value="rto_delivered">Received</TabsTrigger>
          </TabsList>
        </Tabs>

        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by order number or customer..."
              className="pl-10"
            />
          </div>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
      </div>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>RTO Orders</CardTitle>
          <CardDescription>
            Orders that are being returned to origin
          </CardDescription>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <PackageX className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600 font-medium">No RTO orders found</p>
              <p className="text-sm text-gray-500 mt-1">
                Orders returned to origin will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Order Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Link
                          href={`/dashboard/orders/${order.id}`}
                          className="font-mono font-medium text-blue-600 hover:underline"
                        >
                          {order.order_number}
                        </Link>
                        {getStatusBadge(order.fulfillment_status)}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">Customer: </span>
                          <span className="font-medium">{order.customer_name}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Amount: </span>
                          <span className="font-medium">{formatCurrency(order.total)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          <span className="text-gray-600">
                            {order.shipping_address.city}, {order.shipping_address.state}
                          </span>
                        </div>
                        {order.courier_name && order.awb_code && (
                          <div className="flex items-center gap-1">
                            <Truck className="w-3 h-3 text-gray-400" />
                            <span className="text-gray-600">
                              {order.courier_name}: {order.awb_code}
                            </span>
                          </div>
                        )}
                      </div>

                      {order.rto_reason && (
                        <div className="mt-2 p-2 bg-orange-50 rounded text-sm">
                          <span className="text-orange-700 font-medium">RTO Reason: </span>
                          <span className="text-orange-600">{order.rto_reason}</span>
                        </div>
                      )}
                    </div>

                    {/* Timeline */}
                    <div className="flex flex-col gap-1 text-xs text-gray-500 min-w-[160px]">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        <span>
                          Ordered {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      {order.rto_initiated_at && (
                        <div className="flex items-center gap-2">
                          <RotateCcw className="w-3 h-3 text-orange-500" />
                          <span>
                            RTO {format(new Date(order.rto_initiated_at), 'MMM d, h:mm a')}
                          </span>
                        </div>
                      )}
                      {order.rto_delivered_at && (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          <span>
                            Received {format(new Date(order.rto_delivered_at), 'MMM d, h:mm a')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Link href={`/dashboard/orders/${order.id}`}>
                        <Button variant="outline" size="sm">
                          View Order
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* RTO Prevention Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Reduce RTO Rate</CardTitle>
          <CardDescription>
            Tips to minimize return-to-origin shipments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 bg-blue-100 rounded-lg h-fit">
                <MapPin className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Verify Addresses</p>
                <p className="text-xs text-gray-600">
                  Use pincode validation at checkout to ensure accurate delivery addresses
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 bg-green-100 rounded-lg h-fit">
                <Package className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Product Accuracy</p>
                <p className="text-xs text-gray-600">
                  Ensure product images and descriptions match actual items
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 bg-orange-100 rounded-lg h-fit">
                <Truck className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Fast Delivery</p>
                <p className="text-xs text-gray-600">
                  Quick delivery reduces customer cancellations and fake orders
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 bg-purple-100 rounded-lg h-fit">
                <CheckCircle className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Order Confirmation</p>
                <p className="text-xs text-gray-600">
                  Send WhatsApp confirmations to verify customer intent
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ReturnsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    }>
      <ReturnsPageContent />
    </Suspense>
  )
}
