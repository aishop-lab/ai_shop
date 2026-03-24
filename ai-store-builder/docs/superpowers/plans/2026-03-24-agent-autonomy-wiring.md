# Agent Autonomy Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the existing agent orchestrator, tools, and event system so all 5 agents operate autonomously — reacting to business events, running scheduled tasks, communicating across agents, and accepting incoming webhooks with proper authentication.

**Architecture:** Add `dispatchTrigger()` calls to 10 API routes using `waitUntil()` for non-blocking execution. Complete the cron dispatcher (Phase 2C) to execute scheduled agent tasks. Add `crossAgentNotify()` calls inside agent tool result handlers. Fix webhook signature verification for MSG91/Resend.

**Tech Stack:** Next.js API routes, Supabase (PostgreSQL), Vercel AI SDK, existing agent framework (`src/lib/agents/`)

**Spec:** `docs/superpowers/specs/2026-03-24-agent-autonomy-wiring-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/lib/agents/trigger-emitter.ts` | **Create** | Thin wrapper around `dispatchTrigger()` with error handling + waitUntil pattern |
| `src/app/api/agents/cron/route.ts` | **Modify** | Complete Phase 2C — dispatch scheduled tasks to agents |
| `src/app/api/agents/support/webhook/route.ts` | **Modify** | Real MSG91 + Resend signature verification |
| `src/app/api/orders/create/route.ts` | **Modify** | Emit `order.created` trigger |
| `src/app/api/products/upload/route.ts` | **Modify** | Emit `product.created` trigger |
| `src/app/api/customer/register/route.ts` | **Modify** | Emit `customer.signup` trigger |
| `src/app/api/products/[id]/reviews/route.ts` | **Modify** | Emit `review.created` / `review.negative` triggers |
| `src/app/api/dashboard/orders/[orderId]/route.ts` | **Modify** | Emit `order.cancelled` trigger on status change |
| `src/app/api/dashboard/orders/[orderId]/refund/route.ts` | **Modify** | Emit `order.refund_requested` trigger |
| `src/app/api/cron/process-abandoned-carts/route.ts` | **Modify** | Emit `customer.cart_abandoned` triggers |
| `src/app/api/cron/check-low-stock/route.ts` | **Modify** | Emit `product.low_stock` / `product.out_of_stock` triggers |
| `src/lib/agents/schedule-executor.ts` | **Create** | Execute scheduled agent tasks (instantiate agent, call execute, update schedule) |
| `src/lib/agents/agent-notification.ts` | **Create** | Send merchant notifications for autonomous agent actions |

---

## Task 1: Create Trigger Emitter Utility

**Files:**
- Create: `src/lib/agents/trigger-emitter.ts`

This utility wraps `dispatchTrigger()` with error handling so it never breaks the main API flow.

- [ ] **Step 1: Create the trigger emitter**

```typescript
// src/lib/agents/trigger-emitter.ts
import { dispatchTrigger, type AgentTrigger } from './orchestrator'

/**
 * Safely emit an agent trigger. Never throws — logs errors and continues.
 * Designed to be called with waitUntil() so it doesn't block the response.
 */
export async function emitTrigger(params: {
  store_id: string
  trigger_type: string
  entity_type?: string
  entity_id?: string
  payload?: Record<string, unknown>
}): Promise<void> {
  try {
    const trigger: AgentTrigger = {
      store_id: params.store_id,
      trigger_type: params.trigger_type,
      entity_type: params.entity_type,
      entity_id: params.entity_id,
      payload: params.payload || {},
    }

    const results = await dispatchTrigger(trigger)

    // Log dispatch results for observability
    const accepted = results.filter(r => r.status === 'accepted').length
    const blocked = results.filter(r => r.status === 'blocked').length

    if (accepted > 0 || blocked > 0) {
      console.log(
        `[trigger] ${params.trigger_type}: ${accepted} agents dispatched, ${blocked} blocked`
      )
    }
  } catch (error) {
    // Never throw — this runs in background, must not crash the main flow
    console.error(`[trigger] Failed to emit ${params.trigger_type}:`, error)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/agents/trigger-emitter.ts
git commit -m "feat: add trigger emitter utility for safe agent event dispatch"
```

