# Phase 0: Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Design system tokens, database schema for agent infrastructure, directory scaffolding, TypeScript types, and keyboard shortcut hook — the invisible foundation for the entire agent platform.

**Architecture:** Extend the existing Next.js + Supabase codebase with new `lib/agents/` infrastructure, `app/(platform)/` route group, and dark-themed design tokens. No visible features — just groundwork that Phase 1 builds on.

**Tech Stack:** Next.js 16.1, Tailwind CSS v4 (CSS custom properties), Supabase PostgreSQL (migration 031), TypeScript 5, Zod validation

**Spec:** `docs/PRD.md` — Phase 0 (lines 2472-2501) + Section 6.3 Database Schema (lines 1846-2152)

---

## File Structure

### New Files
```
src/
├── lib/
│   ├── agents/
│   │   ├── types.ts              — All agent type definitions (AgentType, AgentState, AgentAction, etc.)
│   │   └── constants.ts          — Agent IDs, display names, colors, default configs
│   ├── connections/
│   │   └── types.ts              — Placeholder for OAuth connection infrastructure (Phase 5+)
│   ├── hooks/
│   │   └── use-keyboard.ts       — Keyboard shortcut registration & Cmd+K handler
│   └── types/
│       └── agents.ts             — Re-export from lib/agents/types.ts (follows existing pattern)
├── app/
│   └── (platform)/
│       ├── layout.tsx            — Shell layout (dark theme, empty sidebar + content + Cmd+K overlay)
│       └── page.tsx              — Placeholder Command Center (empty state)
├── components/
│   └── platform/
│       └── shared/
│           ├── status-dot.tsx    — Agent status indicator (green/amber/gray)
│           ├── agent-badge.tsx   — Agent name + color badge
│           ├── metric-card.tsx   — Compact metric display card
│           └── keyboard-hint.tsx — Keyboard shortcut label (⌘K style)
supabase/
└── migrations/
    └── 031_agent_infrastructure.sql — All agent tables + RLS policies
```

### Modified Files
```
src/app/globals.css               — Add dark theme CSS custom properties for platform
```

---

### Task 1: Agent Type Definitions

**Files:**
- Create: `src/lib/agents/types.ts`
- Test: Verified by TypeScript compiler (`npm run build`)

- [ ] **Step 1: Create agent types file with all interfaces**

