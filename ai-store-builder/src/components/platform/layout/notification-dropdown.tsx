'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Bell, Loader2, ShieldCheck, Bot, ShoppingBag, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { AGENT_DISPLAY_NAMES, AGENT_COLORS } from '@/lib/agents/constants'
import type { AgentType } from '@/lib/agents/types'

interface Notification {
  id: string
  type: 'action' | 'approval' | 'order'
  agentType?: AgentType
  title: string
  summary: string
  timestamp: string
  href: string
}

function formatTimeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

interface NotificationDropdownProps {
  storeId: string | null
  pendingApprovals: number
}

export function NotificationDropdown({ storeId, pendingApprovals }: NotificationDropdownProps) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Fetch recent activity when opened
  useEffect(() => {
    if (!open || !storeId) return

    async function fetchNotifications() {
      setLoading(true)
      try {
        const supabase = createClient()

        // Fetch recent agent actions and pending approvals in parallel
        const [actionsRes, approvalsRes, ordersRes] = await Promise.all([
          supabase
            .from('agent_actions')
            .select('id, agent_type, summary, created_at, status')
            .eq('store_id', storeId)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('agent_approvals')
            .select('id, agent_type, summary, created_at')
            .eq('store_id', storeId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(3),
          supabase
            .from('orders')
            .select('id, order_number, customer_name, created_at')
            .eq('store_id', storeId)
            .order('created_at', { ascending: false })
            .limit(3),
        ])

        const items: Notification[] = []

        // Add pending approvals first
        for (const approval of approvalsRes.data ?? []) {
          items.push({
            id: `approval-${approval.id}`,
            type: 'approval',
            agentType: approval.agent_type as AgentType,
            title: `${AGENT_DISPLAY_NAMES[approval.agent_type as AgentType] ?? approval.agent_type} needs approval`,
            summary: approval.summary ?? 'Pending action requires your review',
            timestamp: approval.created_at,
            href: '/platform/approvals',
          })
        }

        // Add recent orders
        for (const order of ordersRes.data ?? []) {
          items.push({
            id: `order-${order.id}`,
            type: 'order',
            title: `New order #${order.order_number}`,
            summary: `from ${order.customer_name}`,
            timestamp: order.created_at,
            href: '/platform/orders',
          })
        }

        // Add recent agent actions
        for (const action of actionsRes.data ?? []) {
          items.push({
            id: `action-${action.id}`,
            type: 'action',
            agentType: action.agent_type as AgentType,
            title: AGENT_DISPLAY_NAMES[action.agent_type as AgentType] ?? action.agent_type,
            summary: action.summary ?? 'Completed an action',
            timestamp: action.created_at,
            href: `/platform/agents/${action.agent_type}`,
          })
        }

        // Sort by timestamp descending
        items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

        setNotifications(items.slice(0, 8))
      } catch {
        // Non-critical
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()
  }, [open, storeId])

  const totalBadge = pendingApprovals

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label="Notifications"
        className="relative flex h-[44px] w-[44px] items-center justify-center rounded-md text-[var(--platform-text-muted)] hover:text-[var(--platform-text-primary)] transition-colors"
      >
        <Bell className="h-4 w-4" />
        {totalBadge > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-black">
            {totalBadge > 9 ? '9+' : totalBadge}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)] shadow-2xl overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--platform-border)] px-4 py-2.5">
            <h3 className="font-mono text-xs font-medium text-[var(--platform-text-primary)]">
              Notifications
            </h3>
            {pendingApprovals > 0 && (
              <Link
                href="/platform/approvals"
                onClick={() => setOpen(false)}
                className="text-[10px] font-medium text-[var(--platform-accent)] hover:underline"
              >
                {pendingApprovals} pending
              </Link>
            )}
          </div>

          {/* Content */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-[var(--platform-text-muted)]" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="mx-auto h-5 w-5 text-[var(--platform-text-muted)] mb-2" />
                <p className="text-xs text-[var(--platform-text-muted)]">No recent activity</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--platform-border)]">
                {notifications.map((n) => (
                  <Link
                    key={n.id}
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--platform-surface-hover)] transition-colors"
                  >
                    <div className="mt-0.5 shrink-0">
                      {n.type === 'approval' ? (
                        <ShieldCheck className="h-4 w-4 text-amber-400" />
                      ) : n.type === 'order' ? (
                        <ShoppingBag className="h-4 w-4 text-green-400" />
                      ) : n.agentType ? (
                        <div className={cn('h-4 w-4 rounded-full', AGENT_COLORS[n.agentType]?.dot ?? 'bg-[var(--platform-text-muted)]')} />
                      ) : (
                        <Bot className="h-4 w-4 text-[var(--platform-text-muted)]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[var(--platform-text-primary)] truncate">
                        {n.title}
                      </p>
                      <p className="text-[10px] text-[var(--platform-text-muted)] truncate">
                        {n.summary}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-[9px] text-[var(--platform-text-muted)]">
                      {formatTimeAgo(n.timestamp)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-[var(--platform-border)] px-4 py-2">
              <Link
                href="/platform/approvals"
                onClick={() => setOpen(false)}
                className="text-[10px] font-medium text-[var(--platform-text-muted)] hover:text-[var(--platform-text-secondary)] transition-colors"
              >
                View all activity
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
