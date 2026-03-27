# Product Requirements Document — Autonomous AI Agent E-Commerce Platform

## 1. Vision

**Elevator pitch:** "Hire an AI team. Launch a store in 30 seconds. They run it while you sleep."

An e-commerce platform where five AI agents run the merchant's entire business — marketing, sales, support, analytics, and technical operations. The merchant provides products and strategic direction; agents handle everything else 24/7.

**The "One-Man Company" thesis:** AI agents eliminate the operational floor. A solo merchant with modest revenue gets the same operational sophistication as a funded D2C brand. The agents don't replace judgment — they replace bandwidth.

**Positioning:** Not a store builder with AI features. An AI team with a store built in.

## 2. Target Users

| Tier | Persona | Revenue | Needs | Plan |
|------|---------|---------|-------|------|
| Solo Creators | Instagram sellers, handmade goods | 0–1L/month | Instant store, auto-support, basic marketing | Free (usage limits) |
| Growing Merchants | D2C brands, 1-2 employees | 1L–10L/month | Ad optimization, analytics, instant support | 2K–5K/month |
| Scaling Brands | Established D2C, small teams | 10L+/month | Cross-channel coordination, technical ops | 10K–20K/month |

## 3. Core Concepts

### Autonomy Spectrum
| Level | Description | Examples |
|-------|-------------|----------|
| Auto-execute, silent | Routine, logged | Order status replies, SEO meta updates |
| Auto-execute, notify | Merchant should know | Pausing bad ads, cart recovery emails |
| Approval required | Costs money or irreversible | New campaigns, refunds, bulk emails, pricing changes |
| Merchant-only | Agents cannot do | Bank details, ownership, agent autonomy settings |

Defaults are conservative. Merchants can relax per agent over time.

### Agent State Machine
`IDLE → WORKING → NEEDS APPROVAL → COMPLETED` (or `ERROR`)

### Inter-Agent Coordination
Event-driven via Supabase Realtime (not LLM-to-LLM chat). Agents publish structured events others subscribe to. Conflicts escalate to merchant with both agents' reasoning.

### Agent Memory
Stored in `agent_memory` table. Types: explicit preferences, implicit (learned from approvals/rejections), business context. Confidence decays without reinforcement. Fully transparent — merchant can view/edit.

## 4. The Five Agents

### Marketing Agent (CMO)
- **Capabilities:** Meta/Google ad campaigns, email/WhatsApp campaigns, social media, SEO content, influencer outreach, seasonal calendars
- **APIs:** Meta Marketing API, Google Ads API, Resend (existing), MSG91 (existing), Gemini (existing)
- **Auto-execute:** Pause bad ads, send pre-approved content, adjust bids ±20%, weekly summaries
- **Needs approval:** New campaigns, budget increases, bulk broadcasts, >10% discounts
- **Key metrics:** ROAS, CAC, email/WhatsApp engagement, channel attribution

### Sales Agent (Revenue Manager)
- **Capabilities:** Cart recovery, dynamic pricing, refund processing, upsell/cross-sell, customer retention, COD-to-prepaid nudges
- **APIs:** Razorpay (existing), Stripe (existing), Supabase, Resend, MSG91, shipping providers (all existing)
- **Auto-execute:** Cart recovery emails/WhatsApp, small refunds (within threshold), cross-sell recs, daily summaries
- **Needs approval:** Large refunds, pricing changes, flash sales, bulk custom pricing
- **Key metrics:** Revenue, conversion rate, AOV, cart abandonment, LTV, refund rate

### Support Agent (Customer Success)
- **Capabilities:** WhatsApp/email/chat auto-response, order status, product Q&A, returns initiation, multi-language (EN/HI), sentiment analysis, review collection
- **APIs:** MSG91 (existing), Resend (existing), Gemini (existing), Supabase, shipping APIs, new WebSocket chat widget
- **Auto-execute:** Order status, product availability, policy Q&A, post-delivery review requests
- **Needs approval:** Any discounts/compensation, specific delivery promises, non-catalog info, abuse cases
- **Key metrics:** Response time, resolution rate, satisfaction score, escalation rate

