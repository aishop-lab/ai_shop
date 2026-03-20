# Phase 1A: Shell Layout & Command Center — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Phase 0 placeholder layout with a fully functional platform shell (sidebar, top bar, mobile nav) and a Command Center home page with realistic mock agent data.

**Architecture:** Build the layout shell as composable components in `components/platform/layout/`, wire them together in `app/(platform)/layout.tsx`. Create mock data utilities to simulate agent activity. The Command Center page pulls from mock data to demonstrate the full UI before real backend is connected in Phase 2.

**Tech Stack:** Next.js 16.1 App Router, Tailwind CSS v4 (CSS custom properties), Lucide React icons, existing platform shared components, `useKeyboardShortcuts` hook

**Spec:** `docs/PRD.md` — Phase 1 (lines 2504-2574)

---

## File Structure

### New Files
```
src/
├── lib/
│   └── agents/
│       └── mock-data.ts                    — Mock agent states, actions, approvals for dev UI
├── components/
│   └── platform/
│       ├── layout/
│       │   ├── sidebar.tsx                 — Left navigation with agent list, sections, collapse
│       │   ├── sidebar-nav-item.tsx        — Single nav item (link, icon, badge, active state)
│       │   ├── top-bar.tsx                 — Store name, search trigger, notification bell, user menu
│       │   ├── mobile-nav.tsx              — Bottom tab bar for mobile
│       │   └── user-menu.tsx               — Dropdown with profile, settings, sign out
│       └── command-center/
│           ├── agent-card.tsx              — Agent status card with metrics + last action
│           ├── activity-feed.tsx           — Timeline of recent agent actions
│           ├── activity-item.tsx           — Single feed item with agent badge + action text
│           ├── approval-summary.tsx        — Compact pending approvals list (max 5)
│           └── quick-stats.tsx             — 4-metric overview bar
```

### Modified Files
```
src/app/(platform)/layout.tsx               — Replace placeholder with real sidebar, top bar, mobile nav
src/app/(platform)/platform/page.tsx        — Replace placeholder with full Command Center using mock data
```

---

### Task 1: Mock Data Utilities

**Files:**
- Create: `src/lib/agents/mock-data.ts`

- [ ] **Step 1: Create mock data file**