---

## Task 2: Wire Event Triggers Into API Routes (10 routes)

**Files:**
- Modify: `src/app/api/orders/create/route.ts`
- Modify: `src/app/api/products/upload/route.ts`
- Modify: `src/app/api/customer/register/route.ts`
- Modify: `src/app/api/products/[id]/reviews/route.ts`
- Modify: `src/app/api/dashboard/orders/[orderId]/route.ts`
- Modify: `src/app/api/dashboard/orders/[orderId]/refund/route.ts`
- Modify: `src/app/api/cron/process-abandoned-carts/route.ts`
- Modify: `src/app/api/cron/check-low-stock/route.ts`

For each route, the pattern is:
1. Import `emitTrigger` from `@/lib/agents/trigger-emitter`
2. After the successful operation, call `emitTrigger()` wrapped in a `try/catch` (or use Next.js `after()` if available, otherwise just fire-and-forget with `.catch(() => {})`)

- [ ] **Step 1: Wire order.created trigger**

In `src/app/api/orders/create/route.ts`, add before the success return (~line 467):

```typescript
import { emitTrigger } from '@/lib/agents/trigger-emitter'

// After order is created successfully, before the return:
emitTrigger({
  store_id: store_id,
  trigger_type: 'order.created',
  entity_type: 'order',
  entity_id: orderId,
  payload: {
    order_number: orderNumber,
    total_amount: totals.total,
    currency,
    customer_name: customer_details.name,
    customer_email: customer_details.email,
    payment_method,
    item_count: items.length,
  }
}).catch(() => {})
```

- [ ] **Step 2: Wire product.created trigger**

In `src/app/api/products/upload/route.ts`, add before the success return (~line 298):

```typescript
import { emitTrigger } from '@/lib/agents/trigger-emitter'

emitTrigger({
  store_id: storeId,
  trigger_type: 'product.created',
  entity_type: 'product',
  entity_id: finalProduct.id,
  payload: {
    title: finalProduct.title,
    price: finalProduct.price,
    category: finalProduct.category,
    has_images: uploadedImages.length > 0,
  }
}).catch(() => {})
```

- [ ] **Step 3: Wire customer.signup trigger**

In `src/app/api/customer/register/route.ts`, add before the response creation (~line 47):

```typescript
import { emitTrigger } from '@/lib/agents/trigger-emitter'

emitTrigger({
  store_id: validation.data.storeId,
  trigger_type: 'customer.signup',
  entity_type: 'customer',
  entity_id: result.customer.id,
  payload: {
    email: result.customer.email,
    name: result.customer.full_name,
  }
}).catch(() => {})
```

- [ ] **Step 4: Wire review.created and review.negative triggers**

In `src/app/api/products/[id]/reviews/route.ts`, add before the success return (~line 232):

```typescript
import { emitTrigger } from '@/lib/agents/trigger-emitter'

// Get store_id from the product
const storeId = product.store_id // should be available from the product query earlier in the handler

emitTrigger({
  store_id: storeId,
  trigger_type: 'review.created',
  entity_type: 'review',
  entity_id: newReview.id,
  payload: {
    product_id: productId,
    rating: newReview.rating,
    customer_name: newReview.customer_name,
    title: newReview.title,
  }
}).catch(() => {})

// Negative review (rating <= 2) gets an additional trigger
if (newReview.rating <= 2) {
  emitTrigger({
    store_id: storeId,
    trigger_type: 'review.negative',
    entity_type: 'review',
    entity_id: newReview.id,
    payload: {
      product_id: productId,
      rating: newReview.rating,
      customer_name: newReview.customer_name,
      review_text: newReview.review_text,
    }
  }).catch(() => {})
}
```

