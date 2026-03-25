# Sub-Agent System — Master Implementation Plan

**Date:** 2026-03-25
**Status:** In Progress

---

## Phasing Strategy: Build by Capability Layer

Each phase adds a new capability. Each is independently deployable and demoable.

### Phase 0 — Sub-Agent Framework (Foundation)
**What:** The shared infrastructure ALL 37 sub-agents plug into.
- Sub-agent registry (defines each sub-agent: prompt, tools, autonomy rules)
- Sub-agent execution engine (runs any sub-agent given its config)
- Chief orchestrator pattern (routes tasks to the right sub-agent)
- Master orchestrator (routes across Chiefs)
- Approval flow (sub-agent → Chief → Merchant, respects autonomy levels)
- Activity logging (every action tracked per sub-agent)
- Dashboard UI (sub-agent status, recent actions, drill-down)
- Database schema (sub_agent_states, sub_agent_actions tables)

**Deliverable:** Framework where adding a new sub-agent = 1 config file.

### Phase 1 — Data-Only Agents (6 PULSE sub-agents)
**What:** All 6 analytics sub-agents that need no LLM, just SQL queries.
- Revenue Tracker, Traffic Analyst, Customer Profiler
- Product Ranker, Funnel Analyst, Anomaly Sentinel
- Analytics dashboard integration
- Automated anomaly detection + alerting

**Deliverable:** Real-time analytics dashboard powered by named sub-agents.

### Phase 2 — LLM-Only Agents (12 sub-agents across all Chiefs)
**What:** All 12 sub-agents that are just specialized prompts.
- PRISM: Campaign Architect, Copysmith, Social Composer, Reel Director, Influencer Finder
- FORGE: Deal Engineer, Checkout Doctor, Lead Scorer
- SENTINEL: FAQ Builder, Escalation Detector
- PULSE: Report Writer, Competitor Watcher

**Deliverable:** AI-generated content, analysis, and recommendations across all departments.

### Phase 3 — LLM + Existing API Agents (11 sub-agents)
**What:** Sub-agents that use LLM + already-integrated APIs (Resend, MSG91, Razorpay, Stripe, Sharp).
- FORGE: Cart Whisperer, Price Strategist, Upsell Agent, Loyalty Architect
- SENTINEL: Chat Responder, Email Handler, WhatsApp Agent, Returns Manager, Review Curator
- CIPHER: Backup Manager, Image Optimizer

**Deliverable:** Fully autonomous customer support, cart recovery, and store operations.

### Phase 4 — New API Integration Agents (8 sub-agents)
**What:** Sub-agents requiring new third-party API integrations.
- PRISM: Visual Crafter (Vertex AI Imagen), Ad Pilot (Meta Ads API)
- PRISM: SEO Scout (Google Search Console)
- CIPHER: SEO Engineer (Google Search Console), Speed Demon (PageSpeed API)
- CIPHER: Uptime Guardian (HTTP monitoring), Security Scanner, Integration Doctor

**Deliverable:** Full marketing automation, technical monitoring, and SEO optimization.

---

## Timeline Estimate

| Phase | Duration | Sub-Agents | Cumulative |
|-------|----------|-----------|------------|
| Phase 0 | 1-2 weeks | 0 (framework) | Framework ready |
| Phase 1 | 1 week | 6 | 6 / 37 |
| Phase 2 | 1-2 weeks | 12 | 18 / 37 |
| Phase 3 | 2-3 weeks | 11 | 29 / 37 |
| Phase 4 | 2-3 weeks | 8 | 37 / 37 |
| **Total** | **7-11 weeks** | **37** | **Complete** |

---

## Current Status

- [x] Vision document (`docs/sub-agents.md`)
- [x] Master plan (this document)
- [x] Phase 0 — Sub-Agent Framework (37 definitions, executor, router, context loader)
- [x] Phase 1 — Data-Only Agents (6 PULSE queryFn + API routes)
- [x] Phase 2 — LLM-Only Agents (12 sub-agents, all functional via executor)
- [x] Phase 3 — LLM + Existing API Agents (22 tools for 11 sub-agents)
- [x] Phase 4 — New API Integration Agents (16 tools for 8 sub-agents, PageSpeed/SSL/uptime live)
