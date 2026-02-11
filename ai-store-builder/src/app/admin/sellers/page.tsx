'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Search, RefreshCw, Trash2, AlertTriangle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { AdminDataTable } from '@/components/admin/admin-data-table'
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
import type { SellerDetails } from '@/lib/admin/queries'

export default function AdminSellersPage() {
  const { toast } = useToast()
  const [sellers, setSellers] = useState<SellerDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchSellers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20'
      })

      if (search) params.append('search', search)

      const response = await fetch(`/api/admin/sellers?${params}`)
      const data = await response.json()

      setSellers(data.sellers || [])
      setTotalPages(data.totalPages || 1)
      setTotal(data.total || 0)
      setSelectedIds(new Set())
    } catch (error) {
      console.error('Failed to fetch sellers:', error)
    } finally {
      setLoading(false)
    }
  }, [search, page])

  useEffect(() => {
    fetchSellers()
  }, [fetchSellers])

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
    if (selectedIds.size === sellers.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(sellers.map(s => s.id)))
    }
  }

  const handleDelete = async () => {
    if (selectedIds.size === 0) return

    setDeleting(true)
    try {
      const response = await fetch('/api/admin/sellers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      })

      if (!response.ok) throw new Error('Failed to delete')

      toast({
        title: 'Sellers deleted',
        description: `Successfully deleted ${selectedIds.size} seller(s) and their stores`
      })

      setShowDeleteDialog(false)
      fetchSellers()
    } catch (error) {
      console.error('Delete failed:', error)
      toast({
        title: 'Delete failed',
        description: 'Failed to delete sellers. Please try again.',
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
          checked={sellers.length > 0 && selectedIds.size === sellers.length}
          onCheckedChange={toggleSelectAll}
        />
      ),
      render: (seller: SellerDetails) => (
        <Checkbox
          checked={selectedIds.has(seller.id)}
          onCheckedChange={() => toggleSelect(seller.id)}
        />
      )
    },
    {
      key: 'seller',
      header: 'Seller',
      render: (seller: SellerDetails) => (
        <div>
          <p className="font-medium text-sm">{seller.full_name}</p>
          <p className="text-xs text-muted-foreground">{seller.email}</p>
        </div>
      )
    },
    {
      key: 'store',
      header: 'Store',
      render: (seller: SellerDetails) => (
        seller.store_name ? (
          <div>
            <Link
              href={`/admin/stores`}
              className="font-medium text-sm hover:text-primary hover:underline"
            >
              {seller.store_name}
            </Link>
            {seller.store_status && (
              <Badge
                variant="secondary"
                className={`ml-2 text-xs ${
                  seller.store_status === 'active' ? 'bg-green-100 text-green-800' :
                  seller.store_status === 'suspended' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}
              >
                {seller.store_status}
              </Badge>
            )}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">No store</span>
        )
      )
    },
    {
      key: 'signup',
      header: 'Signup Date',
      hideOnMobile: true,
      render: (seller: SellerDetails) => (
        <span className="text-sm">
          {format(new Date(seller.created_at), 'MMM dd, yyyy')}
        </span>
      )
    },
    {
      key: 'lastLogin',
      header: 'Last Login',
      hideOnMobile: true,
      render: (seller: SellerDetails) => (
        <span className="text-sm text-muted-foreground">
          {seller.last_login_at
            ? format(new Date(seller.last_login_at), 'MMM dd, yyyy')
            : 'Never'}
        </span>
      )
    },
    {
      key: 'logins',
      header: 'Logins',
      hideOnMobile: true,
      render: (seller: SellerDetails) => (
        <span className="text-sm">{seller.login_count}</span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (seller: SellerDetails) => (
        <Badge
          variant="secondary"
          className={seller.onboarding_completed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}
        >
          {seller.onboarding_completed ? 'Completed' : 'Onboarding'}
        </Badge>
      )
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Sellers</h1>
          <p className="text-muted-foreground">
            {total} total sellers on the platform
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
          <Button variant="outline" onClick={fetchSellers} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search sellers by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <AdminDataTable
        columns={columns}
        data={sellers}
        keyExtractor={(seller) => seller.id}
        isLoading={loading}
        emptyMessage="No sellers found"
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
              Delete Sellers
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete {selectedIds.size} seller(s)?
              This will also delete their stores, products, orders, and all related data.
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