```typescript
// src/lib/agents/mock-data.ts
import type {
  AgentType,
  AgentState,
  AgentAction,
  AgentApproval,
} from './types'

// ---- Mock Agent States ----

export const MOCK_AGENT_STATES: AgentState[] = [
  {
    id: 'mock-state-1',
    store_id: 'mock-store',
    agent_type: 'support',
    is_enabled: true,
    autonomy_level: 3,
    config: {},
    status: 'running',
    last_action_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 min ago
    last_error: null,
    error_count: 0,
    total_actions: 147,
    total_approvals_requested: 12,
    total_approvals_granted: 10,
    total_approvals_rejected: 2,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-state-2',
    store_id: 'mock-store',
    agent_type: 'analytics',
    is_enabled: true,
    autonomy_level: 4,
    config: {},
    status: 'idle',
    last_action_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min ago
    last_error: null,
    error_count: 0,
    total_actions: 89,
    total_approvals_requested: 3,
    total_approvals_granted: 3,
    total_approvals_rejected: 0,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-state-3',
    store_id: 'mock-store',
    agent_type: 'sales',
    is_enabled: true,
    autonomy_level: 3,
    config: {},
    status: 'waiting_approval',
    last_action_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    last_error: null,
    error_count: 0,
    total_actions: 56,
    total_approvals_requested: 8,
    total_approvals_granted: 6,
    total_approvals_rejected: 2,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-state-4',
    store_id: 'mock-store',
    agent_type: 'marketing',
    is_enabled: false,
    autonomy_level: 2,
    config: {},
    status: 'idle',
    last_action_at: null,
    last_error: null,
    error_count: 0,
    total_actions: 0,
    total_approvals_requested: 0,
    total_approvals_granted: 0,
    total_approvals_rejected: 0,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-state-5',
    store_id: 'mock-store',
    agent_type: 'technical',
    is_enabled: true,
    autonomy_level: 4,
    config: {},
    status: 'idle',
    last_action_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    last_error: null,
    error_count: 0,
    total_actions: 34,
    total_approvals_requested: 5,
    total_approvals_granted: 4,
    total_approvals_rejected: 1,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
]

// ---- Mock Activity Feed ----

export const MOCK_ACTIVITY_FEED: AgentAction[] = [
  {
    id: 'action-1',
    store_id: 'mock-store',
    agent_type: 'support',
    action_type: 'ticket_resolved',
    action_category: 'communication',
    summary: 'Resolved customer query about shipping delay for order #1847',
    details: { customer: 'Priya Sharma', resolution: 'Provided updated tracking link' },
    status: 'completed',
    execution_mode: 'auto',
    approval_id: null,
    related_entity_type: 'order',
    related_entity_id: '1847',
    model_used: 'gemini-2.0-flash',
    tokens_input: 1200,
    tokens_output: 450,
    estimated_cost_usd: 0.0003,
    api_costs: {},
    started_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 1.5 * 60 * 1000).toISOString(),
    duration_ms: 3200,
    created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  },
  {
    id: 'action-2',
    store_id: 'mock-store',
    agent_type: 'analytics',
    action_type: 'daily_digest',
    action_category: 'analysis',
    summary: 'Generated daily business digest — revenue up 23% vs last Tuesday',
    details: { revenue_today: 47500, revenue_last_week: 38600 },
    status: 'completed',
    execution_mode: 'auto',
    approval_id: null,
    related_entity_type: null,
    related_entity_id: null,
    model_used: 'gemini-2.0-flash',
    tokens_input: 3500,
    tokens_output: 1200,
    estimated_cost_usd: 0.0008,
    api_costs: {},
    started_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 29 * 60 * 1000).toISOString(),
    duration_ms: 8500,
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: 'action-3',
    store_id: 'mock-store',
    agent_type: 'sales',
    action_type: 'cart_recovery',
    action_category: 'campaign',
    summary: 'Sent recovery email to 5 abandoned carts with personalized 10% discount',
    details: { carts_targeted: 5, discount_percent: 10, template: 'recovery_gentle' },
    status: 'completed',
    execution_mode: 'auto',
    approval_id: null,
    related_entity_type: null,
    related_entity_id: null,
    model_used: 'gemini-2.0-flash',
    tokens_input: 2800,
    tokens_output: 900,
    estimated_cost_usd: 0.0006,
    api_costs: {},
    started_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 44 * 60 * 1000).toISOString(),
    duration_ms: 5200,
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: 'action-4',
    store_id: 'mock-store',
    agent_type: 'technical',
    action_type: 'seo_update',
    action_category: 'optimization',
    summary: 'Updated meta descriptions for 12 products missing SEO tags',
    details: { products_updated: 12, field: 'meta_description' },
    status: 'completed',
    execution_mode: 'auto',
    approval_id: null,
    related_entity_type: 'product',
    related_entity_id: null,
    model_used: 'gemini-2.0-flash',
    tokens_input: 4200,
    tokens_output: 2800,
    estimated_cost_usd: 0.0012,
    api_costs: {},
    started_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 1.95 * 60 * 60 * 1000).toISOString(),
    duration_ms: 18000,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'action-5',
    store_id: 'mock-store',
    agent_type: 'support',
    action_type: 'ticket_resolved',
    action_category: 'communication',
    summary: 'Answered product availability question on WhatsApp for Rajesh K.',
    details: { channel: 'whatsapp', customer: 'Rajesh K.' },
    status: 'completed',
    execution_mode: 'auto',
    approval_id: null,
    related_entity_type: null,
    related_entity_id: null,
    model_used: 'gemini-2.0-flash',
    tokens_input: 800,
    tokens_output: 350,
    estimated_cost_usd: 0.0002,
    api_costs: {},
    started_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 2.98 * 60 * 60 * 1000).toISOString(),
    duration_ms: 2100,
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'action-6',
    store_id: 'mock-store',
    agent_type: 'analytics',
    action_type: 'anomaly_detected',
    action_category: 'analysis',
    summary: 'Detected unusual traffic spike — 3x normal visits from Instagram referral',
    details: { source: 'instagram', multiplier: 3.2, period: 'last_2_hours' },
    status: 'completed',
    execution_mode: 'auto',
    approval_id: null,
    related_entity_type: null,
    related_entity_id: null,
    model_used: 'gemini-2.0-flash',
    tokens_input: 1500,
    tokens_output: 600,
    estimated_cost_usd: 0.0004,
    api_costs: {},
    started_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 3.98 * 60 * 60 * 1000).toISOString(),
    duration_ms: 4500,
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
]

// ---- Mock Pending Approvals ----

export const MOCK_APPROVALS: AgentApproval[] = [
  {
    id: 'approval-1',
    store_id: 'mock-store',
    agent_type: 'sales',
    action_type: 'discount_campaign',
    summary: 'Send 20% Diwali Sale discount to 156 loyal customers',
    reasoning: 'These customers have purchased 3+ times in the last 6 months. A 20% discount during Diwali has historically driven 4.2x ROI based on similar campaigns.',
    details: { discount_percent: 20, target_segment: 'loyal', customer_count: 156, estimated_cost: 12400 },
    priority: 'high',
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    resolved_by: null,
    resolved_at: null,
    rejection_reason: null,
    modifications: null,
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: 'approval-2',
    store_id: 'mock-store',
    agent_type: 'support',
    action_type: 'refund',
    summary: 'Process ₹2,499 refund for order #1823 — customer received damaged item',
    reasoning: 'Customer provided photos of damaged packaging. Product (ceramic vase) is visibly cracked. Return policy covers damage in transit.',
    details: { order_id: '1823', amount: 2499, currency: 'INR', reason: 'damaged_in_transit' },
    priority: 'normal',
    expires_at: null,
    status: 'pending',
    resolved_by: null,
    resolved_at: null,
    rejection_reason: null,
    modifications: null,
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: 'approval-3',
    store_id: 'mock-store',
    agent_type: 'technical',
    action_type: 'seo_update',
    summary: 'Rewrite product titles for 8 items to improve search ranking',
    reasoning: 'Current titles are too short (avg 3 words). Adding category and material keywords could improve organic traffic by an estimated 15-25%.',
    details: { products_affected: 8, change_type: 'title_rewrite', estimated_impact: '+15-25% organic' },
    priority: 'low',
    expires_at: null,
    status: 'pending',
    resolved_by: null,
    resolved_at: null,
    rejection_reason: null,
    modifications: null,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
]

// ---- Helpers ----

export function getAgentState(agentType: AgentType): AgentState | undefined {
  return MOCK_AGENT_STATES.find((s) => s.agent_type === agentType)
}

export function getEnabledAgentCount(): number {
  return MOCK_AGENT_STATES.filter((s) => s.is_enabled).length
}

export function getPendingApprovalCount(): number {
  return MOCK_APPROVALS.filter((a) => a.status === 'pending').length
}

export function getTotalActions(): number {
  return MOCK_AGENT_STATES.reduce((sum, s) => sum + s.total_actions, 0)
}

export function formatTimeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit src/lib/agents/mock-data.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/agents/mock-data.ts
git commit -m "feat: add mock agent data for dashboard development"
```

