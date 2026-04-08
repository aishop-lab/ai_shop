'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { cn, formatCurrency } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import {
  ShoppingBag,
  TrendingUp,
  Users,
  Package,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Loader2,
} from 'lucide-react'

interface DailyBriefingProps {
  storeId: string | null
  currency: string
}

interface BriefingData {
  todayOrders: number
  todayRevenue: number
  yesterdayOrders: number
  yesterdayRevenue: number
  newCustomers: number
  lowStockProducts: number
  totalProducts: number
  pendingOrders: number
}

export function DailyBriefing({ storeId, currency }: DailyBriefingProps) {
  const [data, setData] = useState<BriefingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function fetchBriefing() {
    if (!storeId) return
    try {
      const supabase = createClient()
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString()

      // Run all queries in parallel
      const [
        todayOrdersRes,
        yesterdayOrdersRes,
        newCustomersRes,
        lowStockRes,
        totalProductsRes,
        pendingOrdersRes,
      ] = await Promise.all([
        // Today's orders + revenue
        supabase
          .from('orders')
          .select('total_amount')
          .eq('store_id', storeId)
          .gte('created_at', todayStart),
        // Yesterday's orders + revenue
        supabase
          .from('orders')
          .select('total_amount')
          .eq('store_id', storeId)
          .gte('created_at', yesterdayStart)
          .lt('created_at', todayStart),
        // New customers today
        supabase
          .from('customers')
          .select('id', { count: 'exact', head: true })
          .eq('store_id', storeId)
          .gte('created_at', todayStart),
        // Low stock products
        supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('store_id', storeId)
          .eq('status', 'active')
          .lte('inventory', 10)
          .gt('inventory', 0),
        // Total products
        supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('store_id', storeId),
        // Pending orders (confirmed but not processed)
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('store_id', storeId)
          .eq('order_status', 'confirmed'),
      ])

      const todayOrders = todayOrdersRes.data ?? []
      const yesterdayOrders = yesterdayOrdersRes.data ?? []

      setData({
        todayOrders: todayOrders.length,
        todayRevenue: todayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
        yesterdayOrders: yesterdayOrders.length,
        yesterdayRevenue: yesterdayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
        newCustomers: newCustomersRes.count ?? 0,
        lowStockProducts: lowStockRes.count ?? 0,
        totalProducts: totalProductsRes.count ?? 0,
        pendingOrders: pendingOrdersRes.count ?? 0,
      })
    } catch {
      // Non-critical
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchBriefing()
  }, [storeId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || !data) return null

  const items: { icon: React.ReactNode; label: string; value: string; href?: string; highlight?: boolean }[] = []

  if (data.todayOrders > 0) {
    items.push({
      icon: <ShoppingBag className="h-3.5 w-3.5 text-green-400" />,
      label: 'Today',
      value: `${data.todayOrders} order${data.todayOrders !== 1 ? 's' : ''} · ${formatCurrency(data.todayRevenue, currency)}`,
      href: '/platform/orders',
    })
  }

  if (data.yesterdayOrders > 0) {
    const change = data.todayRevenue > 0 && data.yesterdayRevenue > 0
      ? Math.round(((data.todayRevenue - data.yesterdayRevenue) / data.yesterdayRevenue) * 100)
      : null
    items.push({
      icon: <TrendingUp className={cn('h-3.5 w-3.5', change !== null && change >= 0 ? 'text-green-400' : 'text-red-400')} />,
      label: 'Yesterday',
      value: `${data.yesterdayOrders} order${data.yesterdayOrders !== 1 ? 's' : ''} · ${formatCurrency(data.yesterdayRevenue, currency)}${change !== null ? ` (${change >= 0 ? '+' : ''}${change}%)` : ''}`,
    })
  }

  if (data.pendingOrders > 0) {
    items.push({
      icon: <Package className="h-3.5 w-3.5 text-amber-400" />,
      label: 'Pending',
      value: `${data.pendingOrders} order${data.pendingOrders !== 1 ? 's' : ''} awaiting processing`,
      href: '/platform/orders',
      highlight: true,
    })
  }

  if (data.newCustomers > 0) {
    items.push({
      icon: <Users className="h-3.5 w-3.5 text-blue-400" />,
      label: 'New customers',
      value: `${data.newCustomers} today`,
      href: '/platform/customers',
    })
  }

  if (data.lowStockProducts > 0) {
    items.push({
      icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />,
      label: 'Low stock',
      value: `${data.lowStockProducts} of ${data.totalProducts} products`,
      href: '/platform/products',
      highlight: true,
    })
  }

  if (items.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
          Daily Briefing
        </h2>
        <button
          type="button"
          onClick={() => { setRefreshing(true); fetchBriefing() }}
          disabled={refreshing}
          className="flex items-center gap-1 text-[10px] text-[var(--platform-text-muted)] hover:text-[var(--platform-text-secondary)] transition-colors disabled:opacity-50"
          aria-label="Refresh briefing"
        >
          {refreshing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
        </button>
      </div>

      <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] divide-y divide-[var(--platform-border)]">
        {items.map((item, i) => {
          const content = (
            <div
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 transition-colors',
                item.href && 'hover:bg-[var(--platform-surface-hover)]',
                item.highlight && 'bg-amber-500/5'
              )}
            >
              {item.icon}
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
                  {item.label}
                </span>
                <p className="text-xs text-[var(--platform-text-primary)] truncate">
                  {item.value}
                </p>
              </div>
              {item.href && (
                <ArrowRight className="h-3 w-3 shrink-0 text-[var(--platform-text-muted)]" />
              )}
            </div>
          )

          return item.href ? (
            <Link key={i} href={item.href}>{content}</Link>
          ) : (
            <div key={i}>{content}</div>
          )
        })}
      </div>
    </div>
  )
}