```typescript
// src/lib/agents/types.ts

// ---- Agent Identity ----

export type AgentType = 'marketing' | 'sales' | 'support' | 'analytics' | 'technical'

export type AgentStatus = 'idle' | 'running' | 'waiting_approval' | 'paused' | 'error'

export type AutonomyLevel = 1 | 2 | 3 | 4 | 5

// ---- Agent State (maps to agent_states table) ----

export interface AgentState {
  id: string
  store_id: string
  agent_type: AgentType

  // Configuration
  is_enabled: boolean
  autonomy_level: AutonomyLevel
  config: AgentConfig

  // Runtime
  status: AgentStatus
  last_action_at: string | null
  last_error: string | null
  error_count: number

  // Usage
  total_actions: number
  total_approvals_requested: number
  total_approvals_granted: number
  total_approvals_rejected: number

  created_at: string
  updated_at: string
}

export interface AgentConfig {
  // Common across all agents
  tone?: 'formal' | 'casual' | 'friendly' | 'professional'
  notification_preference?: 'all' | 'important' | 'none'
  // Agent-specific settings stored as additional keys
  [key: string]: unknown
}

// ---- Agent Actions (maps to agent_actions table) ----

export type ActionStatus = 'completed' | 'failed' | 'pending_approval' | 'approved' | 'rejected' | 'expired' | 'cancelled'

export type ActionCategory = 'communication' | 'campaign' | 'optimization' | 'analysis' | 'maintenance'

export type ExecutionMode = 'auto' | 'approved' | 'manual'

export interface AgentAction {
  id: string
  store_id: string
  agent_type: AgentType

  action_type: string
  action_category: ActionCategory
  summary: string
  details: Record<string, unknown>

  status: ActionStatus
  execution_mode: ExecutionMode
  approval_id: string | null

  related_entity_type: string | null
  related_entity_id: string | null

  model_used: string | null
  tokens_input: number
  tokens_output: number
  estimated_cost_usd: number
  api_costs: Record<string, number>

  started_at: string
  completed_at: string | null
  duration_ms: number | null

  created_at: string
}

// ---- Agent Approvals (maps to agent_approvals table) ----

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled'

export type ApprovalPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface AgentApproval {
  id: string
  store_id: string
  agent_type: AgentType

  action_type: string
  summary: string
  reasoning: string
  details: Record<string, unknown>

  priority: ApprovalPriority
  expires_at: string | null

  status: ApprovalStatus
  resolved_by: string | null
  resolved_at: string | null
  rejection_reason: string | null
  modifications: Record<string, unknown> | null

  created_at: string
  updated_at: string
}

// ---- Agent Memory (maps to agent_memory table) ----

export type MemoryType = 'preference' | 'pattern' | 'feedback' | 'context'

export type MemorySource = 'merchant_feedback' | 'data_analysis' | 'approval_pattern' | 'explicit_config'

export interface AgentMemory {
  id: string
  store_id: string
  agent_type: AgentType

  memory_type: MemoryType
  memory_key: string
  memory_value: Record<string, unknown>
  confidence: number

  source: MemorySource
  source_action_id: string | null

  created_at: string
  updated_at: string
  expires_at: string | null
}

// ---- Agent Schedules (maps to agent_schedules table) ----

export type ScheduleRunStatus = 'completed' | 'failed' | 'skipped'

export interface AgentSchedule {
  id: string
  store_id: string
  agent_type: AgentType

  task_type: string
  schedule_cron: string
  timezone: string

  is_active: boolean
  config: Record<string, unknown>

  last_run_at: string | null
  next_run_at: string | null
  last_run_status: ScheduleRunStatus | null
  consecutive_failures: number

  created_at: string
  updated_at: string
}

// ---- Connected Accounts (maps to connected_accounts table) ----

export type ConnectionProvider = 'meta' | 'google_ads' | 'google_analytics'

export type ConnectionStatus = 'active' | 'expired' | 'revoked' | 'error'

export interface ConnectedAccount {
  id: string
  store_id: string

  provider: ConnectionProvider
  provider_account_id: string | null
  provider_account_name: string | null

  scopes: string[]

  status: ConnectionStatus
  last_used_at: string | null
  last_error: string | null

  created_at: string
  updated_at: string
  // Note: tokens are never exposed to frontend — encrypted in DB, accessed only server-side
}

// ---- Cost Tracking (maps to agent_cost_tracking table) ----

export interface AgentCostTracking {
  id: string
  store_id: string

  period_start: string
  period_end: string

  total_tokens_input: number
  total_tokens_output: number
  total_llm_cost_usd: number

  cost_by_agent: Record<AgentType, number>
  tokens_by_agent: Record<AgentType, { input: number; output: number }>

  total_api_cost_usd: number
  api_cost_by_provider: Record<string, number>

  budget_limit_usd: number | null
  budget_alert_sent: boolean

  created_at: string
  updated_at: string
}

// ---- Conversations (maps to customer_conversations + conversation_messages tables) ----

export type ConversationChannel = 'website_chat' | 'email' | 'whatsapp'

export type ConversationStatus = 'open' | 'resolved' | 'escalated' | 'waiting_customer'

export type ConversationAssignee = 'agent' | 'merchant'

export interface CustomerConversation {
  id: string
  store_id: string
  customer_id: string | null

  channel: ConversationChannel
  channel_identifier: string | null

  status: ConversationStatus
  assigned_to: ConversationAssignee

  subject: string | null
  last_message_at: string | null
  message_count: number

  related_order_id: string | null
  related_product_id: string | null

  first_response_ms: number | null
  resolution_ms: number | null
  customer_satisfaction: number | null

  created_at: string
  updated_at: string
}

export type MessageRole = 'customer' | 'agent' | 'merchant'

export interface ConversationMessage {
  id: string
  conversation_id: string

  role: MessageRole
  content: string
  metadata: Record<string, unknown>

  created_at: string
}
```

- [ ] **Step 2: Create re-export file at lib/types/agents.ts (follows existing pattern)**

```typescript
// src/lib/types/agents.ts
export * from '@/lib/agents/types'
```

- [ ] **Step 3: Create placeholder connections directory**

```typescript
// src/lib/connections/types.ts
// Placeholder for OAuth connection infrastructure (Phase 5+)
// Will contain: meta.ts, google-ads.ts, google-analytics.ts
export type ConnectionProvider = 'meta' | 'google_ads' | 'google_analytics'
```

- [ ] **Step 4: Verify types compile**

Run: `cd /Users/manan/Downloads/aistore_cursor/ai-store-builder && npx tsc --noEmit src/lib/agents/types.ts`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/lib/agents/types.ts src/lib/types/agents.ts src/lib/connections/types.ts
git commit -m "feat: add agent platform type definitions

All TypeScript interfaces for agent states, actions, approvals,
memory, schedules, connected accounts, cost tracking, and conversations."
```

---

### Task 2: Agent Constants

**Files:**
- Create: `src/lib/agents/constants.ts`
- Depends on: Task 1

- [ ] **Step 1: Create constants file**

```typescript
// src/lib/agents/constants.ts
import type { AgentType, AutonomyLevel } from './types'

// ---- Agent Identity ----

export const AGENT_TYPES: AgentType[] = ['marketing', 'sales', 'support', 'analytics', 'technical']

export const AGENT_DISPLAY_NAMES: Record<AgentType, string> = {
  marketing: 'Marketing Agent',
  sales: 'Sales Agent',
  support: 'Support Agent',
  analytics: 'Analytics Agent',
  technical: 'Technical Agent',
}

export const AGENT_DESCRIPTIONS: Record<AgentType, string> = {
  marketing: 'Manages ad campaigns, social media, and brand presence',
  sales: 'Recovers abandoned carts, creates discounts, and drives revenue',
  support: 'Handles customer inquiries across chat, email, and WhatsApp',
  analytics: 'Surfaces insights, detects anomalies, and generates reports',
  technical: 'Optimizes SEO, performance, structured data, and site health',
}