---

### Task 2: Sidebar Navigation Item Component

**Files:**
- Create: `src/components/platform/layout/sidebar-nav-item.tsx`

- [ ] **Step 1: Create the nav item component**

```typescript
// src/components/platform/layout/sidebar-nav-item.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface SidebarNavItemProps {
  href: string
  icon: LucideIcon
  label: string
  badge?: number | string
  badgeVariant?: 'default' | 'warning' | 'accent'
  disabled?: boolean
}

const badgeStyles = {
  default: 'bg-[var(--platform-surface-active)] text-[var(--platform-text-secondary)]',
  warning: 'bg-amber-500/15 text-amber-400',
  accent: 'bg-[var(--platform-accent)]/15 text-[var(--platform-accent)]',
} as const

export function SidebarNavItem({ href, icon: Icon, label, badge, badgeVariant = 'default', disabled }: SidebarNavItemProps) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(href + '/')

  if (disabled) {
    return (
      <div className="flex items-center gap-3 rounded-md px-3 py-2 text-xs text-[var(--platform-text-muted)] opacity-50 cursor-not-allowed">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{label}</span>
      </div>
    )
  }

  return (
    <Link
      href={href}
      className={cn(
        'group flex items-center gap-3 rounded-md px-3 py-2 text-xs transition-colors',
        isActive
          ? 'bg-[var(--platform-surface-active)] text-[var(--platform-text-primary)]'
          : 'text-[var(--platform-text-secondary)] hover:bg-[var(--platform-surface-hover)] hover:text-[var(--platform-text-primary)]'
      )}
    >
      <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-[var(--platform-accent)]' : '')} />
      <span className="truncate flex-1">{label}</span>
      {badge !== undefined && (
        <span className={cn('ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-mono font-medium', badgeStyles[badgeVariant])}>
          {badge}
        </span>
      )}
    </Link>
  )
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit src/components/platform/layout/sidebar-nav-item.tsx`

- [ ] **Step 3: Commit**

