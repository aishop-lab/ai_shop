# Phase 2C: API Routes & Real-time Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the agent backend (Phase 2A/2B) to the frontend by building API routes for agent CRUD/chat/approvals, real-time Supabase hooks, and replacing all mock data in the platform UI with live data.

**Architecture:** A shared auth helper (`lib/agents/auth.ts`) extracts the cookie-or-bearer-token pattern used across all agent API routes. API routes live under `app/api/agents/` and use the admin Supabase client for DB access after verifying the user owns the store. Client-side hooks in `lib/hooks/` subscribe to Supabase Realtime `postgres_changes` channels for live updates to agent_states, agent_actions, and agent_approvals tables. The platform layout and Command Center page swap mock data imports for these hooks. A cron-callable execute endpoint fans out scheduled tasks to all enabled stores.

**Tech Stack:** Next.js 16.1 App Router, Supabase (PostgreSQL + Realtime + Auth), TypeScript 5

**Depends on:** Phase 2A (core backend), Phase 2B (memory, scheduler, orchestrator)

---

## File Structure

### New Files
```
src/
├── lib/
│   └── agents/
│       └── auth.ts                              — Shared auth helper (cookie + bearer token)
├── app/
│   └── api/
│       └── agents/
│           ├── [agentId]/
│           │   ├── route.ts                     — GET agent state, PATCH config
│           │   ├── chat/
│           │   │   └── route.ts                 — POST streaming chat with agent
│           │   ├── actions/
│           │   │   └── route.ts                 — GET paginated action history
│           │   └── pause/
│           │       └── route.ts                 — POST pause/resume agent
│           ├── activity/
│           │   └── route.ts                     — GET cross-agent activity feed
│           ├── approvals/
│           │   ├── route.ts                     — GET pending approvals, POST batch approve/reject
│           │   └── [id]/
│           │       └── route.ts                 — PATCH single approval (approve/reject)
│           └── execute/
│               └── route.ts                     — POST cron-callable task execution
└── lib/
    └── hooks/
        ├── use-agents.ts                        — Real-time agent state hooks
        ├── use-activity.ts                      — Real-time activity feed hook
        └── use-approvals.ts                     — Real-time approvals hook with actions
```

### Modified Files
```
src/app/(platform)/layout.tsx                    — Replace MOCK_AGENT_STATES/MOCK_APPROVALS with hooks
src/app/(platform)/platform/page.tsx             — Replace all MOCK_* imports with real hooks
vercel.json                                      — Add agent cron entries
```

---

## Task 1: Shared Auth Helper

**Files:**
- Create: `src/lib/agents/auth.ts`

Extract the cookie-or-bearer-token auth pattern from `app/api/ai/bot/route.ts` into a reusable helper. This avoids duplicating ~30 lines of auth logic across every agent API route.

- [ ] **Step 1: Create the shared auth helper**

```typescript
// src/lib/agents/auth.ts
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export interface AuthenticatedUser {
  id: string
  email?: string
}

export interface AuthResult {
  user: AuthenticatedUser | null
  error: string | null
  status: number
}

export interface AuthWithStoreResult {
  user: AuthenticatedUser
  storeId: string
  error: null
}

/**
 * Authenticate a request using cookie-based auth (localhost) or
 * Authorization Bearer token (production cross-domain).
 * Same pattern as app/api/ai/bot/route.ts but extracted for reuse.
 */
export async function authenticateRequest(req: Request): Promise<AuthResult> {
  // Method 1: Cookie-based auth (works on localhost)
  let user: AuthenticatedUser | null = null

  const supabase = await createClient()
  const { data: cookieAuth } = await supabase.auth.getUser()
  if (cookieAuth?.user) {
    user = { id: cookieAuth.user.id, email: cookieAuth.user.email }
  }

  // Method 2: Authorization header (fallback for production)
  if (!user) {
    const authHeader = req.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (supabaseUrl && supabaseKey) {
        const tokenClient = createServiceClient(supabaseUrl, supabaseKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        })
        const { data: tokenAuth } = await tokenClient.auth.getUser(token)
        if (tokenAuth?.user) {
          user = { id: tokenAuth.user.id, email: tokenAuth.user.email }
        }
      }
    }
  }

  if (!user) {
    return { user: null, error: 'Unauthorized', status: 401 }
  }

  return { user, error: null, status: 200 }
}

/**
 * Authenticate and verify the user owns the store that owns the agent.
 * Looks up the agent_states row by agentId, gets the store_id, then
 * verifies the user owns that store.
 *
 * Returns the authenticated user and store_id, or an error response.
 */
export async function authenticateAgentRequest(
  req: Request,
  agentId: string
): Promise<{ user: AuthenticatedUser; storeId: string } | Response> {
  const auth = await authenticateRequest(req)
  if (!auth.user) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Look up agent to get store_id
  const admin = getSupabaseAdmin()
  const { data: agent, error: agentError } = await admin
    .from('agent_states')
    .select('store_id')
    .eq('id', agentId)
    .single()

  if (agentError || !agent) {
    return new Response(JSON.stringify({ error: 'Agent not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Verify user owns the store
  const { data: store, error: storeError } = await admin
    .from('stores')
    .select('id')
    .eq('id', agent.store_id)
    .eq('owner_id', auth.user.id)
    .single()

  if (storeError || !store) {
    return new Response(JSON.stringify({ error: 'Store not found or unauthorized' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return { user: auth.user, storeId: agent.store_id }
}

/**
 * Authenticate and verify the user owns a specific store.
 * Used by routes that receive storeId as a query param instead of agentId.
 */
export async function authenticateStoreRequest(
  req: Request,
  storeId: string
): Promise<{ user: AuthenticatedUser; storeId: string } | Response> {
  const auth = await authenticateRequest(req)
  if (!auth.user) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const admin = getSupabaseAdmin()
  const { data: store, error: storeError } = await admin
    .from('stores')
    .select('id')
    .eq('id', storeId)
    .eq('owner_id', auth.user.id)
    .single()

  if (storeError || !store) {
    return new Response(JSON.stringify({ error: 'Store not found or unauthorized' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return { user: auth.user, storeId }
}

/**
 * Helper to build a JSON error response.
 */
export function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Helper to build a JSON success response.
 */
export function jsonSuccess(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
```

