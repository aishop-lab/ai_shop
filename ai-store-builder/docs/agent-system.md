# Agent System Architecture

> **Last updated**: April 2026
> **Status**: Production (v1) — 5 chief agents, 37 sub-agents, live on storeforge.site
> **Audience**: Technical leadership — architecture decisions, execution model, scaling roadmap

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [The Five Chief Agents](#3-the-five-chief-agents)
4. [Sub-Agent System (37 Specialists)](#4-sub-agent-system-37-specialists)
5. [Execution Pipeline](#5-execution-pipeline)
6. [Inter-Agent Communication](#6-inter-agent-communication)
7. [Approval Workflow & Autonomy Levels](#7-approval-workflow--autonomy-levels)
8. [Memory System](#8-memory-system)
9. [Cost Tracking & Model Routing](#9-cost-tracking--model-routing)
10. [Cron & Scheduling](#10-cron--scheduling)
11. [Security & Guardrails](#11-security--guardrails)
12. [Current State Assessment](#12-current-state-assessment)
13. [Mega-Orchestrator Design](#13-mega-orchestrator-design)
14. [Roadmap](#14-roadmap)

---

## 1. Executive Summary

StoreForge's agent system transforms a solo merchant into a one-person company backed by five autonomous AI departments. Each department (chief agent) manages a team of specialized sub-agents that handle real tasks — sending emails, adjusting ad budgets, processing refunds, generating reports — not just generating text.

**The core insight**: E-commerce operations decompose into ~37 distinct specializations. A social media post and an SEO audit require fundamentally different skills, data, and tools. Rather than one monolithic AI, we run a hierarchy: **5 chiefs coordinate 37 specialists**, each with domain-specific tools, prompts, and autonomy rules.

**What makes this different from ChatGPT-with-plugins**:
- Agents act autonomously on schedules (cron), not just when prompted
- Approval workflow gates dangerous actions (spending money, changing prices, issuing refunds)
- Agents have persistent memory — they learn store preferences over time
- Agents communicate with each other (anomaly detection triggers marketing response)
- Cost tracking prevents runaway LLM spend
- Sub-agents use real APIs (Meta Graph, Razorpay, Stripe, Resend, Google Ads) — not mock responses

**Current numbers** (April 2026):
- 5 chief agents, 37 sub-agents
- 30+ bot tools (read/write/destructive)
- 11 cron jobs running daily
- Real integrations: Meta Ads, Google Ads, Razorpay, Stripe, Resend, MSG91, Vertex AI Imagen, Google Vision, Shiprocket
- Approval system with 5-level autonomy scale
- Per-store cost tracking with budget limits

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
                              MERCHANT
                                 |
                    +------------+------------+
                    |                         |
              [Chat UI / Bot]          [Platform Dashboard]
                    |                         |
                    v                         v
              /api/ai/bot              /api/agents/*
              (conversational)         (programmatic)
                    |                         |
                    +------------+------------+
                                 |
                          BASE AGENT ENGINE
                          (execute, approve, log)
                                 |
            +--------+--------+--------+--------+
            |        |        |        |        |
         PRISM    FORGE   SENTINEL  PULSE   CIPHER
        Marketing  Sales   Support  Analytics Technical
            |        |        |        |        |
         8 subs   7 subs   7 subs   8 subs   7 subs
            |        |        |        |        |
        [Tools]  [Tools]  [Tools]  [Queries] [Tools]
            |        |        |        |        |
     Meta Ads   Razorpay  Resend   Supabase  Sharp
     Google Ads  Stripe   MSG91    Analytics  Vertex AI
     Resend     Supabase  Supabase           Google Vision
     Vertex AI                               Supabase Storage
```

### 2.2 Data Layer

```
SUPABASE (PostgreSQL)
├── agent_states          — Status, autonomy level, config per store per agent
├── agent_actions         — Audit log of every action (auto, approved, failed)
├── agent_approvals       — Pending/resolved merchant approval requests
├── agent_memory          — Learned preferences, patterns, feedback
├── agent_schedules       — Cron task definitions per store per agent
├── agent_cost_tracking   — Token usage, costs, budget limits per store
├── stores                — Multi-tenant store data
├── products              — Product catalog
├── orders / order_items  — Order pipeline
├── customers             — Customer profiles
├── abandoned_carts       — Cart recovery pipeline
├── loyalty_programs      — Points-based rewards system
├── loyalty_points        — Customer point balances
├── loyalty_transactions  — Point earn/redeem history
├── influencers           — Influencer CRM
├── influencer_outreach   — Outreach tracking
├── connected_accounts    — OAuth tokens (Meta, Google, encrypted)
└── ...25+ more tables
```

### 2.3 Request Flow

**Conversational (Bot UI)**:
```
User message → /api/ai/bot → Auth → Build system prompt → LLM tool loop
  → Tool call → Permission check → Execute or Request approval → Stream response
```

**Programmatic (Cron/Trigger)**:
```
Cron tick → /api/cron/sub-agents → For each store → For each enabled chief
  → Route to sub-agent → Execute (data-only | llm-only | llm-api)
  → Log actions → Update stats → Return results
```

**Event-Driven (Triggers)**:
```
Business event (order.created) → emitTrigger() → Route to registered agents
  → Each agent evaluates → Execute or skip → Conflict check → Log
```

---

## 3. The Five Chief Agents

Each chief agent is an instance of `BaseAgent` with a unique system prompt, tool set, and approval policy. Chiefs don't do the detailed work — they coordinate their sub-agent teams and handle cross-cutting decisions.

### 3.1 PRISM (Marketing Chief)

| Property | Value |
|----------|-------|
| **Codename** | PRISM |
| **Sub-agents** | 8 (campaign-architect, social-composer, visual-crafter, reel-director, copysmith, ad-pilot, seo-scout, influencer-finder) |
| **Key tools** | createAdCampaign, adjustBudget, createSocialPost, getAdPerformance |
| **Always needs approval** | Campaign creation, budget changes, ad spend allocation |
| **Real integrations** | Meta Graph API (Facebook + Instagram posting), Meta Ads, Google Ads, Vertex AI Imagen 3.0, Resend |

**What it does autonomously**: Drafts social posts, generates creative briefs, analyzes ad performance, monitors competitor activity, suggests SEO improvements.

**What requires merchant approval**: Publishing posts, launching campaigns, allocating ad spend, changing budgets.

### 3.2 FORGE (Sales Chief)

| Property | Value |
|----------|-------|
| **Codename** | FORGE |
| **Sub-agents** | 7 (cart-whisperer, price-strategist, deal-engineer, upsell-agent, checkout-doctor, loyalty-architect, lead-scorer) |
| **Key tools** | sendRecoveryEmail, applyPriceRecommendation, createCoupon, sendTargetedCampaign |
| **Always needs approval** | Price changes, discounts >10%, campaign sends |
| **Real integrations** | Resend (email campaigns + cart recovery), Supabase (coupon/order management) |

**What it does autonomously**: Identifies abandoned carts, segments customers, analyzes pricing opportunities, scores leads, designs loyalty programs.

**What requires merchant approval**: Sending campaigns, issuing coupons, changing prices, activating loyalty programs.

### 3.3 SENTINEL (Support Chief)

| Property | Value |
|----------|-------|
| **Codename** | SENTINEL |
| **Sub-agents** | 7 (chat-responder, email-handler, whatsapp-agent, returns-manager, review-curator, escalation-detector, faq-builder) |
| **Key tools** | lookupOrder, checkShippingStatus, sendReply, escalateToMerchant, createReturnRequest |
| **Always needs approval** | Refunds >500 INR, return requests, complaint escalations |
| **Real integrations** | Resend (email replies), MSG91 (WhatsApp), Supabase (order/conversation management) |

**What it does autonomously**: Answers order status questions, looks up tracking info, responds to routine queries, detects escalation-worthy conversations.

**What requires merchant approval**: Processing refunds, initiating returns, sending compensation offers.

**Unique feature**: Dynamic knowledge base — the support agent's system prompt is built asynchronously at runtime, loading the store's products, policies, FAQs, and recent orders into context.

### 3.4 PULSE (Analytics Chief)

| Property | Value |
|----------|-------|
| **Codename** | PULSE |
| **Sub-agents** | 8 (revenue-tracker, traffic-analyst, customer-profiler, product-ranker, funnel-analyst, competitor-watcher, anomaly-sentinel, report-writer) |
| **Key tools** | queryRevenue, detectAnomalies, generateReport, sendReportEmail |
| **Always needs approval** | None (read-only by nature) |
| **Real integrations** | Supabase (all store data), Resend (email reports) |

**What it does autonomously**: Tracks revenue, detects anomalies, profiles customers, ranks products, monitors funnels, generates reports.

**Unique feature**: 6 of 8 sub-agents are `data-only` — they run pure SQL queries without any LLM, making them fast, cheap, and deterministic.

### 3.5 CIPHER (Technical Chief)

| Property | Value |
|----------|-------|
| **Codename** | CIPHER |
| **Sub-agents** | 7 (seo-engineer, speed-demon, uptime-guardian, security-scanner, image-optimizer, integration-doctor, backup-manager) |
| **Key tools** | fixMetaTags, updateProductSEO, fixImageAltText, auditSEO, optimizeImage, exportStoreData |
| **Always needs approval** | SEO write operations at low autonomy |
| **Real integrations** | Sharp (image processing), Supabase Storage (backups, image uploads), Google Vision |

**What it does autonomously**: Audits SEO, checks image quality, monitors uptime, scans for security issues, creates backups.

**What requires merchant approval**: Modifying product SEO fields, changing image alt text, publishing SEO fixes.

---

## 4. Sub-Agent System (37 Specialists)

### 4.1 Why Sub-Agents?

A chief agent receiving "create a social media campaign for our summer sale" needs to:
1. Design the campaign strategy (CAMPAIGN-ARCHITECT)
2. Write the copy (COPYSMITH)
3. Generate visuals (VISUAL-CRAFTER)
4. Publish to Instagram/Facebook (SOCIAL-COMPOSER)
5. Set up paid ads (AD-PILOT)
6. Find influencers to amplify (INFLUENCER-FINDER)

Each step requires different tools, different prompts, different approval levels. Sub-agents make this decomposition explicit.

### 4.2 Sub-Agent Categories

| Category | LLM Used? | Tools? | Cost | Use Case |
|----------|-----------|--------|------|----------|
| `data-only` | No | No (SQL query) | ~$0 | Revenue tracking, anomaly detection, funnel analysis |
| `llm-only` | Yes | No | Low | Creative drafts, recommendations, content generation |
| `llm-api` | Yes | Yes (real APIs) | Medium | Publishing posts, sending emails, managing campaigns |
| `llm-new-api` | Yes | Yes (new APIs) | Medium | Recently integrated tools |

### 4.3 Sub-Agent Definition

Every sub-agent is defined by a `SubAgentDefinition`:

```typescript
{
  id: 'social-composer',           // Unique ID (kebab-case)
  codename: 'SOCIAL-COMPOSER',     // Display name
  chief: 'marketing',             // Parent chief agent
  category: 'llm-api',           // Execution category
  tools: SOCIAL_COMPOSER_TOOLS,   // Real tool functions
  systemPrompt: (ctx) => `...`,   // Context-aware prompt
  autonomyRules: {
    autonomous: ['draft_post'],              // No approval
    needsChiefApproval: ['schedule_posts'],  // Chief decides
    needsMerchantApproval: ['publish_social_post'],  // Always ask merchant
  }
}
```

### 4.4 Complete Sub-Agent Registry

#### PRISM (Marketing) — 8 Sub-Agents

| # | ID | Category | Tools | What It Does |
|---|---|---|---|---|
| 1 | campaign-architect | llm-api | `get_store_analytics_summary`, `get_seasonal_calendar` | Designs end-to-end campaign strategies with timing, channels, and budgets |
| 2 | social-composer | llm-api | `get_trending_products`, `publish_social_post`, `publish_instagram_post` | Writes platform-native social content AND publishes via Meta Graph API |
| 3 | visual-crafter | llm-api | `generate_product_image`, `render_image_from_prompt`, `get_brand_assets` | Generates product images via Vertex AI Imagen 3.0, uploads to Supabase Storage |
| 4 | reel-director | llm-only | _(none)_ | Scripts and storyboards short-form video content (Reels, Shorts, TikTok) |
| 5 | copysmith | llm-api | `find_weak_descriptions`, `update_product_descriptions` | Finds and rewrites weak product descriptions with SEO-optimized copy |
| 6 | ad-pilot | llm-api | `create_ad_campaign_plan`, `get_ad_spend_analysis`, `get_ad_campaigns`, `get_campaign_performance`, `pause_resume_campaign`, `adjust_campaign_budget` | Manages live Meta Ads + Google Ads campaigns — creates, monitors, pauses, adjusts budgets |
| 7 | seo-scout | llm-api | `run_seo_audit`, `get_keyword_suggestions` | Audits store SEO, finds missing meta tags, suggests keyword optimizations |
| 8 | influencer-finder | llm-api | `save_influencer`, `search_influencers`, `update_influencer_status`, `draft_outreach`, `send_outreach`, `get_outreach_history`, `get_influencer_stats` | Full influencer CRM — saves contacts, tracks pipeline, drafts & sends outreach emails |

#### FORGE (Sales) — 7 Sub-Agents

| # | ID | Category | Tools | What It Does |
|---|---|---|---|---|
| 1 | cart-whisperer | llm-api | `list_abandoned_carts`, `get_cart_details`, `send_cart_recovery_email` | Identifies abandoned carts, sends 3-email recovery sequence via Resend |
| 2 | price-strategist | llm-api | `get_pricing_analysis`, `suggest_price_change` | Analyzes pricing opportunities, competitor positioning, margin optimization |
| 3 | deal-engineer | llm-api | `get_coupon_performance`, `create_smart_coupon` | Creates targeted coupons based on customer segments and purchase patterns |
| 4 | upsell-agent | llm-api | `get_cross_sell_opportunities`, `create_bundle_suggestion` | Identifies cross-sell/upsell opportunities from order patterns |
| 5 | checkout-doctor | llm-api | `analyze_checkout_funnel`, `get_checkout_abandonment_data` | Diagnoses checkout drop-off causes and suggests fixes |
| 6 | loyalty-architect | llm-api | `create_loyalty_program`, `get_loyalty_program`, `get_customer_points`, `award_points`, `redeem_points`, `get_loyalty_stats`, `get_at_risk_customers`, `send_winback_email` | Designs and manages loyalty programs — points, tiers, redemption, win-back campaigns |
| 7 | lead-scorer | llm-api | `score_leads`, `get_lead_insights` | Scores customer leads by engagement, purchase intent, and lifetime value potential |

#### SENTINEL (Support) — 7 Sub-Agents

| # | ID | Category | Tools | What It Does |
|---|---|---|---|---|
| 1 | chat-responder | llm-api | `lookup_order`, `check_product_availability`, `get_store_policies` | Handles live chat queries — order status, product questions, store info |
| 2 | email-handler | llm-api | `parse_email_intent`, `draft_email_reply`, `send_email_reply` | Processes inbound support emails, drafts context-aware replies |
| 3 | whatsapp-agent | llm-api | `send_whatsapp_message`, `get_whatsapp_templates` | Handles WhatsApp support via MSG91 |
| 4 | returns-manager | llm-api | `get_return_policy`, `create_return_request`, `process_return` | Manages the return/refund lifecycle per store policies |
| 5 | review-curator | llm-api | `get_recent_reviews`, `draft_review_response`, `flag_fake_review` | Monitors reviews, drafts responses, flags suspicious reviews |
| 6 | escalation-detector | llm-api | `analyze_sentiment`, `detect_escalation_signals` | Detects angry/frustrated customers and auto-escalates to merchant |
| 7 | faq-builder | llm-api | `get_common_questions`, `generate_faq_entry` | Analyzes support conversations to auto-generate FAQ entries |

#### PULSE (Analytics) — 8 Sub-Agents

| # | ID | Category | Tools/Query | What It Does |
|---|---|---|---|---|
| 1 | revenue-tracker | data-only | `revenueTrackerQuery` | GMV, AOV, revenue trends, daily breakdown, payment status distribution |
| 2 | traffic-analyst | data-only | `trafficAnalystQuery` | Visitor sessions, page views, bounce rates, traffic source attribution |
| 3 | customer-profiler | data-only | `customerProfilerQuery` | RFM segments, LTV profiles, top customers, new vs returning |
| 4 | product-ranker | data-only | `productRankerQuery` | Product rankings by revenue/velocity, top sellers, slow movers, stock alerts |
| 5 | funnel-analyst | data-only | `funnelAnalystQuery` | Conversion funnel drop-off at each stage |
| 6 | competitor-watcher | llm-api | `get_market_position` | Competitive positioning analysis — pricing, categories, market gaps |
| 7 | anomaly-sentinel | data-only | `anomalySentinelQuery` | Detects revenue/order anomalies by comparing today vs 7-day averages |
| 8 | report-writer | llm-api | `get_report_data`, `send_report_email` | Synthesizes data into narrative business reports, emails to merchant |

#### CIPHER (Technical) — 7 Sub-Agents

| # | ID | Category | Tools | What It Does |
|---|---|---|---|---|
| 1 | seo-engineer | llm-api | `audit_meta_tags`, `fix_meta_tags`, `check_structured_data` | Deep SEO audits — meta tags, structured data, Open Graph, canonical URLs |
| 2 | speed-demon | llm-api | `analyze_page_speed`, `get_image_optimization_opportunities` | Page speed analysis, image optimization suggestions, bundle size monitoring |
| 3 | uptime-guardian | llm-api | `check_store_health`, `verify_ssl`, `check_dns` | Monitors store availability, SSL certificate validity, DNS configuration |
| 4 | security-scanner | llm-api | `scan_vulnerabilities`, `check_headers`, `audit_permissions` | Security header audits, vulnerability scanning, permission reviews |
| 5 | image-optimizer | llm-api | `get_unoptimized_images`, `optimize_image` | Finds unoptimized images, queues compression/resize/enhance/WebP conversion jobs |
| 6 | integration-doctor | llm-api | `check_integration_health`, `diagnose_connection` | Monitors health of connected services (Razorpay, Stripe, Resend, shipping providers) |
| 7 | backup-manager | llm-api | `export_store_data`, `list_backups` | Creates JSON backups uploaded to Supabase Storage with 7-day signed download URLs |

### 4.5 Sub-Agent Routing

Tasks are routed to sub-agents via keyword matching — no LLM needed for routing:

```typescript
const ROUTING_KEYWORDS = {
  'campaign-architect': ['campaign', 'launch', 'marketing strategy', 'seasonal'],
  'social-composer':    ['social', 'instagram', 'facebook', 'post', 'caption', 'hashtag'],
  'cart-whisperer':     ['abandoned cart', 'cart recovery', 'cart email'],
  'price-strategist':   ['price', 'pricing', 'competitor price', 'margin'],
  'loyalty-architect':  ['loyalty', 'reward', 'retention', 'repeat customer', 'churn'],
  'influencer-finder':  ['influencer', 'creator', 'partnership', 'collaboration', 'outreach'],
  'image-optimizer':    ['image optim', 'compress', 'webp', 'image size', 'thumbnail'],
  // ... all 37 agents have routing keywords
}
```

**Routing algorithm**:
1. Score each sub-agent by longest keyword match in the task text
2. Filter to sub-agents under the requesting chief
3. Return highest-scoring match (or fallback to chief's default)
4. `routeToSubAgentGlobal()` can find the best match across all chiefs

---

## 5. Execution Pipeline

### 5.1 Chief Agent Execution (`BaseAgent.execute()`)

```
Input: { storeId, task, context }
   |
   v
[1] Load agent_states for this store+agent
    - Is enabled? → If not, return early
    - Budget exhausted? → If yes, return early
   |
   v
[2] Transition state: idle → running
   |
   v
[3] Select model tier (fast/standard/advanced/premium)
    - Based on task complexity + agent config
   |
   v
[4] Build system prompt
    - Inject store context (name, category, currency, brand vibe)
    - Support agent: async load knowledge base (products, policies, FAQs)
   |
   v
[5] Wrap tools with approval checking
    For each tool:
      - Check autonomyLevel vs tool risk
      - If requires approval: wrap to return approval request instead of executing
      - If allowed: wrap to log action after execution
   |
   v
[6] Call LLM with tool-use loop (max 10 steps)
    LLM generates text + optional tool calls
    Each tool call goes through approval wrapper
   |
   v
[7] Track token usage + calculate cost
   |
   v
[8] Transition state: running → idle
    Update action_count, last_run_at, error_count (if error)
   |
   v
[9] Log all actions to agent_actions table
   |
   v
Output: AgentResult { actions[], tokensInput, tokensOutput, durationMs }
```

### 5.2 Sub-Agent Execution

```
Input: { subAgentId, storeId, task }
   |
   v
[1] Look up SubAgentDefinition from registry
   |
   v
[2] Verify chief is enabled for this store
   |
   v
[3] Load store context (lazy — data fetched only when tools request it)
   |
   v
[4] Route by category:
    |
    +-- data-only → Execute queryFn() directly
    |                No LLM, no tokens, ~$0 cost
    |                Return structured data
    |
    +-- llm-only → generateText(systemPrompt, task)
    |              No tools — pure text generation
    |              For drafts, recommendations, creative work
    |
    +-- llm-api → Check autonomy rules for requested tools
                  |
                  +-- If auto-approved → generateText(systemPrompt, task, tools)
                  |                      Allow up to 5 tool-calling steps
                  |                      Track each tool call and result
                  |
                  +-- If needs approval → Run in plan-only mode
                                          LLM explains what it WOULD do
                                          Create approval request
                                          Return pending result
   |
   v
[5] Log to agent_actions (sub_agent_type, action_type, details)
   |
   v
Output: SubAgentResult { output, actions[], requiresApproval, approvalId }
```

### 5.3 Bot UI Execution (Chat)

```
User types message in chat sidebar
   |
   v
[1] POST /api/ai/bot with message + conversationHistory
   |
   v
[2] Auth: Cookie-based (local) or Bearer token (production)
   |
   v
[3] Build system prompt:
    - E-commerce benchmarks (AOV, repeat rate, CTR norms)
    - Indian market expertise (festivals, GST, UPI, COD)
    - Tool descriptions (which tool answers what)
    - Page context (what page the user is on)
    - Selected items context (if user selected products)
   |
   v
[4] Map 30+ tools to executable functions:
    - Read tools: getProducts, getOrders, getRevenueAnalytics, ...
    - Write tools: createProduct, createCoupon, updateStore, ...
    - Destructive tools: deleteProduct, processRefund, ...
   |
   v
[5] Confirmation gate for destructive tools:
    If (destructive && !isConfirmedAction):
      Return { requiresConfirmation: true, toolName, args }
      UI shows confirmation dialog
      User confirms → resend with [CONFIRMED] prefix
   |
   v
[6] LLM generates streaming response with tool calls (max 5 steps)
   |
   v
[7] Stream text + tool results to frontend
```

---

## 6. Inter-Agent Communication

### 6.1 Current Model: Event-Driven Triggers

Business events trigger multiple agents simultaneously:

```typescript
const TRIGGER_ROUTING = {
  'order.created':     ['sales', 'support', 'analytics'],
  'order.cancelled':   ['support', 'analytics'],
  'product.low_stock': ['sales', 'analytics'],
  'customer.complaint': ['support'],
  'review.negative':   ['support'],
  'cart.abandoned':    ['sales'],
  'payment.failed':    ['support', 'sales'],
}
```

When `emitTrigger()` fires:
1. Look up registered agents for this trigger type
2. Fan out to each agent (fire-and-forget, non-blocking)
3. Each agent independently evaluates and acts
4. Conflicts resolved by priority (see 6.2)

### 6.2 Conflict Resolution

When two agents try to act on the same entity within a 5-minute window:

**Priority hierarchy**: Support (5) > Sales (4) > Marketing (3) > Analytics (2) > Technical (1)

```
Agent A and Agent B both want to modify Order #1234
   |
   v
Check: Are they within 5-min window on same entity?
   |
   v
Yes → Compare priority:
   |
   +-- Different priority → Higher wins, lower blocked
   |
   +-- Same priority → Escalate to merchant as approval request
```

### 6.3 Cross-Agent Notifications

Agents can send structured notifications to each other:

```typescript
crossAgentNotify({
  from_agent: 'analytics',
  to_agent: 'marketing',
  notification_type: 'anomaly_detected',
  payload: { metric: 'revenue', change: '-15%', reason: 'competitor_promo' }
})
```

Example flows:
- **PULSE detects revenue drop** → notifies PRISM → PRISM adjusts ad spend
- **SENTINEL sees spike in complaints** → notifies FORGE → FORGE creates recovery coupon
- **CIPHER finds broken images** → notifies PRISM → PRISM pauses social posts using those images

### 6.4 What's Missing (see Mega-Orchestrator, Section 13)

The current system is **reactive** — agents respond to triggers and notifications independently. What's missing:

1. **Coordinated multi-agent plans**: "Launch summer sale" should orchestrate PRISM (ads), FORGE (discounts), SENTINEL (FAQ update), PULSE (tracking dashboard), CIPHER (landing page optimization) as one coordinated effort
2. **Shared goals**: No concept of "all agents work toward increasing Q2 revenue by 20%"
3. **Resource arbitration**: Two agents might both want to email the same customer on the same day
4. **Performance feedback loops**: PULSE should feed performance data back to PRISM/FORGE to tune their strategies automatically

---

## 7. Approval Workflow & Autonomy Levels

### 7.1 Five Autonomy Levels

| Level | Name | Behavior |
|-------|------|----------|
| 1 | Observer | Agents can analyze and recommend. Almost everything needs approval. |
| 2 | Manual | Read-only operations auto-execute. All write operations need approval. |
| 3 | Semi-autonomous | Standard operations auto-execute. High-risk (money, pricing, public-facing) needs approval. |
| 4 | Mostly autonomous | Only merchant-level actions need approval. Chief-level approvals auto-grant. |
| 5 | Full autonomous | Only hard-coded merchant-level gates remain (e.g., refunds, price changes always need approval). |

### 7.2 Approval Lifecycle

```
Agent wants to execute a tool
   |
   v
Check: checkToolPermission(agentType, toolName, autonomyLevel, args)
   |
   +-- allowed, requiresApproval: false → Execute immediately
   |
   +-- allowed, requiresApproval: true → Create approval request
       |
       v
   Insert into agent_approvals:
   { store_id, agent_type, action_type, summary, details, priority, expires_at }
       |
       v
   Merchant sees in Dashboard → Approvals page (real-time via Supabase subscriptions)
       |
       +-- Approve → Execute action, log as 'approved', update agent_actions
       |
       +-- Reject → Log as 'rejected', agent learns from rejection (memory)
       |
       +-- Expires (24h) → Log as 'expired', no action taken
```

### 7.3 Hard-Coded Approval Gates

These actions **always** require merchant approval regardless of autonomy level:

| Agent | Actions |
|-------|---------|
| Marketing | `publish_social_post`, `publish_instagram_post`, `launch_campaign`, `allocate_budget`, `pause_resume_campaign`, `adjust_campaign_budget` |
| Sales | `change_price`, `create_discount` (>10%), `activate_loyalty_program`, `issue_rewards`, `send_outreach` |
| Support | `process_refund` (>500 INR), `finalize_partnership` |
| Technical | _(none currently — all SEO writes can be auto-approved at level 5)_ |
| Analytics | _(none — read-only agent)_ |

---

## 8. Memory System

### 8.1 Memory Types

| Type | Source | Decay | Example |
|------|--------|-------|---------|
| `preference` | Merchant feedback | Never | "Always write product descriptions in Hindi + English" |
| `pattern` | Data analysis | After 90 days | "Sales spike every Friday evening 6-9 PM" |
| `feedback` | Approval/rejection | Never | "Merchant rejected 15% discount — prefers max 10%" |
| `context` | Explicit config | Never | "Store category is premium fashion, target audience 25-35" |

### 8.2 Memory Confidence

Each memory has a confidence score (0.0 to 1.0):

| Source | Default Confidence |
|--------|-------------------|
| `merchant_feedback` | 1.0 (explicit instruction) |
| `explicit_config` | 1.0 (set in settings) |
| `approval_pattern` | 0.8 (learned from approvals) |
| `data_analysis` | 0.6 (inferred from data) |

Lower confidence memories can be overridden by higher confidence ones.

### 8.3 Memory in Practice

When an agent executes, relevant memories are loaded into the system prompt:

```
Agent system prompt:
  "You are SOCIAL-COMPOSER for {storeName}..."
  
+ Memory injection:
  "LEARNED PREFERENCES (from merchant feedback):
   - Always use Hindi captions for Instagram
   - Never use discount language — brand is premium
   - Post frequency: max 3x per week
   
   LEARNED PATTERNS (from data):
   - Best engagement: Tuesday and Thursday 7-9 PM IST
   - Product photos outperform lifestyle shots 2:1
   - Hashtag sweet spot: 4-5 per post"
```

---

## 9. Cost Tracking & Model Routing

### 9.1 Model Tiers

| Tier | Model | Cost (per 1M tokens) | Use Case |
|------|-------|---------------------|----------|
| fast | Gemini 2.0 Flash | ~$0.075 input, $0.30 output | Default for most operations |
| standard | Claude 3.5 Sonnet | ~$3 input, $15 output | Complex reasoning, support |
| advanced | Claude Opus | ~$15 input, $75 output | Critical decisions, reports |
| premium | Reserved | Varies | Enterprise customers |

### 9.2 Model Selection

```typescript
selectModel(agentType, taskComplexity, storeConfig)
  → { tier, modelId, costPer1kInput, costPer1kOutput }
```

Default routing:
- Data-only sub-agents: No LLM (cost = $0)
- Creative tasks (copy, social posts): fast tier
- Support conversations: fast tier (with fallback to standard for complex queries)
- Report generation: standard tier
- Strategy recommendations: standard tier

### 9.3 Budget Controls

```
Per-store budget tracking:
  agent_cost_tracking.budget_limit_usd = 50.00  (monthly limit)
  agent_cost_tracking.total_llm_cost_usd = 23.45  (current month)
  
Before each execution:
  if (total_llm_cost_usd >= budget_limit_usd):
    skip execution, log "budget_exhausted"
```

---

## 10. Cron & Scheduling

### 10.1 Current Schedule (Vercel Hobby — daily crons only)

| Time (UTC) | Cron Route | What Runs |
|------------|-----------|-----------|
| 00:03 | `/api/cron/sub-agents?task=daily` | revenue-tracker, report-writer, image-optimizer |
| 00:04 | `/api/cron/optimize-images` | Process queued Sharp image optimization jobs |
| 00:05 | `/api/cron/sub-agents?task=health-check` | uptime-guardian, integration-doctor |
| 02:30 | `/api/cron/daily-digest` | Daily analytics digest for each store |
| 03:30 (Mon) | `/api/cron/weekly-report` | Weekly business report |
| 06:00 | `/api/cron/publish-scheduled` | Publish scheduled products |
| 08:00 | `/api/cron/marketing-optimize` | Marketing campaign optimization |
| 09:00 | `/api/cron/check-low-stock` | Low stock alerts to merchants |
| 10:00 | `/api/cron/process-abandoned-carts` | Send cart recovery emails |
| 12:00 | `/api/cron/sub-agents?task=hourly` | anomaly-sentinel, cart-whisperer |
| 14:00 | `/api/cron/marketing-sync` | Sync ad spend data from Meta/Google |

### 10.2 Execution Pattern

Each cron route:
1. Validates `Authorization: Bearer ${CRON_SECRET}`
2. Iterates over all active stores
3. For each store, checks if the relevant agent is enabled
4. Dispatches to sub-agents or runs direct logic
5. Logs results to `agent_actions`
6. Returns JSON summary

---

## 11. Security & Guardrails

### 11.1 Authentication & Authorization

| Layer | Mechanism |
|-------|-----------|
| API routes | Supabase Auth (cookie-based + Bearer token fallback) |
| Cron routes | `CRON_SECRET` Bearer token |
| Store isolation | Every query filtered by `store_id`, RLS enforced |
| Agent operations | `getSupabaseAdmin()` with `service_role` (bypasses RLS) |
| Webhook verification | Razorpay + Stripe signature verification |
| Encryption | AES-256-GCM for stored credentials (Meta tokens, Razorpay keys, Resend keys) |

### 11.2 Agent Guardrails

- **Budget exhaustion**: Agents stop if LLM cost exceeds store budget
- **Approval expiry**: Unapproved actions expire after 24 hours
- **Conflict resolution**: Priority-based arbitration prevents conflicting actions
- **Rate limiting**: API routes: 100/min, AI routes: 10/min, Auth routes: 5/min
- **Tool confirmation**: Destructive bot actions require explicit user confirmation
- **Prompt injection defense**: System prompts include guardrails against prompt injection
- **Autonomy caps**: Even at level 5, spending-money actions always need merchant approval

### 11.3 Data Isolation

Every table with agent data includes:
- `store_id` foreign key (tenant isolation)
- Row Level Security policies (authenticated users see only their store)
- `service_role` bypass policies (for agent backend operations)

---

## 12. Current State Assessment

### 12.1 What Works Well

| Area | Status | Notes |
|------|--------|-------|
| Sub-agent architecture | Strong | 37 agents with clear separation of concerns |
| Tool execution | Strong | Real API calls (Meta, Razorpay, Stripe, Resend, MSG91, Sharp, Vertex AI) |
| Approval workflow | Strong | 5-level autonomy with real-time UI |
| Data-only agents | Strong | Fast, cheap, deterministic analytics |
| Cron scheduling | Working | 11 cron jobs running daily |
| Bot UI | Working | 30+ tools with confirmation flow |
| Cost tracking | Working | Per-store budgets and token tracking |
| Memory system | Basic | Schema exists, injection into prompts works, but agents don't actively learn yet |

### 12.2 What Needs Improvement

| Area | Gap | Impact |
|------|-----|--------|
| **Orchestration** | No mega-orchestrator — agents work independently, no coordinated plans | Agents can't execute multi-step campaigns that span departments |
| **Inter-agent feedback** | PULSE detects problems but can't automatically trigger PRISM/FORGE responses | Reactive instead of proactive |
| **Memory learning** | Agents don't automatically learn from approval/rejection patterns | Same mistakes repeated |
| **Testing** | No automated agent behavior tests | Regressions possible with prompt changes |
| **Observability** | Basic logging only — no agent performance dashboards | Hard to know which agents deliver ROI |
| **Multi-language** | English-only prompts and outputs | Limits Indian market reach |
| **Customer-facing agents** | Support agent answers questions but can't proactively reach out | Missed upsell/retention opportunities |

---

## 13. Mega-Orchestrator Design

### 13.1 Why a Mega-Orchestrator?

Currently, agents are **independently intelligent but collectively uncoordinated**. The mega-orchestrator is the "CEO layer" — it:

1. **Sets shared goals** across all five departments
2. **Decomposes complex initiatives** into multi-agent plans
3. **Arbitrates resources** (budget, email sends, customer touchpoints)
4. **Feeds performance data** back into agent strategies
5. **Prevents conflicts** before they happen (proactive, not reactive)

### 13.2 Architecture

```
                        MERCHANT
                           |
                    [Sets Store Goals]
                    "Increase revenue 20% in Q2"
                    "Launch summer collection"
                    "Reduce support tickets 30%"
                           |
                           v
                  +------------------+
                  | MEGA-ORCHESTRATOR |
                  | (Apex Agent)      |
                  +------------------+
                  | - Goal decomposer |
                  | - Plan generator  |
                  | - Resource arbiter|
                  | - Feedback loop   |
                  | - Conflict preventer |
                  +------------------+
                           |
            +---------+---------+---------+---------+
            |         |         |         |         |
         PRISM     FORGE    SENTINEL   PULSE    CIPHER
         (exec)    (exec)   (exec)     (data)   (exec)
```

### 13.3 Goal Decomposition

When the merchant sets a goal like "Launch summer sale next week":

```
MEGA-ORCHESTRATOR receives: "Launch summer sale next week"
   |
   v
[Decompose into department tasks]
   |
   +-- PULSE (Analytics):
   |   - Analyze last year's summer sale performance
   |   - Identify top-selling summer products
   |   - Set revenue targets for this sale
   |   - Create real-time tracking dashboard
   |
   +-- PRISM (Marketing):
   |   - Design campaign strategy (channels, timing, budget)
   |   - Generate visual assets for sale
   |   - Schedule social media posts (countdown, launch, reminder)
   |   - Set up Meta/Google Ads with sale targeting
   |   - Brief influencers for amplification
   |
   +-- FORGE (Sales):
   |   - Create sale coupon codes with smart limits
   |   - Set up cart recovery emails with sale messaging
   |   - Prepare upsell bundles for sale products
   |   - Configure loyalty bonus points for sale period
   |
   +-- SENTINEL (Support):
   |   - Update FAQ with sale terms & conditions
   |   - Prepare response templates for sale-related queries
   |   - Staff escalation rules for high-volume period
   |
   +-- CIPHER (Technical):
   |   - Create sale landing page
   |   - Optimize sale product images
   |   - Run load test / uptime check
   |   - Set up sale-specific SEO meta tags
   |
   v
[Generate execution timeline]
   Day -3: PULSE analysis + CIPHER prep + FORGE coupon creation
   Day -2: PRISM asset generation + SENTINEL FAQ update
   Day -1: PRISM social teasers + PRISM ad setup
   Day  0: PRISM launch posts + FORGE activates discounts + PULSE starts tracking
   Day +1: PRISM boosts top-performing ads + FORGE sends win-back emails to non-buyers
   Day +7: PULSE generates post-sale report + FORGE deactivates coupons
   |
   v
[Submit plan for merchant approval as ONE approval request]
```

### 13.4 Resource Arbitration

The orchestrator manages shared resources to prevent conflicts:

**Email quota management**:
```
Daily limit: 500 emails per store

FORGE wants to send: 200 cart recovery emails
PRISM wants to send: 150 campaign emails
SENTINEL wants to send: 50 support replies
FORGE wants to send: 100 win-back emails

Total requested: 500 → At limit

Orchestrator decision:
  Priority 1: SENTINEL support replies (50) — must send
  Priority 2: FORGE cart recovery (200) — high revenue impact
  Priority 3: PRISM campaign (150) — scheduled, can partially defer
  Priority 4: FORGE win-back (100) — lower urgency, defer 50 to tomorrow
  
  Allocated: 50 + 200 + 150 + 50 = 450 (50 deferred)
```

**Customer touchpoint limits**:
```
Rule: No customer should receive more than 2 automated messages per day

Customer #1234 already received:
  - 10:00 AM: Cart recovery email (FORGE)

PRISM wants to send campaign email at 2:00 PM → ALLOWED (2nd touch)
FORGE wants to send loyalty reminder at 6:00 PM → BLOCKED (would be 3rd touch)
```

**Ad budget allocation**:
```
Monthly ad budget: $500

PRISM requests:
  - Meta Ads campaign: $200
  - Google Ads campaign: $150
  - Influencer gifting: $100
  Total requested: $450

Orchestrator checks PULSE data:
  - Meta ROAS last month: 3.2x
  - Google ROAS last month: 1.8x
  
Reallocation suggestion:
  - Meta Ads: $250 (higher ROAS, increase)
  - Google Ads: $100 (lower ROAS, decrease)
  - Influencer: $100 (keep)
  - Reserve: $50 (buffer for opportunities)
```

### 13.5 Feedback Loops

The orchestrator closes the loop between action and result:

```
PRISM launches Instagram campaign (Day 0)
   |
   v
PULSE tracks performance hourly (Day 0-3)
   - Day 1: CTR 2.1%, conversions 12
   - Day 2: CTR 1.8%, conversions 8 (dropping)
   - Day 3: CTR 1.2%, conversions 3 (significant drop)
   |
   v
ORCHESTRATOR detects underperformance (below 1.5% CTR threshold)
   |
   v
Auto-triggers:
  1. PRISM: AD-PILOT adjusts targeting (broader audience)
  2. PRISM: SOCIAL-COMPOSER creates new creative variant
  3. FORGE: DEAL-ENGINEER increases discount from 10% to 15%
  |
   v
PULSE continues monitoring...
  - Day 4: CTR 2.5%, conversions 18 (recovered!)
   |
   v
ORCHESTRATOR logs success pattern:
  Memory: "Instagram campaigns in {category} lose steam after 48h — 
           pre-schedule creative refresh and discount bump at Day 3"
```

### 13.6 Orchestrator Implementation Plan

**Phase 1 — Goal-Plan-Execute (Near-term)**:
- Merchant sets goals in natural language
- Orchestrator decomposes into per-agent task lists
- Tasks dispatched via existing sub-agent execution
- Single approval for the entire plan

**Phase 2 — Resource Arbitration (Medium-term)**:
- Email quota tracking and allocation
- Customer touchpoint frequency limits
- Ad budget allocation based on ROAS
- Conflict prevention (proactive, not reactive)

**Phase 3 — Autonomous Feedback Loops (Long-term)**:
- Real-time performance monitoring → auto-adjustment
- Cross-agent learning (patterns that work for one store inform others)
- Self-improving strategies based on outcome data
- Anomaly → Response → Measurement → Learning cycle

---

## 14. Roadmap

### 14.1 Near-Term (Next 3 Months)

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| P0 | **Goal-Plan-Execute orchestrator** — decompose merchant goals into multi-agent plans | Large | Transforms from "5 independent agents" to "1 coordinated team" |
| P0 | **Memory auto-learning** — agents learn from approval/rejection patterns automatically | Medium | Reduces repeated approval requests, agents get smarter over time |
| P1 | **Agent performance dashboard** — show ROI per agent (emails sent, revenue attributed, time saved) | Medium | Merchants understand agent value, builds trust for higher autonomy |
| P1 | **Multi-language prompts** — Hindi minimum for all agent outputs | Medium | Unlocks Indian market (60%+ of target merchants prefer Hindi) |
| P1 | **Customer-facing chat widget** — SENTINEL handles live customer support on storefront | Medium | Major value-add — 24/7 AI support without merchant intervention |
| P2 | **Agent behavior tests** — automated test suite for agent prompts and tool execution | Medium | Prevents regressions when prompts or tools change |
| P2 | **Email quota management** — track sends per store, prevent over-emailing | Small | Prevents deliverability issues and customer annoyance |

### 14.2 Medium-Term (3-12 Months)

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| P0 | **Full mega-orchestrator** — resource arbitration, customer touchpoint limits, budget allocation | Large | Agents become a truly coordinated team |
| P0 | **Performance feedback loops** — PULSE data auto-triggers PRISM/FORGE adjustments | Large | Campaigns self-optimize without merchant intervention |
| P1 | **Autonomous A/B testing** — PRISM tests subject lines, FORGE tests discount levels, CIPHER tests page layouts | Large | Data-driven optimization without merchant effort |
| P1 | **Cross-store learning** — anonymized patterns from successful stores inform new stores | Large | New merchants benefit from collective intelligence |
| P1 | **WhatsApp Commerce** — SENTINEL handles full purchase flow via WhatsApp | Large | Massive channel in India (500M+ users) |
| P2 | **Voice agent** — phone support via AI voice (Twilio/Exotel) | Large | Complete omnichannel support |
| P2 | **Predictive inventory** — FORGE predicts stock-outs before they happen | Medium | Prevents lost sales from out-of-stock items |
| P2 | **Smart notification routing** — right message, right channel, right time per customer | Medium | Higher engagement, lower unsubscribe rates |

### 14.3 Full Vision (1-2 Years)

| Item | Description |
|------|-------------|
| **Self-improving agents** | Agents measure their own performance, modify their strategies, and A/B test their own prompts. The system gets better without engineering intervention. |
| **Agent marketplace** | Third-party developers create specialized sub-agents (e.g., "Etsy cross-listing agent", "Instagram Reel editor agent") that plug into the existing hierarchy. |
| **Industry benchmarks** | "Your store's cart recovery rate is 12% — top 20% in fashion. Here's what the top 5% do differently." Powered by anonymized cross-store analytics. |
| **Autonomous seasonal campaigns** | Agent system detects upcoming festivals/seasons, designs campaigns, gets one-click merchant approval, executes end-to-end, reports results. Merchant effort: 5 minutes. |
| **Multi-store orchestration** | Merchants with multiple stores get cross-store agents — shared inventory, unified customer profiles, coordinated marketing across brands. |
| **Real-time competitive response** | PULSE detects competitor price drop → FORGE evaluates margin impact → PRISM adjusts messaging → all within minutes, not days. |
| **Customer success agents** | Agents that proactively reach out to at-risk customers, celebrate milestones, personalize the entire post-purchase journey. Not reactive support — proactive relationship management. |
| **Financial planning agent** | New chief agent (6th) that handles accounting, tax compliance (GST), cash flow forecasting, and financial reporting. The merchant's AI CFO. |

### 14.4 Architecture Evolution

```
TODAY (v1):
  Merchant → Bot UI → Chief Agents → Sub-Agents → Tools
  (Independent execution, trigger-based coordination)

NEAR-TERM (v2):
  Merchant → Goals → Orchestrator → Chief Agents → Sub-Agents → Tools
  (Goal-directed, planned execution, basic coordination)

MEDIUM-TERM (v3):
  Merchant → Goals → Orchestrator → Chief Agents → Sub-Agents → Tools
       ^                    |                              |
       |                    v                              v
       +---- Feedback <-- PULSE <-- Performance Data <-- Results
  (Closed-loop, self-adjusting, resource-aware)

FULL VISION (v4):
  Merchant → Approves → Orchestrator → Chief Agents → Sub-Agents → Tools
       ^         ^              |                |              |
       |         |              v                v              v
       |    Marketplace    Planning      Coordination    Marketplace
       |    (new agents)   Engine        Engine          (new tools)
       |                        |                |
       +-------- Feedback <---- Performance <--- Results
       |
       +-------- Cross-Store Intelligence (anonymized)
  (Self-improving, extensible, industry-aware)
```

---

## Appendix A: Database Schema (Agent Tables)

```sql
-- Agent state per store per agent type
agent_states (
  id, store_id, agent_type, is_enabled, status,
  autonomy_level, config, error_count, action_count,
  last_run_at, created_at, updated_at
)

-- Audit log of every agent action
agent_actions (
  id, store_id, agent_type, sub_agent_type,
  action_type, action_category, summary, details,
  status, execution_mode, approval_id,
  tokens_input, tokens_output, estimated_cost_usd, api_costs,
  started_at, completed_at, duration_ms,
  related_entity_type, related_entity_id
)

-- Pending/resolved approval requests
agent_approvals (
  id, store_id, agent_type, sub_agent_type,
  action_type, summary, details, tool_name, tool_args,
  status, priority, expires_at,
  resolved_at, resolved_by, resolution_notes
)

-- Agent learned preferences and patterns
agent_memory (
  id, store_id, agent_type, memory_key, memory_value,
  memory_type, source, confidence, expires_at,
  created_at, updated_at
)

-- LLM cost tracking per store
agent_cost_tracking (
  id, store_id, period,
  total_tokens_input, total_tokens_output,
  total_llm_cost_usd, total_api_cost_usd,
  budget_limit_usd, cost_by_agent, tokens_by_agent
)

-- Loyalty system (managed by LOYALTY-ARCHITECT)
loyalty_programs (id, store_id, name, points_per_currency_unit, tiers, ...)
loyalty_points (id, store_id, customer_id, balance, lifetime_earned, tier, ...)
loyalty_transactions (id, store_id, customer_id, type, points, description, ...)

-- Influencer CRM (managed by INFLUENCER-FINDER)
influencers (id, store_id, handle, platform, tier, status, ...)
influencer_outreach (id, store_id, influencer_id, channel, message, status, ...)
```

## Appendix B: Key File Locations

```
src/lib/agents/
├── base-agent.ts                    # BaseAgent class — execution engine
├── types.ts                         # AgentType, AgentState, AgentAction types
├── tool-registry.ts                 # Tool permission checking
├── trigger-emitter.ts               # Business event → agent dispatch
├── orchestrator.ts                  # Conflict resolution, cross-agent notify
├── model-router.ts                  # LLM model selection logic
├── marketing/agent.ts               # PRISM chief agent
├── sales/agent.ts                   # FORGE chief agent
├── support/agent.ts                 # SENTINEL chief agent
├── analytics/agent.ts               # PULSE chief agent
├── technical/agent.ts               # CIPHER chief agent
├── sub-agents/
│   ├── types.ts                     # SubAgentDefinition, SubAgentId
│   ├── executor.ts                  # Sub-agent execution engine
│   ├── router.ts                    # Keyword-based task routing
│   ├── registry/
│   │   ├── index.ts                 # Combines all registries
│   │   ├── prism.ts                 # Marketing sub-agents (8)
│   │   ├── forge.ts                 # Sales sub-agents (7)
│   │   ├── sentinel.ts              # Support sub-agents (7)
│   │   ├── pulse.ts                 # Analytics sub-agents (8)
│   │   └── cipher.ts               # Technical sub-agents (7)
│   ├── tools/
│   │   ├── prism-tools.ts          # Visual/Ad/SEO tools
│   │   ├── forge-tools.ts          # Cart/Loyalty/Winback tools
│   │   ├── cipher-tools.ts         # Image/Backup tools
│   │   └── new-agent-tools.ts      # Social/Influencer/Report tools
│   └── query-functions/
│       └── pulse-queries.ts         # Data-only query functions

src/app/api/
├── ai/bot/route.ts                  # Chat UI endpoint
├── agents/execute/route.ts          # Cron-based agent execution
├── agents/sub-agents/execute/       # Sub-agent execution API
├── agents/approvals/                # Approval CRUD
├── agents/memory/                   # Memory CRUD
├── cron/sub-agents/route.ts         # Sub-agent cron handler
├── cron/optimize-images/route.ts    # Image processing cron
├── customer/loyalty/route.ts        # Customer loyalty API
└── dashboard/competitor-prices/     # Competitor price management
```

---

*This document describes the agent system as of April 2026 (v1 production). The mega-orchestrator (Section 13) and roadmap items (Section 14) represent proposed architecture, not implemented features.*