### Analytics Agent (BI Analyst)
- **Capabilities:** Real-time dashboard, anomaly detection, daily/weekly/monthly reports, cohort analysis, product performance, channel attribution, forecasting, NL queries
- **APIs:** Supabase (existing), GA4 Data API, Search Console API, Razorpay/Stripe (existing)
- **Auto-execute:** All — purely observational. Generates reports, detects anomalies, surfaces insights
- **Needs approval:** None — routes recommendations to appropriate agents
- **Key metrics:** All business metrics (revenue, orders, conversion, traffic, LTV, margins)

### Technical Agent (SRE)
- **Capabilities:** Core Web Vitals monitoring, SEO audit, Search Console, image optimization, broken link detection, uptime monitoring, structured data, error monitoring
- **APIs:** PageSpeed Insights API, Search Console API, Sharp (existing), Vercel API
- **Auto-execute:** Meta tag updates, sitemap regen, structured data, image optimization, alt text, error logging
- **Needs approval:** Theme/layout changes, DNS changes, redirects, CDN purge, security header changes
- **Key metrics:** Web Vitals, PageSpeed score, indexing status, uptime, error rate

## 5. User Journeys

### Journey 1: Store Live in 30 Seconds
1. Google Sign-In (0-5s)
2. Three questions: "What do you sell?", "Store name?", "Pick a vibe" (5-20s)
3. Auto-generation: theme, platform Razorpay, self-delivery, 3 demo products (20-28s)
4. Live at `{name}.platform.tld` with working cart and payments (28-30s)

Platform-managed payments (Razorpay/Stripe) by default — merchants connect their own later for direct settlement. Demo products flagged `is_demo: true`, removed on first real upload.

### Journey 2: AI Team Activates in 30 Minutes
- Minutes 0-2: Welcome briefing — agents introduce themselves with initial actions
- Minutes 2-10: OAuth connections (Meta, Google, Razorpay, Shiprocket, MSG91) — not API keys
- Minutes 10-20: Conversational configuration — agents ask key questions inline
- Minutes 20-30: First agent actions — SEO optimization, dashboard setup, campaign draft, cart recovery config

No connection is blocking. Everything works with reduced capability if skipped.

### Journey 3: Daily CEO Operations
Open dashboard → process approval queue (< 2 min) → review morning briefing → close. Agents handle the rest. Approval queue sorted by urgency (time-sensitive > money > strategic). Accessible via dashboard, push notification, and WhatsApp.

## 6. Data Model Additions

```
agent_states:       store_id, agent_type, status, current_task, last_active
agent_actions:      store_id, agent_type, action_type, status, payload, result, requires_approval
agent_memory:       store_id, agent_type, memory_type, content(jsonb), confidence, source
agent_coordination: from_agent, to_agent, event_type, payload, response, status
approval_queue:     store_id, agent_type, action_id, summary, reasoning, impact, urgency, status
agent_metrics:      store_id, agent_type, metric_name, value, period
```

## 7. New API Integrations Required

| API | Agents | Difficulty | Cost |
|-----|--------|-----------|------|
| Google Search Console | Technical, Analytics | Medium (OAuth) | Free |
| Google PageSpeed Insights | Technical | Easy (no auth) | Free |
| Meta Marketing API | Marketing | Hard (verification) | Free (ad spend separate) |
| Google Ads API | Marketing | Hard (dev token) | Free (ad spend separate) |
| GA4 Data API | Analytics | Medium (OAuth) | Free |
| WebSocket chat widget | Support | Medium (new build) | Free |

## 8. Design Language
- Linear/Vercel/Raycast inspired — dark, minimal, fast, keyboard-first
- Agent cards with status, avatars, activity feeds
- Approval queue as primary decision interface
- Natural language interaction via Cmd+K
- Conversational configuration (not settings pages)

## 9. Estimated LLM Cost
$22-115/month per store with tiered model routing (cheap models for simple tasks, capable models for complex decisions).