// ---- Agent Colors (for UI badges, timeline dots, chart series) ----

export const AGENT_COLORS: Record<AgentType, { bg: string; text: string; dot: string; border: string }> = {
  marketing: { bg: 'bg-purple-500/10', text: 'text-purple-400', dot: 'bg-purple-400', border: 'border-purple-500/20' },
  sales: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400', border: 'border-emerald-500/20' },
  support: { bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-400', border: 'border-blue-500/20' },
  analytics: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400', border: 'border-amber-500/20' },
  technical: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', dot: 'bg-cyan-400', border: 'border-cyan-500/20' },
}

// ---- Agent Icons (Lucide icon names) ----

export const AGENT_ICONS: Record<AgentType, string> = {
  marketing: 'megaphone',
  sales: 'trending-up',
  support: 'headphones',
  analytics: 'bar-chart-3',
  technical: 'settings',
}

// ---- Status Colors ----

export const STATUS_COLORS = {
  idle: { dot: 'bg-zinc-500', text: 'text-zinc-400', label: 'Idle' },
  running: { dot: 'bg-green-400', text: 'text-green-400', label: 'Active' },
  waiting_approval: { dot: 'bg-amber-400', text: 'text-amber-400', label: 'Needs Approval' },
  paused: { dot: 'bg-zinc-600', text: 'text-zinc-500', label: 'Paused' },
  error: { dot: 'bg-red-400', text: 'text-red-400', label: 'Error' },
} as const

// ---- Autonomy Levels ----

export const AUTONOMY_LEVELS: Record<AutonomyLevel, { label: string; description: string }> = {
  1: { label: 'Observer', description: 'Reports only — never takes action without approval' },
  2: { label: 'Assistant', description: 'Executes routine tasks, asks approval for anything novel' },
  3: { label: 'Smart Auto', description: 'Auto-executes most actions, approval for money & high-impact' },
  4: { label: 'Autonomous', description: 'Auto-executes everything except large budget decisions' },
  5: { label: 'Full Auto', description: 'Fully autonomous — only escalates emergencies' },
}

export const DEFAULT_AUTONOMY_LEVEL: AutonomyLevel = 3

// ---- Approval Priority ----

export const APPROVAL_PRIORITY_ORDER = ['urgent', 'high', 'normal', 'low'] as const

// ---- Action Categories ----

export const ACTION_CATEGORY_LABELS: Record<string, string> = {
  communication: 'Communication',
  campaign: 'Campaign',
  optimization: 'Optimization',
  analysis: 'Analysis',
  maintenance: 'Maintenance',
}

// ---- Model Routing Defaults ----

export const MODEL_TIERS = {
  fast: { model: 'gemini-2.0-flash', costPer1kInput: 0.0001, costPer1kOutput: 0.0004 },
  balanced: { model: 'gemini-2.0-flash', costPer1kInput: 0.0001, costPer1kOutput: 0.0004 },
  premium: { model: 'claude-sonnet-4', costPer1kInput: 0.003, costPer1kOutput: 0.015 },
} as const

// ---- Default Budget Limits (USD per month) ----

export const DEFAULT_BUDGET_LIMITS = {
  free: 2,
  pro: 20,
  business: 100,
} as const
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/manan/Downloads/aistore_cursor/ai-store-builder && npx tsc --noEmit src/lib/agents/constants.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/agents/constants.ts
git commit -m "feat: add agent constants (display names, colors, icons, autonomy levels)"
```

---

### Task 3: Database Migration — Agent Infrastructure Tables

**Files:**
- Create: `supabase/migrations/031_agent_infrastructure.sql`

- [ ] **Step 1: Create migration file with all agent tables**

```sql
-- 031_agent_infrastructure.sql
-- Agent platform infrastructure tables
-- Part of Phase 0: Foundation

-- ============================================================
-- AGENT STATES — Per-store configuration and runtime state
-- ============================================================
CREATE TABLE agent_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('marketing', 'sales', 'support', 'analytics', 'technical')),

  -- Configuration
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  autonomy_level INTEGER NOT NULL DEFAULT 3 CHECK (autonomy_level BETWEEN 1 AND 5),
  config JSONB NOT NULL DEFAULT '{}',

  -- Runtime state
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'running', 'waiting_approval', 'paused', 'error')),
  last_action_at TIMESTAMPTZ,
  last_error TEXT,
  error_count INTEGER NOT NULL DEFAULT 0,

  -- Usage tracking
  total_actions INTEGER NOT NULL DEFAULT 0,
  total_approvals_requested INTEGER NOT NULL DEFAULT 0,
  total_approvals_granted INTEGER NOT NULL DEFAULT 0,
  total_approvals_rejected INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(store_id, agent_type)
);

CREATE INDEX idx_agent_states_store ON agent_states(store_id);
CREATE INDEX idx_agent_states_status ON agent_states(status) WHERE status != 'idle';

-- ============================================================
-- AGENT APPROVALS — Pending actions awaiting merchant decision
-- (Created before agent_actions because agent_actions references it)
-- ============================================================
CREATE TABLE agent_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,

  action_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  reasoning TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',

  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  expires_at TIMESTAMPTZ,

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'cancelled')),
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  modifications JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_approvals_pending ON agent_approvals(store_id, status, created_at DESC) WHERE status = 'pending';
CREATE INDEX idx_agent_approvals_store ON agent_approvals(store_id, created_at DESC);

