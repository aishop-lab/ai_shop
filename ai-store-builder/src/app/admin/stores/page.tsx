'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, RefreshCw, ChevronRight, Trash2, AlertTriangle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { AdminDataTable } from '@/components/admin/admin-data-table'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { useToast } from '@/lib/hooks/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
  const { toast } = useToast()
  const [stores, setStores] = useState<StoreWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)

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
      setSelectedIds(new Set())
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

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === stores.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(stores.map(s => s.id)))
    }
  }

  const handleDelete = async () => {
    if (selectedIds.size === 0) return

    setDeleting(true)
    try {
      const response = await fetch('/api/admin/stores', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      })

      if (!response.ok) throw new Error('Failed to delete')

      toast({
        title: 'Stores deleted',
        description: `Successfully deleted ${selectedIds.size} store(s) and all their data`
      })

      setShowDeleteDialog(false)
      fetchStores()
    } catch (error) {
      console.error('Delete failed:', error)
      toast({
        title: 'Delete failed',
        description: 'Failed to delete stores. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setDeleting(false)
    }
  }

  const columns = [
    {
      key: 'select',
      header: (
        <Checkbox
          checked={stores.length > 0 && selectedIds.size === stores.length}
          onCheckedChange={toggleSelectAll}
        />
      ),
      render: (store: StoreWithDetails) => (
        <Checkbox
          checked={selectedIds.has(store.id)}
          onCheckedChange={() => toggleSelect(store.id)}
        />
      )
    },
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
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete ({selectedIds.size})
            </Button>
          )}
          <Button variant="outline" onClick={fetchStores} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Stores
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete {selectedIds.size} store(s)?
              This will also delete all products, orders, customers, and other data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
