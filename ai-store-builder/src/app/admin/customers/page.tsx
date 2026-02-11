'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Search, RefreshCw, Trash2, AlertTriangle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
import type { CustomerDetails } from '@/lib/admin/queries'

export default function AdminCustomersPage() {
  const { toast } = useToast()
  const [customers, setCustomers] = useState<CustomerDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20'
      })

      if (search) params.append('search', search)

      const response = await fetch(`/api/admin/customers?${params}`)
      const data = await response.json()

      setCustomers(data.customers || [])
      setTotalPages(data.totalPages || 1)
      setTotal(data.total || 0)
      setSelectedIds(new Set())
    } catch (error) {
      console.error('Failed to fetch customers:', error)
    } finally {
      setLoading(false)
    }
  }, [search, page])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

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
    if (selectedIds.size === customers.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(customers.map(c => c.id)))
    }
  }

  const handleDelete = async () => {
    if (selectedIds.size === 0) return

    setDeleting(true)
    try {
      const response = await fetch('/api/admin/customers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      })

      if (!response.ok) throw new Error('Failed to delete')

      toast({
        title: 'Customers deleted',
        description: `Successfully deleted ${selectedIds.size} customer(s)`
      })

      setShowDeleteDialog(false)
      fetchCustomers()
    } catch (error) {
      console.error('Delete failed:', error)
      toast({
        title: 'Delete failed',
        description: 'Failed to delete customers. Please try again.',
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
          checked={customers.length > 0 && selectedIds.size === customers.length}
          onCheckedChange={toggleSelectAll}
        />
      ),
      render: (customer: CustomerDetails) => (
        <Checkbox
          checked={selectedIds.has(customer.id)}
          onCheckedChange={() => toggleSelect(customer.id)}
        />
      )
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (customer: CustomerDetails) => (
        <div>
          <p className="font-medium text-sm">{customer.name}</p>
          <p className="text-xs text-muted-foreground">{customer.email}</p>
        </div>
      )
    },
    {
      key: 'store',
      header: 'Store',
      render: (customer: CustomerDetails) => (
        <Link
          href={`/admin/stores`}
          className="text-sm hover:text-primary hover:underline"
        >
          {customer.store_name}
        </Link>
      )
    },
    {
      key: 'orders',
      header: 'Orders',
      hideOnMobile: true,
      render: (customer: CustomerDetails) => (
        <span className="text-sm">{customer.orders_count}</span>
      )
    },
    {
      key: 'spent',
      header: 'Total Spent',
      render: (customer: CustomerDetails) => (
        <span className="text-sm font-medium">
          {formatCurrency(customer.total_spent, 'INR')}
        </span>
      )
    },
    {
      key: 'joined',
      header: 'Joined',
      hideOnMobile: true,
      render: (customer: CustomerDetails) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(customer.created_at), 'MMM dd, yyyy')}
        </span>
      )
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-muted-foreground">
            {total} total customers across all stores
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
          <Button variant="outline" onClick={fetchCustomers} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search customers by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <AdminDataTable
        columns={columns}
        data={customers}
        keyExtractor={(customer) => customer.id}
        isLoading={loading}
        emptyMessage="No customers found"
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
              Delete Customers
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete {selectedIds.size} customer(s)?
              This will also delete their addresses, sessions, and wishlists.
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