- [ ] **Step 2: Verify the helper compiles** — Run `npx tsc --noEmit src/lib/agents/auth.ts` or the full type check to confirm no errors.

---

## Task 2: Agent State Route — `[agentId]/route.ts`

**Files:**
- Create: `src/app/api/agents/[agentId]/route.ts`

GET returns the full agent state row. PATCH allows updating `autonomy_level`, `is_enabled`, and `config`.

- [ ] **Step 1: Create the GET and PATCH route**

```typescript
// src/app/api/agents/[agentId]/route.ts
import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { authenticateAgentRequest, jsonError, jsonSuccess } from '@/lib/agents/auth'
import type { AutonomyLevel, AgentConfig } from '@/lib/agents/types'

export const runtime = 'nodejs'

interface RouteParams {
  params: Promise<{ agentId: string }>
}

/**
 * GET /api/agents/[agentId]
 * Returns the full agent state for a given agent.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { agentId } = await params

  const authResult = await authenticateAgentRequest(req, agentId)
  if (authResult instanceof Response) return authResult
  const { storeId } = authResult

  const admin = getSupabaseAdmin()
  const { data: agent, error } = await admin
    .from('agent_states')
    .select('*')
    .eq('id', agentId)
    .eq('store_id', storeId)
    .single()

  if (error || !agent) {
    return jsonError('Agent not found', 404)
  }

  return jsonSuccess(agent)
}

/**
 * PATCH /api/agents/[agentId]
 * Update agent config: autonomy_level, is_enabled, config.
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { agentId } = await params

  const authResult = await authenticateAgentRequest(req, agentId)
  if (authResult instanceof Response) return authResult
  const { storeId } = authResult

  let body: {
    autonomy_level?: AutonomyLevel
    is_enabled?: boolean
    config?: AgentConfig
  }

  try {
    body = await req.json()
  } catch {
    return jsonError('Invalid JSON body', 400)
  }

  // Validate autonomy_level range
  if (body.autonomy_level !== undefined) {
    if (![1, 2, 3, 4, 5].includes(body.autonomy_level)) {
      return jsonError('autonomy_level must be 1-5', 400)
    }
  }

  // Build update object with only allowed fields
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.autonomy_level !== undefined) update.autonomy_level = body.autonomy_level
  if (body.is_enabled !== undefined) update.is_enabled = body.is_enabled
  if (body.config !== undefined) update.config = body.config

  const admin = getSupabaseAdmin()
  const { data: updated, error } = await admin
    .from('agent_states')
    .update(update)
    .eq('id', agentId)
    .eq('store_id', storeId)
    .select('*')
    .single()

  if (error) {
    console.error('[Agents API] Failed to update agent:', error)
    return jsonError('Failed to update agent', 500)
  }

  return jsonSuccess(updated)
}
```

---

## Task 3: Agent Chat Route — `[agentId]/chat/route.ts`

**Files:**
- Create: `src/app/api/agents/[agentId]/chat/route.ts`

POST endpoint for streaming chat with an individual agent. Uses the base-agent execute with a `chat` trigger. Streams response using Vercel AI SDK.

- [ ] **Step 1: Create the streaming chat route**

```typescript
// src/app/api/agents/[agentId]/chat/route.ts
import { NextRequest } from 'next/server'
import { streamText } from 'ai'
import { getTextModel } from '@/lib/ai/provider'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { authenticateAgentRequest, jsonError } from '@/lib/agents/auth'
import { AGENT_DISPLAY_NAMES, AGENT_DESCRIPTIONS } from '@/lib/agents/constants'
import type { AgentType } from '@/lib/agents/types'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_MESSAGES = 30
const MAX_MESSAGE_LENGTH = 4000

interface RouteParams {
  params: Promise<{ agentId: string }>
}

/**
 * POST /api/agents/[agentId]/chat
 * Streaming chat with a specific agent.
 * Body: { messages: UIMessage[] }
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { agentId } = await params

  const authResult = await authenticateAgentRequest(req, agentId)
  if (authResult instanceof Response) return authResult
  const { storeId } = authResult

  // Fetch agent state to get agent_type and config
  const admin = getSupabaseAdmin()
  const { data: agent, error: agentError } = await admin
    .from('agent_states')
    .select('agent_type, config, autonomy_level, is_enabled')
    .eq('id', agentId)
    .eq('store_id', storeId)
    .single()

  if (agentError || !agent) {
    return jsonError('Agent not found', 404)
  }

  if (!agent.is_enabled) {
    return jsonError('Agent is disabled', 400)
  }

  const agentType = agent.agent_type as AgentType

  let body: { messages: Array<{ role: string; content: string }> }
  try {
    body = await req.json()
  } catch {
    return jsonError('Invalid JSON body', 400)
  }

  if (!body.messages || !Array.isArray(body.messages)) {
    return jsonError('messages array is required', 400)
  }

  // Cap messages
  const trimmedMessages = body.messages.slice(-MAX_MESSAGES)

  // Validate last message
  const lastMessage = trimmedMessages[trimmedMessages.length - 1]
  if (lastMessage && typeof lastMessage.content === 'string' && lastMessage.content.length > MAX_MESSAGE_LENGTH) {
    return jsonError('Message too long. Keep messages under 4000 characters.', 400)
  }

  // Fetch store name for context
  const { data: store } = await admin
    .from('stores')
    .select('name')
    .eq('id', storeId)
    .single()

  // Fetch recent memories for context
  const { data: memories } = await admin
    .from('agent_memory')
    .select('memory_key, memory_value')
    .eq('store_id', storeId)
    .eq('agent_type', agentType)
    .order('updated_at', { ascending: false })
    .limit(10)

  const memoryContext = memories && memories.length > 0
    ? `\n\nRelevant memories:\n${memories.map(m => `- ${m.memory_key}: ${JSON.stringify(m.memory_value)}`).join('\n')}`
    : ''

  const systemPrompt = `You are the ${AGENT_DISPLAY_NAMES[agentType]} for the store "${store?.name || 'Unknown'}".
${AGENT_DESCRIPTIONS[agentType]}.

Your autonomy level is ${agent.autonomy_level}/5. You are having a conversation with the store merchant.
Be concise, helpful, and action-oriented. When the merchant asks you to do something, explain what you would do and whether it requires approval.
${memoryContext}`

  // Stream the response
  const result = streamText({
    model: getTextModel(),
    system: systemPrompt,
    messages: trimmedMessages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  })

  return result.toUIMessageStreamResponse()
}
```

