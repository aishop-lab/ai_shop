# Design Spec: Agent Autonomy Wiring

**Date:** 2026-03-24
**Type:** Integration / Wiring
**Scope:** Connect existing agent tools and orchestrator to make agents autonomous

---

## Problem Statement

All 5 agents (Support, Sales, Analytics, Marketing, Technical) have fully implemented tools (54 total) and a production-grade orchestrator with event routing, conflict resolution, and cross-agent communication. However, **nothing calls the orchestrator**. Agents only execute when a merchant chats with them. The event system, cron execution, and cross-agent notifications are defined but unwired.

## Goal

Wire the agent autonomy layer so that agents:
1. React to **business events** automatically (new order, abandoned cart, low stock, etc.)
2. Execute **scheduled tasks** via cron (daily reports, SEO audits, cart recovery scans, marketing optimization)
3. **Communicate across agents** (analytics detects anomaly → notifies marketing; support escalates → triggers sales)
4. Have **proper webhook authentication** for incoming channels (WhatsApp, email)

## What Already Exists (Do Not Rebuild)

- `src/lib/agents/base-agent.ts` — Full execution framework with LLM loop, approval workflow, cost tracking
- `src/lib/agents/orchestrator.ts` — Event routing, conflict resolution, cross-agent notifications
- `src/lib/agents/state-machine.ts` — Agent state transitions
- `src/lib/agents/tool-registry.ts` — Tool registration with permission checking
- `src/lib/agents/cost-tracker.ts` — Monthly budget tracking
- `src/lib/agents/db.ts` — All CRUD operations for agent tables
- `src/lib/agents/sales/tools.ts` — 12 real tools (cart recovery, coupons, pricing, segmentation)
- `src/lib/agents/marketing/tools.ts` — 13 real tools (ad campaigns, social posts, content generation)
- `src/lib/agents/technical/tools.ts` — 10 real tools (SEO audit, structured data, image audit, health score)
- `src/lib/agents/analytics/tools.ts` — 13 real tools (revenue/order/customer queries, anomaly detection, attribution)
- `src/lib/agents/support/tools.ts` — 6 real tools (order lookup, shipping status, escalation)
- All 9 database tables (agent_states, agent_actions, agent_approvals, agent_memory, agent_schedules, connected_accounts, agent_cost_tracking, customer_conversations, conversation_messages)

## What Needs To Be Built

### 1. Event Trigger Emission (Priority: Critical)

Add `dispatchTrigger()` calls at key points in existing API routes:

| Event | Where to emit | Agents triggered |
|-------|--------------|-----------------|
| `order.created` | `/api/orders/create/route.ts` | sales, support, analytics |
| `order.cancelled` | `/api/dashboard/orders/[orderId]/route.ts` (status update) | support, analytics |
| `order.refund_requested` | `/api/dashboard/orders/[orderId]/refund/route.ts` | support, sales |
| `product.created` | `/api/products/upload/route.ts` | marketing, technical, analytics |
| `product.low_stock` | `/api/cron/check-low-stock/route.ts` | sales, analytics |
| `product.out_of_stock` | `/api/cron/check-low-stock/route.ts` | sales, marketing |
| `customer.signup` | `/api/customer/register/route.ts` | marketing, sales |
| `customer.cart_abandoned` | `/api/cron/process-abandoned-carts/route.ts` | sales |
| `review.created` | `/api/products/[id]/reviews/route.ts` (POST) | support, marketing |
| `review.negative` | `/api/products/[id]/reviews/route.ts` (POST, rating <= 2) | support |

**Implementation pattern:** After the main operation succeeds, call `dispatchTrigger()` using `waitUntil()` or `after()` so it doesn't block the response:

```typescript
import { dispatchTrigger } from '@/lib/agents/orchestrator';

// After order creation succeeds:
waitUntil(
  dispatchTrigger({
    storeId,
    event: 'order.created',
    context: { orderId, customerId, totalAmount }
  })
);
```

Each `dispatchTrigger` call must:
- Check if the triggered agents are enabled for this store
- Respect autonomy levels (approval vs auto-execute)
- Log the trigger as an agent_action
- Handle errors gracefully (never break the main flow)

### 2. Cron Execution Wiring (Priority: Critical)

Complete the Phase 2C TODO in `/api/agents/cron/route.ts`:

| Cron Schedule | Task | Agent |
|---------------|------|-------|
| `0 10 * * *` (10am daily) | `abandoned_cart_recovery` | Sales — find carts >1hr old, execute agent to send recovery emails |
| `30 2 * * *` (2:30am daily) | `daily_digest` | Analytics — generate daily report for each store |
| `30 3 * * 1` (3:30am Monday) | `weekly_report` | Analytics — generate weekly report |
| `0 9 * * *` (9am daily) | `check_low_stock` | Sales + Analytics — dispatch low_stock triggers |
| `0 14 * * *` (2pm daily) | `marketing_sync` | Marketing — sync ad spend from connected accounts |
| `0 8 * * *` (8am daily) | `marketing_optimize` | Marketing — analyze ROAS, suggest optimizations |
| `0 3 * * 0` (3am Sunday) | `seo_audit` | Technical — run weekly SEO audit for each store |
| `0 4 * * *` (4am daily) | `health_check` | Technical — check uptime, SSL, page speed |

