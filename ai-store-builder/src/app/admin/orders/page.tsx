'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Search, RefreshCw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { AdminDataTable } from '@/components/admin/admin-data-table'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import type { OrderWithDetails } from '@/lib/admin/queries'

function getPaymentBadge(status: string) {
  switch (status) {
    case 'paid':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Paid</Badge>
    case 'pending':
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>
    case 'failed':
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Failed</Badge>
    case 'refunded':
      return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Refunded</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function getStatusBadge(status: string) {
  const colors: Record<string, string> = {
    unfulfilled: 'bg-orange-100 text-orange-800',
    processing: 'bg-blue-100 text-blue-800',
    packed: 'bg-purple-100 text-purple-800',
    shipped: 'bg-indigo-100 text-indigo-800',
    out_for_delivery: 'bg-cyan-100 text-cyan-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800'
  }

  return (
    <Badge className={`${colors[status] || 'bg-gray-100 text-gray-800'} hover:${colors[status] || 'bg-gray-100'}`}>
      {status.replace('_', ' ')}
    </Badge>
  )
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20'
      })

      if (status !== 'all') params.append('status', status)
      if (search) params.append('search', search)

      const response = await fetch(`/api/admin/orders?${params}`)
      const data = await response.json()

      setOrders(data.orders || [])
      setTotalPages(data.totalPages || 1)
      setTotal(data.total || 0)
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      setLoading(false)
    }
  }, [status, search, page])

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

  const columns = [
    {
      key: 'order',
      header: 'Order',
      render: (order: OrderWithDetails) => (
        <span className="font-medium text-sm">#{order.order_number}</span>
      )
    },
    {
      key: 'store',
      header: 'Store',
      render: (order: OrderWithDetails) => (
        <Link
          href={`/admin/stores`}
          className="text-sm hover:text-primary hover:underline"
        >
          {order.store_name}
        </Link>
      )
    },
    {
      key: 'customer',
      header: 'Customer',
      hideOnMobile: true,
      render: (order: OrderWithDetails) => (
        <div>
          <p className="text-sm">{order.customer_name}</p>
          <p className="text-xs text-muted-foreground">{order.customer_email}</p>
        </div>
      )
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (order: OrderWithDetails) => (
        <span className="text-sm font-medium">
          {formatCurrency(order.total_amount, 'INR')}
        </span>
      )
    },
    {
      key: 'payment',
      header: 'Payment',
      hideOnMobile: true,
      render: (order: OrderWithDetails) => getPaymentBadge(order.payment_status)
    },
    {
      key: 'status',
      header: 'Status',
      render: (order: OrderWithDetails) => getStatusBadge(order.order_status)
    },
    {
      key: 'date',
      header: 'Date',
      hideOnMobile: true,
      render: (order: OrderWithDetails) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(order.created_at), 'MMM dd, yyyy')}
        </span>
      )
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-muted-foreground">
            {total} total orders across all stores
          </p>
        </div>
        <Button variant="outline" onClick={fetchOrders} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by order # or customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Status Tabs */}
      <Tabs value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
        <TabsList className="flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unfulfilled">New</TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="shipped">Shipped</TabsTrigger>
          <TabsTrigger value="delivered">Delivered</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Table */}
      <AdminDataTable
        columns={columns}
        data={orders}
        keyExtractor={(order) => order.id}
        isLoading={loading}
        emptyMessage="No orders found"
        emptyDescription={search ? 'Try a different search term' : undefined}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  )
}