- [ ] **Step 5: Wire order.cancelled trigger**

In `src/app/api/dashboard/orders/[orderId]/route.ts`, add after the successful status update (~line 216), only when status changes to cancelled:

```typescript
import { emitTrigger } from '@/lib/agents/trigger-emitter'

// After successful order update:
if (updates.fulfillment_status === 'cancelled' || updates.status === 'cancelled') {
  emitTrigger({
    store_id: order.store_id,
    trigger_type: 'order.cancelled',
    entity_type: 'order',
    entity_id: orderId,
    payload: {
      order_number: order.order_number,
      total: order.total,
      customer_email: order.email,
    }
  }).catch(() => {})
}
```

- [ ] **Step 6: Wire order.refund_requested trigger**

In `src/app/api/dashboard/orders/[orderId]/refund/route.ts`, add before the success return (~line 192):

```typescript
import { emitTrigger } from '@/lib/agents/trigger-emitter'

emitTrigger({
  store_id: order.stores.id,
  trigger_type: 'order.refund_requested',
  entity_type: 'order',
  entity_id: orderId,
  payload: {
    amount,
    reason,
    is_full_refund: isFullRefund,
    customer_email: order.email,
    refund_id: razorpayRefund.id,
  }
}).catch(() => {})
```

- [ ] **Step 7: Wire customer.cart_abandoned trigger**

In `src/app/api/cron/process-abandoned-carts/route.ts`, the `processAbandonedCarts()` function already handles the logic. Add trigger emission after processing. Read the file to find the right insertion point — after carts are identified but before/after recovery emails are sent:

```typescript
import { emitTrigger } from '@/lib/agents/trigger-emitter'

// After abandoned carts are found, emit trigger for each unique store
// This allows the Sales agent to take autonomous recovery actions
const storeIds = [...new Set(abandonedCarts.map(c => c.store_id))]
for (const storeId of storeIds) {
  const storeCarts = abandonedCarts.filter(c => c.store_id === storeId)
  emitTrigger({
    store_id: storeId,
    trigger_type: 'customer.cart_abandoned',
    entity_type: 'cart',
    payload: {
      cart_count: storeCarts.length,
      total_value: storeCarts.reduce((sum, c) => sum + (c.total || 0), 0),
    }
  }).catch(() => {})
}
```

Note: Read the file carefully to find the exact point where abandoned carts are identified. The trigger should fire after identification, not after recovery emails.

- [ ] **Step 8: Wire product.low_stock and product.out_of_stock triggers**

In `src/app/api/cron/check-low-stock/route.ts`, add after the low stock products are identified (around line 127, after the notification is created):

```typescript
import { emitTrigger } from '@/lib/agents/trigger-emitter'

// After low stock products identified for a store:
const outOfStockProducts = formattedProducts.filter(p => p.current_stock === 0)
const lowStockProducts = formattedProducts.filter(p => p.current_stock > 0)

if (outOfStockProducts.length > 0) {
  emitTrigger({
    store_id: store.id,
    trigger_type: 'product.out_of_stock',
    entity_type: 'product',
    payload: {
      products: outOfStockProducts.map(p => ({ id: p.id, title: p.title })),
      count: outOfStockProducts.length,
    }
  }).catch(() => {})
}

if (lowStockProducts.length > 0) {
  emitTrigger({
    store_id: store.id,
    trigger_type: 'product.low_stock',
    entity_type: 'product',
    payload: {
      products: lowStockProducts.map(p => ({ id: p.id, title: p.title, stock: p.current_stock })),
      count: lowStockProducts.length,
    }
  }).catch(() => {})
}
```

- [ ] **Step 9: Commit all trigger wiring**

