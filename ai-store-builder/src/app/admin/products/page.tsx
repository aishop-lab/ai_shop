'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, RefreshCw, Trash2, AlertTriangle } from 'lucide-react'
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
import type { ProductWithStore } from '@/lib/admin/queries'

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':
    case 'published':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
    case 'draft':
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Draft</Badge>
    case 'archived':
      return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Archived</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

export default function AdminProductsPage() {
  const { toast } = useToast()
  const [products, setProducts] = useState<ProductWithStore[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20'
      })

      if (status !== 'all') params.append('status', status)
      if (search) params.append('search', search)

      const response = await fetch(`/api/admin/products?${params}`)
      const data = await response.json()

      setProducts(data.products || [])
      setTotalPages(data.totalPages || 1)
      setTotal(data.total || 0)
      setSelectedIds(new Set())
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setLoading(false)
    }
  }, [status, search, page])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

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
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(products.map(p => p.id)))
    }
  }

  const handleDelete = async () => {
    if (selectedIds.size === 0) return

    setDeleting(true)
    try {
      const response = await fetch('/api/admin/products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      })

      if (!response.ok) throw new Error('Failed to delete')

      toast({
        title: 'Products deleted',
        description: `Successfully deleted ${selectedIds.size} product(s)`
      })

      setShowDeleteDialog(false)
      fetchProducts()
    } catch (error) {
      console.error('Delete failed:', error)
      toast({
        title: 'Delete failed',
        description: 'Failed to delete products. Please try again.',
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
          checked={products.length > 0 && selectedIds.size === products.length}
          onCheckedChange={toggleSelectAll}
        />
      ),
      render: (product: ProductWithStore) => (
        <Checkbox
          checked={selectedIds.has(product.id)}
          onCheckedChange={() => toggleSelect(product.id)}
        />
      )
    },
    {
      key: 'product',
      header: 'Product',
      render: (product: ProductWithStore) => (
        <div className="flex items-center gap-3">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.title}
              width={40}
              height={40}
              className="w-10 h-10 rounded-lg object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <span className="text-xs text-muted-foreground">No img</span>
            </div>
          )}
          <span className="font-medium text-sm line-clamp-1">{product.title}</span>
        </div>
      )
    },
    {
      key: 'store',
      header: 'Store',
      render: (product: ProductWithStore) => (
        <Link
          href={`/admin/stores`}
          className="text-sm hover:text-primary hover:underline"
        >
          {product.store_name}
        </Link>
      )
    },
    {
      key: 'price',
      header: 'Price',
      render: (product: ProductWithStore) => (
        <span className="text-sm font-medium">
          {formatCurrency(product.price, 'INR')}
        </span>
      )
    },
    {
      key: 'stock',
      header: 'Stock',
      hideOnMobile: true,
      render: (product: ProductWithStore) => (
        <span className={`text-sm ${product.total_inventory <= 5 ? 'text-red-600 font-medium' : ''}`}>
          {product.total_inventory}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (product: ProductWithStore) => getStatusBadge(product.status)
    },
    {
      key: 'created',
      header: 'Created',
      hideOnMobile: true,
      render: (product: ProductWithStore) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(product.created_at), 'MMM dd, yyyy')}
        </span>
      )
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-muted-foreground">
            {total} total products across all stores
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
          <Button variant="outline" onClick={fetchProducts} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search products by title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Status Tabs */}
      <Tabs value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="published">Active</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Table */}
      <AdminDataTable
        columns={columns}
        data={products}
        keyExtractor={(product) => product.id}
        isLoading={loading}
        emptyMessage="No products found"
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
              Delete Products
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete {selectedIds.size} product(s)?
              This will also delete all associated images and variants.
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
