# The AI Company — Agent & Sub-Agent Hierarchy

**Vision:** The merchant becomes the CEO of a one-person company. Five C-suite AI agents run the business, each with specialized sub-agents that handle specific functions. The merchant sets the vision — the AI company executes it.

**Date:** 2026-03-25
**Status:** Vision Document

---

## Architecture

```
MASTER ORCHESTRATOR (The Board)
├── PRISM — Chief Marketing Officer (8 sub-agents)
├── FORGE — Chief Revenue Officer (7 sub-agents)
├── SENTINEL — Chief Customer Officer (7 sub-agents)
├── PULSE — Chief Data Officer (8 sub-agents)
└── CIPHER — Chief Technology Officer (7 sub-agents)

Total: 1 Master Orchestrator + 5 Chiefs + 37 Sub-Agents = 43 AI workers
```

## Cross-Department Communication (Hybrid Model)

- **Read access is cross-functional** — any sub-agent can pull data from any other sub-agent (e.g., Marketing's Visual Crafter can read product performance data from Analytics)
- **Write actions are strictly hierarchical** — sub-agents can only execute through their own Chief
- **Important actions require Chief approval** — sub-agents prepare work, Chiefs approve before execution
- **Routine/low-risk actions are autonomous** — sub-agents can execute without approval (e.g., generating a report, answering a FAQ, compressing an image)

---

## MASTER ORCHESTRATOR (The Board)

No sub-agents — it IS the top-level orchestrator.

| Responsibility | What It Does |
|---------------|-------------|
| **Task Routing** | Receives merchant commands (natural language) and routes to the right Chief agent |
| **Conflict Resolution** | When agents disagree (Marketing wants to discount, Sales says margins are thin), the Orchestrator makes the call based on business priorities |
| **Cross-Department Coordination** | Orchestrates multi-agent workflows (e.g., "Launch a new product" involves CIPHER for SEO, PRISM for marketing, FORGE for pricing, PULSE for tracking) |
| **Priority Management** | Decides what matters most right now — if the site is down, CIPHER takes priority over PRISM's campaign |
| **Strategic Briefings** | Generates daily "CEO briefings" combining insights from all 5 Chiefs into one summary |
| **Budget Allocation** | Distributes the merchant's AI budget across agents based on current priorities and ROI |

---

## PRISM — CMO (Marketing) — 8 Sub-Agents

| Sub-Agent | Role | What It Does | Autonomy |
|-----------|------|-------------|----------|
| **Campaign Architect** | Strategy & Planning | Plans multi-channel campaigns (Diwali sale, new launch, seasonal). Defines goals, timelines, budgets. Coordinates other marketing sub-agents. | Chief approves campaign plans and budgets |
| **Social Composer** | Social Media Content | Writes captions, selects hashtags, schedules posts across Instagram, Facebook, Twitter. Understands platform-specific voice and format. | Chief approves before posting |
| **Visual Crafter** | Graphics & Images | Generates product images, banners, social media creatives, story templates. Uses AI image generation with brand colors/fonts. | Autonomous for drafts; Chief approves final publish |
| **Reel Director** | Video & Short-Form | Creates product demo scripts, reel concepts, video storyboards. Generates short-form video content for Instagram/YouTube Shorts. | Chief approves before publishing |
| **Copysmith** | Writing & Copy | Writes email campaigns, product descriptions, taglines, blog posts, ad copy. Maintains brand voice across all written content. | Autonomous for product descriptions; Chief approves campaigns and ads |
| **Ad Pilot** | Paid Advertising | Manages Google Ads and Meta Ads campaigns. Sets budgets, targets audiences, optimizes bids, pauses underperformers. | Chief approves budget and new campaigns; autonomous for bid optimization |
| **SEO Scout** | Search Optimization | Researches keywords, optimizes product titles/descriptions for search, builds internal linking strategy, monitors rankings. | Autonomous for analysis; Chief approves content changes |
| **Influencer Finder** | Partnerships | Identifies relevant influencers/creators in the merchant's niche. Drafts outreach messages. Tracks collaboration ROI. | Chief approves outreach and partnerships |

---

## FORGE — CRO (Sales) — 7 Sub-Agents

| Sub-Agent | Role | What It Does | Autonomy |
|-----------|------|-------------|----------|
| **Cart Whisperer** | Abandonment Recovery | Monitors abandoned carts in real-time. Sends recovery emails/WhatsApp in a timed sequence. Personalizes offers based on cart value and customer history. | Autonomous for standard recovery emails; Chief approves discount offers |
| **Price Strategist** | Dynamic Pricing | Monitors competitor prices, analyzes demand elasticity, suggests price adjustments. Can auto-adjust within merchant-set bounds. | Chief approves price changes; autonomous for analysis and suggestions |
| **Deal Engineer** | Discounts & Promotions | Creates flash sales, bundle deals, buy-one-get-one offers, loyalty discounts. Times promotions to maximize revenue, not just volume. | Chief approves all promotions (involves money) |
| **Upsell Agent** | Cross-sell & Upsell | Analyzes purchase patterns to recommend "frequently bought together" and "you might also like." Optimizes product page recommendations. | Autonomous — recommendations are low-risk |
| **Checkout Doctor** | Conversion Optimization | Identifies checkout friction (drop-off points, form errors, payment failures). Suggests and implements fixes. A/B tests checkout flows. | Autonomous for analysis; Chief approves UI changes |
| **Loyalty Architect** | Repeat Customers | Designs and manages loyalty/rewards programs. Identifies at-risk customers (haven't purchased in X days). Sends win-back campaigns. | Chief approves program design; autonomous for win-back emails |
| **Lead Scorer** | Visitor Intelligence | Scores website visitors by purchase intent (pages viewed, time on site, cart behavior). Prioritizes high-intent visitors for targeted offers. | Autonomous — analysis only, no customer-facing actions |

---

## SENTINEL — CCO (Support) — 7 Sub-Agents

| Sub-Agent | Role | What It Does | Autonomy |
|-----------|------|-------------|----------|
| **Chat Responder** | Live Chat | Handles real-time customer chat on the storefront. Answers product questions, helps with sizing, resolves order issues. Escalates when needed. | Autonomous for standard queries; escalates complex/angry customers to Chief |
| **Email Handler** | Email Support | Processes incoming customer emails. Categorizes, drafts responses, resolves common issues (tracking, returns, exchanges) autonomously. | Autonomous for standard responses; Chief approves non-standard resolutions |
| **WhatsApp Agent** | WhatsApp Business | Sends order confirmations, shipping updates, delivery alerts via WhatsApp. Handles customer replies and inquiries on WhatsApp. | Autonomous for transactional messages; Chief approves promotional messages |
| **Returns Manager** | Refunds & Returns | Processes return requests, evaluates eligibility against store policy, initiates refunds, arranges return shipping. | Autonomous within policy; Chief approves refunds above threshold |
| **Review Curator** | Reviews & Reputation | Solicits reviews post-delivery (timed email/WhatsApp). Responds to negative reviews professionally. Flags fake reviews. Highlights top reviews on product pages. | Autonomous for solicitation; Chief approves responses to negative reviews |
| **Escalation Detector** | Sentiment & Escalation | Monitors all customer interactions for anger, frustration, or legal threats. Auto-escalates to merchant with context summary. Prevents small issues from becoming PR problems. | Autonomous — detection and alerting only |
| **FAQ Builder** | Self-Service Knowledge | Analyzes recurring support questions. Auto-generates and updates FAQ pages. Suggests new help articles based on trending issues. | Autonomous for drafts; Chief approves publishing |

---

## PULSE — CDO (Analytics) — 8 Sub-Agents

| Sub-Agent | Role | What It Does | Autonomy |
|-----------|------|-------------|----------|
| **Revenue Tracker** | Financial Analytics | Tracks daily/weekly/monthly revenue, AOV, refund rates, net revenue. Compares against targets and historical periods. | Fully autonomous — read-only analysis |
| **Traffic Analyst** | Visitor Intelligence | Monitors traffic sources (organic, paid, social, direct), bounce rates, session duration. Identifies which channels drive actual purchases vs. just visits. | Fully autonomous — read-only analysis |
| **Customer Profiler** | Segmentation & CLV | Segments customers by behavior (first-time, repeat, high-value, at-risk). Calculates customer lifetime value. Identifies VIP customers. | Fully autonomous — read-only analysis |
| **Product Ranker** | Product Performance | Ranks products by revenue, views, conversion rate, return rate. Identifies bestsellers, underperformers, and rising stars. Suggests which products to promote or discontinue. | Fully autonomous — analysis with suggestions |
| **Funnel Analyst** | Conversion Optimization | Maps the full purchase funnel (visit → product view → add to cart → checkout → purchase). Identifies biggest drop-off points with specific recommendations. | Fully autonomous — analysis with suggestions |
| **Competitor Watcher** | Market Intelligence | Monitors competitor pricing, new products, promotions, and social media activity. Alerts merchant to competitive threats and opportunities. | Fully autonomous — monitoring and alerting |
| **Anomaly Sentinel** | Alert System | Detects unusual patterns — sudden traffic spikes, revenue drops, unusually high return rates, inventory running out faster than expected. Sends real-time alerts. | Fully autonomous — detection and alerting |
| **Report Writer** | Automated Reporting | Generates daily digests, weekly summaries, monthly deep-dives. Writes reports in natural language with charts, not just numbers. Sends via email or dashboard notification. | Fully autonomous — reporting |

---

## CIPHER — CTO (Technical) — 7 Sub-Agents

| Sub-Agent | Role | What It Does | Autonomy |
|-----------|------|-------------|----------|
| **SEO Engineer** | Technical SEO | Manages structured data (JSON-LD), generates sitemaps, optimizes meta tags, fixes crawl errors, implements canonical URLs, monitors Search Console. | Autonomous for monitoring; Chief approves structural changes |
| **Speed Demon** | Performance | Monitors Core Web Vitals (LCP, CLS, INP). Optimizes image sizes, lazy loading, caching headers. Identifies and fixes slow pages. | Autonomous for image optimization; Chief approves code/config changes |
| **Uptime Guardian** | Availability | Monitors store availability 24/7. Detects downtime within seconds. Attempts auto-recovery. Sends alerts to merchant with diagnosis. | Autonomous — monitoring and alerting; auto-recovery within safe bounds |
| **Security Scanner** | Vulnerability Detection | Scans for SSL issues, mixed content, exposed API keys, outdated dependencies, XSS/injection vectors. Generates security reports. | Autonomous for scanning; Chief approves fixes |
| **Image Optimizer** | Media Management | Compresses product images without quality loss. Converts to WebP/AVIF. Generates responsive sizes. Manages CDN caching. | Fully autonomous — non-destructive optimization |
| **Integration Doctor** | Third-Party Health | Monitors payment gateway status (Razorpay/Stripe), shipping API health (Shiprocket/Delhivery), email delivery rates (Resend). Alerts on failures. | Autonomous — monitoring and alerting |
| **Backup Manager** | Data Protection | Schedules automated backups of products, orders, customer data. Verifies backup integrity. Provides one-click restore capability. | Autonomous for backups; Chief approves restores |

---

## Autonomy Principles

1. **Analysis is always autonomous** — any sub-agent can analyze data, generate reports, and surface insights without approval
2. **Alerts are always autonomous** — any sub-agent can send alerts to the merchant or Chief without approval
3. **Customer-facing content requires Chief approval** — social posts, ad campaigns, email campaigns, review responses
4. **Money actions require Chief approval** — pricing changes, discount creation, refunds above threshold, ad budget changes
5. **Technical changes require Chief approval** — code changes, config changes, structural SEO changes
6. **Transactional messages are autonomous** — order confirmations, shipping updates, delivery notifications
7. **Recovery actions within policy are autonomous** — standard cart recovery emails, standard return processing within store policy

## Approval Flow

```
Sub-Agent prepares action
    ↓
Is it autonomous? → Yes → Execute immediately, log for Chief
    ↓ No
Send to Chief for approval
    ↓
Chief evaluates (AI judgment based on autonomy level setting)
    ↓
Autonomy Level 1-2: Forward to Merchant for manual approval
Autonomy Level 3: Chief auto-approves low-risk, forwards high-risk to Merchant
Autonomy Level 4: Chief auto-approves most, forwards spending/refunds to Merchant
Autonomy Level 5: Chief auto-approves everything
```

---

## Technical Implementation — How to Build 37 Sub-Agents

### The 3 Building Blocks

Every sub-agent is built from a combination of these three primitives:

**1. LLM + Prompt (the "brain")**
An AI model (Gemini, Claude, GPT) with a very specific system prompt that makes it behave like a specialist. This is what "building an agent" actually means 90% of the time. The sub-agent IS a prompt. The prompt includes store context (name, category, brand voice, product catalog, order history) to make it domain-specific.

**2. External API (the "hands")**
The LLM can think, but it can't DO things in the real world. To actually post on Instagram, send an email, process a refund — you need APIs. These are the "hands" of the agent. Many of these APIs are already integrated in the codebase (Resend, MSG91, Razorpay, Stripe, Sharp).

**3. Internal Data + Logic (the "memory")**
The Supabase database — orders, products, customers, analytics. Sub-agents need this context to be useful. Some sub-agents are purely data-driven — no LLM needed, just SQL queries and aggregation.

### The Universal Sub-Agent Formula

```
Sub-Agent = System Prompt + Store Context + Tools (API functions)
```

The only thing that changes per sub-agent is the prompt and which tools it has access to. The framework is identical for all 37. This is exactly what the AI SDK's tool-calling system is built for.

---

### What You Actually Need

| Resource | Count | Notes |
|----------|-------|-------|
| LLM provider | 1 | Gemini (already integrated) — powers all 23 LLM-based sub-agents |
| Existing APIs (no new integration) | 6 | Resend, MSG91, Razorpay, Stripe, Sharp, Supabase |
| New API integrations | 3-4 | Meta Ads API, Google Search Console API, Google PageSpeed Insights API, Google Ads API (can defer) |
| Third-party sub-agent platforms | 0 | Not needed — all sub-agents are built in-house with the formula above |

**You don't need 37 third-party APIs. You need 1 LLM + your existing stack + 3-4 new integrations.**

---

### Every Sub-Agent Categorized by Build Type

#### LLM-Only (12 sub-agents) — Just a specialized prompt, no external API needed

| Sub-Agent | Chief | What the LLM Does | Cost |
|-----------|-------|-------------------|------|
| Campaign Architect | PRISM | Plans campaigns from store context | LLM tokens only |
| Copysmith | PRISM | Writes copy (descriptions, taglines, emails, blog posts) | LLM tokens only |
| Social Composer | PRISM | Writes captions + hashtags, suggests posting schedule | LLM tokens only |
| Reel Director | PRISM | Writes video scripts + storyboards | LLM tokens only |
| Influencer Finder | PRISM | Analyzes niche + suggests influencer profiles | LLM tokens only |
| Deal Engineer | FORGE | Designs promotions based on inventory + margins | LLM tokens only |
| Checkout Doctor | FORGE | Analyzes funnel data + suggests improvements | LLM tokens only |
| Lead Scorer | FORGE | Scores visitors from behavior patterns | LLM tokens only |
| FAQ Builder | SENTINEL | Generates FAQs from support ticket patterns | LLM tokens only |
| Escalation Detector | SENTINEL | Sentiment analysis on customer messages | LLM tokens only |
| Report Writer | PULSE | Turns data into natural language reports | LLM tokens only |
| Competitor Watcher | PULSE | Analyzes competitor data (if scraped/provided) | LLM tokens only |

#### LLM + Existing APIs (11 sub-agents) — Brain + hands already in the codebase

| Sub-Agent | Chief | LLM Decides | Existing API Executes |
|-----------|-------|-------------|----------------------|
| Cart Whisperer | FORGE | Recovery message content + timing | Resend (email) / MSG91 (WhatsApp) |
| Chat Responder | SENTINEL | Response to customer query | Supabase (store conversations) |
| Email Handler | SENTINEL | Reply to customer email | Resend |
| WhatsApp Agent | SENTINEL | Message content | MSG91 |
| Returns Manager | SENTINEL | Approve/deny based on policy | Razorpay/Stripe refund API |
| Review Curator | SENTINEL | Review response text | Supabase (store response) |
| Price Strategist | FORGE | Suggested price changes | Supabase (update products table) |
| Upsell Agent | FORGE | Recommendation logic | Supabase (update recommendation config) |
| Loyalty Architect | FORGE | Win-back email content | Resend / MSG91 |
| Backup Manager | CIPHER | What to backup, when | Supabase (export data) |
| Image Optimizer | CIPHER | Which images need optimization | Sharp (already in stack) |

#### LLM + New External API (8 sub-agents) — Need new integrations

| Sub-Agent | Chief | LLM Decides | New API Needed |
|-----------|-------|-------------|---------------|
| Visual Crafter | PRISM | What image to generate | AI image generation (Gemini/Imagen — already have Vertex AI credentials) |
| Ad Pilot | PRISM | Campaign strategy, budgets, targeting | **Meta Ads API** + **Google Ads API** (can defer Google Ads) |
| SEO Scout | PRISM | Keyword strategy, content optimization | **Google Search Console API** |
| SEO Engineer | CIPHER | Structured data, meta tags, crawl fixes | **Google Search Console API** (same integration as above) |
| Speed Demon | CIPHER | What to optimize, priority order | **Google PageSpeed Insights API** (free, no auth needed) |
| Uptime Guardian | CIPHER | Monitor + alert + auto-recover | **HTTP ping** (build yourself, no third-party API) |
| Security Scanner | CIPHER | What to scan, risk assessment | **Mozilla Observatory API** (free) or custom checks |
| Integration Doctor | CIPHER | Monitor health, diagnose failures | Ping existing APIs (Razorpay/Stripe/Resend status pages) |

#### Data-Only (6 sub-agents) — No LLM needed, just SQL queries

| Sub-Agent | Chief | What It Queries | Cost |
|-----------|-------|----------------|------|
| Revenue Tracker | PULSE | `orders` table aggregation (revenue, AOV, refund rates) | Free — just code |
| Traffic Analyst | PULSE | Page views / analytics data (needs analytics events table) | Free — just code |
| Customer Profiler | PULSE | `customers` + `orders` join queries for segmentation + CLV | Free — just code |
| Product Ranker | PULSE | `products` + `order_items` aggregation for performance ranking | Free — just code |
| Funnel Analyst | PULSE | Conversion funnel from page view → purchase | Free — just code |
| Anomaly Sentinel | PULSE | Statistical deviation detection on all metrics | Free — just code |

---

### New API Integrations Required (Priority Order)

| API | Sub-Agents It Powers | Difficulty | Cost |
|-----|---------------------|-----------|------|
| **Google Search Console API** | SEO Scout, SEO Engineer | Medium (OAuth2 setup) | Free |
| **Google PageSpeed Insights API** | Speed Demon | Easy (no auth, REST call) | Free |
| **Meta Ads API** | Ad Pilot | Hard (Meta Business verification, review process) | Free API, ad spend separate |
| **Google Ads API** | Ad Pilot | Hard (Google Ads developer token) | Free API, ad spend separate |

Note: Meta Ads and Google Ads can be deferred for the prototype. The Ad Pilot can start as LLM-only (generates campaign plans and creatives) and connect to the APIs when ready.

---

### Recommended Build Order for Prototype

**Phase 1 — Framework + Data-Only agents (1-2 weeks)**
Build the sub-agent framework (shared across all 37) + all 6 data-only PULSE sub-agents. This gives you a working analytics dashboard powered by "sub-agents" immediately.

**Phase 2 — LLM-Only agents (1-2 weeks)**
All 12 LLM-only sub-agents. These are just specialized prompts — fast to build, impressive to demo.

**Phase 3 — LLM + Existing API agents (2-3 weeks)**
All 11 sub-agents that use APIs you already have. Cart Whisperer, Chat Responder, Returns Manager — these are the money-makers.

**Phase 4 — New API integrations (2-3 weeks)**
Google Search Console, PageSpeed Insights, then Meta Ads if time permits.

**Total estimate: 6-10 weeks for a fully functioning prototype with all 37 sub-agents.**