```bash
git add src/app/api/orders/create/route.ts \
  src/app/api/products/upload/route.ts \
  src/app/api/customer/register/route.ts \
  "src/app/api/products/[id]/reviews/route.ts" \
  "src/app/api/dashboard/orders/[orderId]/route.ts" \
  "src/app/api/dashboard/orders/[orderId]/refund/route.ts" \
  src/app/api/cron/process-abandoned-carts/route.ts \
  src/app/api/cron/check-low-stock/route.ts
git commit -m "feat: wire agent event triggers into 10 API routes

Agents now react autonomously to business events:
- order.created, order.cancelled, order.refund_requested
- product.created, product.low_stock, product.out_of_stock
- customer.signup, customer.cart_abandoned
- review.created, review.negative

All triggers use fire-and-forget pattern — never block the main API response."
```

---

## Task 3: Complete Cron Agent Execution (Phase 2C)

**Files:**
- Create: `src/lib/agents/schedule-executor.ts`
- Modify: `src/app/api/agents/cron/route.ts`

- [ ] **Step 1: Create the schedule executor**

```typescript
// src/lib/agents/schedule-executor.ts
import { SalesAgent } from './sales/agent'
import { MarketingAgent } from './marketing/agent'
import { TechnicalAgent } from './technical/agent'
import { AnalyticsAgent } from './analytics/agent'
import { SupportAgent } from './support/agent'
import { getAgentState } from './db'
import type { AgentType, AgentTrigger } from './types'

const AGENT_MAP: Record<AgentType, new () => any> = {
  sales: SalesAgent,
  marketing: MarketingAgent,
  technical: TechnicalAgent,
  analytics: AnalyticsAgent,
  support: SupportAgent,
}

/**
 * Execute a scheduled agent task.
 * Instantiates the appropriate agent and calls execute() with the schedule context.
 */
export async function executeScheduledTask(schedule: {
  store_id: string
  agent_type: AgentType
  task_type: string
  config?: Record<string, unknown>
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Check agent is enabled
    const state = await getAgentState(schedule.store_id, schedule.agent_type)
    if (!state || !state.is_enabled) {
      return { success: false, error: 'Agent not enabled' }
    }

    // Instantiate agent
    const AgentClass = AGENT_MAP[schedule.agent_type]
    if (!AgentClass) {
      return { success: false, error: `Unknown agent type: ${schedule.agent_type}` }
    }

    const agent = new AgentClass()

    // Build trigger
    const trigger: AgentTrigger = {
      storeId: schedule.store_id,
      agentType: schedule.agent_type,
      source: 'cron',
      taskType: schedule.task_type,
      context: schedule.config || {},
    }

    // Execute
    const result = await agent.execute(trigger)

    return {
      success: result.status === 'completed' || result.status === 'requires_approval',
      error: result.error,
    }
  } catch (error) {
    console.error(`[schedule] Failed: store=${schedule.store_id} agent=${schedule.agent_type} task=${schedule.task_type}`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
```

Note: Read the actual agent constructors and execute() signatures to match the exact API. The code above is a template — adjust constructor args and trigger shape to match what base-agent.ts expects.

- [ ] **Step 2: Wire the cron route to use the executor**

In `src/app/api/agents/cron/route.ts`, replace the Phase 2C TODO (line 23) with:

```typescript
import { executeScheduledTask } from '@/lib/agents/schedule-executor'

// Inside the executeScheduledTasks callback:
const result = await executeScheduledTask({
  store_id: schedule.store_id,
  agent_type: schedule.agent_type as AgentType,
  task_type: schedule.task_type,
  config: schedule.config,
})

console.log(
  `[cron] Task ${schedule.task_type} for store=${schedule.store_id}: ${result.success ? 'SUCCESS' : 'FAILED'} ${result.error || ''}`
)
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/agents/schedule-executor.ts src/app/api/agents/cron/route.ts
git commit -m "feat: complete Phase 2C — cron dispatches scheduled tasks to agents

The agent cron endpoint now instantiates the appropriate agent and calls
execute() for each due scheduled task. Tracks success/failure and logs results."
```

---

## Task 4: Fix Support Webhook Authentication