```bash
git add src/components/platform/layout/sidebar-nav-item.tsx
git commit -m "feat: add sidebar nav item component"
```

---

### Task 3: Platform Sidebar

**Files:**
- Create: `src/components/platform/layout/sidebar.tsx`
- Depends on: Task 2

- [ ] **Step 1: Create the sidebar component**

```typescript
// src/components/platform/layout/sidebar.tsx
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
  ChevronLeft,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { StatusDot } from '@/components/platform/shared/status-dot'
import { AGENT_DISPLAY_NAMES, AGENT_COLORS } from '@/lib/agents/constants'
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
}

const AGENT_ICONS: Record<AgentType, typeof Home> = {
  marketing: Megaphone,
  sales: TrendingUp,
  support: Headphones,
  analytics: BarChart3,
  technical: SettingsIcon,
}

export function PlatformSidebar({ isOpen, onClose, agents = [], pendingApprovals = 0 }: PlatformSidebarProps) {
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
            className="rounded-md p-1 text-[var(--platform-text-muted)] hover:text-[var(--platform-text-secondary)] lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2">
          {/* Main */}
          <div className="space-y-1">
            <SidebarNavItem href="/platform" icon={Home} label="Command Center" />
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
                    disabled={!agent?.enabled}
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
              <SidebarNavItem href="/platform/orders" icon={ShoppingCart} label="Orders" />
              <SidebarNavItem href="/platform/analytics" icon={LayoutDashboard} label="Analytics" />
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
```

**Note:** The `badge` prop on `SidebarNavItem` accepts `number | string` but we're passing a React element (`<StatusDot />`). We need to update the `SidebarNavItem` badge prop type to accept `React.ReactNode`:

- [ ] **Step 2: Update SidebarNavItem badge type to accept ReactNode**

In `sidebar-nav-item.tsx`, change the `badge` prop type from `number | string` to `React.ReactNode`, and update the rendering logic so it only wraps with badge styles when `badge` is a string or number.

```typescript
// Update the interface:
badge?: React.ReactNode

// Update the rendering at the end of the Link:
{badge !== undefined && (
  typeof badge === 'string' || typeof badge === 'number' ? (
    <span className={cn('ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-mono font-medium', badgeStyles[badgeVariant])}>
      {badge}
    </span>
  ) : (
    <span className="ml-auto">{badge}</span>
  )
)}
```

- [ ] **Step 3: Verify compilation**

Run: `npx tsc --noEmit src/components/platform/layout/sidebar.tsx`

- [ ] **Step 4: Commit**

```bash
git add src/components/platform/layout/sidebar.tsx src/components/platform/layout/sidebar-nav-item.tsx
git commit -m "feat: add platform sidebar with agent navigation"
```

---

### Task 4: User Menu Dropdown

**Files:**
- Create: `src/components/platform/layout/user-menu.tsx`

- [ ] **Step 1: Create user menu component**

```typescript
// src/components/platform/layout/user-menu.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { User, Settings, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/contexts/auth-context'
import Link from 'next/link'

export function UserMenu() {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
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

  const initial = user?.email?.charAt(0).toUpperCase() ?? '?'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors',
          'bg-[var(--platform-surface-active)] text-[var(--platform-text-secondary)]',
          'hover:bg-[var(--platform-surface-hover)] hover:text-[var(--platform-text-primary)]'
        )}
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] py-1 shadow-xl">
          <div className="border-b border-[var(--platform-border)] px-3 py-2">
            <p className="truncate text-xs text-[var(--platform-text-primary)]">{user?.email}</p>
          </div>
          <Link
            href="/platform/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--platform-text-secondary)] hover:bg-[var(--platform-surface-hover)] hover:text-[var(--platform-text-primary)]"
          >
            <Settings className="h-3.5 w-3.5" />
            Settings
          </Link>
          <button
            onClick={() => { signOut(); setOpen(false) }}
            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-[var(--platform-text-secondary)] hover:bg-[var(--platform-surface-hover)] hover:text-[var(--platform-status-error)]"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/platform/layout/user-menu.tsx
git commit -m "feat: add user menu dropdown component"
```

---

### Task 5: Top Bar

**Files:**
- Create: `src/components/platform/layout/top-bar.tsx`
- Depends on: Task 4

- [ ] **Step 1: Create top bar component**