---

## Task 4: Agent Actions Route — `[agentId]/actions/route.ts`

**Files:**
- Create: `src/app/api/agents/[agentId]/actions/route.ts`

GET returns paginated action history for a specific agent, with optional status and category filters.

- [ ] **Step 1: Create the paginated actions route**

```typescript
// src/app/api/agents/[agentId]/actions/route.ts
import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { authenticateAgentRequest, jsonError, jsonSuccess } from '@/lib/agents/auth'

export const runtime = 'nodejs'

interface RouteParams {
  params: Promise<{ agentId: string }>
}

/**
 * GET /api/agents/[agentId]/actions?page=1&limit=20&status=completed&category=communication
 * Returns paginated action history for a specific agent.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { agentId } = await params

  const authResult = await authenticateAgentRequest(req, agentId)
  if (authResult instanceof Response) return authResult
  const { storeId } = authResult

  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)))
  const status = url.searchParams.get('status')
  const category = url.searchParams.get('category')

  // Fetch agent_type from agent_states
  const admin = getSupabaseAdmin()
  const { data: agent } = await admin
    .from('agent_states')
    .select('agent_type')
    .eq('id', agentId)
    .eq('store_id', storeId)
    .single()

  if (!agent) {
    return jsonError('Agent not found', 404)
  }

  const offset = (page - 1) * limit

  let query = admin
    .from('agent_actions')
    .select('*', { count: 'exact' })
    .eq('store_id', storeId)
    .eq('agent_type', agent.agent_type)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) {
    query = query.eq('status', status)
  }
  if (category) {
    query = query.eq('action_category', category)
  }

  const { data: actions, count, error } = await query

  if (error) {
    console.error('[Agents API] Failed to fetch actions:', error)
    return jsonError('Failed to fetch actions', 500)
  }

  return jsonSuccess({
    actions: actions || [],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  })
}
```

---

## Task 5: Agent Pause/Resume Route — `[agentId]/pause/route.ts`

**Files:**
- Create: `src/app/api/agents/[agentId]/pause/route.ts`

POST toggles the agent between `paused` and `idle` status.

- [ ] **Step 1: Create the pause/resume route**

```typescript
// src/app/api/agents/[agentId]/pause/route.ts
import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { authenticateAgentRequest, jsonError, jsonSuccess } from '@/lib/agents/auth'

export const runtime = 'nodejs'

interface RouteParams {
  params: Promise<{ agentId: string }>
}

/**
 * POST /api/agents/[agentId]/pause
 * Body: { paused: boolean }
 * Toggles agent between 'paused' and 'idle' status.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { agentId } = await params

  const authResult = await authenticateAgentRequest(req, agentId)
  if (authResult instanceof Response) return authResult
  const { storeId } = authResult

  let body: { paused: boolean }
  try {
    body = await req.json()
  } catch {
    return jsonError('Invalid JSON body', 400)
  }

  if (typeof body.paused !== 'boolean') {
    return jsonError('paused field (boolean) is required', 400)
  }

  const admin = getSupabaseAdmin()

  // Only allow pausing agents that are idle or running, and resuming agents that are paused
  const { data: agent } = await admin
    .from('agent_states')
    .select('status')
    .eq('id', agentId)
    .eq('store_id', storeId)
    .single()

  if (!agent) {
    return jsonError('Agent not found', 404)
  }

  if (body.paused && agent.status !== 'idle' && agent.status !== 'running' && agent.status !== 'waiting_approval') {
    return jsonError(`Cannot pause agent in '${agent.status}' status`, 400)
  }

  if (!body.paused && agent.status !== 'paused') {
    return jsonError('Agent is not paused', 400)
  }

  const newStatus = body.paused ? 'paused' : 'idle'

  const { data: updated, error } = await admin
    .from('agent_states')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', agentId)
    .eq('store_id', storeId)
    .select('*')
    .single()

  if (error) {
    console.error('[Agents API] Failed to update agent status:', error)
    return jsonError('Failed to update agent status', 500)
  }

  return jsonSuccess(updated)
}
```

---

## Task 6: Cross-Agent Activity Feed Route — `activity/route.ts`

**Files:**
- Create: `src/app/api/agents/activity/route.ts`

GET returns recent actions across all agents for a store, used by the Command Center activity feed.

- [ ] **Step 1: Create the activity feed route**

```typescript
// src/app/api/agents/activity/route.ts
import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { authenticateStoreRequest, jsonError, jsonSuccess } from '@/lib/agents/auth'

export const runtime = 'nodejs'

/**
 * GET /api/agents/activity?storeId=xxx&limit=20&agentType=support&category=communication
 * Returns recent actions across all agents for a store.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const storeId = url.searchParams.get('storeId')

  if (!storeId) {
    return jsonError('storeId query parameter is required', 400)
  }

  const authResult = await authenticateStoreRequest(req, storeId)
  if (authResult instanceof Response) return authResult

  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)))
  const agentType = url.searchParams.get('agentType')
  const category = url.searchParams.get('category')
  const cursor = url.searchParams.get('cursor') // ISO timestamp for cursor-based pagination

  const admin = getSupabaseAdmin()

  let query = admin
    .from('agent_actions')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (agentType) {
    query = query.eq('agent_type', agentType)
  }
  if (category) {
    query = query.eq('action_category', category)
  }
  if (cursor) {
    query = query.lt('created_at', cursor)
  }

  const { data: actions, error } = await query

  if (error) {
    console.error('[Agents API] Failed to fetch activity:', error)
    return jsonError('Failed to fetch activity', 500)
  }

  const nextCursor = actions && actions.length === limit
    ? actions[actions.length - 1].created_at
    : null

  return jsonSuccess({
    actions: actions || [],
    nextCursor,
  })
}
```

---

## Task 7: Approvals Routes — `approvals/route.ts` and `approvals/[id]/route.ts`

**Files:**
- Create: `src/app/api/agents/approvals/route.ts`
- Create: `src/app/api/agents/approvals/[id]/route.ts`

### Step 1: Approvals list + batch route

- [ ] **Step 1: Create the approvals list and batch route**