**Files:**
- Modify: `src/app/api/agents/support/webhook/route.ts`

- [ ] **Step 1: Implement MSG91 signature verification**

Replace the placeholder `verifyMsg91Signature` function:

```typescript
import crypto from 'crypto'

function verifyMsg91Signature(request: NextRequest, body: string): boolean {
  const secret = process.env.MSG91_WEBHOOK_SECRET
  if (!secret) {
    console.warn('[webhook] MSG91_WEBHOOK_SECRET not configured — skipping verification')
    return true // Allow in development when secret not set
  }

  const signature = request.headers.get('x-msg91-signature') ||
                    request.headers.get('x-hub-signature-256')
  if (!signature) {
    console.warn('[webhook] No MSG91 signature header found')
    return false
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}
```

- [ ] **Step 2: Implement Resend signature verification**

Replace the placeholder `verifyResendSignature` function:

```typescript
function verifyResendSignature(request: NextRequest, body: string): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    console.warn('[webhook] RESEND_WEBHOOK_SECRET not configured — skipping verification')
    return true // Allow in development when secret not set
  }

  const svixId = request.headers.get('svix-id')
  const svixTimestamp = request.headers.get('svix-timestamp')
  const svixSignature = request.headers.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    console.warn('[webhook] Missing Resend/svix headers')
    return false
  }

  // Verify timestamp is within 5 minutes (replay protection)
  const timestamp = parseInt(svixTimestamp, 10)
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - timestamp) > 300) {
    console.warn('[webhook] Resend timestamp too old')
    return false
  }

  // Compute expected signature
  const signedContent = `${svixId}.${svixTimestamp}.${body}`
  const secretBytes = Buffer.from(secret.split('_')[1] || secret, 'base64')
  const expectedSignature = crypto
    .createHmac('sha256', secretBytes)
    .update(signedContent)
    .digest('base64')

  // svix-signature may contain multiple signatures separated by spaces
  const signatures = svixSignature.split(' ')
  return signatures.some(sig => {
    const sigValue = sig.startsWith('v1,') ? sig.slice(3) : sig
    try {
      return crypto.timingSafeEqual(
        Buffer.from(sigValue),
        Buffer.from(expectedSignature)
      )
    } catch {
      return false
    }
  })
}
```

- [ ] **Step 3: Update the POST handler to pass body to verification**

The POST handler needs to read the body once and pass it to both the verification function and the JSON parser. Update the handler:

```typescript
export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const provider = request.headers.get('x-webhook-provider') ||
                   (request.headers.get('x-msg91-signature') ? 'msg91' :
                    request.headers.get('svix-id') ? 'resend' : 'unknown')

  // Verify signature
  if (provider === 'msg91' && !verifyMsg91Signature(request, rawBody)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }
  if (provider === 'resend' && !verifyResendSignature(request, rawBody)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const body = JSON.parse(rawBody)
  // ... rest of handler continues with body
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/agents/support/webhook/route.ts
git commit -m "fix: implement real webhook signature verification for MSG91 and Resend

- MSG91: HMAC-SHA256 verification using MSG91_WEBHOOK_SECRET
- Resend: svix signature verification with timestamp replay protection
- Graceful fallback when secrets not configured (dev mode)"
```

---

## Task 5: Auto-Create Agent Schedules on Enable

**Files:**
- Modify: The API endpoint that toggles agent enabled state (find it — likely in `src/app/api/agents/[agentId]/pause/route.ts` or the state update handler)

- [ ] **Step 1: Find the agent toggle endpoint**

Search for where `is_enabled` is updated. It's likely in one of:
- `src/app/api/agents/[agentId]/pause/route.ts`
- Or directly via `upsertAgentState()` calls from the platform settings page

Read the file to understand the current flow.

- [ ] **Step 2: Add default schedule creation**

After an agent is enabled (is_enabled set to true), insert default schedules:

