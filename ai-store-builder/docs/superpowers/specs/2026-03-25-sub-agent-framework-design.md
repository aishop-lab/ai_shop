# Sub-Agent Framework (Phase 0) — Design Spec

**Date:** 2026-03-25
**Status:** Approved
**Author:** Claude + Manan

---

## Overview

A framework that allows 37 specialized sub-agents to be defined as TypeScript configuration objects and executed through a shared engine. Sub-agents are grouped under 5 Chief agents (PRISM, FORGE, SENTINEL, PULSE, CIPHER). No new database tables — sub-agent identity is tracked via a `sub_agent_type` column on the existing `agent_actions` table.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Sub-agent storage | Code-only (TypeScript configs) | YAGNI — no DB migration for prototype, add later if needed |
| Tracking | `sub_agent_type` column on `agent_actions` | Reuse existing action tracking infrastructure |
| Execution | Single `executeSubAgent()` function | All sub-agents share the same execution pattern |
| Routing | LLM-based routing at Chief level | Chief decides which sub-agent handles a task |
| Cross-department data | Read access open, write hierarchical | Hybrid model per vision doc |

---

## Types

```typescript
// Sub-agent definition — lives in code, not DB
interface SubAgentDefinition {
  id: string                              // e.g., 'copysmith'
  codename: string                        // e.g., 'COPYSMITH'
  chief: AgentType                        // e.g., 'marketing'
  role: string                            // e.g., 'Writing & Copy'
  description: string                     // One-liner for UI
  category: 'data-only' | 'llm-only' | 'llm-api' | 'llm-new-api'
  systemPrompt: (ctx: StoreContext) => string
  tools?: Record<string, ToolDefinition>  // AI SDK tool definitions
  queryFn?: (ctx: StoreContext, params: Record<string, unknown>) => Promise<unknown>  // For data-only agents
  autonomyRules: {
    autonomous: string[]                  // Action types auto-executed
    needsChiefApproval: string[]          // Action types needing Chief OK
    needsMerchantApproval: string[]       // Action types needing Merchant OK
  }
}

// Store context loaded for every sub-agent execution
interface StoreContext {
  storeId: string
  storeName: string
  storeSlug: string
  category: string
  description: string
  brandVibe: string
  primaryColor: string
  currency: string
  autonomyLevel: AutonomyLevel           // From the Chief's settings
  // Lazy-loaded sections (only fetched if sub-agent needs them)
  products?: () => Promise<Product[]>
  orders?: () => Promise<Order[]>
  customers?: () => Promise<Customer[]>
  recentActions?: () => Promise<AgentAction[]>
}

// Result from executing a sub-agent
interface SubAgentResult {
  subAgentId: string
  chief: AgentType
  actions: AgentActionResult[]
  output: unknown                        // Structured output from the sub-agent
  tokensInput: number
  tokensOutput: number
  durationMs: number
  requiresApproval: boolean
}
```

---

## File Structure

```
src/lib/agents/sub-agents/
├── types.ts                    SubAgentDefinition, SubAgentResult, StoreContext types
├── registry/
│   ├── index.ts                getSubAgent(id), getSubAgentsForChief(chief), ALL_SUB_AGENTS
│   ├── prism.ts                8 PRISM (marketing) sub-agent definitions
│   ├── forge.ts                7 FORGE (sales) sub-agent definitions
│   ├── sentinel.ts             7 SENTINEL (support) sub-agent definitions
│   ├── pulse.ts                8 PULSE (analytics) sub-agent definitions
│   └── cipher.ts               7 CIPHER (technical) sub-agent definitions
├── executor.ts                 executeSubAgent(subAgentId, storeId, task) → SubAgentResult
├── context.ts                  loadStoreContext(storeId) → StoreContext
└── router.ts                   routeToSubAgent(chief, task) → subAgentId
```

### Modifications to Existing Files

| File | Change |
|------|--------|
| `src/lib/agents/types.ts` | Add SubAgentType union type |
| `src/lib/agents/orchestrator.ts` | Update dispatch to route through sub-agents |
| DB migration | `ALTER TABLE agent_actions ADD COLUMN sub_agent_type TEXT` |

---

## Sub-Agent Registry

Each Chief's registry file exports an array of `SubAgentDefinition` objects. The index file provides lookup functions.

### Registry Index API