-- ============================================================
-- AGENT ACTIONS — Complete log of everything agents do
-- ============================================================
CREATE TABLE agent_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,

  action_type TEXT NOT NULL,
  action_category TEXT NOT NULL,
  summary TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',

  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'pending_approval', 'approved', 'rejected', 'expired', 'cancelled')),
  execution_mode TEXT NOT NULL CHECK (execution_mode IN ('auto', 'approved', 'manual')),
  approval_id UUID REFERENCES agent_approvals(id),

  related_entity_type TEXT,
  related_entity_id TEXT,

  model_used TEXT,
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  estimated_cost_usd DECIMAL(10,6) DEFAULT 0,
  api_costs JSONB DEFAULT '{}',

  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_actions_store_time ON agent_actions(store_id, created_at DESC);
CREATE INDEX idx_agent_actions_agent ON agent_actions(store_id, agent_type, created_at DESC);
CREATE INDEX idx_agent_actions_status ON agent_actions(status) WHERE status = 'pending_approval';
CREATE INDEX idx_agent_actions_entity ON agent_actions(related_entity_type, related_entity_id) WHERE related_entity_id IS NOT NULL;

-- ============================================================
-- AGENT MEMORY — Learned preferences and patterns per store
-- ============================================================
CREATE TABLE agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,

  memory_type TEXT NOT NULL,
  memory_key TEXT NOT NULL,
  memory_value JSONB NOT NULL,
  confidence DECIMAL(3,2) DEFAULT 1.0,

  source TEXT NOT NULL,
  source_action_id UUID REFERENCES agent_actions(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,

  UNIQUE(store_id, agent_type, memory_key)
);

CREATE INDEX idx_agent_memory_lookup ON agent_memory(store_id, agent_type, memory_type);

-- ============================================================
-- AGENT SCHEDULES — Recurring tasks for agents
-- ============================================================
CREATE TABLE agent_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,

  task_type TEXT NOT NULL,
  schedule_cron TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',

  is_active BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}',

  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  last_run_status TEXT CHECK (last_run_status IN ('completed', 'failed', 'skipped')),
  consecutive_failures INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_schedules_next ON agent_schedules(next_run_at) WHERE is_active = true;
CREATE INDEX idx_agent_schedules_store ON agent_schedules(store_id, agent_type);

-- ============================================================
-- CONNECTED ACCOUNTS — OAuth tokens for third-party services
-- ============================================================
CREATE TABLE connected_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

  provider TEXT NOT NULL,
  provider_account_id TEXT,
  provider_account_name TEXT,

  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,

  scopes TEXT[] NOT NULL DEFAULT '{}',

  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'error')),
  last_used_at TIMESTAMPTZ,
  last_error TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(store_id, provider)
);

CREATE INDEX idx_connected_accounts_store ON connected_accounts(store_id);
CREATE INDEX idx_connected_accounts_refresh ON connected_accounts(token_expires_at) WHERE status = 'active';

-- ============================================================
-- AGENT COST TRACKING — Monthly budget tracking per store
-- ============================================================
CREATE TABLE agent_cost_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  total_tokens_input BIGINT NOT NULL DEFAULT 0,
  total_tokens_output BIGINT NOT NULL DEFAULT 0,
  total_llm_cost_usd DECIMAL(10,4) NOT NULL DEFAULT 0,

  cost_by_agent JSONB NOT NULL DEFAULT '{}',
  tokens_by_agent JSONB NOT NULL DEFAULT '{}',

  total_api_cost_usd DECIMAL(10,4) NOT NULL DEFAULT 0,
  api_cost_by_provider JSONB NOT NULL DEFAULT '{}',

  budget_limit_usd DECIMAL(10,2),
  budget_alert_sent BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(store_id, period_start)
);

CREATE INDEX idx_agent_costs_store ON agent_cost_tracking(store_id, period_start DESC);

-- ============================================================
-- CUSTOMER CONVERSATIONS — Support agent conversation threads
-- ============================================================
CREATE TABLE customer_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),

  channel TEXT NOT NULL CHECK (channel IN ('website_chat', 'email', 'whatsapp')),
  channel_identifier TEXT,

  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'escalated', 'waiting_customer')),
  assigned_to TEXT NOT NULL DEFAULT 'agent' CHECK (assigned_to IN ('agent', 'merchant')),

  subject TEXT,
  last_message_at TIMESTAMPTZ,
  message_count INTEGER NOT NULL DEFAULT 0,

  related_order_id UUID REFERENCES orders(id),
  related_product_id UUID REFERENCES products(id),

  first_response_ms INTEGER,
  resolution_ms INTEGER,
  customer_satisfaction INTEGER CHECK (customer_satisfaction BETWEEN 1 AND 5),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversations_store ON customer_conversations(store_id, status, created_at DESC);
CREATE INDEX idx_conversations_customer ON customer_conversations(customer_id) WHERE customer_id IS NOT NULL;