```typescript
// src/app/api/agents/approvals/route.ts
import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { authenticateStoreRequest, jsonError, jsonSuccess } from '@/lib/agents/auth'

export const runtime = 'nodejs'

/**
 * GET /api/agents/approvals?storeId=xxx&status=pending&agentType=sales
 * Returns approvals for a store, defaulting to pending status.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const storeId = url.searchParams.get('storeId')

  if (!storeId) {
    return jsonError('storeId query parameter is required', 400)
  }

  const authResult = await authenticateStoreRequest(req, storeId)
  if (authResult instanceof Response) return authResult

  const status = url.searchParams.get('status') || 'pending'
  const agentType = url.searchParams.get('agentType')
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)))

  const admin = getSupabaseAdmin()

  let query = admin
    .from('agent_approvals')
    .select('*', { count: 'exact' })
    .eq('store_id', storeId)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (agentType) {
    query = query.eq('agent_type', agentType)
  }

  const { data: approvals, count, error } = await query

  if (error) {
    console.error('[Agents API] Failed to fetch approvals:', error)
    return jsonError('Failed to fetch approvals', 500)
  }

  return jsonSuccess({
    approvals: approvals || [],
    total: count || 0,
  })
}

/**
 * POST /api/agents/approvals
 * Batch approve or reject multiple approvals.
 * Body: { storeId: string, ids: string[], action: 'approve' | 'reject', reason?: string }
 */
export async function POST(req: NextRequest) {
  let body: {
    storeId: string
    ids: string[]
    action: 'approve' | 'reject'
    reason?: string
  }

  try {
    body = await req.json()
  } catch {
    return jsonError('Invalid JSON body', 400)
  }

  if (!body.storeId || !body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
    return jsonError('storeId and ids[] are required', 400)
  }

  if (body.action !== 'approve' && body.action !== 'reject') {
    return jsonError('action must be "approve" or "reject"', 400)
  }

  const authResult = await authenticateStoreRequest(req, body.storeId)
  if (authResult instanceof Response) return authResult
  const { user } = authResult

  const admin = getSupabaseAdmin()
  const now = new Date().toISOString()

  const newStatus = body.action === 'approve' ? 'approved' : 'rejected'
  const update: Record<string, unknown> = {
    status: newStatus,
    resolved_by: user.id,
    resolved_at: now,
    updated_at: now,
  }

  if (body.action === 'reject' && body.reason) {
    update.rejection_reason = body.reason
  }

  const { data: updated, error } = await admin
    .from('agent_approvals')
    .update(update)
    .eq('store_id', body.storeId)
    .eq('status', 'pending')
    .in('id', body.ids)
    .select('id, status')

  if (error) {
    console.error('[Agents API] Failed to batch update approvals:', error)
    return jsonError('Failed to update approvals', 500)
  }

  // Also update the corresponding agent_actions rows
  if (updated && updated.length > 0) {
    const actionStatus = body.action === 'approve' ? 'approved' : 'rejected'
    await admin
      .from('agent_actions')
      .update({ status: actionStatus, completed_at: now })
      .eq('store_id', body.storeId)
      .eq('status', 'pending_approval')
      .in('approval_id', updated.map(a => a.id))
  }

  return jsonSuccess({
    updated: updated?.length || 0,
    ids: updated?.map(a => a.id) || [],
  })
}
```

### Step 2: Single approval route

- [ ] **Step 2: Create the single approval route**

```typescript
// src/app/api/agents/approvals/[id]/route.ts
import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { authenticateRequest, jsonError, jsonSuccess } from '@/lib/agents/auth'

export const runtime = 'nodejs'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * PATCH /api/agents/approvals/[id]
 * Approve or reject a single approval.
 * Body: { action: 'approve' | 'reject', reason?: string, modifications?: Record<string, unknown> }
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id } = await params

  const auth = await authenticateRequest(req)
  if (!auth.user) {
    return jsonError(auth.error || 'Unauthorized', auth.status)
  }

  let body: {
    action: 'approve' | 'reject'
    reason?: string
    modifications?: Record<string, unknown>
  }

  try {
    body = await req.json()
  } catch {
    return jsonError('Invalid JSON body', 400)
  }

  if (body.action !== 'approve' && body.action !== 'reject') {
    return jsonError('action must be "approve" or "reject"', 400)
  }

  const admin = getSupabaseAdmin()

  // Fetch approval and verify ownership
  const { data: approval, error: fetchError } = await admin
    .from('agent_approvals')
    .select('id, store_id, status')
    .eq('id', id)
    .single()

  if (fetchError || !approval) {
    return jsonError('Approval not found', 404)
  }

  // Verify user owns this store
  const { data: store } = await admin
    .from('stores')
    .select('id')
    .eq('id', approval.store_id)
    .eq('owner_id', auth.user.id)
    .single()

  if (!store) {
    return jsonError('Unauthorized', 403)
  }

  if (approval.status !== 'pending') {
    return jsonError(`Approval already ${approval.status}`, 400)
  }

  const now = new Date().toISOString()
  const newStatus = body.action === 'approve' ? 'approved' : 'rejected'

  const update: Record<string, unknown> = {
    status: newStatus,
    resolved_by: auth.user.id,
    resolved_at: now,
    updated_at: now,
  }

  if (body.action === 'reject' && body.reason) {
    update.rejection_reason = body.reason
  }
  if (body.action === 'approve' && body.modifications) {
    update.modifications = body.modifications
  }

  const { data: updated, error: updateError } = await admin
    .from('agent_approvals')
    .update(update)
    .eq('id', id)
    .select('*')
    .single()

  if (updateError) {
    console.error('[Agents API] Failed to update approval:', updateError)
    return jsonError('Failed to update approval', 500)
  }

  // Update the corresponding agent_action
  const actionStatus = body.action === 'approve' ? 'approved' : 'rejected'
  await admin
    .from('agent_actions')
    .update({ status: actionStatus, completed_at: now })
    .eq('approval_id', id)
    .eq('status', 'pending_approval')

  // If approved, update the agent status back to idle (from waiting_approval)
  if (body.action === 'approve') {
    await admin
      .from('agent_states')
      .update({ status: 'idle', updated_at: now })
      .eq('store_id', approval.store_id)
      .eq('status', 'waiting_approval')
  }

  return jsonSuccess(updated)
}
```

