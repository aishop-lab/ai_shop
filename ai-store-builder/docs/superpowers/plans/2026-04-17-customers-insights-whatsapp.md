# Customers CRM, Proactive Insights & WhatsApp Marketing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Customers CRM dashboard, proactive agent insights on the Command Center, and WhatsApp marketing campaign capabilities.

**Architecture:** Three independent features sharing the existing dashboard patterns (orders page as template), Supabase backend, and agent infrastructure. Feature 1 builds a new dashboard section from existing DB schema. Feature 2 wires existing agent output (agent_actions, agent_approvals, anomaly detection) into Command Center UI. Feature 3 adds a marketing_campaigns table and extends MSG91 integration for broadcast messaging.

**Tech Stack:** Next.js App Router, Supabase (PostgreSQL), Tailwind CSS, Lucide icons, MSG91 WhatsApp API, existing agent executor & analytics queries.

---

## File Structure

### Feature 1: Customers CRM

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/app/dashboard/customers/page.tsx` | Customer list page with search, segment tabs, table, pagination |
| Create | `src/app/dashboard/customers/[id]/page.tsx` | Customer detail page — profile, stats, orders, addresses, wishlist |
| Create | `src/app/api/dashboard/customers/route.ts` | List customers API with segment filtering, search, pagination |
| Create | `src/app/api/dashboard/customers/[id]/route.ts` | Single customer detail API with orders, addresses, wishlist |
| Create | `src/app/api/dashboard/customers/export/route.ts` | CSV export of customer list |
| Modify | `src/components/dashboard/sidebar.tsx` | Add "Customers" nav item after Reviews |

### Feature 2: Proactive Agent Insights

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/app/api/dashboard/insights/route.ts` | Aggregated insights API — merges agent_actions insights, pending approvals, anomalies |
| Create | `src/components/dashboard/insights-feed.tsx` | Insight cards component for Command Center |
| Create | `src/components/dashboard/pending-approvals.tsx` | Approval cards with approve/reject actions |
| Create | `src/components/dashboard/agent-activity.tsx` | Recent agent activity timeline |
| Create | `src/app/api/dashboard/approvals/[id]/route.ts` | Approve/reject an agent approval |
| Modify | `src/app/dashboard/page.tsx` | Replace static content with insights feed, approvals, activity |

### Feature 3: WhatsApp Marketing Campaigns

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `supabase/migrations/040_marketing_campaigns.sql` | marketing_campaigns + campaign_messages tables, whatsapp_consent column |
| Create | `src/app/api/dashboard/campaigns/route.ts` | List/create campaigns API |
| Create | `src/app/api/dashboard/campaigns/[id]/route.ts` | Get/update/delete single campaign |
| Create | `src/app/api/dashboard/campaigns/[id]/send/route.ts` | Execute campaign — send messages |
| Create | `src/lib/campaigns/send-campaign.ts` | Campaign execution logic — segment customers, send via MSG91/Resend |
| Create | `src/app/dashboard/marketing/page.tsx` | Campaign list page with status tabs |
| Create | `src/app/dashboard/marketing/new/page.tsx` | Create campaign flow — channel, segment, template, preview, schedule |
| Create | `src/app/dashboard/marketing/[id]/page.tsx` | Campaign detail — delivery stats, message log |
| Modify | `src/components/dashboard/sidebar.tsx` | Update Marketing nav to point to `/dashboard/marketing` |
| Modify | `src/lib/whatsapp/msg91.ts` | Add `sendBulkWhatsApp()` for broadcast messaging |

---

## FEATURE 1: CUSTOMERS CRM

### Task 1: Customer List API

**Files:**
- Create: `src/app/api/dashboard/customers/route.ts`

- [ ] **Step 1: Create the customer list API route**

```typescript
// src/app/api/dashboard/customers/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { sanitizeSearchQuery } from '@/lib/utils/sanitize'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const storeId = searchParams.get('store_id')
  const segment = searchParams.get('segment') || 'all'
  const search = searchParams.get('search') || ''
  const sortBy = searchParams.get('sort_by') || 'created_at'
  const sortOrder = searchParams.get('sort_order') === 'asc'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  if (!storeId) {
    return NextResponse.json({ error: 'store_id is required' }, { status: 400 })
  }

  // Verify store ownership
  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('id')
    .eq('id', storeId)
    .eq('owner_id', user.id)
    .single()

  if (storeError || !store) {
    return NextResponse.json({ error: 'Store not found or access denied' }, { status: 403 })
  }

  const admin = getSupabaseAdmin()
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = admin
    .from('customers')
    .select('id, email, phone, full_name, marketing_consent, total_orders, total_spent, last_order_at, created_at', { count: 'exact' })
    .eq('store_id', storeId)

  // Segment filtering
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()

  if (segment === 'active') {
    query = query.gte('last_order_at', thirtyDaysAgo)
  } else if (segment === 'at_risk') {
    query = query.lt('last_order_at', thirtyDaysAgo).gte('last_order_at', ninetyDaysAgo)
  } else if (segment === 'churned') {
    query = query.lt('last_order_at', ninetyDaysAgo)
  } else if (segment === 'new') {
    query = query.lte('total_orders', 1)
  }

  // Search
  if (search) {
    const s = sanitizeSearchQuery(search)
    query = query.or(`full_name.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%`)
  }

  // Sort and paginate
  const validSortColumns = ['created_at', 'total_spent', 'total_orders', 'last_order_at', 'full_name']
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at'
  query = query.order(sortColumn, { ascending: sortOrder }).range(from, to)

  const { data: customers, error, count } = await query

  if (error) {
    console.error('Error fetching customers:', error)
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
  }

  // Get segment counts for tabs
  const { data: allCustomers } = await admin
    .from('customers')
    .select('total_orders, last_order_at')
    .eq('store_id', storeId)

  const segments = { all: 0, active: 0, at_risk: 0, churned: 0, new: 0 }
  if (allCustomers) {
    segments.all = allCustomers.length
    for (const c of allCustomers) {
      if (c.total_orders <= 1) segments.new++
      if (c.last_order_at && c.last_order_at >= thirtyDaysAgo) segments.active++
      else if (c.last_order_at && c.last_order_at < thirtyDaysAgo && c.last_order_at >= ninetyDaysAgo) segments.at_risk++
      else if (c.last_order_at && c.last_order_at < ninetyDaysAgo) segments.churned++
    }
  }

  return NextResponse.json({
    customers: customers || [],
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
    segments,
  })
}
```

- [ ] **Step 2: Verify the API compiles**

Run: `cd /Users/manan/Downloads/aistore_cursor/ai-store-builder && npx tsc --noEmit 2>&1 | grep "customers/route" | head -5`
Expected: No errors (or fix any import path issues)

- [ ] **Step 3: Commit**

```bash
git add src/app/api/dashboard/customers/route.ts
git commit -m "feat(customers): add customer list API with segment filtering"
```

---

### Task 2: Customer Detail API

**Files:**
- Create: `src/app/api/dashboard/customers/[id]/route.ts`

- [ ] **Step 1: Create the customer detail API**