CREATE TABLE conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES customer_conversations(id) ON DELETE CASCADE,

  role TEXT NOT NULL CHECK (role IN ('customer', 'agent', 'merchant')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conversation ON conversation_messages(conversation_id, created_at);

-- ============================================================
-- RLS POLICIES — Multi-tenant isolation
-- ============================================================

ALTER TABLE agent_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_cost_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

-- Agent States: merchants can view/update their own
CREATE POLICY "Merchants can view their own agent states"
  ON agent_states FOR SELECT
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

CREATE POLICY "Merchants can update their own agent states"
  ON agent_states FOR UPDATE
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

CREATE POLICY "Merchants can insert their own agent states"
  ON agent_states FOR INSERT
  WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

-- Agent Actions: merchants can view their own
CREATE POLICY "Merchants can view their own agent actions"
  ON agent_actions FOR SELECT
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

-- Agent Approvals: merchants can view/update their own
CREATE POLICY "Merchants can view their own agent approvals"
  ON agent_approvals FOR SELECT
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

CREATE POLICY "Merchants can update their own agent approvals"
  ON agent_approvals FOR UPDATE
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

-- Agent Memory: merchants can view/manage their own
CREATE POLICY "Merchants can view their own agent memory"
  ON agent_memory FOR SELECT
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

CREATE POLICY "Merchants can delete their own agent memory"
  ON agent_memory FOR DELETE
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

-- Agent Schedules: merchants can view/update their own
CREATE POLICY "Merchants can view their own agent schedules"
  ON agent_schedules FOR SELECT
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

CREATE POLICY "Merchants can update their own agent schedules"
  ON agent_schedules FOR UPDATE
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

-- Connected Accounts: merchants can manage their own
CREATE POLICY "Merchants can view their own connected accounts"
  ON connected_accounts FOR SELECT
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

CREATE POLICY "Merchants can insert their own connected accounts"
  ON connected_accounts FOR INSERT
  WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

CREATE POLICY "Merchants can update their own connected accounts"
  ON connected_accounts FOR UPDATE
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

CREATE POLICY "Merchants can delete their own connected accounts"
  ON connected_accounts FOR DELETE
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

-- Cost Tracking: merchants can view their own
CREATE POLICY "Merchants can view their own cost tracking"
  ON agent_cost_tracking FOR SELECT
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

-- Conversations: merchants can view their own store's conversations
CREATE POLICY "Merchants can view their own conversations"
  ON customer_conversations FOR SELECT
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

CREATE POLICY "Merchants can update their own conversations"
  ON customer_conversations FOR UPDATE
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

-- Conversation Messages: merchants can view messages in their store's conversations
CREATE POLICY "Merchants can view their own conversation messages"
  ON conversation_messages FOR SELECT
  USING (conversation_id IN (
    SELECT id FROM customer_conversations
    WHERE store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  ));

-- ============================================================
-- UPDATED_AT TRIGGERS — Auto-update timestamp on modification
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agent_states_updated_at BEFORE UPDATE ON agent_states
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_approvals_updated_at BEFORE UPDATE ON agent_approvals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_memory_updated_at BEFORE UPDATE ON agent_memory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_schedules_updated_at BEFORE UPDATE ON agent_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_connected_accounts_updated_at BEFORE UPDATE ON connected_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_cost_tracking_updated_at BEFORE UPDATE ON agent_cost_tracking
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_conversations_updated_at BEFORE UPDATE ON customer_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

- [ ] **Step 2: Apply migration to Supabase**

Run: `cd /Users/manan/Downloads/aistore_cursor/ai-store-builder && npx supabase db push --linked`

If that fails (Docker not running), apply directly via the Supabase MCP `run_sql` tool or the Supabase dashboard SQL editor.

Expected: All tables created, indexes created, RLS policies applied, triggers created.

- [ ] **Step 3: Verify tables exist**

Run SQL via Supabase dashboard or MCP:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'agent_%' OR table_name IN ('connected_accounts', 'customer_conversations', 'conversation_messages')
ORDER BY table_name;
```
Expected: 9 tables listed.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/031_agent_infrastructure.sql
git commit -m "feat: add database migration for agent infrastructure (9 tables)"
```

---

### Task 4: Dark Theme Design Tokens

**Files:**
- Modify: `src/app/globals.css` (add platform-specific dark theme tokens)

- [ ] **Step 1: Read current globals.css**

Read: `src/app/globals.css` — understand existing theme structure before adding.

- [ ] **Step 2: Add platform dark theme custom properties**

Add after the existing `@theme inline` block a new section for platform-specific tokens. The existing dark mode in globals.css uses oklch. The platform theme adds specific values for the agent dashboard:

```css
/* Add to globals.css — Platform Agent Dashboard Theme */
@layer base {
  .platform-theme {
    /* Surface hierarchy (darkest to lightest) */
    --platform-bg: oklch(0.098 0 0);           /* #0a0a0a - page background */
    --platform-surface: oklch(0.13 0 0);        /* ~#1a1a1a - card/panel bg */
    --platform-surface-hover: oklch(0.16 0 0);  /* ~#222 - hover state */
    --platform-surface-active: oklch(0.19 0 0); /* ~#2a2a2a - active/selected */
    --platform-overlay: oklch(0.11 0 0);        /* ~#151515 - overlay/modal bg */

    /* Border hierarchy */
    --platform-border: oklch(0.2 0 0);          /* ~#2a2a2a - subtle border */
    --platform-border-hover: oklch(0.28 0 0);   /* ~#3a3a3a - hover border */

    /* Text hierarchy */
    --platform-text-primary: oklch(0.95 0 0);   /* ~#eee - primary text */
    --platform-text-secondary: oklch(0.65 0 0); /* ~#888 - secondary text */
    --platform-text-muted: oklch(0.45 0 0);     /* ~#555 - muted/hint text */

    /* Agent status colors */
    --platform-status-active: oklch(0.723 0.191 142.5);    /* #22c55e green */
    --platform-status-approval: oklch(0.795 0.184 86.047);  /* #f59e0b amber */
    --platform-status-idle: oklch(0.551 0.027 264.364);     /* #6b7280 gray */
    --platform-status-error: oklch(0.637 0.237 25.331);     /* #ef4444 red */
    --platform-status-paused: oklch(0.37 0 0);              /* dim gray */

    /* Accent */
    --platform-accent: oklch(0.623 0.214 259.815);          /* #3b82f6 blue */
    --platform-accent-hover: oklch(0.566 0.225 262.881);    /* #2563eb darker blue */
  }
}
```

- [ ] **Step 3: Verify CSS is valid**

Run: `cd /Users/manan/Downloads/aistore_cursor/ai-store-builder && npm run build`
Expected: Build succeeds (CSS compiles without errors)

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add platform dark theme design tokens"
```

---

### Task 5: Keyboard Shortcut Hook

**Files:**
- Create: `src/lib/hooks/use-keyboard.ts`

- [ ] **Step 1: Create keyboard shortcut hook**

```typescript
// src/lib/hooks/use-keyboard.ts
'use client'

import { useEffect, useCallback, useRef, useState } from 'react'

export interface KeyboardShortcut {
  key: string                          // e.g. 'k', 'j', 'Enter', 'Escape'
  meta?: boolean                       // Cmd on Mac, Ctrl on Windows
  shift?: boolean
  alt?: boolean
  handler: (e: KeyboardEvent) => void
  /** If true, shortcut fires even when an input/textarea is focused */
  allowInInput?: boolean
  description?: string                 // For future shortcut help panel
}

/**
 * Register multiple keyboard shortcuts. Handles Cmd vs Ctrl cross-platform.
 * Respects prefers-reduced-motion for any animation-triggering shortcuts.
 *
 * Usage:
 *   useKeyboardShortcuts([
 *     { key: 'k', meta: true, handler: () => openCommandPalette(), description: 'Open command palette' },
 *     { key: 'j', handler: () => nextItem(), description: 'Next item' },
 *   ])
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const shortcutsRef = useRef(shortcuts)
  shortcutsRef.current = shortcuts

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Skip if user is typing in an input (unless explicitly allowed)
    const target = e.target as HTMLElement
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

    for (const shortcut of shortcutsRef.current) {
      if (isInput && !shortcut.allowInInput) continue

      const metaMatch = shortcut.meta
        ? (e.metaKey || e.ctrlKey)  // Cmd on Mac, Ctrl on Windows/Linux
        : (!e.metaKey && !e.ctrlKey)

      const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey
      const altMatch = shortcut.alt ? e.altKey : !e.altKey

      if (e.key.toLowerCase() === shortcut.key.toLowerCase() && metaMatch && shiftMatch && altMatch) {
        e.preventDefault()
        shortcut.handler(e)
        return
      }
    }
  }, [])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

/**
 * Returns true if user prefers reduced motion.
 * Used to disable keyboard-triggered animations.
 * Reactive: updates if user changes preference. SSR-safe.
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReduced(mq.matches)
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return prefersReduced
}

/**
 * Formats a keyboard shortcut for display.
 * Returns platform-appropriate symbols (⌘ on Mac, Ctrl on others).
 */
export function formatShortcut(shortcut: Pick<KeyboardShortcut, 'key' | 'meta' | 'shift' | 'alt'>): string {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac')

  const parts: string[] = []
  if (shortcut.meta) parts.push(isMac ? '⌘' : 'Ctrl')
  if (shortcut.shift) parts.push(isMac ? '⇧' : 'Shift')
  if (shortcut.alt) parts.push(isMac ? '⌥' : 'Alt')
  parts.push(shortcut.key.toUpperCase())

  return parts.join(isMac ? '' : '+')
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd /Users/manan/Downloads/aistore_cursor/ai-store-builder && npx tsc --noEmit src/lib/hooks/use-keyboard.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/hooks/use-keyboard.ts
git commit -m "feat: add keyboard shortcut hook with cross-platform support"
```

---

### Task 6: Shared Platform Components

**Files:**
- Create: `src/components/platform/shared/status-dot.tsx`
- Create: `src/components/platform/shared/agent-badge.tsx`
- Create: `src/components/platform/shared/metric-card.tsx`
- Create: `src/components/platform/shared/keyboard-hint.tsx`
- Depends on: Task 2

- [ ] **Step 1: Create status-dot component**

```typescript
// src/components/platform/shared/status-dot.tsx
import { cn } from '@/lib/utils'
import type { AgentStatus } from '@/lib/agents/types'
import { STATUS_COLORS } from '@/lib/agents/constants'

interface StatusDotProps {
  status: AgentStatus
  size?: 'sm' | 'md' | 'lg'
  pulse?: boolean
  className?: string
}

const sizeClasses = {
  sm: 'h-1.5 w-1.5',
  md: 'h-2 w-2',
  lg: 'h-2.5 w-2.5',
} as const

export function StatusDot({ status, size = 'md', pulse, className }: StatusDotProps) {
  const colors = STATUS_COLORS[status]
  const shouldPulse = pulse ?? status === 'running'

  return (
    <span className={cn('relative inline-flex', className)}>
      {shouldPulse && (
        <span
          className={cn(
            'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
            colors.dot
          )}
        />
      )}
      <span
        className={cn(
          'relative inline-flex rounded-full',
          sizeClasses[size],
          colors.dot
        )}
      />
    </span>
  )
}
```

- [ ] **Step 2: Create agent-badge component**

```typescript
// src/components/platform/shared/agent-badge.tsx
import { cn } from '@/lib/utils'
import type { AgentType } from '@/lib/agents/types'
import { AGENT_DISPLAY_NAMES, AGENT_COLORS } from '@/lib/agents/constants'

interface AgentBadgeProps {
  agentType: AgentType
  size?: 'sm' | 'md'
  className?: string
}

export function AgentBadge({ agentType, size = 'sm', className }: AgentBadgeProps) {
  const colors = AGENT_COLORS[agentType]
  const name = AGENT_DISPLAY_NAMES[agentType]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-mono',
        colors.bg,
        colors.text,
        colors.border,
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        className
      )}
    >
      <span className={cn('inline-block h-1.5 w-1.5 rounded-full', colors.dot)} />
      {name.replace(' Agent', '')}
    </span>
  )
}
```

- [ ] **Step 3: Create metric-card component**

```typescript
// src/components/platform/shared/metric-card.tsx
import { cn } from '@/lib/utils'