---

## Task 8: Cron Execute Route — `execute/route.ts`

**Files:**
- Create: `src/app/api/agents/execute/route.ts`

POST endpoint callable by Vercel Cron. Validates `CRON_SECRET`, then fans out the specified task to all stores with the relevant agent enabled.

- [ ] **Step 1: Create the execute route**

```typescript
// src/app/api/agents/execute/route.ts
import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { jsonError, jsonSuccess } from '@/lib/agents/auth'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 min for fan-out

/**
 * Task definitions: which agent type handles each task.
 */
const TASK_AGENT_MAP: Record<string, string> = {
  expire_approvals: '_system',           // No specific agent, system-level task
  abandoned_cart_scan: 'sales',
}

/**
 * GET/POST /api/agents/execute?task=expire_approvals
 * Cron-callable endpoint. Validates CRON_SECRET, then executes the specified task
 * across all relevant stores.
 */
export async function GET(req: NextRequest) {
  return handleExecute(req)
}

export async function POST(req: NextRequest) {
  return handleExecute(req)
}

async function handleExecute(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return jsonError('Unauthorized', 401)
  }

  const url = new URL(req.url)
  const task = url.searchParams.get('task')

  if (!task) {
    return jsonError('task query parameter is required', 400)
  }

  if (!TASK_AGENT_MAP[task]) {
    return jsonError(`Unknown task: ${task}`, 400)
  }

  const admin = getSupabaseAdmin()

  console.log(`[Agent Cron] Starting task: ${task}`)

  try {
    switch (task) {
      case 'expire_approvals':
        return await expireApprovals(admin)

      case 'abandoned_cart_scan':
        return await abandonedCartScan(admin)

      default:
        return jsonError(`Task handler not implemented: ${task}`, 501)
    }
  } catch (error) {
    console.error(`[Agent Cron] Task ${task} failed:`, error)
    return jsonError(`Task ${task} failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 500)
  }
}

/**
 * Expire approvals that have passed their expires_at timestamp.
 * Runs across all stores — no agent-specific filtering needed.
 */
async function expireApprovals(admin: ReturnType<typeof getSupabaseAdmin>) {
  const now = new Date().toISOString()

  const { data: expired, error } = await admin
    .from('agent_approvals')
    .update({
      status: 'expired',
      updated_at: now,
    })
    .eq('status', 'pending')
    .lt('expires_at', now)
    .select('id, store_id, agent_type')

  if (error) {
    console.error('[Agent Cron] Failed to expire approvals:', error)
    return jsonError('Failed to expire approvals', 500)
  }

  const expiredCount = expired?.length || 0

  // Update corresponding agent_actions
  if (expired && expired.length > 0) {
    await admin
      .from('agent_actions')
      .update({ status: 'expired', completed_at: now })
      .in('approval_id', expired.map(a => a.id))
      .eq('status', 'pending_approval')

    // Reset waiting_approval agents back to idle if they have no more pending approvals
    const storeAgentPairs = [...new Set(expired.map(a => `${a.store_id}|${a.agent_type}`))]
    for (const pair of storeAgentPairs) {
      const [storeId, agentType] = pair.split('|')

      // Check if there are still pending approvals for this agent
      const { count } = await admin
        .from('agent_approvals')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId)
        .eq('agent_type', agentType)
        .eq('status', 'pending')

      if (count === 0) {
        await admin
          .from('agent_states')
          .update({ status: 'idle', updated_at: now })
          .eq('store_id', storeId)
          .eq('agent_type', agentType)
          .eq('status', 'waiting_approval')
      }
    }
  }

  console.log(`[Agent Cron] Expired ${expiredCount} approvals`)
  return jsonSuccess({ task: 'expire_approvals', expired: expiredCount })
}

/**
 * Scan for abandoned carts across all stores with the sales agent enabled.
 * Fans out to each store and triggers the sales agent's cart recovery logic.
 */
async function abandonedCartScan(admin: ReturnType<typeof getSupabaseAdmin>) {
  // Find all stores with the sales agent enabled
  const { data: salesAgents, error: agentError } = await admin
    .from('agent_states')
    .select('store_id, id')
    .eq('agent_type', 'sales')
    .eq('is_enabled', true)
    .neq('status', 'paused')

  if (agentError) {
    console.error('[Agent Cron] Failed to fetch sales agents:', agentError)
    return jsonError('Failed to fetch sales agents', 500)
  }

  if (!salesAgents || salesAgents.length === 0) {
    console.log('[Agent Cron] No enabled sales agents found')
    return jsonSuccess({ task: 'abandoned_cart_scan', storesScanned: 0, cartsFound: 0 })
  }

  let totalCartsFound = 0
  const errors: string[] = []

  for (const agent of salesAgents) {
    try {
      // Find abandoned carts for this store (carts older than 1 hour, no recovery email sent recently)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      const { data: carts, error: cartError } = await admin
        .from('abandoned_carts')
        .select('id')
        .eq('store_id', agent.store_id)
        .eq('recovered', false)
        .lt('updated_at', oneHourAgo)
        .gt('created_at', oneDayAgo)
        .is('last_email_sent_at', null)

      if (cartError) {
        errors.push(`Store ${agent.store_id}: ${cartError.message}`)
        continue
      }

      if (carts && carts.length > 0) {
        totalCartsFound += carts.length

        // Log the action
        await admin.from('agent_actions').insert({
          store_id: agent.store_id,
          agent_type: 'sales',
          action_type: 'abandoned_cart_scan',
          action_category: 'campaign',
          summary: `Found ${carts.length} abandoned cart(s) eligible for recovery`,
          details: { cart_count: carts.length, cart_ids: carts.map(c => c.id) },
          status: 'completed',
          execution_mode: 'auto',
          tokens_input: 0,
          tokens_output: 0,
          estimated_cost_usd: 0,
          api_costs: {},
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          duration_ms: 0,
        })
      }
    } catch (storeError) {
      errors.push(`Store ${agent.store_id}: ${storeError instanceof Error ? storeError.message : 'Unknown error'}`)
    }
  }

  console.log(`[Agent Cron] Scanned ${salesAgents.length} stores, found ${totalCartsFound} carts`)

  return jsonSuccess({
    task: 'abandoned_cart_scan',
    storesScanned: salesAgents.length,
    cartsFound: totalCartsFound,
    errors: errors.length > 0 ? errors : undefined,
  })
}
```

---

## Task 9: Real-time Hook — `use-agents.ts`

**Files:**
- Create: `src/lib/hooks/use-agents.ts`

Provides `useAgentStates(storeId)` and `useAgentState(storeId, agentType)` hooks with Supabase Realtime subscriptions on the `agent_states` table.

- [ ] **Step 1: Create the agents hook**

```typescript
// src/lib/hooks/use-agents.ts
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AgentState, AgentType } from '@/lib/agents/types'