```typescript
// src/app/api/dashboard/customers/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const storeId = searchParams.get('store_id')

  if (!storeId) {
    return NextResponse.json({ error: 'store_id is required' }, { status: 400 })
  }

  // Verify store ownership
  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('id', storeId)
    .eq('owner_id', user.id)
    .single()

  if (!store) {
    return NextResponse.json({ error: 'Store not found or access denied' }, { status: 403 })
  }

  const admin = getSupabaseAdmin()

  // Fetch customer
  const { data: customer, error: customerError } = await admin
    .from('customers')
    .select('*')
    .eq('id', id)
    .eq('store_id', storeId)
    .single()

  if (customerError || !customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  }

  // Fetch related data in parallel
  const [ordersRes, addressesRes, wishlistRes, loyaltyRes] = await Promise.all([
    admin
      .from('orders')
      .select('id, order_number, total_amount, currency, order_status, payment_status, created_at')
      .eq('store_id', storeId)
      .eq('customer_id', id)
      .order('created_at', { ascending: false })
      .limit(50),
    admin
      .from('customer_addresses')
      .select('*')
      .eq('customer_id', id)
      .order('is_default', { ascending: false }),
    admin
      .from('wishlists')
      .select('product_id, created_at, products(id, title, price, currency, images)')
      .eq('customer_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
    admin
      .from('loyalty_points')
      .select('balance, lifetime_earned, lifetime_redeemed, tier')
      .eq('store_id', storeId)
      .eq('customer_id', id)
      .maybeSingle(),
  ])

  // Compute stats
  const orders = ordersRes.data || []
  const paidOrders = orders.filter((o: any) => o.payment_status === 'paid')
  const avgOrderValue = paidOrders.length > 0
    ? paidOrders.reduce((sum: number, o: any) => sum + parseFloat(o.total_amount || 0), 0) / paidOrders.length
    : 0

  return NextResponse.json({
    customer,
    orders,
    addresses: addressesRes.data || [],
    wishlist: wishlistRes.data || [],
    loyalty: loyaltyRes.data || null,
    stats: {
      totalOrders: customer.total_orders,
      totalSpent: customer.total_spent,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      loyaltyPoints: loyaltyRes.data?.balance || 0,
      loyaltyTier: loyaltyRes.data?.tier || 'none',
    },
  })
}
```

- [ ] **Step 2: Verify compiles**

Run: `npx tsc --noEmit 2>&1 | grep "customers" | head -5`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/dashboard/customers/[id]/route.ts
git commit -m "feat(customers): add customer detail API with orders, addresses, wishlist, loyalty"
```

---

### Task 3: Customer Export API

**Files:**
- Create: `src/app/api/dashboard/customers/export/route.ts`

- [ ] **Step 1: Create CSV export endpoint**

```typescript
// src/app/api/dashboard/customers/export/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const storeId = searchParams.get('store_id')

  if (!storeId) {
    return NextResponse.json({ error: 'store_id required' }, { status: 400 })
  }

  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('id', storeId)
    .eq('owner_id', user.id)
    .single()

  if (!store) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const admin = getSupabaseAdmin()
  const { data: customers } = await admin
    .from('customers')
    .select('full_name, email, phone, total_orders, total_spent, last_order_at, marketing_consent, created_at')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(10000)

  if (!customers || customers.length === 0) {
    return NextResponse.json({ error: 'No customers to export' }, { status: 404 })
  }

  const headers = ['Name', 'Email', 'Phone', 'Total Orders', 'Total Spent', 'Last Order', 'Marketing Consent', 'Joined']
  const rows = customers.map((c: any) => [
    c.full_name || '',
    c.email,
    c.phone || '',
    c.total_orders,
    c.total_spent,
    c.last_order_at ? new Date(c.last_order_at).toLocaleDateString() : 'Never',
    c.marketing_consent ? 'Yes' : 'No',
    new Date(c.created_at).toLocaleDateString(),
  ])

  const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename=customers-${new Date().toISOString().split('T')[0]}.csv`,
    },
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/dashboard/customers/export/route.ts
git commit -m "feat(customers): add CSV export endpoint"
```

---

### Task 4: Customer List Page

**Files:**
- Create: `src/app/dashboard/customers/page.tsx`

- [ ] **Step 1: Create the customers list page**

```tsx
// src/app/dashboard/customers/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Search, Download, ChevronLeft, ChevronRight } from 'lucide-react'

interface Customer {
  id: string
  full_name: string | null
  email: string
  phone: string | null
  total_orders: number
  total_spent: number
  last_order_at: string | null
  marketing_consent: boolean
  created_at: string
}

interface Segments {
  all: number
  active: number
  at_risk: number
  churned: number
  new: number
}

const SEGMENT_TABS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'at_risk', label: 'At Risk' },
  { value: 'churned', label: 'Churned' },
  { value: 'new', label: 'New' },
]

export default function CustomersPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [segment, setSegment] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [segments, setSegments] = useState<Segments>({ all: 0, active: 0, at_risk: 0, churned: 0, new: 0 })
  const [storeId, setStoreId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    fetch('/api/dashboard/settings')
      .then(res => res.json())
      .then(data => { if (data.store?.id) setStoreId(data.store.id) })
      .catch(() => {})
  }, [])

  const fetchCustomers = useCallback(async () => {
    if (!storeId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        store_id: storeId,
        page: page.toString(),
        limit: '20',
        segment,
        sort_by: sortBy,
        sort_order: sortOrder,
      })
      if (search) params.set('search', search)

      const res = await fetch(`/api/dashboard/customers?${params}`)
      const data = await res.json()
      setCustomers(data.customers || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
      setSegments(data.segments || segments)
    } catch (err) {
      console.error('Failed to fetch customers:', err)
    } finally {
      setLoading(false)
    }
  }, [storeId, page, segment, search, sortBy, sortOrder])

  useEffect(() => { fetchCustomers() }, [fetchCustomers])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => { setPage(1); fetchCustomers() }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)

  const formatDate = (date: string | null) =>
    date ? new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never'

  const getSegmentBadge = (customer: Customer) => {
    const now = Date.now()
    const lastOrder = customer.last_order_at ? new Date(customer.last_order_at).getTime() : 0
    const daysSince = lastOrder ? (now - lastOrder) / (1000 * 60 * 60 * 24) : Infinity

    if (customer.total_orders <= 1) return <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-400">New</span>
    if (daysSince <= 30) return <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400">Active</span>
    if (daysSince <= 90) return <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-500/20 text-yellow-400">At Risk</span>
    return <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-400">Churned</span>
  }

  const handleExport = async () => {
    if (!storeId) return
    window.open(`/api/dashboard/customers/export?store_id=${storeId}`, '_blank')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Customers</h1>
          <p className="text-sm text-zinc-400 mt-1">{total} customers across all segments</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 transition-colors"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Segment Tabs */}
      <div className="flex gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
        {SEGMENT_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => { setSegment(tab.value); setPage(1) }}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              segment === tab.value
                ? 'bg-zinc-700 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs text-zinc-500">
              {segments[tab.value as keyof Segments]}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
        </div>
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <Users className="h-12 w-12 mb-4" />
          <p className="text-lg font-medium text-zinc-400">No customers found</p>
          <p className="text-sm">Customers will appear here when they create accounts on your store.</p>
        </div>
      ) : (
        <div className="border border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-900/50 border-b border-zinc-800">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase hidden md:table-cell">Phone</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase">Orders</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase">Spent</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase hidden lg:table-cell">Last Order</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase hidden sm:table-cell">Segment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {customers.map(customer => (
                <tr
                  key={customer.id}
                  onClick={() => router.push(`/dashboard/customers/${customer.id}`)}
                  className="hover:bg-zinc-800/50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{customer.full_name || 'No name'}</p>
                      <p className="text-xs text-zinc-500">{customer.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-400 hidden md:table-cell">{customer.phone || '—'}</td>
                  <td className="px-4 py-3 text-sm text-zinc-300">{customer.total_orders}</td>
                  <td className="px-4 py-3 text-sm text-zinc-300">{formatCurrency(customer.total_spent)}</td>
                  <td className="px-4 py-3 text-sm text-zinc-400 hidden lg:table-cell">{formatDate(customer.last_order_at)}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">{getSegmentBadge(customer)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500">
            Page {page} of {totalPages} ({total} customers)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | grep "customers/page" | head -5`

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/customers/page.tsx
git commit -m "feat(customers): add customer list page with segments, search, pagination"
```

---

### Task 5: Customer Detail Page

**Files:**
- Create: `src/app/dashboard/customers/[id]/page.tsx`

- [ ] **Step 1: Create the customer detail page**

```tsx
// src/app/dashboard/customers/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Mail, Phone, MapPin, ShoppingBag, Heart,
  Star, TrendingUp, Package, CreditCard,
} from 'lucide-react'