```typescript
// src/components/platform/layout/top-bar.tsx
'use client'

import { Menu, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { KeyboardHint } from '@/components/platform/shared/keyboard-hint'
import { UserMenu } from './user-menu'

interface TopBarProps {
  onMenuClick: () => void
  onSearchClick: () => void
  pendingApprovals?: number
}

export function TopBar({ onMenuClick, onSearchClick, pendingApprovals = 0 }: TopBarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-[var(--platform-border)] bg-[var(--platform-surface)] px-4 lg:px-6">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="rounded-md p-1.5 text-[var(--platform-text-muted)] hover:text-[var(--platform-text-primary)] lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Search trigger */}
      <button
        onClick={onSearchClick}
        className={cn(
          'hidden items-center gap-2 rounded-md border px-3 py-1.5 text-xs transition-colors sm:flex',
          'border-[var(--platform-border)] bg-[var(--platform-bg)] text-[var(--platform-text-muted)]',
          'hover:border-[var(--platform-border-hover)] hover:text-[var(--platform-text-secondary)]'
        )}
      >
        Search or run command...
        <KeyboardHint keys="⌘K" />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <button className="relative rounded-md p-1.5 text-[var(--platform-text-muted)] hover:text-[var(--platform-text-primary)]">
          <Bell className="h-4 w-4" />
          {pendingApprovals > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-black">
              {pendingApprovals > 9 ? '9+' : pendingApprovals}
            </span>
          )}
        </button>

        {/* User menu */}
        <UserMenu />
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/platform/layout/top-bar.tsx
git commit -m "feat: add platform top bar with search, notifications, and user menu"
```

---

### Task 6: Mobile Bottom Navigation

**Files:**
- Create: `src/components/platform/layout/mobile-nav.tsx`

- [ ] **Step 1: Create mobile nav component**

```typescript
// src/components/platform/layout/mobile-nav.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ShieldCheck, Package, BarChart3, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobileNavProps {
  pendingApprovals?: number
}

const tabs = [
  { href: '/platform', icon: Home, label: 'Home' },
  { href: '/platform/approvals', icon: ShieldCheck, label: 'Approvals', showBadge: true },
  { href: '/platform/products', icon: Package, label: 'Products' },
  { href: '/platform/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/platform/settings', icon: Settings, label: 'Settings' },
] as const

export function MobileNav({ pendingApprovals = 0 }: MobileNavProps) {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--platform-border)] bg-[var(--platform-surface)] lg:hidden">
      <div className="flex items-center justify-around py-2">
        {tabs.map(({ href, icon: Icon, label, showBadge }) => {
          const isActive = pathname === href || (href !== '/platform' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex flex-col items-center gap-0.5 px-3 py-1 text-[10px]',
                isActive ? 'text-[var(--platform-accent)]' : 'text-[var(--platform-text-muted)]'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
              {showBadge && pendingApprovals > 0 && (
                <span className="absolute -right-1 top-0 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-[8px] font-bold text-black">
                  {pendingApprovals > 9 ? '9+' : pendingApprovals}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/platform/layout/mobile-nav.tsx
git commit -m "feat: add mobile bottom tab navigation"
```

---

### Task 7: Command Center Components

**Files:**
- Create: `src/components/platform/command-center/activity-item.tsx`
- Create: `src/components/platform/command-center/activity-feed.tsx`
- Create: `src/components/platform/command-center/agent-card.tsx`
- Create: `src/components/platform/command-center/approval-summary.tsx`
- Create: `src/components/platform/command-center/quick-stats.tsx`
- Depends on: Task 1

- [ ] **Step 1: Create activity-item component**

```typescript
// src/components/platform/command-center/activity-item.tsx
import { cn } from '@/lib/utils'
import { AgentBadge } from '@/components/platform/shared/agent-badge'
import { AGENT_COLORS } from '@/lib/agents/constants'
import type { AgentAction } from '@/lib/agents/types'
import { formatTimeAgo } from '@/lib/agents/mock-data'

interface ActivityItemProps {
  action: AgentAction
}

export function ActivityItem({ action }: ActivityItemProps) {
  const colors = AGENT_COLORS[action.agent_type]

  return (
    <div className="group flex gap-3 py-2.5">
      {/* Timeline dot */}
      <div className="flex flex-col items-center pt-1">
        <div className={cn('h-2 w-2 rounded-full', colors.dot)} />
        <div className="mt-1 w-px flex-1 bg-[var(--platform-border)]" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <AgentBadge agentType={action.agent_type} size="sm" />
          <span className="text-[10px] text-[var(--platform-text-muted)]">
            {formatTimeAgo(action.created_at)}
          </span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-[var(--platform-text-secondary)]">
          {action.summary}
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create activity-feed component**

```typescript
// src/components/platform/command-center/activity-feed.tsx
import type { AgentAction } from '@/lib/agents/types'
import { ActivityItem } from './activity-item'