/**
 * Hook to fetch and subscribe to all agent states for a store.
 * Uses Supabase Realtime postgres_changes for live updates.
 */
export function useAgentStates(storeId: string | null) {
  const [agents, setAgents] = useState<AgentState[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabaseRef = useRef(createClient())

  const fetchAgents = useCallback(async () => {
    if (!storeId) {
      setAgents([])
      setIsLoading(false)
      return
    }

    try {
      const { data, error: fetchError } = await supabaseRef.current
        .from('agent_states')
        .select('*')
        .eq('store_id', storeId)
        .order('agent_type')

      if (fetchError) {
        console.error('[useAgentStates] Fetch error:', fetchError)
        setError(fetchError.message)
      } else {
        setAgents((data as AgentState[]) || [])
        setError(null)
      }
    } catch (err) {
      console.error('[useAgentStates] Error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [storeId])

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  // Subscribe to real-time changes
  useEffect(() => {
    if (!storeId) return

    const channel = supabaseRef.current
      .channel(`agent_states:${storeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_states',
          filter: `store_id=eq.${storeId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setAgents(prev => [...prev, payload.new as AgentState])
          } else if (payload.eventType === 'UPDATE') {
            setAgents(prev =>
              prev.map(a => (a.id === (payload.new as AgentState).id ? (payload.new as AgentState) : a))
            )
          } else if (payload.eventType === 'DELETE') {
            setAgents(prev => prev.filter(a => a.id !== (payload.old as { id: string }).id))
          }
        }
      )
      .subscribe()

    return () => {
      supabaseRef.current.removeChannel(channel)
    }
  }, [storeId])

  return { agents, isLoading, error, refetch: fetchAgents }
}

/**
 * Hook to fetch and subscribe to a single agent's state.
 */
export function useAgentState(storeId: string | null, agentType: AgentType) {
  const { agents, isLoading, error, refetch } = useAgentStates(storeId)
  const agent = agents.find(a => a.agent_type === agentType) || null

  return { agent, isLoading, error, refetch }
}

/**
 * Helper: count of enabled agents.
 */
export function getEnabledCount(agents: AgentState[]): number {
  return agents.filter(a => a.is_enabled).length
}

/**
 * Helper: total actions across all agents.
 */
export function getTotalActionsCount(agents: AgentState[]): number {
  return agents.reduce((sum, a) => sum + a.total_actions, 0)
}
```

---

## Task 10: Real-time Hook — `use-activity.ts`

**Files:**
- Create: `src/lib/hooks/use-activity.ts`

Provides `useActivityFeed(storeId, filters)` with real-time INSERT subscription for new actions.

- [ ] **Step 1: Create the activity feed hook**

```typescript
// src/lib/hooks/use-activity.ts
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AgentAction, AgentType, ActionCategory } from '@/lib/agents/types'

export interface ActivityFilters {
  agentType?: AgentType
  category?: ActionCategory
  limit?: number
}

/**
 * Hook to fetch and subscribe to the cross-agent activity feed.
 * New actions appear in real-time via Supabase Realtime INSERT subscription.
 */
export function useActivityFeed(storeId: string | null, filters: ActivityFilters = {}) {
  const { agentType, category, limit = 20 } = filters
  const [actions, setActions] = useState<AgentAction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabaseRef = useRef(createClient())

  const fetchActions = useCallback(async () => {
    if (!storeId) {
      setActions([])
      setIsLoading(false)
      return
    }

    try {
      let query = supabaseRef.current
        .from('agent_actions')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (agentType) {
        query = query.eq('agent_type', agentType)
      }
      if (category) {
        query = query.eq('action_category', category)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        console.error('[useActivityFeed] Fetch error:', fetchError)
        setError(fetchError.message)
      } else {
        setActions((data as AgentAction[]) || [])
        setError(null)
      }
    } catch (err) {
      console.error('[useActivityFeed] Error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [storeId, agentType, category, limit])

  useEffect(() => {
    fetchActions()
  }, [fetchActions])

  // Subscribe to new actions in real-time
  useEffect(() => {
    if (!storeId) return

    const channel = supabaseRef.current
      .channel(`agent_actions:${storeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_actions',
          filter: `store_id=eq.${storeId}`,
        },
        (payload) => {
          const newAction = payload.new as AgentAction

          // Apply client-side filters
          if (agentType && newAction.agent_type !== agentType) return
          if (category && newAction.action_category !== category) return

          // Prepend new action, keep list capped at limit
          setActions(prev => [newAction, ...prev].slice(0, limit))
        }
      )
      .subscribe()

    return () => {
      supabaseRef.current.removeChannel(channel)
    }
  }, [storeId, agentType, category, limit])

  return { actions, isLoading, error, refetch: fetchActions }
}
```

---

## Task 11: Real-time Hook — `use-approvals.ts`

**Files:**
- Create: `src/lib/hooks/use-approvals.ts`

Provides `useApprovals(storeId)` with real-time subscription, plus `approveAction()` and `rejectAction()` mutation helpers.

- [ ] **Step 1: Create the approvals hook**

```typescript
// src/lib/hooks/use-approvals.ts
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient as createBrowserClient } from '@/lib/supabase/client'
import type { AgentApproval } from '@/lib/agents/types'

/**
 * Hook to fetch and subscribe to pending approvals for a store.
 * Includes mutation helpers for approve/reject actions.
 */
export function useApprovals(storeId: string | null) {
  const [approvals, setApprovals] = useState<AgentApproval[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabaseRef = useRef(createBrowserClient())

  const fetchApprovals = useCallback(async () => {
    if (!storeId) {
      setApprovals([])
      setIsLoading(false)
      return
    }

    try {
      const { data, error: fetchError } = await supabaseRef.current
        .from('agent_approvals')
        .select('*')
        .eq('store_id', storeId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (fetchError) {
        console.error('[useApprovals] Fetch error:', fetchError)
        setError(fetchError.message)
      } else {
        setApprovals((data as AgentApproval[]) || [])
        setError(null)
      }
    } catch (err) {
      console.error('[useApprovals] Error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [storeId])

  useEffect(() => {
    fetchApprovals()
  }, [fetchApprovals])

  // Subscribe to real-time changes on approvals
  useEffect(() => {
    if (!storeId) return

    const channel = supabaseRef.current
      .channel(`agent_approvals:${storeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_approvals',
          filter: `store_id=eq.${storeId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newApproval = payload.new as AgentApproval
            if (newApproval.status === 'pending') {
              setApprovals(prev => [newApproval, ...prev])
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as AgentApproval
            if (updated.status !== 'pending') {
              // Remove from pending list
              setApprovals(prev => prev.filter(a => a.id !== updated.id))
            } else {
              // Update in place
              setApprovals(prev =>
                prev.map(a => (a.id === updated.id ? updated : a))
              )
            }
          } else if (payload.eventType === 'DELETE') {
            setApprovals(prev => prev.filter(a => a.id !== (payload.old as { id: string }).id))
          }
        }
      )
      .subscribe()

    return () => {
      supabaseRef.current.removeChannel(channel)
    }
  }, [storeId])

  /**
   * Approve a single approval via API.
   */
  const approveAction = useCallback(
    async (approvalId: string, modifications?: Record<string, unknown>) => {
      const response = await fetch(`/api/agents/approvals/${approvalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', modifications }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to approve')
      }

      // Optimistic removal — real-time will confirm
      setApprovals(prev => prev.filter(a => a.id !== approvalId))

      return response.json()
    },
    []
  )

  /**
   * Reject a single approval via API.
   */
  const rejectAction = useCallback(
    async (approvalId: string, reason?: string) => {
      const response = await fetch(`/api/agents/approvals/${approvalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to reject')
      }

      // Optimistic removal — real-time will confirm
      setApprovals(prev => prev.filter(a => a.id !== approvalId))

      return response.json()
    },
    []
  )

  /**
   * Batch approve/reject multiple approvals.
   */
  const batchAction = useCallback(
    async (ids: string[], action: 'approve' | 'reject', reason?: string) => {
      if (!storeId) throw new Error('No store ID')

      const response = await fetch('/api/agents/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, ids, action, reason }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || `Failed to ${action}`)
      }

      // Optimistic removal
      setApprovals(prev => prev.filter(a => !ids.includes(a.id)))

      return response.json()
    },
    [storeId]
  )

  const pendingCount = approvals.length

  return {
    approvals,
    pendingCount,
    isLoading,
    error,
    refetch: fetchApprovals,
    approveAction,
    rejectAction,
    batchAction,
  }
}
```

---

## Task 12: UI Integration — Platform Layout

**Files:**
- Modify: `src/app/(platform)/layout.tsx`

Replace mock data imports with real hooks. The layout needs the user's store ID from the auth context (fetched via `/api/dashboard/stats` like the AI bot does, or a simpler approach: fetch from the auth API).

- [ ] **Step 1: Add a `usePlatformStore` helper to get the store ID**

Add a small hook at the top of `layout.tsx` (or inline) that fetches the merchant's store ID, since the platform layout needs it for all hooks.

- [ ] **Step 2: Replace mock data in layout.tsx**

```typescript
// src/app/(platform)/layout.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRequireAuth } from '@/lib/hooks/use-require-auth'
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard'
import { useAgentStates } from '@/lib/hooks/use-agents'
import { useApprovals } from '@/lib/hooks/use-approvals'
import { FullPageLoader } from '@/components/ui/loading-spinner'
import { PlatformSidebar } from '@/components/platform/layout/sidebar'
import { TopBar } from '@/components/platform/layout/top-bar'
import { MobileNav } from '@/components/platform/layout/mobile-nav'

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { isLoading: authLoading } = useRequireAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [storeId, setStoreId] = useState<string | null>(null)

  // Fetch the merchant's store ID
  useEffect(() => {
    async function fetchStoreId() {
      try {
        const response = await fetch('/api/dashboard/stats')
        if (response.ok) {
          const data = await response.json()
          if (data.storeId) setStoreId(data.storeId)
        }
      } catch {
        console.error('[Platform] Failed to fetch store ID')
      }
    }
    fetchStoreId()
  }, [])

  // Real-time agent states and approvals
  const { agents } = useAgentStates(storeId)
  const { pendingCount } = useApprovals(storeId)

  const agentNavInfo = agents.map((s) => ({
    type: s.agent_type,
    status: s.status,
    enabled: s.is_enabled,
  }))

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

  if (authLoading) return <FullPageLoader />

  return (
    <div className="platform-theme flex min-h-screen bg-[var(--platform-bg)]">
      <PlatformSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        agents={agentNavInfo}
        pendingApprovals={pendingCount}
      />

      <div className="flex flex-1 flex-col">
        <TopBar
          onMenuClick={() => setSidebarOpen(true)}
          onSearchClick={() => setCommandPaletteOpen(true)}
          pendingApprovals={pendingCount}
        />

        <main className="flex-1 overflow-y-auto p-4 pb-20 lg:p-6 lg:pb-6">
          {children}
        </main>
      </div>

      <MobileNav pendingApprovals={pendingCount} />

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

---

## Task 13: UI Integration — Command Center Page

**Files:**
- Modify: `src/app/(platform)/platform/page.tsx`

Replace all `MOCK_*` imports with real hooks. The page needs a storeId — pass it via context or fetch inline (same pattern as layout).

- [ ] **Step 1: Replace mock data in the Command Center page**

```typescript
// src/app/(platform)/platform/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { AgentCard } from '@/components/platform/command-center/agent-card'
import { ActivityFeed } from '@/components/platform/command-center/activity-feed'
import { ApprovalSummary } from '@/components/platform/command-center/approval-summary'
import { QuickStats } from '@/components/platform/command-center/quick-stats'
import { useAgentStates, getEnabledCount, getTotalActionsCount } from '@/lib/hooks/use-agents'
import { useActivityFeed } from '@/lib/hooks/use-activity'
import { useApprovals } from '@/lib/hooks/use-approvals'
import { AGENT_TYPES } from '@/lib/agents/constants'

export default function CommandCenterPage() {
  const [storeId, setStoreId] = useState<string | null>(null)

  // Fetch the merchant's store ID
  useEffect(() => {
    async function fetchStoreId() {
      try {
        const response = await fetch('/api/dashboard/stats')
        if (response.ok) {
          const data = await response.json()
          if (data.storeId) setStoreId(data.storeId)
        }
      } catch {
        console.error('[CommandCenter] Failed to fetch store ID')
      }
    }
    fetchStoreId()
  }, [])

  // Real-time hooks
  const { agents, isLoading: agentsLoading } = useAgentStates(storeId)
  const { actions, isLoading: activityLoading } = useActivityFeed(storeId, { limit: 6 })
  const { approvals, pendingCount, isLoading: approvalsLoading } = useApprovals(storeId)

  const isLoading = agentsLoading || activityLoading || approvalsLoading

  if (isLoading && agents.length === 0) {
    return (
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <h1 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
            Command Center
          </h1>
          <p className="mt-1 text-sm text-[var(--platform-text-secondary)]">
            Loading your AI team...
          </p>
        </div>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--platform-accent)] border-t-transparent" />
        </div>
      </div>
    )
  }

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
        totalActions={getTotalActionsCount(agents)}
        pendingApprovals={pendingCount}
        activeAgents={getEnabledCount(agents)}
        totalAgents={AGENT_TYPES.length}
        monthlyCost={0} // TODO: Phase 2D — pull from agent_cost_tracking
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
          <ActivityFeed actions={actions} maxItems={6} />
        </div>

        {/* Approval Queue — 1 column */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
              Pending Approvals
            </h2>
            {pendingCount > 0 && (
              <Link
                href="/platform/approvals"
                className="flex items-center gap-1 text-[10px] text-[var(--platform-accent)] hover:underline"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
          <ApprovalSummary approvals={approvals} maxItems={3} />
        </div>
      </div>

      {/* Agent Cards */}
      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
          Your Agents
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </div>
    </div>
  )
}
```

---

## Task 14: Cron Job Configuration

**Files:**
- Modify: `vercel.json`

Add two new cron entries for agent tasks.

- [ ] **Step 1: Update vercel.json with agent cron entries**

Add the following entries to the `crons` array in `vercel.json`:

```json
{
  "path": "/api/agents/execute?task=expire_approvals",
  "schedule": "*/15 * * * *"
},
{
  "path": "/api/agents/execute?task=abandoned_cart_scan",
  "schedule": "0 */2 * * *"
}
```

The full `crons` array should look like:

```json
"crons": [
  {
    "path": "/api/cron/check-low-stock",
    "schedule": "0 9 * * *"
  },
  {
    "path": "/api/cron/process-abandoned-carts",
    "schedule": "0 10 * * *"
  },
  {
    "path": "/api/agents/execute?task=expire_approvals",
    "schedule": "*/15 * * * *"
  },
  {
    "path": "/api/agents/execute?task=abandoned_cart_scan",
    "schedule": "0 */2 * * *"
  }
]
```

> **Note:** `*/15 * * * *` (every 15 min) and `0 */2 * * *` (every 2 hours) require the Vercel Pro plan. Hobby plan only supports once per day minimum.

---

## Task 15: Type Check and Smoke Test

- [ ] **Step 1: Run TypeScript type check** — `npx tsc --noEmit` from project root. Fix any import errors or type mismatches.

- [ ] **Step 2: Verify Supabase Realtime is enabled** — Ensure `agent_states`, `agent_actions`, and `agent_approvals` tables have Realtime enabled in Supabase dashboard (Database > Replication > enable for these tables).

- [ ] **Step 3: Manual smoke test** — Start dev server (`npm run dev`), navigate to `/platform`. Verify:
  - No console errors on load
  - Quick stats show zeros (no agents provisioned yet)
  - Agent cards section is empty or shows "no agents" state
  - Activity feed shows empty state

- [ ] **Step 4: Test API routes with curl** — Verify auth works:
  ```bash
  # Should return 401
  curl -s http://localhost:3000/api/agents/activity?storeId=test | jq .

  # Should return 401
  curl -s http://localhost:3000/api/agents/execute?task=expire_approvals | jq .

  # Cron endpoint should work with CRON_SECRET
  curl -s -H "Authorization: Bearer $CRON_SECRET" \
    http://localhost:3000/api/agents/execute?task=expire_approvals | jq .
  ```

---

## Summary

| # | Task | Files | Est. Time |
|---|------|-------|-----------|
| 1 | Shared Auth Helper | `lib/agents/auth.ts` (create) | 5 min |
| 2 | Agent State Route | `app/api/agents/[agentId]/route.ts` (create) | 5 min |
| 3 | Agent Chat Route | `app/api/agents/[agentId]/chat/route.ts` (create) | 5 min |
| 4 | Agent Actions Route | `app/api/agents/[agentId]/actions/route.ts` (create) | 4 min |
| 5 | Agent Pause/Resume Route | `app/api/agents/[agentId]/pause/route.ts` (create) | 4 min |
| 6 | Activity Feed Route | `app/api/agents/activity/route.ts` (create) | 4 min |
| 7 | Approvals Routes | `app/api/agents/approvals/route.ts`, `app/api/agents/approvals/[id]/route.ts` (create) | 8 min |
| 8 | Cron Execute Route | `app/api/agents/execute/route.ts` (create) | 8 min |
| 9 | Real-time Hook: Agents | `lib/hooks/use-agents.ts` (create) | 5 min |
| 10 | Real-time Hook: Activity | `lib/hooks/use-activity.ts` (create) | 4 min |
| 11 | Real-time Hook: Approvals | `lib/hooks/use-approvals.ts` (create) | 5 min |
| 12 | UI Integration: Layout | `app/(platform)/layout.tsx` (modify) | 4 min |
| 13 | UI Integration: Command Center | `app/(platform)/platform/page.tsx` (modify) | 5 min |
| 14 | Cron Configuration | `vercel.json` (modify) | 2 min |
| 15 | Type Check & Smoke Test | — | 5 min |
| | **Total** | **12 new files, 3 modified files** | **~73 min** |