**Implementation:** The cron endpoint should:
1. Query `agent_schedules` for active tasks due to run
2. For each task, instantiate the appropriate agent
3. Call `agent.execute()` with the task trigger
4. Update `last_run_at`, `next_run_at`, and `last_run_status`
5. Handle failures (increment `consecutive_failures`, disable after 5 consecutive)

### 3. Cross-Agent Communication (Priority: High)

Wire `crossAgentNotify()` calls inside agent tool implementations:

| When | From Agent | Notify Agent | Context |
|------|-----------|-------------|---------|
| Anomaly detected (revenue drop >20%) | Analytics | Marketing, Sales | anomaly details |
| Anomaly detected (traffic spike >50%) | Analytics | Technical | spike details |
| Negative review received | Support | Marketing | review details, sentiment |
| Cart recovered successfully | Sales | Analytics | recovery details |
| SEO score dropped below 60 | Technical | Analytics | audit results |
| Ad campaign ROAS < 1.0 | Marketing | Analytics, Sales | campaign details |
| Customer complaint escalated | Support | Sales | customer details |

**Implementation:** Add `crossAgentNotify()` calls at the end of relevant tool executions in each agent's tools file. These are lightweight — they just insert a record into `agent_actions` that the target agent picks up on next execution.

### 4. Support Webhook Authentication (Priority: High)

Fix `/api/agents/support/webhook/route.ts`:

**MSG91 (WhatsApp):**
- Verify webhook signature using MSG91's HMAC-SHA256 method
- Compare `x-msg91-signature` header against computed hash of body + secret
- Reject with 401 if invalid

**Resend (Email):**
- Verify webhook signature using Resend's `svix` library
- Validate `svix-id`, `svix-timestamp`, `svix-signature` headers
- Reject with 401 if invalid

Both should fall back to the existing `routeIncomingMessage()` flow after validation.

### 5. Agent Schedule Initialization (Priority: Medium)

When a merchant enables an agent (toggles it on in the platform), auto-create default schedules in `agent_schedules`:

| Agent | Default Schedules |
|-------|------------------|
| Sales | `abandoned_cart_recovery` every 6 hours, `customer_segmentation` weekly |
| Analytics | `daily_digest` daily 8am, `weekly_report` Monday 8am |
| Marketing | `campaign_check` daily 9am, `spend_sync` every 6 hours |
| Technical | `seo_audit` weekly Sunday, `health_check` daily 4am |
| Support | No scheduled tasks (purely reactive) |

Create schedules via the agent toggle API (`/api/agents/[agentId]/pause/route.ts` or the state update endpoint).

### 6. Notification Delivery for Agent Actions (Priority: Medium)

When an agent completes an autonomous action, notify the merchant via the existing notification system (`src/lib/notifications.ts`):

- Insert into `notifications` table with appropriate type and link
- The notification bell in the dashboard already polls and displays these
- High-priority actions (spending, refunds, pricing) should also trigger email via Resend if configured

---

## Architecture Principles

1. **Never break the main flow** — all trigger emissions use `waitUntil()` / background execution
2. **Respect autonomy levels** — the existing approval system handles this, just wire it up
3. **Budget-aware** — `checkBudget()` is called in base-agent, prevents overspend
4. **Graceful degradation** — if an agent fails, log the error and move on
5. **Idempotent triggers** — the orchestrator's conflict resolution prevents duplicate execution
6. **Observable** — all actions logged to `agent_actions`, visible in activity feed

## Out of Scope

- New UI pages (the UI already exists for all of this)
- New agent tools (all 54 tools already implemented)
- New database tables (all 9 tables exist)
- Meta/Google Ads API implementations (already exist in marketing tools)
- GA4/GSC API implementations (already exist in analytics/technical tools)

## Testing Strategy

- Unit tests for trigger emission (mock `dispatchTrigger`, verify it's called with correct args)
- Integration tests for cron execution (verify agent runs and logs actions)
- Webhook auth tests (valid/invalid signatures)
- End-to-end: create an order → verify sales/support/analytics agents are triggered

---

## Build Order

1. **Event triggers** — wire `dispatchTrigger()` into 10 API routes
2. **Cron execution** — complete Phase 2C in cron route
3. **Cross-agent notifications** — add `crossAgentNotify()` to tool implementations
4. **Webhook auth** — fix support webhook verification
5. **Schedule initialization** — auto-create schedules on agent enable
6. **Merchant notifications** — notify merchants of autonomous actions
