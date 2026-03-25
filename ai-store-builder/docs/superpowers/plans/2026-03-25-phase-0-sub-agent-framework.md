# Phase 0: Sub-Agent Framework — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Build the shared framework that all 37 sub-agents plug into — types, registry, executor, context loader, and router.

**Architecture:** Code-only sub-agent definitions (no new DB tables). Single executor function handles all sub-agent types. Sub-agent identity tracked via `sub_agent_type` column on existing `agent_actions` table.

**Tech Stack:** TypeScript, Supabase, AI SDK (generateText), existing agent infrastructure

**Spec:** `docs/superpowers/specs/2026-03-25-sub-agent-framework-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/lib/agents/sub-agents/types.ts` | Create | All sub-agent TypeScript types |
| `src/lib/agents/sub-agents/context.ts` | Create | Store context loader with lazy loading |
| `src/lib/agents/sub-agents/registry/index.ts` | Create | Registry lookup functions |
| `src/lib/agents/sub-agents/registry/prism.ts` | Create | 8 marketing sub-agent definitions |
| `src/lib/agents/sub-agents/registry/forge.ts` | Create | 7 sales sub-agent definitions |
| `src/lib/agents/sub-agents/registry/sentinel.ts` | Create | 7 support sub-agent definitions |
| `src/lib/agents/sub-agents/registry/pulse.ts` | Create | 8 analytics sub-agent definitions |
| `src/lib/agents/sub-agents/registry/cipher.ts` | Create | 7 technical sub-agent definitions |
| `src/lib/agents/sub-agents/executor.ts` | Create | Core execution engine |
| `src/lib/agents/sub-agents/router.ts` | Create | Task routing to sub-agents |

---

### Task 1: Sub-Agent Types

Create `src/lib/agents/sub-agents/types.ts` with all type definitions for the sub-agent system.

### Task 2: Store Context Loader

Create `src/lib/agents/sub-agents/context.ts` — loads store data from Supabase with lazy-loaded sections.

### Task 3: Registry — All 37 Sub-Agent Definitions

Create all 5 registry files (prism.ts, forge.ts, sentinel.ts, pulse.ts, cipher.ts) plus the index.ts with lookup functions. Each sub-agent gets: id, codename, chief, role, description, category, systemPrompt function, autonomy rules.

### Task 4: Sub-Agent Executor

Create `src/lib/agents/sub-agents/executor.ts` — the core engine that runs any sub-agent given its ID, store ID, and task.

### Task 5: Sub-Agent Router

Create `src/lib/agents/sub-agents/router.ts` — keyword-based routing that decides which sub-agent handles a given task.

### Task 6: DB Migration + Type Update

Add `sub_agent_type` column to agent_actions table. Update AgentAction type.