interface CustomerDetail {
  customer: any
  orders: any[]
  addresses: any[]
  wishlist: any[]
  loyalty: any
  stats: {
    totalOrders: number
    totalSpent: number
    avgOrderValue: number
    loyaltyPoints: number
    loyaltyTier: string
  }
}

export default function CustomerDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [data, setData] = useState<CustomerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [storeId, setStoreId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/dashboard/settings')
      .then(res => res.json())
      .then(d => { if (d.store?.id) setStoreId(d.store.id) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!storeId || !id) return
    setLoading(true)
    fetch(`/api/dashboard/customers/${id}?store_id=${storeId}`)
      .then(res => res.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [storeId, id])

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      delivered: 'text-green-400 bg-green-500/20',
      shipped: 'text-blue-400 bg-blue-500/20',
      processing: 'text-yellow-400 bg-yellow-500/20',
      cancelled: 'text-red-400 bg-red-500/20',
      unfulfilled: 'text-zinc-400 bg-zinc-500/20',
    }
    return colors[status] || 'text-zinc-400 bg-zinc-500/20'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-zinc-500">
        <p>Customer not found</p>
      </div>
    )
  }

  const { customer, orders, addresses, wishlist, stats, loyalty } = data

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.push('/dashboard/customers')}
        className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Customers
      </button>

      {/* Profile header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">{customer.full_name || 'No name'}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-zinc-400">
              <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{customer.email}</span>
              {customer.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{customer.phone}</span>}
            </div>
            <p className="text-xs text-zinc-500 mt-2">Customer since {formatDate(customer.created_at)}</p>
          </div>
          {stats.loyaltyTier !== 'none' && (
            <span className="px-3 py-1 text-sm rounded-full bg-amber-500/20 text-amber-400 capitalize">
              <Star className="h-3.5 w-3.5 inline mr-1" />{stats.loyaltyTier}
            </span>
          )}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders', value: stats.totalOrders, icon: Package },
          { label: 'Lifetime Value', value: formatCurrency(stats.totalSpent), icon: TrendingUp },
          { label: 'Avg Order Value', value: formatCurrency(stats.avgOrderValue), icon: CreditCard },
          { label: 'Loyalty Points', value: stats.loyaltyPoints.toLocaleString(), icon: Star },
        ].map(stat => (
          <div key={stat.label} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-zinc-400 mb-2">
              <stat.icon className="h-4 w-4" />
              <span className="text-xs">{stat.label}</span>
            </div>
            <p className="text-lg font-semibold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Orders */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
        <div className="px-4 py-3 border-b border-zinc-800">
          <h2 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            Order History ({orders.length})
          </h2>
        </div>
        {orders.length === 0 ? (
          <p className="p-4 text-sm text-zinc-500">No orders yet</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500">Order</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500">Date</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500">Amount</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {orders.map((order: any) => (
                <tr
                  key={order.id}
                  onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                  className="hover:bg-zinc-800/50 cursor-pointer"
                >
                  <td className="px-4 py-2.5 text-sm text-zinc-300">#{order.order_number}</td>
                  <td className="px-4 py-2.5 text-sm text-zinc-400">{formatDate(order.created_at)}</td>
                  <td className="px-4 py-2.5 text-sm text-zinc-300">{formatCurrency(order.total_amount)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(order.order_status)}`}>
                      {order.order_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Addresses and Wishlist side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Addresses */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
          <div className="px-4 py-3 border-b border-zinc-800">
            <h2 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Addresses ({addresses.length})
            </h2>
          </div>
          {addresses.length === 0 ? (
            <p className="p-4 text-sm text-zinc-500">No saved addresses</p>
          ) : (
            <div className="divide-y divide-zinc-800">
              {addresses.map((addr: any) => (
                <div key={addr.id} className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-zinc-300">{addr.label || 'Address'}</span>
                    {addr.is_default && <span className="text-xs px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">Default</span>}
                  </div>
                  <p className="text-xs text-zinc-500">
                    {[addr.address_line1, addr.address_line2, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Wishlist */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
          <div className="px-4 py-3 border-b border-zinc-800">
            <h2 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Wishlist ({wishlist.length})
            </h2>
          </div>
          {wishlist.length === 0 ? (
            <p className="p-4 text-sm text-zinc-500">No wishlist items</p>
          ) : (
            <div className="divide-y divide-zinc-800">
              {wishlist.map((item: any) => (
                <div key={item.product_id} className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded bg-zinc-800 flex items-center justify-center text-zinc-500">
                    <ShoppingBag className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-300">{item.products?.title || 'Unknown product'}</p>
                    <p className="text-xs text-zinc-500">{item.products?.price ? formatCurrency(item.products.price) : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify compiles**

Run: `npx tsc --noEmit 2>&1 | grep "customers" | head -5`

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/customers/[id]/page.tsx
git commit -m "feat(customers): add customer detail page with profile, orders, addresses, wishlist"
```

---

### Task 6: Add Customers to Sidebar

**Files:**
- Modify: `src/components/dashboard/sidebar.tsx`

- [ ] **Step 1: Add Customers nav item after Reviews**

In `src/components/dashboard/sidebar.tsx`, add a new `NavSection` for Customers right after Reviews and before Refunds. The exact insertion point is after the Reviews NavSection (`<NavSection label="Reviews" icon={MessageSquare}`) and before the Refunds NavSection. Add:

```tsx
<NavSection
  label="Customers"
  icon={Users}
  href="/dashboard/customers"
  onNavigate={onClose}
/>
```

Ensure `Users` is imported from `lucide-react` at the top of the file.

- [ ] **Step 2: Verify compiles**

Run: `npx tsc --noEmit 2>&1 | grep "sidebar" | head -5`

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/sidebar.tsx
git commit -m "feat(customers): add Customers to dashboard sidebar navigation"
```

---

## FEATURE 2: PROACTIVE AGENT INSIGHTS

### Task 7: Insights API

**Files:**
- Create: `src/app/api/dashboard/insights/route.ts`

- [ ] **Step 1: Create the aggregated insights API**

```typescript
// src/app/api/dashboard/insights/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const storeId = searchParams.get('store_id')

  if (!storeId) {
    return NextResponse.json({ error: 'store_id required' }, { status: 400 })
  }

  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('id', storeId)
    .eq('owner_id', user.id)
    .single()

  if (!store) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const admin = getSupabaseAdmin()

  // Fetch in parallel: recent insights, pending approvals, recent activity
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [insightsRes, approvalsRes, activityRes, agentStatesRes] = await Promise.all([
    // Recent insight-type actions (anomalies, recommendations, reports)
    admin
      .from('agent_actions')
      .select('id, agent_type, action_type, action_category, summary, details, status, created_at')
      .eq('store_id', storeId)
      .in('action_category', ['insight', 'anomaly', 'recommendation', 'report', 'alert'])
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false })
      .limit(20),

    // Pending approvals
    admin
      .from('agent_approvals')
      .select('id, agent_type, action_type, summary, reasoning, details, priority, expires_at, created_at')
      .eq('store_id', storeId)
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(10),

    // Recent agent activity
    admin
      .from('agent_actions')
      .select('id, agent_type, action_type, summary, status, execution_mode, created_at, duration_ms')
      .eq('store_id', storeId)
      .gte('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: false })
      .limit(30),

    // Agent states for status overview
    admin
      .from('agent_states')
      .select('agent_type, is_enabled, status, last_action_at, total_actions, error_count')
      .eq('store_id', storeId),
  ])

  return NextResponse.json({
    insights: insightsRes.data || [],
    pendingApprovals: approvalsRes.data || [],
    recentActivity: activityRes.data || [],
    agentStates: agentStatesRes.data || [],
  })
}
```

- [ ] **Step 2: Verify compiles**

Run: `npx tsc --noEmit 2>&1 | grep "insights" | head -5`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/dashboard/insights/route.ts
git commit -m "feat(insights): add aggregated insights API for Command Center"
```

---

### Task 8: Approval Action API

**Files:**
- Create: `src/app/api/dashboard/approvals/[id]/route.ts`

- [ ] **Step 1: Create approve/reject API**

```typescript
// src/app/api/dashboard/approvals/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { action, rejection_reason, modifications } = body

  if (!action || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'action must be "approve" or "reject"' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  // Fetch the approval and verify store ownership
  const { data: approval } = await admin
    .from('agent_approvals')
    .select('id, store_id, status')
    .eq('id', id)
    .single()

  if (!approval) {
    return NextResponse.json({ error: 'Approval not found' }, { status: 404 })
  }

  // Verify ownership
  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('id', approval.store_id)
    .eq('owner_id', user.id)
    .single()

  if (!store) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  if (approval.status !== 'pending') {
    return NextResponse.json({ error: 'Approval already resolved' }, { status: 409 })
  }

  const updateData: any = {
    status: action === 'approve' ? 'approved' : 'rejected',
    resolved_by: user.id,
    resolved_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  if (action === 'reject' && rejection_reason) {
    updateData.rejection_reason = rejection_reason
  }

  if (action === 'approve' && modifications) {
    updateData.modifications = modifications
  }

  const { error } = await admin
    .from('agent_approvals')
    .update(updateData)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Failed to update approval' }, { status: 500 })
  }

  return NextResponse.json({ success: true, status: updateData.status })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/dashboard/approvals/[id]/route.ts
git commit -m "feat(insights): add approval approve/reject API"
```

---

### Task 9: Insights Feed Component

**Files:**
- Create: `src/components/dashboard/insights-feed.tsx`

- [ ] **Step 1: Create the insights feed component**

```tsx
// src/components/dashboard/insights-feed.tsx
'use client'

import { TrendingUp, TrendingDown, AlertTriangle, Lightbulb, BarChart3, Bot } from 'lucide-react'

interface Insight {
  id: string
  agent_type: string
  action_type: string
  action_category: string
  summary: string
  details: any
  created_at: string
}

const AGENT_COLORS: Record<string, string> = {
  analytics: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  marketing: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  sales: 'text-green-400 bg-green-500/10 border-green-500/20',
  support: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  technical: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
}

const CATEGORY_ICONS: Record<string, any> = {
  anomaly: AlertTriangle,
  insight: Lightbulb,
  recommendation: TrendingUp,
  report: BarChart3,
  alert: AlertTriangle,
}

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export function InsightsFeed({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500">
        <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No insights yet. Agents will surface findings here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {insights.map(insight => {
        const Icon = CATEGORY_ICONS[insight.action_category] || Lightbulb
        const colorClass = AGENT_COLORS[insight.agent_type] || 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20'

        return (
          <div
            key={insight.id}
            className={`p-4 rounded-lg border ${colorClass}`}
          >
            <div className="flex items-start gap-3">
              <Icon className="h-5 w-5 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium uppercase opacity-60">{insight.agent_type}</span>
                  <span className="text-xs opacity-40">{timeAgo(insight.created_at)}</span>
                </div>
                <p className="text-sm leading-relaxed">{insight.summary}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/insights-feed.tsx
git commit -m "feat(insights): add insights feed component"
```

---

### Task 10: Pending Approvals Component

**Files:**
- Create: `src/components/dashboard/pending-approvals.tsx`

- [ ] **Step 1: Create the pending approvals component**

```tsx
// src/components/dashboard/pending-approvals.tsx
'use client'

import { useState } from 'react'
import { Check, X, Clock, AlertCircle, Bot } from 'lucide-react'

interface Approval {
  id: string
  agent_type: string
  action_type: string
  summary: string
  reasoning: string | null
  details: any
  priority: string
  expires_at: string | null
  created_at: string
}

const PRIORITY_STYLES: Record<string, string> = {
  urgent: 'border-red-500/30 bg-red-500/5',
  high: 'border-orange-500/30 bg-orange-500/5',
  normal: 'border-zinc-700 bg-zinc-900',
  low: 'border-zinc-800 bg-zinc-900/50',
}

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export function PendingApprovals({
  approvals,
  onResolve,
}: {
  approvals: Approval[]
  onResolve: (id: string, action: 'approve' | 'reject') => Promise<void>
}) {
  const [resolving, setResolving] = useState<string | null>(null)

  if (approvals.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500">
        <Check className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No pending approvals. Agents are running smoothly.</p>
      </div>
    )
  }

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setResolving(id)
    try {
      await onResolve(id, action)
    } finally {
      setResolving(null)
    }
  }

  return (
    <div className="space-y-3">
      {approvals.map(approval => (
        <div
          key={approval.id}
          className={`p-4 rounded-lg border ${PRIORITY_STYLES[approval.priority] || PRIORITY_STYLES.normal}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Bot className="h-3.5 w-3.5 text-zinc-500" />
                <span className="text-xs font-medium text-zinc-400 uppercase">{approval.agent_type}</span>
                {approval.priority === 'urgent' && (
                  <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">Urgent</span>
                )}
                {approval.priority === 'high' && (
                  <span className="text-xs px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded">High</span>
                )}
                <span className="text-xs text-zinc-600">{timeAgo(approval.created_at)}</span>
              </div>
              <p className="text-sm text-zinc-200 mb-1">{approval.summary}</p>
              {approval.reasoning && (
                <p className="text-xs text-zinc-500 leading-relaxed">{approval.reasoning}</p>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => handleAction(approval.id, 'approve')}
                disabled={resolving === approval.id}
                className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 transition-colors disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleAction(approval.id, 'reject')}
                disabled={resolving === approval.id}
                className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/pending-approvals.tsx
git commit -m "feat(insights): add pending approvals component with approve/reject"
```

---

### Task 11: Agent Activity Component

**Files:**
- Create: `src/components/dashboard/agent-activity.tsx`

- [ ] **Step 1: Create the agent activity timeline**

```tsx
// src/components/dashboard/agent-activity.tsx
'use client'

import { Bot, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react'

interface Activity {
  id: string
  agent_type: string
  action_type: string
  summary: string
  status: string
  execution_mode: string | null
  created_at: string
  duration_ms: number | null
}

const STATUS_ICONS: Record<string, { icon: any; color: string }> = {
  completed: { icon: CheckCircle, color: 'text-green-400' },
  failed: { icon: XCircle, color: 'text-red-400' },
  running: { icon: Loader2, color: 'text-blue-400' },
  pending: { icon: Clock, color: 'text-yellow-400' },
  requires_approval: { icon: Clock, color: 'text-orange-400' },
}

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export function AgentActivity({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500">
        <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No recent agent activity.</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {activities.map(activity => {
        const statusInfo = STATUS_ICONS[activity.status] || STATUS_ICONS.completed
        const StatusIcon = statusInfo.icon

        return (
          <div key={activity.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800/50">
            <StatusIcon className={`h-4 w-4 shrink-0 ${statusInfo.color} ${activity.status === 'running' ? 'animate-spin' : ''}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-zinc-300 truncate">{activity.summary}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-zinc-600 capitalize">{activity.agent_type}</span>
              <span className="text-xs text-zinc-600">{timeAgo(activity.created_at)}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/agent-activity.tsx
git commit -m "feat(insights): add agent activity timeline component"
```

---

### Task 12: Redesign Command Center Page

**Files:**
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Rewrite the Command Center to include insights, approvals, and activity**

Replace the current static dashboard page content. Keep the existing store fetch pattern and getting started checklist (for new stores), but add the three new sections. The new page layout:

1. **Header**: Welcome + store name
2. **Quick Stats** (existing): Products, Orders, Revenue — keep these
3. **Pending Approvals**: `PendingApprovals` component (only if there are pending approvals)
4. **Insights Feed**: `InsightsFeed` component
5. **Agent Activity**: `AgentActivity` component
6. **Getting Started** (conditional): Only show for stores with no products

Key changes to the existing page:
- Add new state: `insights`, `pendingApprovals`, `recentActivity`, `agentStates`
- Add `fetchInsights()` that calls `GET /api/dashboard/insights?store_id=X`
- Add `handleApprovalResolve()` that calls `PATCH /api/dashboard/approvals/:id`
- Import the three new components
- Add a refresh button that re-fetches both stats and insights
- Add auto-refresh every 60 seconds for insights

The existing `DashboardStats` fetch from `/api/dashboard/stats` stays unchanged. The new insights fetch runs in parallel.

- [ ] **Step 2: Verify compiles**

Run: `npx tsc --noEmit 2>&1 | grep "dashboard/page" | head -5`

- [ ] **Step 3: Test in browser**

Run: `npm run dev` and visit `/dashboard`. Verify:
- Quick stats still display
- Insights section appears (may be empty if no agent actions exist yet)
- Pending approvals section appears
- Agent activity timeline appears
- Approve/reject buttons work

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat(insights): redesign Command Center with insights feed, approvals, agent activity"
```

---

## FEATURE 3: WHATSAPP MARKETING CAMPAIGNS

### Task 13: Database Migration

**Files:**
- Create: `supabase/migrations/040_marketing_campaigns.sql`

- [ ] **Step 1: Create the marketing campaigns migration**

```sql
-- 040_marketing_campaigns.sql
-- Marketing campaigns and message tracking

-- Add WhatsApp consent to customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS whatsapp_consent BOOLEAN DEFAULT FALSE;

-- Marketing campaigns
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled')),
  
  -- Targeting
  segment_filters JSONB DEFAULT '{}',
  -- e.g. { "segment": "active", "min_orders": 2, "marketing_consent": true }
  
  -- Content
  template_name VARCHAR(255),
  subject VARCHAR(255),
  content JSONB NOT NULL DEFAULT '{}',
  -- WhatsApp: { template_name, language, components[] }
  -- Email: { subject, body_html, body_text }
  
  -- Scheduling
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Stats (denormalized for fast reads)
  target_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  read_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual message tracking
CREATE TABLE IF NOT EXISTS campaign_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed', 'bounced')),
  
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  
  external_message_id VARCHAR(255),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_store_id ON marketing_campaigns(store_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON marketing_campaigns(store_id, status);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled ON marketing_campaigns(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_campaign_messages_campaign ON campaign_messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_messages_customer ON campaign_messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_campaign_messages_status ON campaign_messages(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_customers_whatsapp_consent ON customers(store_id, whatsapp_consent) WHERE whatsapp_consent = TRUE;

-- RLS
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners can manage campaigns"
  ON marketing_campaigns FOR ALL
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

CREATE POLICY "Store owners can view campaign messages"
  ON campaign_messages FOR ALL
  USING (campaign_id IN (
    SELECT id FROM marketing_campaigns WHERE store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()
    )
  ));
```

- [ ] **Step 2: Apply migration**

Run: `cd /Users/manan/Downloads/aistore_cursor/ai-store-builder && npx supabase db push` (or apply via Supabase dashboard)

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/040_marketing_campaigns.sql
git commit -m "feat(campaigns): add marketing_campaigns and campaign_messages tables"
```

---

### Task 14: Campaign Send Logic

**Files:**
- Create: `src/lib/campaigns/send-campaign.ts`

- [ ] **Step 1: Create campaign execution logic**

```typescript
// src/lib/campaigns/send-campaign.ts
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { sendWhatsAppMessage, getMSG91Credentials, formatPhoneNumber, validatePhoneNumber } from '@/lib/whatsapp/msg91'

interface CampaignTarget {
  id: string
  email: string
  phone: string | null
  full_name: string | null
}

export async function getEligibleCustomers(
  storeId: string,
  channel: 'whatsapp' | 'email',
  filters: Record<string, any>
): Promise<CampaignTarget[]> {
  const admin = getSupabaseAdmin()

  let query = admin
    .from('customers')
    .select('id, email, phone, full_name, total_orders, total_spent, last_order_at, marketing_consent, whatsapp_consent')
    .eq('store_id', storeId)
    .eq('marketing_consent', true)

  if (channel === 'whatsapp') {
    query = query.eq('whatsapp_consent', true).not('phone', 'is', null)
  }

  // Apply segment filter
  if (filters.segment && filters.segment !== 'all') {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()

    if (filters.segment === 'active') query = query.gte('last_order_at', thirtyDaysAgo)
    else if (filters.segment === 'at_risk') query = query.lt('last_order_at', thirtyDaysAgo).gte('last_order_at', ninetyDaysAgo)
    else if (filters.segment === 'churned') query = query.lt('last_order_at', ninetyDaysAgo)
    else if (filters.segment === 'new') query = query.lte('total_orders', 1)
  }

  if (filters.min_orders) query = query.gte('total_orders', filters.min_orders)
  if (filters.min_spent) query = query.gte('total_spent', filters.min_spent)

  const { data } = await query.limit(5000)
  return (data || []) as CampaignTarget[]
}

export async function executeCampaign(campaignId: string): Promise<{ sent: number; failed: number }> {
  const admin = getSupabaseAdmin()

  // Fetch campaign
  const { data: campaign, error } = await admin
    .from('marketing_campaigns')
    .select('*')
    .eq('id', campaignId)
    .single()

  if (error || !campaign) throw new Error('Campaign not found')
  if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
    throw new Error(`Campaign cannot be sent (status: ${campaign.status})`)
  }

  // Update status to sending
  await admin
    .from('marketing_campaigns')
    .update({ status: 'sending', started_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', campaignId)

  // Get eligible customers
  const targets = await getEligibleCustomers(campaign.store_id, campaign.channel, campaign.segment_filters || {})

  // Update target count
  await admin
    .from('marketing_campaigns')
    .update({ target_count: targets.length, updated_at: new Date().toISOString() })
    .eq('id', campaignId)

  let sent = 0
  let failed = 0

  if (campaign.channel === 'whatsapp') {
    const credentials = await getMSG91Credentials(campaign.store_id)
    if (!credentials) throw new Error('MSG91 credentials not configured')

    for (const target of targets) {
      if (!target.phone || !validatePhoneNumber(target.phone)) {
        failed++
        continue
      }

      const phone = formatPhoneNumber(target.phone)
      const content = campaign.content as any

      // Insert message record
      const { data: msg } = await admin
        .from('campaign_messages')
        .insert({
          campaign_id: campaignId,
          customer_id: target.id,
          channel: 'whatsapp',
          recipient: phone,
          status: 'pending',
        })
        .select('id')
        .single()

      try {
        const result = await sendWhatsAppMessage({
          authKey: credentials.authKey,
          integratedNumber: credentials.whatsappNumber,
          to: phone,
          templateName: content.template_name || 'promotional_message',
          language: content.language || 'en',
          components: content.components || [],
        })

        if (result.success) {
          sent++
          await admin.from('campaign_messages').update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            external_message_id: result.messageId,
          }).eq('id', msg?.id)
        } else {
          failed++
          await admin.from('campaign_messages').update({
            status: 'failed',
            failed_at: new Date().toISOString(),
            error_message: result.error,
          }).eq('id', msg?.id)
        }
      } catch (err: any) {
        failed++
        await admin.from('campaign_messages').update({
          status: 'failed',
          failed_at: new Date().toISOString(),
          error_message: err.message,
        }).eq('id', msg?.id)
      }
    }
  }

  // TODO: Email campaign support uses Resend — add when needed

  // Update campaign as complete
  await admin
    .from('marketing_campaigns')
    .update({
      status: 'sent',
      completed_at: new Date().toISOString(),
      sent_count: sent,
      failed_count: failed,
      updated_at: new Date().toISOString(),
    })
    .eq('id', campaignId)

  return { sent, failed }
}
```

- [ ] **Step 2: Verify compiles**

Run: `npx tsc --noEmit 2>&1 | grep "campaigns" | head -5`

- [ ] **Step 3: Commit**

```bash
git add src/lib/campaigns/send-campaign.ts
git commit -m "feat(campaigns): add campaign execution logic with WhatsApp broadcast"
```

---

### Task 15: Campaign List & Create API

**Files:**
- Create: `src/app/api/dashboard/campaigns/route.ts`

- [ ] **Step 1: Create campaign CRUD API**

```typescript
// src/app/api/dashboard/campaigns/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const storeId = searchParams.get('store_id')
  const status = searchParams.get('status')

  if (!storeId) {
    return NextResponse.json({ error: 'store_id required' }, { status: 400 })
  }

  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('id', storeId)
    .eq('owner_id', user.id)
    .single()

  if (!store) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const admin = getSupabaseAdmin()
  let query = admin
    .from('marketing_campaigns')
    .select('*', { count: 'exact' })
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data: campaigns, count, error } = await query.limit(50)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })
  }

  return NextResponse.json({ campaigns: campaigns || [], total: count || 0 })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { store_id, name, channel, segment_filters, template_name, subject, content, scheduled_at } = body

  if (!store_id || !name || !channel) {
    return NextResponse.json({ error: 'store_id, name, and channel are required' }, { status: 400 })
  }

  if (!['whatsapp', 'email'].includes(channel)) {
    return NextResponse.json({ error: 'channel must be whatsapp or email' }, { status: 400 })
  }

  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('id', store_id)
    .eq('owner_id', user.id)
    .single()

  if (!store) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const admin = getSupabaseAdmin()
  const { data: campaign, error } = await admin
    .from('marketing_campaigns')
    .insert({
      store_id,
      name,
      channel,
      status: scheduled_at ? 'scheduled' : 'draft',
      segment_filters: segment_filters || {},
      template_name,
      subject,
      content: content || {},
      scheduled_at,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create campaign:', error)
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
  }

  return NextResponse.json({ campaign }, { status: 201 })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/dashboard/campaigns/route.ts
git commit -m "feat(campaigns): add campaign list and create API"
```

---

### Task 16: Campaign Detail & Send APIs

**Files:**
- Create: `src/app/api/dashboard/campaigns/[id]/route.ts`
- Create: `src/app/api/dashboard/campaigns/[id]/send/route.ts`

- [ ] **Step 1: Create campaign detail API**

```typescript
// src/app/api/dashboard/campaigns/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getSupabaseAdmin()
  const { data: campaign } = await admin
    .from('marketing_campaigns')
    .select('*')
    .eq('id', id)
    .single()

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  // Verify ownership
  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('id', campaign.store_id)
    .eq('owner_id', user.id)
    .single()

  if (!store) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  // Fetch message stats
  const { data: messages } = await admin
    .from('campaign_messages')
    .select('id, status, recipient, sent_at, delivered_at, read_at, failed_at, error_message')
    .eq('campaign_id', id)
    .order('created_at', { ascending: false })
    .limit(200)

  return NextResponse.json({ campaign, messages: messages || [] })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getSupabaseAdmin()
  const { data: campaign } = await admin
    .from('marketing_campaigns')
    .select('store_id, status')
    .eq('id', id)
    .single()

  if (!campaign) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('id', campaign.store_id)
    .eq('owner_id', user.id)
    .single()

  if (!store) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  if (campaign.status === 'sending') {
    return NextResponse.json({ error: 'Cannot delete a campaign that is currently sending' }, { status: 409 })
  }

  await admin.from('marketing_campaigns').delete().eq('id', id)
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Create campaign send API**

```typescript
// src/app/api/dashboard/campaigns/[id]/send/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { executeCampaign } from '@/lib/campaigns/send-campaign'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getSupabaseAdmin()
  const { data: campaign } = await admin
    .from('marketing_campaigns')
    .select('store_id, status')
    .eq('id', id)
    .single()

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('id', campaign.store_id)
    .eq('owner_id', user.id)
    .single()

  if (!store) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
    return NextResponse.json({ error: `Cannot send campaign with status: ${campaign.status}` }, { status: 409 })
  }

  try {
    const result = await executeCampaign(id)
    return NextResponse.json({ success: true, ...result })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/dashboard/campaigns/[id]/route.ts src/app/api/dashboard/campaigns/[id]/send/route.ts
git commit -m "feat(campaigns): add campaign detail, delete, and send APIs"
```

---

### Task 17: Campaign List Page

**Files:**
- Create: `src/app/dashboard/marketing/page.tsx`

- [ ] **Step 1: Create the marketing campaigns list page**

```tsx
// src/app/dashboard/marketing/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Send, MessageSquare, Mail, Clock, CheckCircle, Trash2 } from 'lucide-react'

interface Campaign {
  id: string
  name: string
  channel: string
  status: string
  target_count: number
  sent_count: number
  delivered_count: number
  read_count: number
  failed_count: number
  scheduled_at: string | null
  completed_at: string | null
  created_at: string
}

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Drafts' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'sent', label: 'Sent' },
]

const STATUS_BADGES: Record<string, string> = {
  draft: 'bg-zinc-500/20 text-zinc-400',
  scheduled: 'bg-blue-500/20 text-blue-400',
  sending: 'bg-yellow-500/20 text-yellow-400',
  sent: 'bg-green-500/20 text-green-400',
  paused: 'bg-orange-500/20 text-orange-400',
  cancelled: 'bg-red-500/20 text-red-400',
}

export default function MarketingPage() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [storeId, setStoreId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/dashboard/settings')
      .then(res => res.json())
      .then(data => { if (data.store?.id) setStoreId(data.store.id) })
      .catch(() => {})
  }, [])

  const fetchCampaigns = useCallback(async () => {
    if (!storeId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ store_id: storeId, status: statusFilter })
      const res = await fetch(`/api/dashboard/campaigns?${params}`)
      const data = await res.json()
      setCampaigns(data.campaigns || [])
    } catch (err) {
      console.error('Failed to fetch campaigns:', err)
    } finally {
      setLoading(false)
    }
  }, [storeId, statusFilter])

  useEffect(() => { fetchCampaigns() }, [fetchCampaigns])

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Marketing Campaigns</h1>
          <p className="text-sm text-zinc-400 mt-1">Send targeted messages to your customers via WhatsApp or Email</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/marketing/new')}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-white text-black rounded-lg hover:bg-zinc-200 font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Campaign
        </button>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              statusFilter === tab.value ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Campaign List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <Send className="h-12 w-12 mb-4" />
          <p className="text-lg font-medium text-zinc-400">No campaigns yet</p>
          <p className="text-sm mb-4">Create your first campaign to reach your customers.</p>
          <button
            onClick={() => router.push('/dashboard/marketing/new')}
            className="px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 transition-colors"
          >
            Create Campaign
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(campaign => (
            <div
              key={campaign.id}
              onClick={() => router.push(`/dashboard/marketing/${campaign.id}`)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:bg-zinc-800/50 cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {campaign.channel === 'whatsapp' ? (
                    <MessageSquare className="h-5 w-5 text-green-400" />
                  ) : (
                    <Mail className="h-5 w-5 text-blue-400" />
                  )}
                  <div>
                    <h3 className="text-sm font-medium text-zinc-200">{campaign.name}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {campaign.channel === 'whatsapp' ? 'WhatsApp' : 'Email'} &middot; {formatDate(campaign.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {campaign.status === 'sent' && (
                    <div className="text-right text-xs text-zinc-500">
                      <span>{campaign.sent_count} sent</span>
                      {campaign.delivered_count > 0 && <span> &middot; {campaign.delivered_count} delivered</span>}
                    </div>
                  )}
                  <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_BADGES[campaign.status] || STATUS_BADGES.draft}`}>
                    {campaign.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/dashboard/marketing/page.tsx
git commit -m "feat(campaigns): add marketing campaigns list page"
```

---

### Task 18: Create Campaign Page

**Files:**
- Create: `src/app/dashboard/marketing/new/page.tsx`

- [ ] **Step 1: Create the new campaign page with channel, segment, content steps**

```tsx
// src/app/dashboard/marketing/new/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MessageSquare, Mail, Send, Users, FileText } from 'lucide-react'
import { getEligibleCustomers } from '@/lib/campaigns/send-campaign'

const SEGMENTS = [
  { value: 'all', label: 'All Customers', desc: 'Every customer with consent' },
  { value: 'active', label: 'Active', desc: 'Ordered in the last 30 days' },
  { value: 'at_risk', label: 'At Risk', desc: 'No order in 30-90 days' },
  { value: 'churned', label: 'Churned', desc: 'No order in 90+ days' },
  { value: 'new', label: 'New Customers', desc: '1 or fewer orders' },
]

const WHATSAPP_TEMPLATES = [
  { value: 'promotional_message', label: 'Promotional Message', desc: 'General promotional template' },
  { value: 'flash_sale', label: 'Flash Sale', desc: 'Time-limited offer announcement' },
  { value: 'new_arrival', label: 'New Arrival', desc: 'New product announcement' },
  { value: 'back_in_stock', label: 'Back in Stock', desc: 'Product restock notification' },
  { value: 'loyalty_reward', label: 'Loyalty Reward', desc: 'Loyalty points/tier update' },
  { value: 'festival_greeting', label: 'Festival Greeting', desc: 'Festival/holiday wishes' },
]

export default function NewCampaignPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [storeId, setStoreId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [estimatedReach, setEstimatedReach] = useState<number | null>(null)

  const [form, setForm] = useState({
    name: '',
    channel: '' as 'whatsapp' | 'email' | '',
    segment: 'all',
    template_name: 'promotional_message',
    subject: '',
    content: {} as Record<string, any>,
  })

  useEffect(() => {
    fetch('/api/dashboard/settings')
      .then(res => res.json())
      .then(data => { if (data.store?.id) setStoreId(data.store.id) })
      .catch(() => {})
  }, [])

  // Estimate reach when segment changes
  useEffect(() => {
    if (!storeId || !form.channel) return
    const params = new URLSearchParams({
      store_id: storeId,
      channel: form.channel,
      segment: form.segment,
      count_only: 'true',
    })
    fetch(`/api/dashboard/campaigns/estimate?${params}`)
      .then(res => res.json())
      .then(data => setEstimatedReach(data.count ?? null))
      .catch(() => setEstimatedReach(null))
  }, [storeId, form.channel, form.segment])

  const handleCreate = async () => {
    if (!storeId || !form.name || !form.channel) return
    setSaving(true)
    try {
      const res = await fetch('/api/dashboard/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: storeId,
          name: form.name,
          channel: form.channel,
          segment_filters: { segment: form.segment },
          template_name: form.template_name,
          subject: form.subject,
          content: form.channel === 'whatsapp'
            ? { template_name: form.template_name, language: 'en', components: [] }
            : { subject: form.subject, body_html: '', body_text: '' },
        }),
      })
      const data = await res.json()
      if (data.campaign) {
        router.push(`/dashboard/marketing/${data.campaign.id}`)
      }
    } catch (err) {
      console.error('Failed to create campaign:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back */}
      <button
        onClick={() => router.push('/dashboard/marketing')}
        className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Campaigns
      </button>

      <h1 className="text-2xl font-bold text-white">Create Campaign</h1>

      {/* Step indicator */}
      <div className="flex gap-2">
        {[1, 2, 3].map(s => (
          <div key={s} className={`h-1 flex-1 rounded-full ${s <= step ? 'bg-white' : 'bg-zinc-800'}`} />
        ))}
      </div>

      {/* Step 1: Channel */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-zinc-200">Choose Channel</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'green' },
              { value: 'email', label: 'Email', icon: Mail, color: 'blue' },
            ].map(ch => (
              <button
                key={ch.value}
                onClick={() => { setForm(f => ({ ...f, channel: ch.value as any })); setStep(2) }}
                className={`p-6 rounded-lg border text-left transition-colors ${
                  form.channel === ch.value
                    ? `border-${ch.color}-500/50 bg-${ch.color}-500/10`
                    : 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800/50'
                }`}
              >
                <ch.icon className={`h-8 w-8 mb-3 text-${ch.color}-400`} />
                <p className="font-medium text-zinc-200">{ch.label}</p>
                <p className="text-xs text-zinc-500 mt-1">
                  {ch.value === 'whatsapp' ? 'Send via MSG91 WhatsApp Business' : 'Send via Resend'}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Segment & Template */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-medium text-zinc-200 mb-1">Campaign Name</h2>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Summer Sale Announcement"
              className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
            />
          </div>

          <div>
            <h2 className="text-lg font-medium text-zinc-200 mb-3">Target Segment</h2>
            <div className="space-y-2">
              {SEGMENTS.map(seg => (
                <button
                  key={seg.value}
                  onClick={() => setForm(f => ({ ...f, segment: seg.value }))}
                  className={`w-full p-3 rounded-lg border text-left transition-colors ${
                    form.segment === seg.value ? 'border-zinc-500 bg-zinc-800' : 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800/50'
                  }`}
                >
                  <p className="text-sm font-medium text-zinc-200">{seg.label}</p>
                  <p className="text-xs text-zinc-500">{seg.desc}</p>
                </button>
              ))}
            </div>
            {estimatedReach !== null && (
              <p className="text-sm text-zinc-400 mt-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Estimated reach: <span className="font-medium text-white">{estimatedReach}</span> customers
              </p>
            )}
          </div>

          {form.channel === 'whatsapp' && (
            <div>
              <h2 className="text-lg font-medium text-zinc-200 mb-3">WhatsApp Template</h2>
              <div className="space-y-2">
                {WHATSAPP_TEMPLATES.map(tmpl => (
                  <button
                    key={tmpl.value}
                    onClick={() => setForm(f => ({ ...f, template_name: tmpl.value }))}
                    className={`w-full p-3 rounded-lg border text-left transition-colors ${
                      form.template_name === tmpl.value ? 'border-zinc-500 bg-zinc-800' : 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800/50'
                    }`}
                  >
                    <p className="text-sm font-medium text-zinc-200">{tmpl.label}</p>
                    <p className="text-xs text-zinc-500">{tmpl.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {form.channel === 'email' && (
            <div>
              <h2 className="text-lg font-medium text-zinc-200 mb-1">Email Subject</h2>
              <input
                type="text"
                value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                placeholder="e.g. Exclusive offer just for you!"
                className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
              />
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!form.name}
              className="px-4 py-2 text-sm bg-white text-black rounded-lg hover:bg-zinc-200 font-medium transition-colors disabled:opacity-50"
            >
              Review
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Send */}
      {step === 3 && (
        <div className="space-y-6">
          <h2 className="text-lg font-medium text-zinc-200">Review Campaign</h2>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg divide-y divide-zinc-800">
            <div className="p-4">
              <p className="text-xs text-zinc-500 mb-1">Campaign Name</p>
              <p className="text-sm text-zinc-200">{form.name}</p>
            </div>
            <div className="p-4">
              <p className="text-xs text-zinc-500 mb-1">Channel</p>
              <p className="text-sm text-zinc-200 capitalize">{form.channel}</p>
            </div>
            <div className="p-4">
              <p className="text-xs text-zinc-500 mb-1">Target Segment</p>
              <p className="text-sm text-zinc-200">{SEGMENTS.find(s => s.value === form.segment)?.label}</p>
            </div>
            {form.channel === 'whatsapp' && (
              <div className="p-4">
                <p className="text-xs text-zinc-500 mb-1">Template</p>
                <p className="text-sm text-zinc-200">{WHATSAPP_TEMPLATES.find(t => t.value === form.template_name)?.label}</p>
              </div>
            )}
            {estimatedReach !== null && (
              <div className="p-4">
                <p className="text-xs text-zinc-500 mb-1">Estimated Reach</p>
                <p className="text-sm text-zinc-200">{estimatedReach} customers</p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-white text-black rounded-lg hover:bg-zinc-200 font-medium transition-colors disabled:opacity-50"
            >
              <FileText className="h-4 w-4" />
              {saving ? 'Creating...' : 'Create Campaign'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/dashboard/marketing/new/page.tsx
git commit -m "feat(campaigns): add create campaign page with channel, segment, template steps"
```

---

### Task 19: Campaign Detail Page

**Files:**
- Create: `src/app/dashboard/marketing/[id]/page.tsx`

- [ ] **Step 1: Create campaign detail page with stats and send action**

```tsx
// src/app/dashboard/marketing/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Send, MessageSquare, Mail, CheckCircle, XCircle, Clock, Eye, Trash2 } from 'lucide-react'

export default function CampaignDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [campaign, setCampaign] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetch(`/api/dashboard/campaigns/${id}`)
      .then(res => res.json())
      .then(data => {
        setCampaign(data.campaign)
        setMessages(data.messages || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  const handleSend = async () => {
    if (!confirm('Are you sure you want to send this campaign? This action cannot be undone.')) return
    setSending(true)
    try {
      const res = await fetch(`/api/dashboard/campaigns/${id}/send`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        // Refresh
        const refreshRes = await fetch(`/api/dashboard/campaigns/${id}`)
        const refreshData = await refreshRes.json()
        setCampaign(refreshData.campaign)
        setMessages(refreshData.messages || [])
      }
    } catch (err) {
      console.error('Failed to send campaign:', err)
    } finally {
      setSending(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this campaign? This cannot be undone.')) return
    await fetch(`/api/dashboard/campaigns/${id}`, { method: 'DELETE' })
    router.push('/dashboard/marketing')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    )
  }

  if (!campaign) {
    return <div className="text-center py-20 text-zinc-500">Campaign not found</div>
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-zinc-500/20 text-zinc-400',
    scheduled: 'bg-blue-500/20 text-blue-400',
    sending: 'bg-yellow-500/20 text-yellow-400',
    sent: 'bg-green-500/20 text-green-400',
  }

  const msgStatusIcon = (status: string) => {
    if (status === 'sent' || status === 'delivered') return <CheckCircle className="h-3.5 w-3.5 text-green-400" />
    if (status === 'read') return <Eye className="h-3.5 w-3.5 text-blue-400" />
    if (status === 'failed' || status === 'bounced') return <XCircle className="h-3.5 w-3.5 text-red-400" />
    return <Clock className="h-3.5 w-3.5 text-zinc-500" />
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push('/dashboard/marketing')}
        className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Campaigns
      </button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {campaign.channel === 'whatsapp' ? (
            <MessageSquare className="h-6 w-6 text-green-400" />
          ) : (
            <Mail className="h-6 w-6 text-blue-400" />
          )}
          <div>
            <h1 className="text-xl font-bold text-white">{campaign.name}</h1>
            <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${statusColors[campaign.status] || statusColors.draft}`}>
              {campaign.status}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
            <>
              <button
                onClick={handleSend}
                disabled={sending}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-white text-black rounded-lg hover:bg-zinc-200 font-medium transition-colors disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {sending ? 'Sending...' : 'Send Now'}
              </button>
              <button
                onClick={handleDelete}
                className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-red-400 border border-zinc-700 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      {campaign.status === 'sent' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Targeted', value: campaign.target_count },
            { label: 'Sent', value: campaign.sent_count },
            { label: 'Delivered', value: campaign.delivered_count },
            { label: 'Failed', value: campaign.failed_count },
          ].map(stat => (
            <div key={stat.label} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <p className="text-xs text-zinc-500">{stat.label}</p>
              <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Message Log */}
      {messages.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
          <div className="px-4 py-3 border-b border-zinc-800">
            <h2 className="text-sm font-medium text-zinc-300">Message Log ({messages.length})</h2>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500">Recipient</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500">Status</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500 hidden md:table-cell">Sent</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500 hidden lg:table-cell">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {messages.map((msg: any) => (
                  <tr key={msg.id} className="hover:bg-zinc-800/50">
                    <td className="px-4 py-2 text-sm text-zinc-300">{msg.recipient}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5">
                        {msgStatusIcon(msg.status)}
                        <span className="text-xs text-zinc-400 capitalize">{msg.status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-xs text-zinc-500 hidden md:table-cell">
                      {msg.sent_at ? new Date(msg.sent_at).toLocaleString('en-IN') : '—'}
                    </td>
                    <td className="px-4 py-2 text-xs text-red-400 hidden lg:table-cell truncate max-w-xs">
                      {msg.error_message || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/dashboard/marketing/[id]/page.tsx
git commit -m "feat(campaigns): add campaign detail page with stats and message log"
```

---

### Task 20: Campaign Estimate API & Sidebar Update

**Files:**
- Create: `src/app/api/dashboard/campaigns/estimate/route.ts`
- Modify: `src/components/dashboard/sidebar.tsx`

- [ ] **Step 1: Create estimate API for audience size preview**

```typescript
// src/app/api/dashboard/campaigns/estimate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getEligibleCustomers } from '@/lib/campaigns/send-campaign'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const storeId = searchParams.get('store_id')
  const channel = searchParams.get('channel') as 'whatsapp' | 'email'
  const segment = searchParams.get('segment') || 'all'

  if (!storeId || !channel) {
    return NextResponse.json({ error: 'store_id and channel required' }, { status: 400 })
  }

  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('id', storeId)
    .eq('owner_id', user.id)
    .single()

  if (!store) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const customers = await getEligibleCustomers(storeId, channel, { segment })
  return NextResponse.json({ count: customers.length })
}
```

- [ ] **Step 2: Update sidebar Marketing link to point to /dashboard/marketing**

In `src/components/dashboard/sidebar.tsx`, find the Marketing NavSection and change its `href` from `/platform/settings` to `/dashboard/marketing`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/dashboard/campaigns/estimate/route.ts src/components/dashboard/sidebar.tsx
git commit -m "feat(campaigns): add audience estimate API, update Marketing sidebar link"
```

---

### Task 21: TypeScript Check & Integration Test

- [ ] **Step 1: Run full TypeScript check**

Run: `cd /Users/manan/Downloads/aistore_cursor/ai-store-builder && npx tsc --noEmit`

Fix any type errors that arise.

- [ ] **Step 2: Start dev server and test all three features**

Run: `npm run dev`

Test checklist:
- [ ] `/dashboard/customers` — loads, shows table (or empty state), tabs work, search works
- [ ] `/dashboard/customers/[id]` — click a customer row, detail page loads
- [ ] `/dashboard` (Command Center) — shows insights/approvals/activity sections
- [ ] `/dashboard/marketing` — loads campaign list (or empty state)
- [ ] `/dashboard/marketing/new` — create campaign flow works through all steps
- [ ] Sidebar has Customers and Marketing links

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "fix: resolve type errors and integration issues across all three features"
```

---

### Task 22: Consolidated Commit

- [ ] **Step 1: Verify everything compiles clean**

Run: `npx tsc --noEmit`

- [ ] **Step 2: Verify no untracked files left behind**

Run: `git status`

- [ ] **Step 3: If any fixes were needed, commit them**

```bash
git add -A
git commit -m "chore: final cleanup for customers, insights, and campaigns features"
```
