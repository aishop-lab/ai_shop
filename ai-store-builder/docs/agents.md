# Agent & Sub-Agent System

**Vision:** The merchant becomes the CEO of a one-person company. Five C-suite AI agents run the business, each with specialized sub-agents.

## Architecture

```
MASTER ORCHESTRATOR (The Board)
├── PRISM — CMO (8 sub-agents): Campaign Architect, Social Composer, Visual Crafter, Reel Director, Copysmith, Ad Pilot, SEO Scout, Influencer Finder
├── FORGE — CRO (7 sub-agents): Cart Whisperer, Price Strategist, Deal Engineer, Upsell Agent, Checkout Doctor, Loyalty Architect, Lead Scorer
├── SENTINEL — CCO (7 sub-agents): Chat Responder, Email Handler, WhatsApp Agent, Returns Manager, Review Curator, Escalation Detector, FAQ Builder
├── PULSE — CDO (8 sub-agents): Revenue Tracker, Traffic Analyst, Customer Profiler, Product Ranker, Funnel Analyst, Competitor Watcher, Anomaly Sentinel, Report Writer
└── CIPHER — CTO (7 sub-agents): SEO Engineer, Speed Demon, Uptime Guardian, Security Scanner, Image Optimizer, Integration Doctor, Backup Manager

Total: 1 Master + 5 Chiefs + 37 Sub-Agents = 43 AI workers
```

## Build Types

| Type | Count | Description |
|------|-------|-------------|
| Data-Only | 6 | SQL queries, no LLM (all PULSE analytics) |
| LLM-Only | 12 | Specialized prompts, no external API |
| LLM + Existing APIs | 11 | Uses Resend, MSG91, Razorpay, Stripe, Sharp, Supabase |
| LLM + New APIs | 8 | Needs Google Search Console, PageSpeed, Meta Ads |

## Autonomy Principles

1. **Analysis/alerts** — always autonomous
2. **Customer-facing content** — Chief approval required
3. **Money actions** (pricing, refunds, ad spend) — Chief approval required
4. **Technical changes** — Chief approval required
5. **Transactional messages** (order confirmations, shipping) — autonomous
6. **Recovery within policy** — autonomous

## Approval Flow

```
Sub-Agent prepares action
  → Autonomous? → Yes → Execute, log for Chief
  → No → Chief evaluates based on autonomy level (1-5)
    → Level 1-2: Forward to Merchant
    → Level 3: Auto-approve low-risk, forward high-risk
    → Level 4: Auto-approve most, forward spending/refunds
    → Level 5: Auto-approve everything
```

## Implementation Phases

| Phase | What | Sub-Agents | Status |
|-------|------|-----------|--------|
| 0 | Framework (registry, executor, router, approval, logging, UI) | 0 (infra) | Done |
| 1 | Data-Only (PULSE analytics — SQL queries) | 6 | Done |
| 2 | LLM-Only (specialized prompts across all Chiefs) | 12 | Done |
| 3 | LLM + Existing APIs (cart recovery, support, payments) | 11 | Done |
| 4 | New API Integrations (Search Console, PageSpeed, Meta Ads) | 8 | Done |

## New APIs Required

| API | Powers | Difficulty |
|-----|--------|-----------|
| Google Search Console | SEO Scout, SEO Engineer | Medium |
| Google PageSpeed Insights | Speed Demon | Easy (free, no auth) |
| Meta Ads API | Ad Pilot | Hard (verification required) |
| Google Ads API | Ad Pilot | Hard (can defer) |

## Universal Sub-Agent Formula

```
Sub-Agent = System Prompt + Store Context + Tools (API functions)
```

Adding a new sub-agent = 1 config file in the registry.
