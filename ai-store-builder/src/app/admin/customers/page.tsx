'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Search, RefreshCw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AdminDataTable } from '@/components/admin/admin-data-table'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import type { CustomerDetails } from '@/lib/admin/queries'

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

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

  const columns = [
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
        <Button variant="outline" onClick={fetchCustomers} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
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
    </div>
  )
}
