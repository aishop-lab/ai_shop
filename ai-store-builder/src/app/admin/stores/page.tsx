'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, RefreshCw, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { AdminDataTable } from '@/components/admin/admin-data-table'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import type { StoreWithDetails } from '@/lib/admin/queries'

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
    case 'draft':
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Draft</Badge>
    case 'suspended':
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Suspended</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

export default function AdminStoresPage() {
  const [stores, setStores] = useState<StoreWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchStores = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20'
      })

      if (status !== 'all') params.append('status', status)
      if (search) params.append('search', search)

      const response = await fetch(`/api/admin/stores?${params}`)
      const data = await response.json()

      setStores(data.stores || [])
      setTotalPages(data.totalPages || 1)
      setTotal(data.total || 0)
    } catch (error) {
      console.error('Failed to fetch stores:', error)
    } finally {
      setLoading(false)
    }
  }, [status, search, page])

  useEffect(() => {
    fetchStores()
  }, [fetchStores])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const columns = [
    {
      key: 'store',
      header: 'Store',
      render: (store: StoreWithDetails) => (
        <div className="flex items-center gap-3">
          {store.logo_url ? (
            <Image
              src={store.logo_url}
              alt={store.name}
              width={40}
              height={40}
              className="w-10 h-10 rounded-lg object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-white font-bold">
              {store.name.charAt(0)}
            </div>
          )}
          <div>
            <Link
              href={`/admin/stores/${store.id}`}
              className="font-medium text-sm hover:text-primary hover:underline"
            >
              {store.name}
            </Link>
            <p className="text-xs text-muted-foreground">{store.slug}</p>
          </div>
        </div>
      )
    },
    {
      key: 'owner',
      header: 'Owner',
      hideOnMobile: true,
      render: (store: StoreWithDetails) => (
        <div>
          <p className="text-sm">{store.owner_name}</p>
          <p className="text-xs text-muted-foreground">{store.owner_email}</p>
        </div>
      )
    },
    {
      key: 'products',
      header: 'Products',
      hideOnMobile: true,
      render: (store: StoreWithDetails) => (
        <span className="text-sm">{store.products_count}</span>
      )
    },
    {
      key: 'orders',
      header: 'Orders',
      hideOnMobile: true,
      render: (store: StoreWithDetails) => (
        <span className="text-sm">{store.orders_count}</span>
      )
    },
    {
      key: 'revenue',
      header: 'Revenue',
      render: (store: StoreWithDetails) => (
        <span className="text-sm font-medium">
          {formatCurrency(store.revenue, 'INR')}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (store: StoreWithDetails) => getStatusBadge(store.status)
    },
    {
      key: 'actions',
      header: '',
      render: (store: StoreWithDetails) => (
        <Link href={`/admin/stores/${store.id}`}>
          <ChevronRight className="h-5 w-5 text-muted-foreground hover:text-foreground" />
        </Link>
      )
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Stores</h1>
          <p className="text-muted-foreground">
            {total} total stores on the platform
          </p>
        </div>
        <Button variant="outline" onClick={fetchStores} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search stores by name or slug..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Status Tabs */}
      <Tabs value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="suspended">Suspended</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Table */}
      <AdminDataTable
        columns={columns}
        data={stores}
        keyExtractor={(store) => store.id}
        isLoading={loading}
        emptyMessage="No stores found"
        emptyDescription={search ? 'Try a different search term' : undefined}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  )
}