interface MetricCardProps {
  label: string
  value: string | number
  change?: { value: number; positive?: boolean }
  className?: string
}

export function MetricCard({ label, value, change, className }: MetricCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border p-3',
        'border-[var(--platform-border)] bg-[var(--platform-surface)]',
        className
      )}
    >
      <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
        {label}
      </p>
      <p className="mt-1 font-mono text-xl font-semibold text-[var(--platform-text-primary)]">
        {value}
      </p>
      {change && (
        <p
          className={cn(
            'mt-0.5 font-mono text-xs',
            change.positive ? 'text-[var(--platform-status-active)]' : 'text-[var(--platform-status-error)]'
          )}
        >
          {change.positive ? '↑' : '↓'} {Math.abs(change.value)}%
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create keyboard-hint component**

```typescript
// src/components/platform/shared/keyboard-hint.tsx
import { cn } from '@/lib/utils'

interface KeyboardHintProps {
  keys: string  // e.g. "⌘K" or "J"
  className?: string
}

export function KeyboardHint({ keys, className }: KeyboardHintProps) {
  return (
    <kbd
      className={cn(
        'inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5',
        'border-[var(--platform-border)] bg-[var(--platform-bg)]',
        'font-mono text-[10px] text-[var(--platform-text-muted)]',
        className
      )}
    >
      {keys}
    </kbd>
  )
}
```

- [ ] **Step 5: Verify all components compile**

Run: `cd /Users/manan/Downloads/aistore_cursor/ai-store-builder && npx tsc --noEmit src/components/platform/shared/*.tsx`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/components/platform/shared/
git commit -m "feat: add shared platform components (status-dot, agent-badge, metric-card, keyboard-hint)"
```

---

### Task 7: Platform Shell Layout

**Files:**
- Create: `src/app/(platform)/layout.tsx`
- Create: `src/app/(platform)/page.tsx`
- Depends on: Task 4, Task 5, Task 6

- [ ] **Step 1: Create platform layout**

```typescript
// src/app/(platform)/layout.tsx
'use client'

import { useState } from 'react'
import { useRequireAuth } from '@/lib/hooks/use-require-auth'
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard'
import { KeyboardHint } from '@/components/platform/shared/keyboard-hint'
import { FullPageLoader } from '@/components/ui/loading-spinner'

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { isLoading } = useRequireAuth()
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  useKeyboardShortcuts([
    {
      key: 'k',
      meta: true,
      handler: () => setCommandPaletteOpen((prev) => !prev),
      description: 'Toggle command palette',
    },
    {
      key: 'Escape',
      handler: () => setCommandPaletteOpen(false),
      allowInInput: true,
      description: 'Close command palette',
    },
  ])

  if (isLoading) return <FullPageLoader />

  return (
    <div className="platform-theme flex min-h-screen bg-[var(--platform-bg)]">
      {/* Sidebar placeholder — built in Phase 1 */}
      <aside className="hidden w-56 shrink-0 border-r border-[var(--platform-border)] bg-[var(--platform-surface)] lg:block">
        <div className="flex h-14 items-center px-4">
          <span className="font-mono text-sm font-semibold text-[var(--platform-text-primary)]">
            Agent Platform
          </span>
        </div>
        <nav className="mt-2 space-y-1 px-2">
          <div className="rounded-md px-3 py-2 text-xs text-[var(--platform-text-muted)]">
            Navigation coming in Phase 1
          </div>
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Top bar placeholder */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--platform-border)] bg-[var(--platform-surface)] px-6">
          <span className="text-sm text-[var(--platform-text-secondary)]">
            Command Center
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="flex items-center gap-2 rounded-md border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-1.5 text-xs text-[var(--platform-text-muted)] transition-colors hover:border-[var(--platform-border-hover)] hover:text-[var(--platform-text-secondary)]"
            >
              Search or run command...
              <KeyboardHint keys="⌘K" />
            </button>
          </div>
        </header>

        {/* Content area */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

      {/* Command Palette overlay — empty shell, built out in Phase 1 */}
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
              className="w-full rounded-xl bg-transparent px-4 py-3 text-sm text-[var(--platform-text-primary)] outline-none placeholder:text-[var(--platform-text-muted)]"
            />
            <div className="border-t border-[var(--platform-border)] px-4 py-3">
              <p className="text-xs text-[var(--platform-text-muted)]">
                Commands will be available in Phase 1. Press Esc to close.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create placeholder Command Center page**

```typescript
// src/app/(platform)/page.tsx
import { AGENT_TYPES, AGENT_DISPLAY_NAMES, AGENT_DESCRIPTIONS } from '@/lib/agents/constants'
import { AgentBadge } from '@/components/platform/shared/agent-badge'
import { MetricCard } from '@/components/platform/shared/metric-card'

export default function CommandCenterPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
          Command Center
        </h1>
        <p className="mt-1 text-sm text-[var(--platform-text-secondary)]">
          Your AI team at a glance. All agents are currently in setup mode.
        </p>
      </div>

      {/* Quick Stats placeholder */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Total Actions" value="—" />
        <MetricCard label="Pending Approvals" value="0" />
        <MetricCard label="Active Agents" value="0 / 5" />
        <MetricCard label="This Month Cost" value="$0.00" />
      </div>

      {/* Agent Cards placeholder */}
      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
          Your Agents
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {AGENT_TYPES.map((type) => (
            <div
              key={type}
              className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-4"
            >
              <div className="flex items-center justify-between">
                <AgentBadge agentType={type} size="md" />
                <span className="text-[10px] text-[var(--platform-text-muted)]">Not configured</span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-[var(--platform-text-secondary)]">
                {AGENT_DESCRIPTIONS[type]}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Activity Feed placeholder */}
      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
          Activity Feed
        </h2>
        <div className="rounded-lg border border-dashed border-[var(--platform-border)] p-8 text-center">
          <p className="text-sm text-[var(--platform-text-muted)]">
            No agent activity yet. Enable an agent to get started.
          </p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify the page renders**

Run: `cd /Users/manan/Downloads/aistore_cursor/ai-store-builder && npm run build`
Expected: Build succeeds. Navigating to `/(platform)` in dev should show the dark-themed empty shell.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(platform\)/
git commit -m "feat: add platform shell layout with dark theme and placeholder Command Center"
```

---

### Task 8: Build Verification

**Files:** None (verification only)

- [ ] **Step 1: Full build check**

Run: `cd /Users/manan/Downloads/aistore_cursor/ai-store-builder && npm run build`
Expected: Build succeeds with no TypeScript or CSS errors.

- [ ] **Step 2: Verify database tables**

Query Supabase to confirm all 9 new tables exist:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'agent_states', 'agent_actions', 'agent_approvals', 'agent_memory',
  'agent_schedules', 'connected_accounts', 'agent_cost_tracking',
  'customer_conversations', 'conversation_messages'
)
ORDER BY table_name;
```
Expected: 9 rows returned.

- [ ] **Step 3: Verify RLS is enabled**

```sql
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE 'agent_%' OR tablename IN ('connected_accounts', 'customer_conversations', 'conversation_messages');
```
Expected: All 9 tables show `rowsecurity = true`.

- [ ] **Step 4: Start dev server and check platform route**

Run: `cd /Users/manan/Downloads/aistore_cursor/ai-store-builder && npm run dev`
Navigate to: `http://localhost:3000` (auth required, then should be able to visit the platform layout)
Expected: Dark-themed shell with sidebar, top bar, and Command Center placeholder.

- [ ] **Step 5: Final commit (if any fixes were needed)**

```bash
git add -A
git commit -m "fix: Phase 0 build verification fixes"
```

---

## Success Criteria Checklist

- [ ] `npm run build` succeeds with new directory structure
- [ ] All 9 new tables exist in Supabase with RLS policies
- [ ] Navigating to `/(platform)` renders empty shell with dark theme
- [ ] Cmd+K hook infrastructure is in place (will wire to command palette in Phase 1)
- [ ] Shared components render correctly (status-dot, agent-badge, metric-card, keyboard-hint)
- [ ] All TypeScript types compile without errors
- [ ] No regressions in existing storefront, API routes, or auth
