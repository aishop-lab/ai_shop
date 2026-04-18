'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Search, Download, ChevronRight, RefreshCw, Filter, ShoppingCart } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/orders/order-status-badge'
import { formatCurrency } from '@/lib/utils'
import { useStoreCurrency } from '@/lib/hooks/use-store-currency'
import { useAuth } from '@/lib/contexts/auth-context'
import { format } from 'date-fns'
import type { Order } from '@/lib/types/order'

interface OrdersResponse {
  orders: Order[]
  total: number
  page: number
  totalPages: number
}

export default function OrdersPage() {
  const { profile } = useAuth()
  const { currency } = useStoreCurrency()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [storeId, setStoreId] = useState<string | null>(null)

  const [error, setError] = useState<string | null>(null)

  // Fetch store ID on mount
  useEffect(() => {
    async function fetchStore() {
      try {
        const response = await fetch('/api/dashboard/settings')
        if (response.ok) {
          const data = await response.json()
          if (data.store?.id) {
            setStoreId(data.store.id)
          } else {
            setError('No store found')
            setLoading(false)
          }
        } else {
          setError('Failed to load store')
          setLoading(false)
        }
      } catch (err) {
        console.error('Failed to fetch store:', err)
        setError('Failed to load store')
        setLoading(false)
      }
    }
    fetchStore()
  }, [])

  const fetchOrders = useCallback(async () => {
    if (!storeId) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        store_id: storeId,
        page: String(page),
        limit: '20'
      })

      if (status !== 'all') params.append('status', status)
      if (search) params.append('search', search)

      const response = await fetch(`/api/dashboard/orders?${params}`)
      const data: OrdersResponse = await response.json()

      setOrders(data.orders || [])
      setTotalPages(data.totalPages || 1)
      setTotal(data.total || 0)
    } catch (err) {
      console.error('Failed to fetch orders:', err)
      setError('Failed to load orders. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [storeId, status, search, page])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const handleExport = () => {
    if (!storeId) return
    window.location.href = `/api/dashboard/export?store_id=${storeId}&type=orders&format=csv`
  }

  // Calculate status counts from current data
  const getStatusCount = (statusFilter: string) => {
    if (statusFilter === 'all') return total
    return orders.filter(o => o.order_status === statusFilter).length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-muted-foreground">Manage and fulfill customer orders</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchOrders} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={!storeId}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order # or customer name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Status tabs - using database fulfillment_status values */}
      <Tabs value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
        <TabsList className="flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unfulfilled">New</TabsTrigger>
          <TabsTrigger value="processing">
            <span className="hidden md:inline">Processing</span>
            <span className="md:hidden">Process.</span>
          </TabsTrigger>
          <TabsTrigger value="packed">Packed</TabsTrigger>
          <TabsTrigger value="shipped">Shipped</TabsTrigger>
          <TabsTrigger value="out_for_delivery">
            <span className="hidden md:inline">Out for Delivery</span>
            <span className="md:hidden">Out</span>
          </TabsTrigger>
          <TabsTrigger value="delivered">
            <span className="hidden md:inline">Delivered</span>
            <span className="md:hidden">Done</span>
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            <span className="hidden md:inline">Cancelled</span>
            <span className="md:hidden">Cancel.</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Orders table */}
      {error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center bg-destructive/10 rounded-lg">
          <ShoppingCart className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold">{error}</h3>
          <p className="text-sm text-muted-foreground mt-1">Please try refreshing the page</p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" /> Retry
          </Button>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center bg-muted/30 rounded-lg">
          <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No orders yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {search ? 'Try a different search term' : 'Orders will appear here when customers make purchases'}
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                    Payment
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-4">
                      <Link
                        href={`/dashboard/orders/${order.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        #{order.order_number}
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-sm">{order.customer_name}</p>
                        <p className="text-xs text-muted-foreground">{order.customer_email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-muted-foreground hidden md:table-cell">
                      {format(new Date(order.created_at), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-4 py-4 font-semibold text-sm">
                      {formatCurrency(order.total_amount, currency)}
                    </td>
                    <td className="px-4 py-4 hidden sm:table-cell">
                      <PaymentStatusBadge status={order.payment_status} />
                    </td>
                    <td className="px-4 py-4">
                      <OrderStatusBadge status={order.order_status} />
                    </td>
                    <td className="px-4 py-4">
                      <Link href={`/dashboard/orders/${order.id}`}>
                        <ChevronRight className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 px-4 py-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                &lt;
              </Button>
              {(() => {
                const pages: (number | string)[] = []
                if (totalPages <= 7) {
                  for (let i = 1; i <= totalPages; i++) pages.push(i)
                } else {
                  pages.push(1)
                  if (page > 3) pages.push('...')
                  const start = Math.max(2, page - 1)
                  const end = Math.min(totalPages - 1, page + 1)
                  for (let i = start; i <= end; i++) pages.push(i)
                  if (page < totalPages - 2) pages.push('...')
                  pages.push(totalPages)
                }
                return pages.map((p, i) =>
                  typeof p === 'string' ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-sm text-muted-foreground">...</span>
                  ) : (
                    <Button
                      key={p}
                      variant={page === p ? 'default' : 'outline'}
                      size="sm"
                      className="min-w-[36px]"
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </Button>
                  )
                )
              })()}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                &gt;
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