interface ActivityFeedProps {
  actions: AgentAction[]
  maxItems?: number
}

export function ActivityFeed({ actions, maxItems = 8 }: ActivityFeedProps) {
  const items = actions.slice(0, maxItems)

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--platform-border)] p-8 text-center">
        <p className="text-sm text-[var(--platform-text-muted)]">
          No agent activity yet. Enable an agent to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {items.map((action) => (
        <ActivityItem key={action.id} action={action} />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Create agent-card component**

```typescript
// src/components/platform/command-center/agent-card.tsx
import { cn } from '@/lib/utils'
import { StatusDot } from '@/components/platform/shared/status-dot'
import { AGENT_DISPLAY_NAMES, AGENT_DESCRIPTIONS, AGENT_COLORS, STATUS_COLORS } from '@/lib/agents/constants'
import type { AgentState } from '@/lib/agents/types'
import { formatTimeAgo } from '@/lib/agents/mock-data'

interface AgentCardProps {
  agent: AgentState
}

export function AgentCard({ agent }: AgentCardProps) {
  const colors = AGENT_COLORS[agent.agent_type]
  const statusInfo = STATUS_COLORS[agent.status]

  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-colors',
        'border-[var(--platform-border)] bg-[var(--platform-surface)]',
        agent.is_enabled && 'hover:border-[var(--platform-border-hover)] cursor-pointer',
        !agent.is_enabled && 'opacity-50'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn('inline-block h-2 w-2 rounded-full', colors.dot)} />
          <span className={cn('font-mono text-xs font-medium', colors.text)}>
            {AGENT_DISPLAY_NAMES[agent.agent_type].replace(' Agent', '')}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <StatusDot status={agent.status} size="sm" />
          <span className="text-[10px] text-[var(--platform-text-muted)]">
            {statusInfo.label}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="mt-2 text-[11px] leading-relaxed text-[var(--platform-text-muted)]">
        {AGENT_DESCRIPTIONS[agent.agent_type]}
      </p>

      {/* Stats */}
      {agent.is_enabled && (
        <div className="mt-3 flex items-center gap-4 border-t border-[var(--platform-border)] pt-3">
          <div>
            <p className="font-mono text-sm font-semibold text-[var(--platform-text-primary)]">
              {agent.total_actions}
            </p>
            <p className="text-[9px] uppercase tracking-wider text-[var(--platform-text-muted)]">Actions</p>
          </div>
          <div>
            <p className="font-mono text-sm font-semibold text-[var(--platform-text-primary)]">
              {agent.total_approvals_requested}
            </p>
            <p className="text-[9px] uppercase tracking-wider text-[var(--platform-text-muted)]">Approvals</p>
          </div>
          {agent.last_action_at && (
            <div className="ml-auto text-right">
              <p className="text-[10px] text-[var(--platform-text-muted)]">
                Last active {formatTimeAgo(agent.last_action_at)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Not enabled state */}
      {!agent.is_enabled && (
        <div className="mt-3 border-t border-[var(--platform-border)] pt-3">
          <p className="text-[10px] text-[var(--platform-text-muted)]">Not configured</p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create approval-summary component**

```typescript
// src/components/platform/command-center/approval-summary.tsx
import { cn } from '@/lib/utils'
import { AgentBadge } from '@/components/platform/shared/agent-badge'
import { APPROVAL_PRIORITY_ORDER } from '@/lib/agents/constants'
import type { AgentApproval, ApprovalPriority } from '@/lib/agents/types'
import { formatTimeAgo } from '@/lib/agents/mock-data'

interface ApprovalSummaryProps {
  approvals: AgentApproval[]
  maxItems?: number
}

const priorityDots: Record<ApprovalPriority, string> = {
  urgent: 'bg-red-400',
  high: 'bg-amber-400',
  normal: 'bg-[var(--platform-text-muted)]',
  low: 'bg-[var(--platform-border-hover)]',
}

export function ApprovalSummary({ approvals, maxItems = 5 }: ApprovalSummaryProps) {
  const pending = approvals
    .filter((a) => a.status === 'pending')
    .sort((a, b) => {
      const ai = APPROVAL_PRIORITY_ORDER.indexOf(a.priority)
      const bi = APPROVAL_PRIORITY_ORDER.indexOf(b.priority)
      return ai - bi
    })
    .slice(0, maxItems)

  if (pending.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--platform-border)] p-6 text-center">
        <p className="text-xs text-[var(--platform-text-muted)]">No pending approvals</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {pending.map((approval) => (
        <div
          key={approval.id}
          className="flex items-start gap-3 rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-3 transition-colors hover:border-[var(--platform-border-hover)] cursor-pointer"
        >
          <div className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', priorityDots[approval.priority])} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <AgentBadge agentType={approval.agent_type} size="sm" />
              <span className="text-[10px] text-[var(--platform-text-muted)]">
                {formatTimeAgo(approval.created_at)}
              </span>
            </div>
            <p className="mt-1 text-xs text-[var(--platform-text-secondary)] line-clamp-2">
              {approval.summary}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Create quick-stats component**

```typescript
// src/components/platform/command-center/quick-stats.tsx
import { MetricCard } from '@/components/platform/shared/metric-card'

interface QuickStatsProps {
  totalActions: number
  pendingApprovals: number
  activeAgents: number
  totalAgents: number
  monthlyCost: number
}

export function QuickStats({ totalActions, pendingApprovals, activeAgents, totalAgents, monthlyCost }: QuickStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <MetricCard label="Total Actions" value={totalActions} change={{ value: 12, positive: true }} />
      <MetricCard label="Pending Approvals" value={pendingApprovals} />
      <MetricCard label="Active Agents" value={`${activeAgents} / ${totalAgents}`} />
      <MetricCard label="This Month" value={`$${monthlyCost.toFixed(2)}`} />
    </div>
  )
}
```

- [ ] **Step 6: Verify all compile**

Run: `npx tsc --noEmit src/components/platform/command-center/*.tsx`

- [ ] **Step 7: Commit**

```bash
git add src/components/platform/command-center/
git commit -m "feat: add Command Center components (agent cards, activity feed, approvals, quick stats)"
```

---

### Task 8: Wire Up Platform Layout

**Files:**
- Modify: `src/app/(platform)/layout.tsx`
- Depends on: Tasks 1-6

- [ ] **Step 1: Rewrite platform layout with real components**

Replace the entire `src/app/(platform)/layout.tsx` with:

```typescript
// src/app/(platform)/layout.tsx
'use client'

import { useState, useMemo } from 'react'
import { useRequireAuth } from '@/lib/hooks/use-require-auth'
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard'
import { FullPageLoader } from '@/components/ui/loading-spinner'
import { PlatformSidebar } from '@/components/platform/layout/sidebar'
import { TopBar } from '@/components/platform/layout/top-bar'
import { MobileNav } from '@/components/platform/layout/mobile-nav'
import { MOCK_AGENT_STATES, MOCK_APPROVALS, getPendingApprovalCount } from '@/lib/agents/mock-data'

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { isLoading } = useRequireAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  const pendingApprovals = useMemo(() => getPendingApprovalCount(), [])
  const agentNavInfo = useMemo(
    () =>
      MOCK_AGENT_STATES.map((s) => ({
        type: s.agent_type,
        status: s.status,
        enabled: s.is_enabled,
      })),
    []
  )

  useKeyboardShortcuts([
    {
      key: 'k',
      meta: true,
      handler: () => setCommandPaletteOpen((prev) => !prev),
      description: 'Toggle command palette',
    },
    {
      key: 'Escape',
      handler: () => {
        setCommandPaletteOpen(false)
        setSidebarOpen(false)
      },
      allowInInput: true,
      description: 'Close overlays',
    },
  ])

  if (isLoading) return <FullPageLoader />

  return (
    <div className="platform-theme flex min-h-screen bg-[var(--platform-bg)]">
      <PlatformSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        agents={agentNavInfo}
        pendingApprovals={pendingApprovals}
      />

      <div className="flex flex-1 flex-col">
        <TopBar
          onMenuClick={() => setSidebarOpen(true)}
          onSearchClick={() => setCommandPaletteOpen(true)}
          pendingApprovals={pendingApprovals}
        />

        <main className="flex-1 overflow-y-auto p-4 pb-20 lg:p-6 lg:pb-6">
          {children}
        </main>
      </div>

      <MobileNav pendingApprovals={pendingApprovals} />

      {/* Command Palette */}
      {commandPaletteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
          onClick={() => setCommandPaletteOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative w-full max-w-lg rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              autoFocus
              type="text"
              placeholder="Type a command or search..."
              className="w-full rounded-t-xl bg-transparent px-4 py-3 text-sm text-[var(--platform-text-primary)] outline-none placeholder:text-[var(--platform-text-muted)]"
            />
            <div className="border-t border-[var(--platform-border)] px-4 py-3">
              <p className="text-xs text-[var(--platform-text-muted)]">
                Navigation commands coming soon. Press Esc to close.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/app/\(platform\)/layout.tsx
git commit -m "feat: wire up platform layout with sidebar, top bar, and mobile nav"
```

---

### Task 9: Command Center Page

**Files:**
- Modify: `src/app/(platform)/platform/page.tsx`
- Depends on: Tasks 1, 7

- [ ] **Step 1: Rewrite Command Center page with mock data**

Replace `src/app/(platform)/platform/page.tsx` with:

```typescript
// src/app/(platform)/platform/page.tsx
'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { AgentCard } from '@/components/platform/command-center/agent-card'
import { ActivityFeed } from '@/components/platform/command-center/activity-feed'
import { ApprovalSummary } from '@/components/platform/command-center/approval-summary'
import { QuickStats } from '@/components/platform/command-center/quick-stats'
import {
  MOCK_AGENT_STATES,
  MOCK_ACTIVITY_FEED,
  MOCK_APPROVALS,
  getEnabledAgentCount,
  getPendingApprovalCount,
  getTotalActions,
} from '@/lib/agents/mock-data'
import { AGENT_TYPES } from '@/lib/agents/constants'

export default function CommandCenterPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
          Command Center
        </h1>
        <p className="mt-1 text-sm text-[var(--platform-text-secondary)]">
          Your AI team at a glance
        </p>
      </div>

      {/* Quick Stats */}
      <QuickStats
        totalActions={getTotalActions()}
        pendingApprovals={getPendingApprovalCount()}
        activeAgents={getEnabledAgentCount()}
        totalAgents={AGENT_TYPES.length}
        monthlyCost={3.52}
      />

      {/* Two-column layout: Activity Feed + Approvals */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Activity Feed — 2 columns */}
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
              Recent Activity
            </h2>
          </div>
          <ActivityFeed actions={MOCK_ACTIVITY_FEED} maxItems={6} />
        </div>

        {/* Approval Queue — 1 column */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
              Pending Approvals
            </h2>
            {getPendingApprovalCount() > 0 && (
              <Link
                href="/platform/approvals"
                className="flex items-center gap-1 text-[10px] text-[var(--platform-accent)] hover:underline"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
          <ApprovalSummary approvals={MOCK_APPROVALS} maxItems={3} />
        </div>
      </div>

      {/* Agent Cards */}
      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
          Your Agents
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {MOCK_AGENT_STATES.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Full build and verify**

Run: `npm run build`
Then: `npm run dev` and open `http://localhost:3000/platform` in browser

- [ ] **Step 3: Commit**

```bash
git add src/app/\(platform\)/platform/page.tsx
git commit -m "feat: build Command Center page with agent cards, activity feed, and approvals"
```

---

### Task 10: Build Verification & Browser Test

**Files:** None (verification only)

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 2: Start dev server and visually verify**

Run: `npm run dev`
Navigate to: `http://localhost:3000/platform` (after auth)

Expected:
- Dark theme applied (near-black background)
- Left sidebar with: Command Center, Approvals (badge with count), 5 agents (with status dots), Products, Orders, Analytics, Settings
- Top bar with: hamburger (mobile), search bar (⌘K), notification bell (badge), user avatar
- Command Center shows: 4 stat cards, activity feed (6 items with timeline dots), 3 pending approvals, 5 agent cards
- Cmd+K opens command palette overlay
- Mobile: bottom tab bar with 5 tabs, sidebar hidden
- All hover states work, transitions are smooth

- [ ] **Step 3: Commit any fixes needed**

```bash
git add -A
git commit -m "fix: Phase 1A visual polish and build fixes"
```

---

## Success Criteria

- [ ] Sidebar navigation works with active state highlighting
- [ ] Agent status dots show in sidebar (green pulse for running, amber for needs approval)
- [ ] Cmd+K opens command palette, Escape closes it
- [ ] Notification bell shows pending approval count
- [ ] Mobile bottom tab bar shows on small screens
- [ ] Command Center displays: quick stats, activity feed, approval summary, agent cards
- [ ] Mock data renders realistically (Indian market context — ₹ amounts, Indian names)
- [ ] All text is readable against dark background
- [ ] No build errors, no TypeScript errors
- [ ] Existing storefront, API routes, and `/dashboard` routes still work