```typescript
import { getSupabaseAdmin } from '@/lib/supabase'

const DEFAULT_SCHEDULES: Record<string, Array<{ task_type: string; schedule_cron: string }>> = {
  sales: [
    { task_type: 'abandoned_cart_recovery', schedule_cron: '0 */6 * * *' }, // Every 6 hours
    { task_type: 'customer_segmentation', schedule_cron: '0 3 * * 1' },     // Weekly Monday 3am
  ],
  analytics: [
    { task_type: 'daily_digest', schedule_cron: '0 8 * * *' },              // Daily 8am
    { task_type: 'weekly_report', schedule_cron: '0 8 * * 1' },             // Weekly Monday 8am
  ],
  marketing: [
    { task_type: 'campaign_performance_check', schedule_cron: '0 9 * * *' }, // Daily 9am
    { task_type: 'spend_sync', schedule_cron: '0 */6 * * *' },              // Every 6 hours
  ],
  technical: [
    { task_type: 'seo_audit', schedule_cron: '0 3 * * 0' },                 // Weekly Sunday 3am
    { task_type: 'health_check', schedule_cron: '0 4 * * *' },              // Daily 4am
  ],
  support: [], // Purely reactive, no scheduled tasks
}

async function createDefaultSchedules(storeId: string, agentType: string): Promise<void> {
  const schedules = DEFAULT_SCHEDULES[agentType] || []
  if (schedules.length === 0) return

  const supabase = getSupabaseAdmin()

  // Upsert to avoid duplicates
  for (const schedule of schedules) {
    await supabase.from('agent_schedules').upsert(
      {
        store_id: storeId,
        agent_type: agentType,
        task_type: schedule.task_type,
        schedule_cron: schedule.schedule_cron,
        timezone: 'Asia/Kolkata',
        is_active: true,
        config: {},
      },
      { onConflict: 'store_id,agent_type,task_type' }
    )
  }
}
```

Call `createDefaultSchedules(storeId, agentType)` after the agent is enabled.

- [ ] **Step 3: Deactivate schedules on disable**

When an agent is disabled, deactivate its schedules:

```typescript
async function deactivateSchedules(storeId: string, agentType: string): Promise<void> {
  const supabase = getSupabaseAdmin()
  await supabase
    .from('agent_schedules')
    .update({ is_active: false })
    .eq('store_id', storeId)
    .eq('agent_type', agentType)
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: auto-create agent schedules when agents are enabled

Each agent type gets default scheduled tasks:
- Sales: cart recovery (6h), segmentation (weekly)
- Analytics: daily digest, weekly report
- Marketing: campaign check (daily), spend sync (6h)
- Technical: SEO audit (weekly), health check (daily)
- Support: no schedules (purely reactive)

Schedules deactivated when agent is disabled."
```

---

## Task 6: Add Cross-Agent Notifications

**Files:**
- Create: `src/lib/agents/cross-agent-hooks.ts`

This adds post-execution hooks that call `crossAgentNotify()` for key agent actions.

- [ ] **Step 1: Create the cross-agent notification hooks**

