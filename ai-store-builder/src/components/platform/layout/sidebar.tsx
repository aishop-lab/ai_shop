'use client'

import {
  Home,
  Headphones,
  TrendingUp,
  BarChart3,
  Megaphone,
  Settings as SettingsIcon,
  ShieldCheck,
  Package,
  ShoppingCart,
  LayoutDashboard,
  ExternalLink,
  X,
  Users,
  FolderOpen,
  Ticket,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { StatusDot } from '@/components/platform/shared/status-dot'
import { AGENT_DISPLAY_NAMES } from '@/lib/agents/constants'
import { SidebarNavItem } from './sidebar-nav-item'
import type { AgentType, AgentStatus } from '@/lib/agents/types'

interface AgentNavInfo {
  type: AgentType
  status: AgentStatus
  enabled: boolean
}

interface PlatformSidebarProps {
  isOpen: boolean
  onClose: () => void
  agents?: AgentNavInfo[]
  pendingApprovals?: number
  storeSlug?: string | null
}

function getStoreUrl(slug: string): string {
  if (process.env.NODE_ENV === 'production') {
    return `https://${slug}.storeforge.site`
  }
  return `/${slug}`
}

const AGENT_ICONS: Record<AgentType, typeof Home> = {
  marketing: Megaphone,
  sales: TrendingUp,
  support: Headphones,
  analytics: BarChart3,
  technical: SettingsIcon,
}

export function PlatformSidebar({ isOpen, onClose, agents = [], pendingApprovals = 0, storeSlug }: PlatformSidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-56 flex-col border-r border-[var(--platform-border)] bg-[var(--platform-surface)]',
          'transition-transform duration-200 ease-in-out lg:static lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between px-4">
          <span className="font-mono text-sm font-semibold text-[var(--platform-text-primary)]">
            Agent Platform
          </span>
          <button
            onClick={onClose}
            className="flex h-[44px] w-[44px] items-center justify-center rounded-md text-[var(--platform-text-muted)] hover:text-[var(--platform-text-secondary)] lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2">
          {/* Main */}
          <div className="space-y-1">
            <SidebarNavItem href="/platform" icon={Home} label="Command Center" />
            {storeSlug && (
              <a
                href={getStoreUrl(storeSlug)}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 rounded-md px-3 py-2.5 min-h-[44px] text-xs text-[var(--platform-text-secondary)] hover:bg-[var(--platform-surface-hover)] hover:text-[var(--platform-text-primary)] border-l-2 border-l-transparent transition-colors"
              >
                <ExternalLink className="h-4 w-4 shrink-0" />
                <span className="truncate flex-1">View Store</span>
              </a>
            )}
            <SidebarNavItem
              href="/platform/approvals"
              icon={ShieldCheck}
              label="Approvals"
              badge={pendingApprovals > 0 ? pendingApprovals : undefined}
              badgeVariant="warning"
            />
          </div>

          {/* Agents */}
          <div>
            <p className="mb-2 px-3 text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
              Agents
            </p>
            <div className="space-y-1">
              {(['support', 'sales', 'analytics', 'technical', 'marketing'] as AgentType[]).map((type) => {
                const agent = agents.find((a) => a.type === type)
                const Icon = AGENT_ICONS[type]
                return (
                  <SidebarNavItem
                    key={type}
                    href={`/platform/agents/${type}`}
                    icon={Icon}
                    label={AGENT_DISPLAY_NAMES[type].replace(' Agent', '')}
                    badge={
                      agent?.enabled ? (
                        <StatusDot status={agent.status} size="sm" />
                      ) : undefined
                    }
                  />
                )
              })}
            </div>
          </div>

          {/* Store */}
          <div>
            <p className="mb-2 px-3 text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
              Store
            </p>
            <div className="space-y-1">
              <SidebarNavItem href="/platform/products" icon={Package} label="Products" />
              <SidebarNavItem href="/platform/collections" icon={FolderOpen} label="Collections" />
              <SidebarNavItem href="/platform/orders" icon={ShoppingCart} label="Orders" />
              <SidebarNavItem href="/platform/customers" icon={Users} label="Customers" />
              <SidebarNavItem href="/platform/coupons" icon={Ticket} label="Coupons" />
              <SidebarNavItem href="/platform/analytics" icon={LayoutDashboard} label="Reports" />
            </div>
          </div>

          {/* Settings */}
          <div>
            <div className="space-y-1">
              <SidebarNavItem href="/platform/settings" icon={SettingsIcon} label="Settings" />
            </div>
          </div>
        </nav>
      </aside>
    </>
  )
}