```typescript
// Get a specific sub-agent by ID
getSubAgent(id: string): SubAgentDefinition | undefined

// Get all sub-agents for a Chief
getSubAgentsForChief(chief: AgentType): SubAgentDefinition[]

// All 37 sub-agents
ALL_SUB_AGENTS: SubAgentDefinition[]

// All sub-agent IDs as a union type
type SubAgentId = 'campaign-architect' | 'social-composer' | ... // all 37
```

---

## Executor

The executor is the core engine. One function handles all 37 sub-agents:

```
executeSubAgent(subAgentId, storeId, task):
  1. Look up SubAgentDefinition from registry
  2. Load StoreContext via context.ts
  3. Check if Chief is enabled (from agent_states)
  4. Branch by category:
     - data-only: call queryFn(context, task.params)
     - llm-only: call generateText with systemPrompt + task
     - llm-api: call generateText with systemPrompt + tools + task
     - llm-new-api: same as llm-api (tools include new API calls)
  5. Check autonomy rules:
     - If action type is in autonomous[] → execute + log
     - If in needsChiefApproval[] → check autonomy level:
       - Level 4-5: auto-approve
       - Level 1-3: create approval request
     - If in needsMerchantApproval[] → always create approval request
  6. Log action to agent_actions with sub_agent_type
  7. Return SubAgentResult
```

### LLM Execution Pattern

For LLM-based sub-agents, the execution uses AI SDK's tool calling:

```typescript
const result = await generateText({
  model: 'google/gemini-2.0-flash',  // Current model in codebase
  system: subAgent.systemPrompt(storeContext),
  prompt: task.instruction,
  tools: subAgent.tools,
});
```

---

## Store Context Loader

Fetches store data needed by sub-agent prompts. Uses lazy loading — only queries DB for sections the sub-agent actually needs.

```typescript
async function loadStoreContext(storeId: string): Promise<StoreContext> {
  const supabase = getSupabaseAdmin()
  const { data: store } = await supabase
    .from('stores')
    .select('name, slug, blueprint, status')
    .eq('id', storeId)
    .single()

  return {
    storeId,
    storeName: store.name,
    storeSlug: store.slug,
    category: store.blueprint?.business_type || 'General',
    description: store.blueprint?.description || '',
    brandVibe: store.blueprint?.brand_vibe || 'modern',
    primaryColor: store.blueprint?.primary_color || '#6366f1',
    currency: store.blueprint?.location?.currency || 'INR',
    autonomyLevel: 3, // Populated by executor from agent_states
    // Lazy loaders
    products: () => supabase.from('products').select('*').eq('store_id', storeId).then(r => r.data || []),
    orders: () => supabase.from('orders').select('*').eq('store_id', storeId).order('created_at', { ascending: false }).limit(100).then(r => r.data || []),
    customers: () => supabase.from('customers').select('*').eq('store_id', storeId).then(r => r.data || []),
    recentActions: () => supabase.from('agent_actions').select('*').eq('store_id', storeId).order('created_at', { ascending: false }).limit(50).then(r => r.data || []),
  }
}
```

---

## Router

Each Chief has a routing function that decides which sub-agent handles a task. For the prototype, this uses simple keyword matching (not LLM-based — saves tokens):

```typescript
function routeToSubAgent(chief: AgentType, task: string): string {
  const subAgents = getSubAgentsForChief(chief)
  // Simple keyword matching against sub-agent descriptions and roles
  // Falls back to the first sub-agent (usually the orchestrator/architect role)
  // Can be upgraded to LLM-based routing later
}
```

---

## Dashboard UI

No new pages needed. The existing agent detail page (`/platform/agents/[agentId]`) is updated to show sub-agents as a grid of cards beneath the Chief's info.

Each sub-agent card shows:
- Codename and role
- Action count (from agent_actions WHERE sub_agent_type = id)
- Last action timestamp
- Category badge (data-only, llm-only, etc.)

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Chief is disabled | Sub-agents under it cannot execute; return early with `skipped: true` |
| Sub-agent has no tools (LLM-only) | Execute with generateText, no tool calling |
| Sub-agent is data-only | Skip LLM entirely, call queryFn directly |
| LLM call fails | Log error to agent_actions, increment Chief's error_count |
| Store context missing fields | Use sensible defaults (category='General', currency='INR') |
| Unknown sub-agent ID | Throw error with available sub-agent IDs |