```typescript
// src/lib/agents/cross-agent-hooks.ts
import { crossAgentNotify } from './orchestrator'
import type { AgentType } from './types'

/**
 * Call after an agent action completes to notify other relevant agents.
 * These are fire-and-forget — errors are logged but never thrown.
 */
export async function notifyRelatedAgents(params: {
  store_id: string
  source_agent: AgentType
  action_type: string
  summary: string
  details?: Record<string, unknown>
}): Promise<void> {
  const notifications = getNotificationTargets(params.source_agent, params.action_type)

  for (const target of notifications) {
    try {
      await crossAgentNotify({
        store_id: params.store_id,
        source_agent: params.source_agent,
        target_agent: target.agent,
        notification_type: target.type,
        summary: params.summary,
        details: params.details || {},
      })
    } catch (error) {
      console.error(`[cross-agent] Failed to notify ${target.agent}:`, error)
    }
  }
}

function getNotificationTargets(
  source: AgentType,
  actionType: string
): Array<{ agent: AgentType; type: string }> {
  const map: Record<string, Record<string, Array<{ agent: AgentType; type: string }>>> = {
    analytics: {
      anomaly_detected: [
        { agent: 'marketing', type: 'anomaly_alert' },
        { agent: 'sales', type: 'anomaly_alert' },
      ],
      traffic_spike: [
        { agent: 'technical', type: 'traffic_alert' },
      ],
    },
    support: {
      negative_review: [
        { agent: 'marketing', type: 'review_alert' },
      ],
      complaint_escalated: [
        { agent: 'sales', type: 'customer_issue' },
      ],
    },
    sales: {
      cart_recovered: [
        { agent: 'analytics', type: 'recovery_event' },
      ],
    },
    marketing: {
      low_roas_campaign: [
        { agent: 'analytics', type: 'campaign_alert' },
        { agent: 'sales', type: 'campaign_alert' },
      ],
    },
    technical: {
      seo_score_dropped: [
        { agent: 'analytics', type: 'health_alert' },
      ],
    },
  }

  return map[source]?.[actionType] || []
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/agents/cross-agent-hooks.ts
git commit -m "feat: add cross-agent notification hooks

Agents can now notify each other after key actions:
- Analytics → Marketing/Sales on anomalies
- Support → Marketing on negative reviews
- Sales → Analytics on cart recovery
- Marketing → Analytics/Sales on low ROAS
- Technical → Analytics on SEO drops"
```

---

## Task 7: Merchant Notifications for Autonomous Actions

**Files:**
- Create: `src/lib/agents/agent-notification.ts`

- [ ] **Step 1: Create agent notification helper**

```typescript
// src/lib/agents/agent-notification.ts
import { createNotification } from '@/lib/notifications'
import type { AgentType } from './types'

const AGENT_DISPLAY_NAMES: Record<AgentType, string> = {
  support: 'SENTINEL (Support)',
  sales: 'FORGE (Sales)',
  analytics: 'PULSE (Analytics)',
  marketing: 'PRISM (Marketing)',
  technical: 'CIPHER (Technical)',
}

/**
 * Notify the merchant about an autonomous agent action.
 * Uses the existing notification system (shows in notification bell).
 */
export async function notifyMerchantOfAgentAction(params: {
  store_id: string
  user_id: string
  agent_type: AgentType
  action_summary: string
  action_type: string
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  data?: Record<string, unknown>
}): Promise<void> {
  try {
    const agentName = AGENT_DISPLAY_NAMES[params.agent_type] || params.agent_type

    await createNotification({
      store_id: params.store_id,
      user_id: params.user_id,
      type: 'system', // Use 'system' type for agent notifications
      title: `${agentName} — ${params.action_type}`,
      message: params.action_summary,
      priority: params.priority || 'normal',
      data: {
        ...params.data,
        agent_type: params.agent_type,
        source: 'agent_autonomous',
      },
    })
  } catch (error) {
    console.error(`[agent-notify] Failed to notify merchant:`, error)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/agents/agent-notification.ts
git commit -m "feat: add merchant notification helper for autonomous agent actions

Merchants receive notifications via the existing notification bell when
agents take autonomous actions. Uses the system notification type."
```

---

## Execution Notes

- **Tasks 1-2 are the critical path** — they make agents reactive to events. Everything else builds on this.
- **Task 3** makes cron actually execute agents instead of just logging.
- **Task 4** makes the support webhook production-safe.
- **Task 5** ensures agents start working immediately when enabled.
- **Tasks 6-7** add observability (cross-agent + merchant notifications).
- Each task is independently committable and testable.
- The trigger emitter (Task 1) must be created before Task 2.
- Tasks 3-7 can be done in any order after Tasks 1-2.
- Read the actual files before modifying — the line numbers and variable names in this plan are approximate. Verify against the real code.
