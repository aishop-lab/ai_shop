

# Product Requirements Document — Autonomous AI Agent E-Commerce Platform

## Part I: Vision, Concepts, Agents & Journeys

---

## 1. Product Vision & Positioning

### 1.1 What Is This Product?

This is an e-commerce platform where five AI agents run your entire online business. You provide the product. They handle everything else — marketing campaigns, customer support, sales optimization, performance analytics, and technical operations — 24 hours a day, 7 days a week, without salaries, without sick days, without needing to be managed.

The elevator pitch: **"Hire an AI team. Launch a store in 30 seconds. They run it while you sleep."**

Today, a solo merchant who wants to compete with funded D2C brands needs to be a marketer, a customer support rep, a data analyst, a web developer, and a salesperson — simultaneously. This platform collapses that entire org chart into five autonomous agents that coordinate with each other, learn the merchant's preferences, and execute relentlessly. The merchant's job reduces to three things: source great products, approve spending decisions, and set the strategic direction. Everything else is handled.

This is not a store builder with AI features bolted on. It is not a chatbot that answers questions about your dashboard. It is a fundamentally different architecture: the agents are not assistants — they are employees. They have goals, they take initiative, they report results, and they escalate decisions they are not authorized to make. The platform is their workspace. The merchant is the CEO.

### 1.2 The "One-Man Company" Thesis

The cost of running an e-commerce operation has a floor. Below a certain revenue threshold, hiring a marketing person, a support person, and a developer is economically impossible. This creates a ceiling on what solo merchants can achieve — not because their products are bad, but because they cannot operationally scale.

The thesis is simple: AI agents eliminate the operational floor. A single person with a ₹50,000/month revenue store can now have the same operational sophistication as a ₹50,00,000/month D2C brand. The agents do not replace the merchant's judgment — they replace the merchant's bandwidth.

This matters now, not later, for three reasons:

1. **LLM capabilities have crossed the usefulness threshold.** Generating a product description or writing a support response is no longer a novelty — it is reliably good enough to ship without human review in most cases. The models are fast enough to operate in real-time customer interactions and cheap enough to run continuously.

2. **India's e-commerce merchant base is exploding.** ONDC, UPI adoption, Instagram Commerce, and WhatsApp Business have created millions of small merchants who sell online but lack operational infrastructure. They do not need another Shopify theme — they need an operations team they can afford.

3. **The platform economics work.** The existing codebase already handles payments (Razorpay + Stripe), shipping (4 providers), email (Resend), WhatsApp (MSG91), and AI extraction (Gemini + Vision API). The infrastructure to power autonomous agents is already built — it just needs to be orchestrated differently.

The "one-man company" is not a tagline. It is the product's reason for existing. Every design decision, every feature priority, every UX choice flows from this question: *does this make a solo merchant more operationally capable?*

### 1.3 Target Users

**Tier 1: Solo Creators (₹0–₹1L/month revenue)**

*Persona: Priya, 26, sells handmade jewelry on Instagram.*

Priya has 8,000 Instagram followers and takes orders via DM. She ships 3–5 orders a day using self-delivery or local courier. She has no website, no analytics, no marketing strategy beyond posting photos. She spends 4 hours a day on customer messages ("Is this available?", "What's the shipping time?", "Can I get this in gold?"). She tried Shopify once but abandoned it after two days because the dashboard was overwhelming and she could not figure out how to connect her payment gateway.

Priya needs: a store that goes live instantly, a support agent that handles 80% of her DMs, and a marketing agent that tells her when to post and what to promote. She does not need dashboards full of charts. She needs agents that do things and tell her what they did.

Plan: Free tier with usage limits. She upgrades when agent actions demonstrably increase her revenue.

**Tier 2: Growing Merchants (₹1L–₹10L/month revenue)**

*Persona: Rajesh, 34, runs a D2C skincare brand with 2 employees.*

Rajesh has a Shopify store, runs Meta ads (poorly — ROAS hovers around 1.5x), and uses Shiprocket for fulfillment. He spends ₹50,000/month on ads but cannot tell which campaigns drive actual purchases versus just traffic. He wants to hire a marketing person but cannot justify ₹40,000/month salary at his current margins. His customer support is handled by one person who also packs orders — response times average 6 hours.

Rajesh needs: a marketing agent that optimizes his ad spend with actual ROAS tracking, an analytics agent that tells him which products and channels are profitable, and a support agent that responds instantly on WhatsApp. He would migrate from Shopify if the platform demonstrably outperforms his current setup.

Plan: Growth tier (₹2,000–₹5,000/month). The platform pays for itself if it improves his ROAS by even 0.3x.

**Tier 3: Scaling D2C Brands (₹10L+/month revenue)**

*Persona: Ananya, 31, co-founded a premium tea brand doing ₹25L/month.*

Ananya has a 6-person team including a part-time digital marketer and a customer support hire. She runs campaigns across Meta, Google, and influencer partnerships. Her challenge is not capability — it is coordination. Campaign launches require syncing across ad platforms, email sequences, WhatsApp blasts, website banners, and inventory checks. A Diwali campaign takes 2 weeks to plan and execute. She loses sleep over site speed because she knows it affects conversion but has no developer on staff to fix it.

Ananya needs: agents that coordinate complex cross-channel operations autonomously, a technical agent that proactively optimizes site performance, and an analytics agent that surfaces insights she would not think to look for. She values the inter-agent coordination — the fact that the marketing agent automatically checks with the sales agent on inventory before promoting a product.

Plan: Pro tier (₹10,000–₹20,000/month). Replaces ₹1–2L/month in operational costs.

### 1.4 Market Positioning

**Shopify / WooCommerce / Dukaan:** These are store builders. They give you the tools and expect you to use them. Their AI features are assistive — Shopify Magic writes product descriptions, Sidekick answers questions about your store. The merchant still has to decide what to do, when to do it, and then go do it. Our platform decides, does, and reports. The merchant's job is oversight, not execution.

**Shopify + apps ecosystem:** The typical Shopify merchant installs 6–12 apps (Klaviyo for email, Privy for popups, Loox for reviews, Oberlo for sourcing). Each app has its own dashboard, its own billing, its own learning curve. Integration between them is fragile. Our five agents replace the entire app ecosystem with a unified, coordinated intelligence layer.

**Hiring an agency:** A decent e-commerce agency charges ₹50,000–₹2,00,000/month. They operate on your behalf but with significant latency (brief → draft → review → revision → launch). Agents operate in real-time. The feedback loop between "detect opportunity" and "execute action" shrinks from days to minutes.

**Other AI e-commerce tools (Jasper, Copy.ai, etc.):** These are single-function AI tools — they generate copy, or they generate images. They are hammers looking for nails. Our platform is a coordinated team where each agent has a distinct role, access to real business data, and the authority to take action.

The positioning in one line: **"Not a store builder with AI features. An AI team with a store built in."**

### 1.5 The Name Question

The current name (StoreForge) communicates store creation — building, forging, constructing. The new product is not primarily about building a store. It is about running a business. The name must reflect this shift.

Naming criteria:

- **Agency over tooling.** The name should evoke the feeling of having a team, a crew, a workforce — not a tool, a builder, or a platform. The merchant is hiring, not configuring.
- **Short and registrable.** One or two syllables preferred. The .com must be available or acquirable. The .site, .co, or .ai TLD are acceptable alternatives. The name will be used as a subdomain (`{store}.name.tld`), so it must be concise.
- **Culturally neutral with Indian resonance.** The primary market is India. The name should not feel alienating to a merchant in Jaipur or Coimbatore, but it should also work globally. Avoid puns or references that only work in American English.
- **Not "AI-something."** The AI-prefix space is saturated and increasingly commoditized. The intelligence should be implicit, not branded.
- **Verbifiable.** Ideally, merchants can say "I [name]'d my store" or "My [name] team handled it." This is aspirational, not mandatory.
- **Domain available for wildcard subdomains.** The DNS must support `*.name.tld` routing. Short TLDs are preferred for merchant-facing URLs.

Do not pick a name at this stage. The criteria above will guide a naming exercise once the product direction is validated.

---

## 2. Core Concepts & Mental Model

### 2.1 The "AI Team" Metaphor

Every design decision in the platform uses the same metaphor: the merchant has hired a team of five specialists. These are not "features" or "modules" — they are employees. This distinction drives the entire UX.

An employee has a name, a role, a status (working, idle, waiting for you). An employee takes initiative — they do not wait to be told to do everything. An employee reports what they have done, explains their reasoning, and asks for permission when they are about to spend money or do something irreversible. An employee gets better at the job over time because they learn the boss's preferences.

The five agents are:

| Agent | Role | Metaphor |
|-------|------|----------|
| **Marketing** | Head of Growth | The person who runs your ads, writes your emails, plans your campaigns |
| **Sales** | Revenue Manager | The person who optimizes pricing, rescues abandoned carts, manages refunds |
| **Support** | Customer Success Lead | The person who answers customer questions 24/7 across all channels |
| **Analytics** | Business Intelligence Analyst | The person who watches your numbers and tells you what matters |
| **Technical** | Site Reliability Engineer | The person who keeps your store fast, SEO-optimized, and error-free |

The metaphor is not decorative. It determines:
- **How agents appear in the UI:** Each has an avatar, a status indicator, and an activity feed — like a team member in Slack.
- **How agents communicate:** They explain actions in natural language, not system logs. "I paused the Instagram campaign because CTR dropped below 1% — it was burning ₹400/day with no conversions" not "Campaign ID 8472 status changed to PAUSED."
- **How the merchant interacts:** The merchant talks to agents in natural language. "Run a Diwali sale on all products, 20% off, starts October 15" — not filling out a coupon form.
- **How agents coordinate:** They message each other. Marketing asks Sales to check inventory before promoting a product. Support escalates a complaint to Sales for a refund decision. This coordination is visible to the merchant in the activity feed.

### 2.2 Autonomy Spectrum

Not all actions are equal. The platform defines a clear boundary between what agents can do on their own and what requires merchant approval.

**Principle: Agents auto-execute everything that is reversible and free. They request approval for everything that costs money or is irreversible.**

The spectrum:

| Level | Description | Examples |
|-------|-------------|----------|
| **Auto-execute, silent** | Routine actions logged but not surfaced prominently | Responding to a "Where is my order?" customer query, updating SEO meta tags, generating a product description draft |
| **Auto-execute, notify** | Actions the merchant should know about but did not need to approve | Pausing an underperforming ad (saves money), sending an abandoned cart recovery email (uses existing template), fixing a broken image link |
| **Approval required** | Actions that cost money, are customer-facing at scale, or are irreversible | Launching a new ad campaign (spend), issuing a refund (money out), sending a bulk promotional email, changing product prices, deleting a product |
| **Merchant-only** | Actions agents cannot take | Changing bank account / payout details, changing store ownership, accessing raw encryption keys, modifying agent autonomy settings |

The merchant can adjust these levels per agent. A merchant who trusts the marketing agent can grant it auto-execute permission for ad campaigns up to ₹500/day. A cautious merchant can require approval for everything. The defaults are conservative — more approval, less autonomy — and relax over time as the merchant builds trust.

### 2.3 Agent State Machine

Every agent, at any moment, is in one of five states:

```
┌──────┐    task found     ┌─────────┐
│ IDLE │ ────────────────→ │ WORKING │
└──────┘                   └────┬────┘
   ↑                            │
   │         completed          ├── needs merchant input
   │    (auto-execute action)   │
   │                            ↓
   │                     ┌──────────────────┐
   │                     │ NEEDS APPROVAL   │
   │                     └───────┬──────────┘
   │                             │
   │          approved           │  rejected
   │◄────────────────────────────┤───────────→ (agent adjusts)
   │                             │
   │                             ↓
   │                      ┌───────────┐
   │◄─────────────────────│ COMPLETED │
   │                      └───────────┘
   │
   │     unrecoverable     ┌───────┐
   │◄──────────────────────│ ERROR │
                           └───────┘
```

**IDLE:** The agent has no active tasks. It is monitoring its domain (watching metrics, listening for customer messages, checking site health) but not actively executing. In the UI, the agent appears as "available" with a subtle pulse.

**WORKING:** The agent is executing a task. This could take seconds (answering a customer question) or minutes (generating a full marketing campaign plan). The UI shows a progress indicator and a brief description of what the agent is doing: "Generating email sequence for Diwali campaign..."

**NEEDS APPROVAL:** The agent has completed its work but requires merchant sign-off before the action takes effect. The task enters the approval queue with a clear summary, the agent's reasoning, and one-tap approve/reject buttons. The agent remains in this state until the merchant responds — it does not block; it continues working on other tasks.

**COMPLETED:** The action was executed (either auto-executed or approved and executed). The result is logged in the activity feed with measurable outcomes when applicable: "Abandoned cart email sent to 23 customers — 4 recovered so far (₹8,400 in revenue)."

**ERROR:** Something went wrong that the agent cannot recover from. API rate limit hit, third-party service down, invalid credentials. The error is surfaced to the merchant with a plain-language explanation and a recommended fix: "Meta Ads API returned an authentication error. Your connected account may need to be re-authorized. [Reconnect Meta →]"

State transitions are stored in the database and visible in the agent's activity log. The merchant can always see what an agent is doing, what it did, and what it is waiting on.

### 2.4 Inter-Agent Coordination

Agents do not operate in silos. Real business operations require coordination, and the agents replicate this.

**Coordination is event-driven, not conversational.** Agents do not "chat" with each other in a way that consumes LLM tokens continuously. Instead, they publish structured events that other agents subscribe to. The coordination layer is a lightweight internal message bus (implemented as a Supabase table with Realtime subscriptions).

Examples of inter-agent coordination:

| Trigger | From | To | Action |
|---------|------|----|--------|
| Marketing agent wants to promote a product | Marketing | Sales | "Check inventory for SKU #4821 before I run the campaign" |
| Customer complaint about damaged product | Support | Sales | "Customer #892 requesting refund for order #1204 — damaged in transit" |
| Sales agent detects 30% revenue drop | Analytics → Sales | Marketing + Technical | "Revenue anomaly detected. Marketing: check ad performance. Technical: check site uptime." |
| Technical agent detects slow page load | Technical | Analytics | "Homepage LCP degraded to 4.2s. Correlate with traffic patterns." |
| New product added by merchant | System event | All agents | Marketing updates promotion calendar, Support learns product details, Analytics starts tracking, Technical indexes for SEO |

The coordination protocol:

1. **Request:** Agent A publishes a coordination event with type, priority, and payload.
2. **Response:** Agent B processes the request and publishes a response event.
3. **Resolution:** Agent A incorporates the response and continues its task.

All coordination events are logged and visible to the merchant in a unified activity feed. The merchant can see that the Marketing agent checked with Sales before launching a campaign — this builds trust in the system's intelligence.

**Conflict resolution:** When agents disagree (Marketing wants to promote a low-margin product, Sales flags margin concerns), the conflict is escalated to the merchant's approval queue with both agents' reasoning presented side by side.

### 2.5 The Approval Queue

The approval queue is the merchant's primary decision-making interface. It is designed to be processed in under 2 minutes per session. The merchant should be able to open the dashboard, process the queue, and close the dashboard — confident that the agents will handle the rest.

Each approval item contains:

- **Agent identity:** Which agent is asking (with avatar and role)
- **Action summary:** One sentence describing what the agent wants to do. "Launch Meta ad campaign for 'Winter Collection' — ₹800/day for 7 days"
- **Reasoning:** Why the agent recommends this action. "Your winter products have 3x the margin of summer products, and Meta CPMs drop 20% in January. Estimated ROAS: 2.8x based on similar campaigns."
- **Impact preview:** What will happen if approved. "Budget: ₹5,600 total. Expected reach: 45,000–60,000. Estimated orders: 12–18."
- **Alternatives (optional):** "If ₹800/day feels high, I can start with ₹400/day and scale based on performance."
- **Actions:** Approve, Reject (with optional reason), Modify (adjust parameters and approve)

The queue is sorted by urgency:
1. **Time-sensitive:** Approval needed within hours (refund request aging, flash sale window closing)
2. **Money-involved:** Spending or refund decisions
3. **Strategic:** Long-term decisions that can wait (campaign planning, pricing changes)

The queue is accessible from the dashboard, via push notification, and via WhatsApp (the merchant can approve/reject directly from a WhatsApp message from the platform's bot).

### 2.6 Agent Memory

Agents learn. This is not a philosophical statement — it is a technical requirement. Every agent maintains a preference model for its merchant.

**What agents remember:**

- **Explicit preferences:** "I never discount more than 15%", "Don't run ads on Sundays", "Always respond to customers in Hindi if they message in Hindi." These are stated by the merchant and stored as rules.
- **Implicit preferences:** The merchant consistently rejects ad campaigns over ₹1,000/day → the agent learns to propose smaller budgets. The merchant always approves refunds for orders under ₹500 → the agent can suggest auto-approving these.
- **Rejection patterns:** When a merchant rejects an action, the agent stores the rejection reason and adjusts future proposals. After 3 rejections of similar actions, the agent explicitly asks: "I've noticed you reject [pattern]. Should I stop suggesting these?"
- **Business context:** Seasonal patterns (Diwali spike, January slump), product lifecycle stage, customer segment behavior. This is learned from data, not stated.

**How memory is stored:**

Agent memory is stored as structured data in a dedicated `agent_memory` table:

```
agent_memory:
  - id (uuid)
  - store_id (uuid)
  - agent_type (enum: marketing, sales, support, analytics, technical)
  - memory_type (enum: preference, rejection_pattern, learned_rule, business_context)
  - content (jsonb) — the actual memory content
  - confidence (float) — how confident the agent is in this memory (increases with reinforcement)
  - created_at, updated_at
  - source (enum: explicit, inferred, rejection)
```

**Memory decay:** Inferred memories have a confidence score that decays if not reinforced. If the merchant's behavior changes (they start approving larger budgets), old memories about preferring small budgets fade.

**Memory transparency:** The merchant can view and edit any agent's memories. "The Marketing agent believes you prefer campaigns under ₹500/day. [Correct] [Update]" — full transparency, no black box.

---

## 3. The Five Agents — Detailed Specifications

### 3.1 Marketing Agent

**Role Description**

The Marketing Agent is the merchant's Head of Growth. It plans, creates, executes, and optimizes marketing campaigns across paid ads, email, social media, and WhatsApp. It thinks in terms of customer acquisition cost, return on ad spend, and revenue per channel — not vanity metrics.

**Capabilities**

- Create and manage Meta (Facebook + Instagram) ad campaigns end-to-end: audience targeting, creative generation (copy + image suggestions), budget allocation, bid strategy, A/B testing
- Create and manage Google Ads campaigns (Search + Shopping + Performance Max)
- Design and send email campaigns and automated sequences (welcome series, post-purchase, win-back, promotional)
- Design and send WhatsApp broadcast campaigns (promotional, transactional)
- Plan seasonal marketing calendars (auto-generates Diwali, Eid, Christmas, Republic Day, summer sale campaigns with Indian market context)
- Generate ad copy, email subject lines, WhatsApp message templates — in English and Hindi
- Create discount codes and flash sales (coordinating with Sales agent on pricing impact)
- Manage social media posting schedule (generate caption suggestions, optimal posting times)
- Set up and manage Meta Pixel / Conversions API (CAPI) for conversion tracking
- Set up and manage Google Analytics 4 events and conversion goals
- Run influencer outreach campaigns (generate outreach templates, track affiliate codes)
- SEO content suggestions (blog post topics, product description optimization) — coordinating with Technical agent

**Tools & APIs**

| Service | API | Purpose |
|---------|-----|---------|
| Meta Marketing API | `v21.0` | Create/manage/optimize Facebook + Instagram ad campaigns, audiences, creatives |
| Meta Conversions API (CAPI) | Server-side | Accurate conversion tracking (bypasses iOS privacy restrictions) |
| Google Ads API | `v18` | Create/manage Search, Shopping, Performance Max campaigns |
| Google Analytics 4 Data API | `v1beta` | Read campaign performance, attribution data, audience insights |
| Resend API | Existing integration | Email campaigns and automated sequences |
| MSG91 WhatsApp API | Existing integration | WhatsApp broadcasts and templates |
| Vercel AI SDK (Gemini) | Existing integration | Copy generation, creative ideation |
| Meta Graph API | `v21.0` | Organic social posting, page insights |
| Canva API (future) | `v1` | Automated creative generation |

**Auto-Execute Actions**

- Pause an ad set that has spent over 2x target CPA with zero conversions
- Send scheduled email campaigns that were pre-approved
- Send abandoned cart recovery emails (using existing sequences)
- Adjust ad bids within pre-approved budget range (±20% of set daily budget)
- Publish pre-approved social media posts at optimal times
- Update Meta Pixel events when product catalog changes
- Generate weekly marketing performance summaries

**Approval-Required Actions**

- Launch any new ad campaign (regardless of budget)
- Increase daily ad spend beyond current approved limit
- Send any bulk promotional email or WhatsApp broadcast (first-time templates)
- Create store-wide discount codes over 10%
- Change marketing strategy or target audience significantly
- Spend on any new marketing channel
- A/B test changes to the storefront (hero banners, CTAs)

**Key Metrics It Tracks**

- Return on Ad Spend (ROAS) per campaign, per channel, per product
- Customer Acquisition Cost (CAC) — blended and per-channel
- Email open rate, click rate, revenue per email
- WhatsApp message delivery rate, read rate, conversion rate
- Meta ad CTR, CPM, CPC, frequency, relevance score
- Google Ads Quality Score, impression share, conversion rate
- Overall marketing spend as percentage of revenue
- Channel attribution (first-touch, last-touch, multi-touch)

**Data It Needs**

- Product catalog with pricing, margins, inventory levels (from store database)
- Order history and revenue data (from store database)
- Customer segments and purchase behavior (from Analytics agent)
- Ad account access tokens (via OAuth — Meta Business Manager, Google Ads)
- GA4 property access (via OAuth)
- Historical campaign performance data
- Competitor pricing context (from merchant input or web scraping)

**Inter-Agent Dependencies**

- **→ Sales:** Checks inventory levels before promoting products. Requests margin data to calculate profitable ad spend thresholds.
- **→ Support:** Receives signal when a promotion generates high support volume (indicates confusing offer or quality issue). Adjusts messaging.
- **→ Analytics:** Receives customer segment data, cohort analysis, LTV predictions to inform targeting. Gets anomaly alerts when campaign metrics deviate.
- **→ Technical:** Requests landing page performance data. Coordinates on UTM parameter setup. Asks Technical agent to optimize pages that receive paid traffic.
- **← Sales:** Receives requests to promote slow-moving inventory or seasonal products.
- **← Analytics:** Receives insights like "Customers who buy Product A have 60% probability of buying Product B within 30 days" — uses this for cross-sell campaigns.

**Technical Feasibility: Medium-Hard**

The Meta Marketing API and Google Ads API are well-documented but have significant complexity: campaign structure hierarchies, audience creation rules, creative asset requirements, policy compliance checks, and rate limits. OAuth flows for Meta Business Manager are notoriously fragile. The email and WhatsApp integrations are already built (Resend + MSG91). The hardest part is making the agent's campaign decisions reliably good — this requires strong prompt engineering and guardrails to prevent the agent from wasting ad spend.

**MVP Scope**

- Email campaign creation and sending (templates + scheduling) via existing Resend integration
- WhatsApp broadcast campaigns via existing MSG91 integration
- Discount code creation with AI-suggested parameters
- Marketing calendar with seasonal suggestions (no auto-execution)
- Basic Meta Ads connection (OAuth) with read-only performance dashboard
- Ad campaign creation requires full merchant review before submission
- Weekly marketing summary generation

---

### 3.2 Sales Agent

**Role Description**

The Sales Agent is the merchant's Revenue Manager. It owns the revenue number. It optimizes pricing, rescues abandoned carts, manages the refund/return process, handles order issues, and identifies opportunities to increase average order value and customer lifetime value. It thinks in terms of conversion rate, AOV, and retention.

**Capabilities**

- Monitor and optimize abandoned cart recovery (enhance existing 3-email sequence with AI-personalized timing and messaging)
- Dynamic pricing recommendations based on demand, inventory levels, competitor context, and margin targets
- Automated refund processing (within merchant-defined rules)
- Order issue resolution (wrong item shipped, delayed delivery — coordinates with shipping providers)
- Upsell and cross-sell optimization (AI recommendations on product pages and in cart)
- Coupon strategy management (auto-generate targeted discount codes for specific customer segments)
- Customer retention campaigns (identify at-risk customers, trigger win-back offers)
- Flash sale management (coordinate timing, pricing, inventory holds)
- Invoice and payment follow-up (for COD orders or pending payments)
- Customer LTV analysis and segmentation for targeted offers
- Bulk order / wholesale inquiry handling
- COD-to-prepaid conversion nudges (offer small discount for prepaid to reduce RTO)

**Tools & APIs**

| Service | API | Purpose |
|---------|-----|---------|
| Razorpay API | Existing integration | Process refunds (INR), verify payments, fetch transaction data |
| Stripe API | Existing integration | Process refunds (international), manage disputes |
| Supabase | Existing integration | Order data, customer data, abandoned cart data, product inventory |
| Resend API | Existing integration | Abandoned cart emails, follow-up emails, refund confirmations |
| MSG91 WhatsApp API | Existing integration | Cart recovery WhatsApp messages, order updates |
| Shiprocket / Delhivery / Blue Dart / Shippo APIs | Existing integrations | Track shipment status, handle delivery exceptions |

**Auto-Execute Actions**

- Send abandoned cart recovery emails at optimized intervals (existing system, enhanced timing)
- Send abandoned cart WhatsApp reminders (low-cost, high-impact)
- Apply automatic COD-to-prepaid discount (if enabled by merchant, e.g., "₹50 off for online payment")
- Auto-approve refunds under merchant-defined threshold (e.g., orders under ₹500 with valid return reason)
- Send post-purchase cross-sell recommendations (email/WhatsApp) based on purchase history
- Update order status based on shipping provider tracking webhooks
- Flag potentially fraudulent orders (multiple failed payments, mismatched billing/shipping)
- Send payment reminders for pending COD confirmation
- Generate daily sales summary

**Approval-Required Actions**

- Issue refunds above the auto-approval threshold
- Change product pricing (any amount)
- Create discount codes over 10% or with no minimum order value
- Initiate bulk promotional pricing (flash sales, clearance)
- Approve wholesale / bulk order custom pricing
- Write off lost/damaged inventory
- Escalate order disputes to payment provider (chargeback response)

**Key Metrics It Tracks**

- Revenue (daily, weekly, monthly, YoY)
- Conversion rate (visitor → cart → checkout → purchase, full funnel)
- Average Order Value (AOV) and trends
- Cart abandonment rate and recovery rate
- Refund rate and refund reasons breakdown
- Customer Lifetime Value (LTV) by acquisition channel and segment
- Repeat purchase rate and time between purchases
- COD vs prepaid ratio and RTO (Return to Origin) rate
- Revenue per visitor
- Gross margin per product and per order

**Data It Needs**

- Full order history with line items, payment methods, shipping status (from store database)
- Customer purchase history and profiles (from store database)
- Abandoned cart data with timestamps and items (from store database)
- Product inventory levels and cost prices / margins (from store database)
- Shipping tracking data (from shipping provider APIs)
- Payment transaction data (from Razorpay/Stripe)
- Customer segment classifications (from Analytics agent)

**Inter-Agent Dependencies**

- **→ Marketing:** Requests promotion for slow-moving inventory. Provides margin data so Marketing does not run unprofitable campaigns. Shares customer segments for targeted campaigns.
- **→ Support:** Receives escalated refund/return requests from customer interactions. Sends refund confirmation status back to Support for customer communication.
- **→ Analytics:** Receives customer segmentation, churn predictions, revenue forecasts. Gets alerted on revenue anomalies.
- **→ Technical:** Reports checkout funnel drop-off data. Requests investigation if payment failure rate spikes.
- **← Marketing:** Receives impact data from campaigns (which campaign drove which orders) for attribution.
- **← Support:** Receives product feedback patterns ("customers keep complaining about sizing for product X") — informs pricing/promotion decisions.

**Technical Feasibility: Easy-Medium**

Most of the Sales agent's capabilities build directly on existing infrastructure: abandoned cart recovery is already built, Razorpay/Stripe refund APIs are integrated, order management exists, shipping tracking is in place. The primary new work is the intelligence layer — dynamic pricing logic, customer segmentation algorithms, and cross-sell recommendation optimization. The AI recommendation system already exists in `lib/ai/recommendations.ts` and needs to be enhanced, not rebuilt.

**MVP Scope**

- Enhanced abandoned cart recovery with AI-optimized email/WhatsApp timing
- Automated refund processing with configurable thresholds
- Daily and weekly sales summary generation
- Basic pricing recommendations (flag products with declining sales or excess inventory)
- Order issue detection and merchant alerting (delayed shipments, payment failures)
- Cross-sell suggestions on product pages using existing recommendation engine

---

### 3.3 Support Agent

**Role Description**

The Support Agent is the merchant's Customer Success Lead. It handles customer inquiries across all channels — WhatsApp, website chat widget, and email — 24/7 with instant response times. It resolves common questions autonomously (order status, product info, shipping timelines) and escalates complex issues to the merchant or other agents. It speaks the customer's language — literally (Hindi, English, Hinglish).

**Capabilities**

- Answer customer questions in real-time via WhatsApp (MSG91), website live chat widget, and email
- Automatic order status lookup and proactive shipping updates ("Your order has been shipped! Track here: ...")
- Product information responses (pricing, availability, sizing, material, care instructions — sourced from product catalog)
- Return/exchange initiation (collect reason, photos if needed, route to Sales agent for refund approval)
- FAQ auto-generation from product descriptions and store policies
- Multi-language support (English, Hindi, Hinglish auto-detection and response)
- Complaint classification and priority routing (urgent: damaged product received, normal: sizing question)
- Customer sentiment analysis on interactions
- Proactive outreach (delivery confirmation follow-up, review request after delivery)
- Collect and manage product reviews (prompt happy customers, flag negative reviews for merchant attention)
- Handle pre-purchase questions that drive conversion ("Will this fit me?", "Is this available in blue?")
- Escalation to merchant for complex/sensitive issues with full conversation context

**Tools & APIs**

| Service | API | Purpose |
|---------|-----|---------|
| MSG91 WhatsApp Business API | Existing integration | Receive and respond to customer WhatsApp messages |
| Resend API | Existing integration | Respond to customer emails, send proactive updates |
| Vercel AI SDK (Gemini) | Existing integration | Natural language understanding and response generation |
| Supabase | Existing integration | Order lookup, product catalog, customer history, store policies |
| Shipping provider APIs | Existing integrations | Real-time shipment tracking for order status queries |
| Website chat widget | New (WebSocket) | Real-time chat on storefront pages |

**Auto-Execute Actions**

- Respond to order status inquiries ("Where is my order?") with real-time tracking info
- Respond to product availability questions with current stock data
- Respond to store policy questions (shipping time, return policy, payment methods) based on stored policies
- Send post-delivery review request messages
- Send shipping confirmation and delivery confirmation messages
- Acknowledge complaints and create tickets for merchant review
- Respond to basic pre-purchase questions using product catalog data
- Auto-detect language and respond in the customer's preferred language
- Tag and categorize all interactions for analytics

**Approval-Required Actions**

- Offer any discount or compensation to a customer (even small amounts)
- Promise specific delivery dates beyond standard estimates
- Initiate a return/refund process (routes to Sales agent, but needs merchant awareness)
- Share any information not in the product catalog or store policies
- Escalate a complaint to a shipping provider on behalf of the merchant
- Respond to legal or regulatory inquiries (GST, compliance)
- Handle any interaction flagged as potentially abusive or fraudulent

**Key Metrics It Tracks**

- Average response time (first response and resolution time)
- Resolution rate (% of inquiries resolved without merchant intervention)
- Customer satisfaction score (post-interaction rating)
- Inquiry volume by channel (WhatsApp, chat, email)
- Top inquiry categories (order status, product questions, returns, complaints)
- Escalation rate (% of inquiries escalated to merchant)
- Sentiment distribution (positive, neutral, negative)
- Pre-purchase question → conversion rate (did answering the question lead to a sale?)

**Data It Needs**

- Full product catalog with descriptions, sizing info, materials, care instructions (from store database)
- Store policies (shipping, returns, refunds, privacy — from store settings)
- Order data with shipping tracking (from store database + shipping APIs)
- Customer interaction history (from support conversation database)
- Customer purchase history (from store database)
- Current promotions and discount codes (from Marketing agent / store database)
- Store FAQ and custom auto-responses (from store settings)

**Inter-Agent Dependencies**

- **→ Sales:** Escalates refund/return requests with customer conversation context. Reports product complaint patterns.
- **→ Marketing:** Reports when a promotion is generating confused customer inquiries (sign of unclear messaging). Shares common pre-purchase objections that Marketing can address in ad copy.
- **→ Analytics:** Provides customer interaction data for sentiment analysis and satisfaction trending. Reports inquiry volume spikes.
- **→ Technical:** Reports if customers mention site errors, broken links, or payment failures.
- **← Sales:** Receives refund decision outcomes to communicate back to customers.
- **← Marketing:** Receives current promotion details to accurately answer customer questions about active offers.

**Technical Feasibility: Medium**

The WhatsApp integration (MSG91) and email (Resend) already exist. The new work is: (1) a website chat widget with WebSocket real-time communication, (2) an AI response generation pipeline that is fast enough for live chat (<3 second response time), (3) a conversation memory system that tracks multi-turn interactions, and (4) a robust escalation workflow. The AI response quality is the main risk — the agent must never give incorrect order information or make promises the merchant cannot keep. Strong retrieval-augmented generation (RAG) over the product catalog and order database is essential.

**MVP Scope**

- WhatsApp auto-response for order status inquiries (query order DB + shipping tracking, respond via MSG91)
- WhatsApp auto-response for product availability and basic product questions
- Email auto-response for common inquiries with merchant CC
- Conversation logging and merchant review dashboard
- Escalation to merchant with full conversation context
- Basic website chat widget (WebSocket, text-only)
- Auto-language detection (English/Hindi)

---

### 3.4 Analytics Agent

**Role Description**

The Analytics Agent is the merchant's Business Intelligence Analyst. It continuously monitors store performance, detects anomalies, surfaces insights the merchant would not think to look for, and translates raw data into actionable recommendations. It does not just report numbers — it tells the merchant what the numbers mean and what to do about them.

**Capabilities**

- Real-time dashboard with key business metrics (revenue, orders, conversion, AOV, traffic)
- Anomaly detection (revenue drops, traffic spikes, conversion rate changes, inventory alerts)
- Automated daily, weekly, and monthly business reports (delivered via dashboard + WhatsApp/email)
- Customer cohort analysis (acquisition cohorts, retention curves, LTV by segment)
- Product performance analysis (best sellers, declining products, margin analysis, inventory turnover)
- Channel attribution (which marketing channels drive the most revenue and profit)
- Funnel analysis (landing page → product page → cart → checkout → purchase, with drop-off identification)
- Predictive forecasting (revenue forecast, inventory demand forecasting, seasonal trend prediction)
- Competitor price monitoring (manual input or web-scraped, where legal)
- Custom report generation via natural language ("Show me revenue by product category for the last 3 months compared to the previous period")
- A/B test analysis (statistical significance calculation for experiments run by other agents)
- Customer RFM (Recency, Frequency, Monetary) segmentation

**Tools & APIs**

| Service | API | Purpose |
|---------|-----|---------|
| Supabase (PostgreSQL) | Existing integration | Primary data source — orders, products, customers, carts, all store data |
| Google Analytics 4 Data API | `v1beta` | Website traffic, user behavior, session data, event tracking |
| Google Search Console API | `v1` | Search performance, impressions, clicks, average position (shared with Technical agent) |
| Meta Marketing API | Read-only via Marketing agent | Ad performance data for attribution |
| Razorpay API | Existing integration | Payment data, settlement reports |
| Stripe API | Existing integration | Payment data, payout reports |
| Vercel AI SDK (Gemini) | Existing integration | Natural language insight generation, report summarization |

**Auto-Execute Actions**

- Generate and deliver daily morning briefing (key metrics vs yesterday, vs last week)
- Detect and alert on anomalies (>20% deviation from rolling average on any key metric)
- Update customer segments based on latest transaction data
- Generate weekly business report
- Track and log all key metrics hourly for trend analysis
- Calculate and update product performance scores
- Monitor inventory levels and flag low-stock / out-of-stock products
- Run cohort analysis on new customer acquisition weekly

**Approval-Required Actions**

- None — the Analytics agent is purely observational and advisory. It never takes business actions directly. All recommendations are routed through the appropriate agent (pricing recommendations → Sales, campaign recommendations → Marketing, technical fixes → Technical).

**Key Metrics It Tracks**

- Revenue (total, by product, by category, by channel, by customer segment)
- Orders (volume, AOV, items per order)
- Conversion rate (overall and per funnel stage)
- Traffic (sessions, unique visitors, by source/medium)
- Customer metrics (new vs returning, LTV, churn rate, RFM segments)
- Product metrics (sell-through rate, days of inventory, contribution margin)
- Marketing metrics (CAC, ROAS, channel ROI) — aggregated from Marketing agent
- Operational metrics (fulfillment time, delivery time, return rate)
- Financial metrics (gross margin, net margin, cash flow from orders)

**Data It Needs**

- Full transactional data from store database (orders, line items, payments, refunds)
- Product catalog with cost prices and inventory levels
- Customer profiles and interaction history
- Google Analytics 4 property access (via OAuth)
- Marketing spend and performance data (from Marketing agent)
- Support interaction data (from Support agent — volume, sentiment, categories)
- Shipping and fulfillment data (from store database + shipping APIs)

**Inter-Agent Dependencies**

- **→ Marketing:** Provides customer segments, channel attribution, campaign performance analysis. Alerts on audience fatigue or declining engagement.
- **→ Sales:** Provides revenue forecasts, churn predictions, pricing elasticity estimates. Alerts on revenue anomalies.
- **→ Support:** Provides customer satisfaction trends, support volume forecasts. Identifies products generating disproportionate support tickets.
- **→ Technical:** Provides traffic pattern data for capacity planning. Alerts on conversion drops that may be caused by technical issues.
- **← All agents:** Receives activity data from all agents to correlate actions with outcomes. This is how the platform measures whether agent actions are actually helping.

**Technical Feasibility: Easy-Medium**

The data is already in Supabase. Most analytics queries are SQL aggregations over existing tables. The harder parts are: (1) Google Analytics 4 Data API integration (OAuth + query building), (2) anomaly detection algorithms that minimize false positives, (3) predictive forecasting (requires sufficient historical data — cold start problem for new stores), and (4) making the natural language report generation feel insightful rather than just a data recitation. The analytics agent has the lowest integration risk of all five because it is primarily read-only.

**MVP Scope**

- Real-time dashboard with core metrics (revenue, orders, conversion rate, AOV, top products)
- Daily morning briefing (auto-generated, delivered in dashboard + optional WhatsApp)
- Revenue anomaly detection with alerts (>25% deviation from 7-day rolling average)
- Basic product performance report (top sellers, slow movers, out-of-stock alerts)
- Customer overview (new vs returning, basic RFM segmentation)
- Natural language query interface ("What was my revenue last week?" → instant answer)
- Weekly automated business report

---

### 3.5 Technical Agent

**Role Description**

The Technical Agent is the merchant's Site Reliability Engineer. It monitors store performance, optimizes page speed, manages SEO, handles technical errors, and ensures the storefront is always fast, discoverable, and error-free. The merchant never has to think about technical infrastructure — the agent handles it.

**Capabilities**

- Continuous site performance monitoring (Core Web Vitals: LCP, FID/INP, CLS)
- SEO audit and optimization (meta tags, structured data, sitemap, robots.txt, canonical URLs, Open Graph tags)
- Google Search Console monitoring (indexing issues, crawl errors, search performance)
- Automated image optimization (detect unoptimized images, compress and resize)
- Broken link detection and fixing (internal links, product images, external references)
- SSL certificate monitoring (relevant for custom domains)
- Uptime monitoring and alerting
- Schema.org structured data management (Product, BreadcrumbList, Organization, FAQ)
- Page speed optimization recommendations (unused CSS, render-blocking resources, image lazy loading)
- Mobile responsiveness testing
- Accessibility audit (WCAG compliance checking)
- DNS and domain management assistance (custom domain setup guidance)
- Error log monitoring (JavaScript errors on storefront, API errors)
- Security header verification and management
- Automatic `sitemap.xml` and `robots.txt` regeneration when products/pages change
- CDN cache invalidation when content changes

**Tools & APIs**

| Service | API | Purpose |
|---------|-----|---------|
| Google PageSpeed Insights API | `v5` | Core Web Vitals measurement, performance scoring, optimization suggestions |
| Google Search Console API | `v1` | Indexing status, crawl errors, search performance, sitemap submission |
| Supabase | Existing integration | Product data (for structured data generation), error logs, store configuration |
| Vercel API | `v6+` | Deployment status, function logs, edge config, domain management |
| Sharp | Existing integration | Image optimization and format conversion |
| Google Safe Browsing API | `v4` | Check store URLs for security issues |
| Vercel AI SDK (Gemini) | Existing integration | Generate SEO-optimized meta descriptions, alt text for images |

**Auto-Execute Actions**

- Update SEO meta tags when product titles/descriptions change
- Regenerate `sitemap.xml` when products are added/removed/published/unpublished
- Generate and update structured data (Product schema) for all products
- Compress and optimize new product images that exceed size thresholds
- Fix broken internal links when detected
- Generate alt text for product images missing alt attributes
- Submit updated sitemaps to Google Search Console
- Log and categorize JavaScript errors from storefront
- Update `robots.txt` when store structure changes
- Monitor Core Web Vitals and log trends

**Approval-Required Actions**

- Make changes to the storefront theme or layout
- Modify DNS settings or custom domain configuration
- Implement redirects (301/302) that affect live URLs
- Purge CDN cache (can cause temporary slowdown)
- Modify security headers or CORS policies
- Install or update third-party scripts (analytics, pixels, chat widgets)
- Make changes that could affect storefront SEO ranking (URL structure, canonical changes)

**Key Metrics It Tracks**

- Core Web Vitals (LCP, INP, CLS) — mobile and desktop
- PageSpeed Insights score — mobile and desktop
- Google Search Console: total impressions, clicks, average CTR, average position
- Indexing status: pages indexed, pages with errors, pages excluded
- Crawl budget utilization and crawl errors
- Uptime percentage and downtime incidents
- JavaScript error rate on storefront
- Image optimization coverage (% of images optimized)
- Structured data coverage (% of products with valid schema markup)
- Time to First Byte (TTFB) — by region
- SSL certificate expiry countdown (for custom domains)

**Data It Needs**

- Full product catalog (for structured data, sitemap, SEO optimization)
- Store configuration and theme settings (from store database)
- Storefront URL structure and routing (from Next.js config + middleware)
- Google Search Console access (via OAuth)
- Vercel deployment data (via Vercel API or CLI)
- Error logs and monitoring data
- Current DNS and domain configuration

**Inter-Agent Dependencies**

- **→ Analytics:** Provides page performance data correlated with conversion (slow pages that are losing revenue). Receives traffic data for capacity planning.
- **→ Marketing:** Provides landing page performance data for campaign optimization. Ensures UTM tracking is properly configured.
- **→ Sales:** Reports if checkout page performance degrades (directly impacts conversion). Investigates payment gateway timeout issues.
- **→ Support:** Receives reports of customer-facing technical issues (site not loading, images broken, checkout failing).
- **← Marketing:** Receives requests to optimize pages receiving paid traffic. Gets notified of new landing pages that need SEO setup.
- **← Analytics:** Gets alerted on conversion drops that may have technical causes.

**Technical Feasibility: Easy**

Google PageSpeed Insights and Search Console APIs are straightforward REST APIs with good documentation. Image optimization uses Sharp, which is already integrated. SEO meta tag and structured data generation is template-based with AI enhancement. Sitemap generation is already partially built. The main complexity is in making the monitoring continuous (needs a cron job architecture) and in making the agent's SEO recommendations genuinely useful rather than generic. This is the lowest-risk agent to build.

**MVP Scope**

- Initial SEO audit on store creation (meta tags, structured data, sitemap, robots.txt)
- Core Web Vitals monitoring via PageSpeed Insights API (daily check, weekly report)
- Google Search Console integration (OAuth) with indexing status dashboard
- Automated sitemap regeneration on product changes
- Product structured data (Schema.org/Product) auto-generation
- Image alt text generation for products missing alt attributes
- Basic error monitoring (log JavaScript errors from storefront)
- Weekly technical health report

---

## 4. User Journeys

### Journey 1: First 30 Seconds — Store Goes Live

**The goal:** A merchant goes from "I want to sell online" to "My store is live and accepting orders" in 30 seconds. Not 30 minutes. Not "after you configure your payment gateway." Thirty seconds.

**Step 1: Sign Up (0–5 seconds)**

Merchant lands on the platform homepage. Single CTA: "Launch Your Store." They click, see a Google Sign-In button (primary) and email/password option (secondary). They tap "Continue with Google." OAuth completes. They are now authenticated.

No email verification step. No "choose a plan" screen. No onboarding survey with 20 questions. They are immediately dropped into a conversational interface.

**Step 2: Three Questions (5–20 seconds)**

A clean, full-screen conversational UI — not a form. The platform asks three questions:

1. **"What do you sell?"** — Free text. "Handmade silver jewelry" or "Organic skincare products" or "Custom phone cases." The AI parses this into product category, likely audience, and pricing tier.

2. **"What should we call your store?"** — The merchant types a name. The platform instantly checks slug availability and shows the live URL: `{store-name}.platform.tld`. If taken, it suggests alternatives. The merchant picks one.

3. **"Quick — pick a vibe."** — Four visual options (modern/classic/playful/minimal) shown as thumbnail previews with the merchant's store name already rendered into them. One tap to select.

That is it. Three inputs. Everything else is inferred or defaulted.

**Step 3: Store Generation (20–28 seconds)**

The screen shows a live generation animation — not a spinner, but a visual build sequence:

- "Creating your storefront..." — Theme applied, store name rendered, colors selected based on product category
- "Setting up payments..." — Platform-managed Razorpay (UPI + cards + COD) is auto-configured using platform credentials. The merchant does not need API keys. Settlements initially go to the platform, with a clear "Connect your own Razorpay/Stripe for direct settlement" option in settings.
- "Configuring shipping..." — Self-delivery is enabled by default. Shiprocket/Delhivery are shown as "Connect later for automated shipping" options.
- "Adding sample products..." — 3 demo products relevant to the merchant's category are generated (AI-generated titles, descriptions, and placeholder images). Clearly marked as "[Demo]" with a banner: "These are samples — add your real products to replace them."

**Step 4: Store is Live (28–30 seconds)**

The merchant sees their live storefront in a split-screen preview. Left side: the dashboard. Right side: the live store at `{store-name}.platform.tld`. The store is real. The URL works. If someone visited it right now, they would see a functional store with demo products, a working cart, and UPI/card payment via Razorpay (platform-managed).

A toast notification: "Your store is live at silversparkle.platform.tld" with a copy-link button.

**How payments work without API keys:**

The platform uses its own Razorpay/Stripe credentials as a default. Orders are processed through the platform account with the merchant's store ID tagged. Settlements are tracked per-merchant in the database. The merchant sees a prominent but non-blocking prompt: "Connect your own Razorpay account for direct bank settlement →". Until they connect their own account, the platform processes payments and settles to the merchant via manual transfer (for MVP) or an automated payout system (for scale). This is identical to how marketplaces like Meesho or Amazon work — the platform handles payments, the merchant gets their cut.

**How the domain works:**

Wildcard DNS (`*.platform.tld`) is already configured. The middleware detects the subdomain and routes to the correct store. No DNS configuration needed from the merchant. Custom domain support is available in settings for merchants who want `www.theirstore.com` — the Technical agent assists with DNS setup.

**How demo products work:**

The existing demo product system (`lib/products/demo-products.ts`) generates category-appropriate sample products. They are flagged with `is_demo: true` in the database. When the merchant uploads their first real product, a prompt appears: "Remove demo products? They were just placeholders." One click to remove all demos.

---

### Journey 2: First 30 Minutes — AI Team Activates

**The merchant's store has been live for 30 seconds. Now the AI team introduces itself.**

**Minutes 0–2: The Welcome Briefing**

The dashboard transitions from the store preview to the Command Center — a dark, clean interface inspired by Linear. A subtle animation reveals five agent cards across the top of the screen, each "waking up" in sequence:

The activity feed (center of the dashboard) begins populating:

> **Technical Agent** — "I've completed an initial audit of your store. SEO score: 72/100. I've already set up your sitemap, robots.txt, and structured data. Three recommendations for you to review later."

> **Analytics Agent** — "I'm now monitoring your store metrics. I'll send you a daily briefing at 9 AM. Right now your baseline is ₹0 revenue, 0 orders — I'll track everything from here."

> **Support Agent** — "I'm ready to handle customer inquiries on your store. I've reviewed your product catalog and store policies. I can respond to questions about your products, shipping, and returns. WhatsApp support is available — connect your MSG91 account to enable it."

> **Sales Agent** — "I've configured abandoned cart recovery emails. When a customer adds items to their cart and leaves, I'll send them a reminder sequence. I've also set up COD-to-prepaid conversion nudges at ₹50 off."

> **Marketing Agent** — "Ready when you are. Connect your Meta Business account to run Instagram and Facebook ads. Connect Google Ads for search campaigns. I'll work with whatever channels you give me access to."

**Minutes 2–10: Connect Accounts (OAuth, Not API Keys)**

A "Connect" panel slides in from the right. It shows available integrations with OAuth buttons — not API key input fields.

- **Meta Business** — "Connect to run Facebook + Instagram ads and track conversions." → OAuth flow opens Meta Business Manager → merchant authorizes → Ad account and Pixel are auto-detected and configured.
- **Google** — "Connect for Google Ads, Analytics, and Search Console." → Single Google OAuth with multi-scope → Ads account, GA4 property, and Search Console are auto-detected.
- **Razorpay** — "Connect for direct bank settlement (currently using platform payments)." → OAuth or guided API key entry with live validation ("Testing connection... ✓ Connected!").
- **Shiprocket** — "Connect for automated shipping labels and tracking." → Email/password entry with live validation.
- **MSG91** — "Connect for WhatsApp customer support and notifications." → API key entry with test message.

Each connection triggers an agent reaction in the activity feed:

> **Marketing Agent** — "Meta Business connected. I can see your Ad Account 'Priya's Silver' and Instagram page. I'll analyze your existing audience and suggest your first campaign when you're ready."

> **Technical Agent** — "Google Search Console connected. Your store has been submitted for indexing. I'll monitor crawl status and report back in 24–48 hours."

The merchant connects what they have. Everything they skip still works — just with limited capability. No connection is blocking.

**Minutes 10–20: Configuration Conversations**

Each agent that needs merchant input presents a brief, conversational configuration in the activity feed — not a settings page. The merchant responds inline.

**Support Agent asks:**
> "A few quick questions to configure auto-responses:
> 1. What's your standard shipping time? (I'll default to '5–7 business days' if you skip)
> 2. Do you accept returns? If yes, within how many days?
> 3. Any common questions your customers ask that I should know about?"

The merchant types: "Shipping is 3-5 days in India, 7 days returns, people always ask about silver purity — it's 92.5% sterling silver."

> **Support Agent** — "Got it. Shipping: 3–5 business days. Returns: 7 days. I've noted that silver purity (92.5% sterling) is a common question — I'll answer this automatically. I've generated a FAQ page for your store. [Review FAQ →]"

**Marketing Agent asks:**
> "What's your comfort level with ad spending?
> - Conservative (₹200–500/day — test and learn)
> - Moderate (₹500–1,500/day — steady growth)
> - Aggressive (₹1,500+/day — maximize reach)
>
> I'll always ask before starting a campaign. This just helps me size my recommendations."

Merchant taps: "Conservative."

> **Marketing Agent** — "Noted. I'll keep campaign suggestions in the ₹200–500/day range. You'll always approve before any money is spent."

**Minutes 20–30: First Actions**

By minute 20, the agents start doing things:

> **Technical Agent** — "SEO optimization complete. Updated meta descriptions for 3 demo products. Generated alt text for all product images. PageSpeed score improved from 72 to 86. [View details →]"

> **Analytics Agent** — "Dashboard is configured. Your morning briefing will arrive daily at 9:00 AM. Here's your current baseline report. [View report →]"

> **Marketing Agent** — "I've drafted your first Instagram campaign based on your product category (handmade silver jewelry). Target audience: Women 22–45, interested in handmade jewelry + fashion accessories, located in metro cities. Budget: ₹400/day for 5 days. Shall I put this in your approval queue for review?"

Merchant: "Yes, I'll look at it later."

> **Marketing Agent** — "Added to your approval queue. No rush — the campaign won't start until you approve."

> **Sales Agent** — "I've set your abandoned cart recovery sequence:
> - Email 1: 1 hour after abandonment ('You left something behind')
> - WhatsApp reminder: 3 hours after abandonment
> - Email 2: 24 hours ('Still interested? Here's ₹100 off')
> - Email 3: 72 hours ('Last chance — your cart expires soon')
> All using your store branding. [Preview emails →]"

At the 30-minute mark, the merchant has: a live store, five configured agents, connected integrations, a pending campaign to review, active cart recovery, and an SEO-optimized storefront. They did not fill out a single traditional settings form.

---

### Journey 3: Daily Operation — A Regular Tuesday

**8:55 AM — WhatsApp Notification**

Priya's phone buzzes. It is a WhatsApp message from the platform:

> ☀ **Morning Briefing — Tuesday, Oct 15**
>
> **Yesterday's Results:**
> Revenue: ₹4,200 (3 orders) — ↑12% vs Monday
> Visitors: 187 — ↑8% vs Monday
> Conversion: 1.6% — stable
>
> **Overnight Activity:**
> • Support Agent handled 7 customer queries (5 order status, 1 sizing question, 1 return request)
> • 2 abandoned carts recovered (₹1,800 in revenue)
> • Marketing: Instagram campaign spent ₹380, reached 4,200 people, 3 link clicks
>
> **Needs Your Attention (3 items):**
> 1. Refund request: ₹850 — damaged pendant (Support Agent has photos)
> 2. Marketing: Navratri campaign proposal — ₹500/day for 9 days
> 3. Low stock alert: Sterling Silver Jhumkas — 4 remaining
>
> [Open Dashboard →]

**9:02 AM — Dashboard**

Priya opens the dashboard. The Command Center loads with the familiar dark interface. The top bar shows agent statuses:

- **Marketing:** Working — "Optimizing Instagram ad audiences"
- **Sales:** Idle — "Monitoring, all quiet"
- **Support:** Working — "Handling 1 active conversation"
- **Analytics:** Idle — "Next report: Friday weekly summary"
- **Technical:** Idle — "All systems healthy"

The center of the screen shows the **Approval Queue** with 3 items:

**Item 1: Refund Request**
> **Sales Agent** requests approval
> Customer Meera Patel ordered Sterling Silver Necklace (₹850) on Oct 10. Delivered Oct 13. Customer reports clasp is damaged — photos attached. [View photos]
>
> **Recommendation:** Approve refund. Customer has ordered 3 times before (LTV: ₹3,200). Sending a replacement clasp would cost ₹120 via self-delivery — I recommend offering this as option 1 with full refund as option 2.
>
> [Approve Refund ₹850] [Offer Replacement Clasp] [Reject — Contact Customer]

Priya taps "Offer Replacement Clasp."

> **Sales Agent** — "Done. I've told Support Agent to offer Meera the replacement clasp option first, with full refund as backup. Support will handle the conversation."

**Item 2: Navratri Campaign**
> **Marketing Agent** requests approval
> Navratri starts Oct 15 (today!) through Oct 23.
>
> **Proposed campaign:**
> Platform: Instagram (Feed + Stories)
> Creative: 3 product shots with festive overlay — "Celebrate Navratri with Sterling Silver" [Preview creatives →]
> Audience: Women 22–45, interested in ethnic jewelry + Navratri + festive fashion, Tier 1+2 cities
> Budget: ₹500/day × 9 days = ₹4,500 total
> Estimated reach: 38,000–52,000
> Estimated ROAS: 2.2–3.1x (based on your previous campaign performance)
>
> **I've also prepared:**
> - Navratri collection page on your store with 8 products [Preview →]
> - 15% Navratri discount code: NAVRATRI15 (auto-applies at checkout)
> - Email to 45 past customers: "Navratri Special — Sterling Silver at 15% Off" [Preview →]
>
> [Approve All (₹4,500)] [Approve Ads Only] [Modify Budget] [Reject]

Priya reviews the creatives (they look good — festive without being garish), taps "Approve All."

> **Marketing Agent** — "Campaign is live. Navratri collection page published. Discount code active. Email scheduled for 11 AM today. I'll report performance daily."

**Item 3: Low Stock Alert**
> **Sales Agent** — "Sterling Silver Jhumkas: 4 units remaining. At current sell rate (1.2/day), you'll be out of stock by Friday.
>
> Options:
> 1. I can pause promotion of this product to preserve stock for organic orders
> 2. I can mark it as 'Limited Edition — Only 4 Left' to create urgency
> 3. No action needed — you'll restock before Friday
>
> [Pause Promotion] [Add Urgency Tag] [Dismiss — Restocking]"

Priya taps "Add Urgency Tag."

> **Sales Agent** — "Done. Product page now shows 'Only 4 left — selling fast!' badge. I've also told Marketing Agent not to feature this product in paid ads until stock is replenished."

**9:04 AM — Queue processed. Total time: 2 minutes.**

Priya closes the approval queue. She now wants to do something proactive.

**9:05 AM — Conversational Command**

Priya opens the command bar (Cmd+K) and types: "Create a flash sale this Saturday for earrings, 25% off, 6 PM to midnight only"

> **Marketing Agent** — "Got it. Setting up a flash sale:
> - Products: All earrings (12 products)
> - Discount: 25% off
> - Window: Saturday Oct 19, 6:00 PM – 11:59 PM IST
> - Discount code: EARRINGS25 (auto-applied on earrings pages)
>
> I'll prepare:
> - Instagram Story countdown (posts Friday evening)
> - WhatsApp broadcast to 45 past customers (Saturday 5:30 PM)
> - Homepage banner swap at 6 PM Saturday (auto-reverts at midnight)
> - Email to subscribers (Saturday 12 PM — teaser)
>
> **Budget for promotion: ₹0 (organic only, using existing channels)**
>
> Shall I add this to your approval queue or approve now?"

Priya: "Approve now."

> **Marketing Agent** — "Flash sale scheduled. All assets will be created and deployed automatically. I'll report results on Sunday morning."

Priya closes the dashboard. Her agents will handle the rest.

---

### Journey 4: Critical Moment — Something Goes Wrong

**Thursday, 11:47 PM**

**Analytics Agent** detects an anomaly. Revenue for Thursday is ₹1,100 against a 7-day rolling average of ₹4,800. That is a 77% drop. The agent does not wait until the morning briefing.

**11:48 PM — Automated Investigation Begins**

The Analytics agent publishes a coordination event to all agents:

> **[INTERNAL] Analytics → All Agents:** Revenue anomaly detected. Thursday revenue ₹1,100 vs ₹4,800 expected (77% drop). Initiating cross-agent investigation.

**Marketing Agent responds (11:48 PM):**
> Checked Meta Ads performance. Instagram campaign spent ₹420 today with normal impressions (4,100) but CTR dropped from 1.8% to 0.3%. Click-through to store is nearly zero. Investigating creative fatigue or audience issue.
>
> Also checked: Google Ads paused (no active campaign). Email sends normal. WhatsApp delivery normal.
>
> **Finding: Ad traffic dropped 85%. Not a platform spend issue — the ads are running but not converting to clicks.**

**Technical Agent responds (11:49 PM):**
> Ran PageSpeed check. Homepage LCP: 8.4 seconds (normally 1.8s). Product pages loading slowly. Checked Vercel function logs — multiple timeout errors on `/api/products/list` starting at 3:42 PM today.
>
> Checked Supabase: database connection pool at 98% utilization. Multiple slow queries detected. Longest running query: 12 seconds on product listing with full-text search.
>
> **Finding: Database performance degradation since 3:42 PM. Store is effectively unusable — pages taking 8+ seconds to load. This explains the ad CTR drop — users click the ad, store does not load, they bounce.**

**Sales Agent responds (11:49 PM):**
> Checkout funnel data: 41 visitors today reached the store. 0 reached checkout. Abandoned cart rate: 100% — but not "abandoned" in the traditional sense. Users are bouncing before the page loads.
>
> **Finding: Confirms Technical Agent diagnosis. Zero checkout attempts since 3:42 PM.**

**Support Agent responds (11:50 PM):**
> Received 4 customer messages today about "site not working" and "page not loading." Auto-responded with "We're experiencing temporary technical issues and are working on a fix. Apologies for the inconvenience." Logged all complaints.
>
> **Finding: Customers are actively complaining about site performance.**

**11:50 PM — Diagnosis Complete (3 minutes after detection)**

The Analytics agent compiles the findings and sends a priority alert to the merchant:

**WhatsApp Push Notification:**

> 🚨 **Urgent: Store Performance Issue Detected**
>
> Your store has been loading slowly since 3:42 PM today, causing a 77% revenue drop.
>
> **Root Cause:** Database performance degradation — connection pool near capacity with slow queries on product listings.
>
> **Impact:**
> - Revenue today: ₹1,100 (vs ₹4,800 expected)
> - Estimated lost revenue: ~₹3,700
> - 41 visitors bounced due to slow load times
> - 4 customers complained (Support Agent responded)
> - Instagram ad budget partially wasted (₹420 spent on ads driving traffic to a broken store)
>
> **Recommended Actions:**
> 1. **Immediate:** Technical Agent can restart the database connection pool and optimize the slow query (auto-executable — no data loss risk)
> 2. **Short-term:** Technical Agent will add query caching to prevent recurrence
> 3. **Recovery:** Marketing Agent recommends pausing Instagram ads until site is stable, then increasing budget for 48 hours to recover lost impressions
>
> [Approve Fix Now] [Open Dashboard for Details]

**11:52 PM — Merchant Responds**

Priya sees the WhatsApp notification (she is still awake — it is Navratri week). She taps "Approve Fix Now."

**11:52 PM — Resolution**

> **Technical Agent** — "Executing fix. Optimizing product listing query... done. Restarting connection pool... done. Running PageSpeed check... LCP: 1.9 seconds. Store is back to normal performance."

> **Marketing Agent** — "Pausing Instagram campaign to avoid wasting budget on a recovering store. Will restart tomorrow at 8 AM with a 20% budget increase for 48 hours to recover lost ground. This is within your approved daily limit — no additional approval needed."

> **Analytics Agent** — "Monitoring recovery. I'll send you a special report tomorrow morning with full incident analysis and comparison data."

> **Support Agent** — "Sending follow-up messages to the 4 customers who complained: 'The issue has been resolved — sorry for the inconvenience. Here's a ₹100 discount code (SORRY100) for your next order.' Pending your approval for the discount code."

**Friday, 9:00 AM — Morning Briefing**

> ☀ **Morning Briefing — Friday, Oct 18**
>
> **Incident Recovery Report:**
> Store was degraded from 3:42 PM – 11:52 PM Thursday (8 hours, 10 minutes).
> Root cause: Database query performance — fixed and optimized by Technical Agent.
> Estimated revenue loss: ₹3,700. Recovery discount codes sent to 4 affected customers.
>
> **Since Fix (11:52 PM – 9:00 AM):**
> Revenue: ₹1,200 (3 orders — strong overnight recovery)
> Site performance: LCP 1.9s (healthy)
> Instagram campaign: Restarted at 8 AM with ₹600/day budget
>
> **Navratri Campaign Update (Day 4 of 9):**
> Total spend: ₹1,820 | Revenue attributed: ₹8,400 | ROAS: 4.6x
> Navratri collection page: 230 visits, 12 orders
> NAVRATRI15 code used: 18 times
>
> **Today's Approval Queue: 1 item**
> Support Agent: Approve ₹100 discount codes for 4 affected customers? (Total: ₹400)
>
> [Open Dashboard →]

The entire incident — detection, diagnosis, coordination, fix, recovery — happened while the merchant was watching Netflix. Four agents coordinated without human intervention. The merchant's only action was tapping one button on WhatsApp. The store was down for 8 hours but the resolution took 2 minutes of the merchant's time.

This is the "one-man company" in action.


# Section 5: UX/UI Specification

## 5.1 Design System

### Color Palette

The design language follows a dark-mode-first aesthetic inspired by Linear, Vercel, and Raycast. Every surface is a shade of near-black or dark gray, with color reserved exclusively for status and interaction.

**Backgrounds**
| Token | Value | Usage |
|-------|-------|-------|
| `--bg-root` | `#0a0a0a` | Page background, root canvas |
| `--bg-surface` | `#111111` | Cards, panels, primary containers |
| `--bg-elevated` | `#191919` | Modals, dropdowns, popovers, hover states |
| `--bg-inset` | `#0d0d0d` | Inset regions (code blocks, nested panels) |
| `--bg-overlay` | `rgba(0,0,0,0.6)` | Backdrop behind modals/command palette |

**Borders**
| Token | Value | Usage |
|-------|-------|-------|
| `--border-default` | `#1e1e1e` | Card borders, dividers |
| `--border-subtle` | `#161616` | Subtle separators within cards |
| `--border-focus` | `#3b82f6` | Focus rings (2px solid) |
| `--border-hover` | `#2a2a2a` | Border on hover |

**Text**
| Token | Value | Usage |
|-------|-------|-------|
| `--text-primary` | `#fafafa` | Headlines, primary content |
| `--text-secondary` | `#a1a1aa` | Descriptions, labels, secondary info |
| `--text-tertiary` | `#52525b` | Timestamps, metadata, disabled |
| `--text-inverse` | `#0a0a0a` | Text on colored backgrounds |

**Status Colors**
| Status | Dot/Badge | Background (subtle) | Text | Usage |
|--------|-----------|---------------------|------|-------|
| Active/Success | `#22c55e` | `rgba(34,197,94,0.1)` | `#4ade80` | Agent running, action completed, auto-executed |
| Needs Approval | `#f59e0b` | `rgba(245,158,11,0.1)` | `#fbbf24` | Pending approvals, warnings |
| Idle/Paused | `#52525b` | `rgba(82,82,91,0.1)` | `#71717a` | Agent paused, no activity |
| Error/Failed | `#ef4444` | `rgba(239,68,68,0.1)` | `#f87171` | Failures, blocked actions |
| Accent/Info | `#3b82f6` | `rgba(59,130,246,0.1)` | `#60a5fa` | Links, interactive elements, info badges |
| Premium/AI | `#a855f7` | `rgba(168,85,247,0.1)` | `#c084fc` | AI-generated content indicators |

**Agent Identity Colors** — Each agent has a fixed accent color used for its avatar ring, timeline markers, and workspace header gradient.
| Agent | Color | Token |
|-------|-------|-------|
| Marketing | `#f97316` (orange) | `--agent-marketing` |
| Sales | `#22c55e` (green) | `--agent-sales` |
| Support | `#3b82f6` (blue) | `--agent-support` |
| Analytics | `#a855f7` (purple) | `--agent-analytics` |
| Technical | `#64748b` (slate) | `--agent-technical` |

### Typography

All typography uses the system font stack for performance. Monospace is reserved for data-heavy contexts (IDs, code, metrics, timestamps).

```css
--font-sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
--font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
```

| Scale | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `display` | 28px | 600 | 1.2 | Page titles ("Command Center") |
| `heading` | 20px | 600 | 1.3 | Section headers, card titles |
| `subheading` | 14px | 500 | 1.4 | Card subtitles, group labels |
| `body` | 14px | 400 | 1.5 | Default text, descriptions |
| `small` | 12px | 400 | 1.5 | Timestamps, metadata, badges |
| `micro` | 11px | 500 | 1.4 | Keyboard shortcuts, tiny labels |
| `mono-data` | 13px (mono) | 500 | 1.4 | Order IDs, prices, metrics |

Letter spacing: `-0.01em` on headings, `0` on body, `0.02em` on micro/uppercase labels.

### Component Patterns

**Cards** — The primary container unit. All cards share:
- Background: `--bg-surface`
- Border: 1px solid `--border-default`
- Border radius: 12px
- Padding: 16px (compact) or 20px (standard)
- Hover: border transitions to `--border-hover` over 150ms
- No box-shadow (shadows are reserved for elevated elements like modals)

**Agent Status Card** — A specialized card variant:
- Left edge: 2px vertical bar in agent color
- Header: Agent icon (16x16 SVG) + name + status dot (8px circle, pulsing animation when active)
- Body: 2-3 key metrics in mono-data font, latest action as one-line summary
- Footer: "View workspace →" link or pending approval count badge

**Badges** — Pill-shaped, always uppercase micro text:
- Status badges: colored background + colored text (from status colors table)
- Count badges: `--bg-elevated` background + `--text-secondary` text
- Agent badges: agent color background at 10% opacity + agent color text

**Timeline Items** — Used in activity feeds and agent workspaces:
- Left gutter: vertical line (1px `--border-default`) connecting agent-colored dots (8px circles)
- Content: action description (body), timestamp (small, tertiary), optional expandable detail
- Grouped by time: "Just now", "2 min ago", "Today", "Yesterday"

**Status Indicators**
- Dot: 8px circle, agent/status color. Pulsing ring animation (scale 1→1.5, opacity 1→0, 2s infinite) when active.
- Inline: Small dot (6px) inline with text for list items.
- Banner: Full-width bar at top of card/page for important states (e.g., "3 approvals waiting").

**Buttons**
- Primary: white text on `--bg-elevated` with blue border on hover, keyboard shortcut hint right-aligned in micro text
- Approve: green subtle background, green text, green border on hover
- Reject: red subtle background, red text
- Ghost: no background, `--text-secondary`, hover shows `--bg-elevated`
- All buttons: 32px height (compact) or 36px height (standard), 8px border-radius, 150ms transitions

**Inputs**
- Background: `--bg-inset`
- Border: 1px solid `--border-default`, `--border-focus` on focus
- Text: `--text-primary`
- Placeholder: `--text-tertiary`
- Height: 36px, border-radius 8px

### Animation Principles

1. **Fast**: No transition exceeds 200ms. Most are 100-150ms. The interface should feel instant.
2. **Subtle**: Opacity and transform only. No color flashes, no bouncing, no scaling above 1.02x.
3. **Purposeful**: Animation communicates state change, not decoration.
   - Card hover: border color transition (150ms ease)
   - Activity item enter: translateY(4px) → 0, opacity 0 → 1 (150ms ease-out)
   - Agent status change: dot color crossfade (200ms)
   - Approval resolved: item collapses height to 0 (200ms ease-in-out) then removed from DOM
   - Command palette open: opacity 0 → 1, translateY(-8px) → 0 (100ms ease-out)
   - Skeleton loading: subtle pulse on `--bg-elevated` (1.5s ease-in-out infinite)
4. **Reduced motion**: All animations respect `prefers-reduced-motion: reduce`. Transitions become instant.

### Keyboard-First Interactions

Every action in the platform is reachable without a mouse. The keyboard model follows Raycast/Linear conventions.

| Shortcut | Action |
|----------|--------|
| `Cmd+K` | Open command palette |
| `Cmd+J` | Open approval queue |
| `Cmd+1` through `Cmd+5` | Navigate to agent workspace (Marketing=1, Sales=2, Support=3, Analytics=4, Technical=5) |
| `Cmd+Shift+A` | Home / Command Center |
| `Cmd+Shift+P` | Products |
| `Cmd+Shift+O` | Orders |
| `g` then `h` | Go Home (vim-style, when no input focused) |
| `g` then `a` | Go Approvals |
| `g` then `p` | Go Products |
| `g` then `o` | Go Orders |
| `g` then `s` | Go Settings |
| `j` / `k` | Navigate up/down in lists (activity feed, product list, approval queue) |
| `Enter` | Open selected item |
| `Esc` | Close modal/palette, deselect |
| `a` | Approve (when an approval is selected) |
| `r` | Reject (when an approval is selected) |
| `?` | Show keyboard shortcut overlay |

Focus indicators: 2px solid `--border-focus` ring, offset 2px. Visible only on keyboard navigation (`:focus-visible`), hidden on mouse click.

---

## 5.2 Key Screens

### 1. Home / Command Center

The merchant's primary screen. Everything important is visible within one viewport. No scrolling to reach critical information.

**Layout**: Full-width, three-column grid on desktop (1fr 1.5fr 1fr).

**Left Column — Agent Cards Stack**
- Five vertically stacked agent status cards, each ~100px tall
- Each card: agent icon + name (left), status dot + state label (right), one-line latest action below, 1-2 key metrics in mono font at bottom
- Cards are interactive: click opens agent workspace, right-click shows quick actions menu (pause, configure, view logs)
- If an agent has pending approvals, an amber count badge pulses on the card's top-right corner
- Cards ordered by activity (most recent at top) with option to pin order

**Center Column — Activity Feed**
- Reverse-chronological feed of all agent actions across the store
- Each item: agent-colored dot on timeline rail, agent badge, action description, timestamp, optional "Details ▸" expander
- Actions are filterable by agent (row of 5 small toggleable agent badges at feed top) and by type (auto-executed, approved, rejected, failed)
- Auto-executed actions show a green checkmark icon; approval-required actions show an amber clock icon
- Feed updates in real-time via Supabase Realtime subscription — new items slide in from top with subtle animation
- Clicking any feed item opens a detail panel (right-side slide-over) or navigates to relevant entity
- Example feed items:
  - `[Support] Auto-replied to customer inquiry about shipping times — 2 min ago`
  - `[Sales] ⏳ Wants to send 15% discount to 23 at-risk customers — Approve / Reject`
  - `[Analytics] Weekly report generated: Revenue up 12%, 3 anomalies detected — Just now`
  - `[Marketing] Published Instagram post for "Summer Collection" — 1 hour ago`
  - `[Technical] Fixed 3 broken product image links — 45 min ago`

**Right Column — Approvals + Quick Stats**
- Top: Approval Queue Summary — count of pending approvals, grouped by urgency (expiring soon on top). Each approval: agent badge, one-line description, Approve/Reject buttons inline. Maximum 5 shown with "View all →" link.
- Bottom: Quick Stats Panel — 4 key metrics in a 2x2 grid (Today's Revenue, Orders Today, Active Visitors, Agent Actions Today). Each metric: large mono number, small delta badge (↑12% in green or ↓3% in red), sparkline or trend indicator.

**Top Bar** (persistent across all pages)
- Left: StoreForge logo (small) + store name
- Center: Cmd+K search bar (appears as a subtle pill-shaped input, `--bg-inset` background, placeholder "Search or command... ⌘K")
- Right: Notification bell (with unread count dot), store avatar/initial, dropdown menu (Settings, Billing, View Store, Sign Out)

**Bottom Bar** — Slim 40px bar showing platform status:
- Left: "All agents operational" with green dot, or specific agent warnings
- Right: "Next scheduled action: Analytics report in 2h 15m"

### 2. Agent Workspace

The dedicated view for a single agent. Opened by clicking an agent card from Command Center or via `Cmd+1` through `Cmd+5`.

**Layout**: Two-column (2fr 1fr) with full-width header.

**Header** — Full-width, 80px tall:
- Agent icon (24px) + agent name ("Marketing Agent") in display font
- Status: colored dot + label ("Running" / "Paused" / "Needs Attention")
- Subtle top-border gradient in the agent's identity color (fades from left)
- Right side: "Pause Agent" toggle button, "Configure" gear icon, "Chat with Agent" button

**Left Column — Timeline + Chat**
- Tabbed view with two tabs: "Activity" (default) and "Chat"
- **Activity Tab**: Full timeline of this agent's actions, identical format to Command Center feed but filtered to this agent only. Richer detail: each action expands to show full context (what data the agent analyzed, what decision it made, what the outcome was). Failed actions show error details and retry button.
- **Chat Tab**: Direct conversation interface with the agent. Message bubbles (user on right, agent on left in agent-colored bubble). User can give instructions ("Run a flash sale this weekend"), ask questions ("Why did you pause that campaign?"), or provide feedback ("That email subject line was bad, use shorter ones"). Chat history persisted per agent. Input bar at bottom with text field + send button.

**Right Column — Metrics + Config**
- **Metrics Panel** (top half): 4-6 key metrics specific to this agent, displayed as large mono numbers with trend arrows and sparklines. Metrics vary by agent:
  - Marketing: Ad spend, ROAS, impressions, click-through rate, posts published
  - Sales: Cart recovery rate, upsell revenue, average order value lift, active campaigns
  - Support: Tickets resolved, avg response time, customer satisfaction, escalation rate
  - Analytics: Reports generated, anomalies detected, insights surfaced, data freshness
  - Technical: SEO score, page speed, broken links fixed, uptime
- **Configuration Panel** (bottom half): Agent-specific settings exposed inline. Autonomy level slider (1-5), budget limits (for Marketing), response tone (for Support), reporting frequency (for Analytics). "Advanced Settings →" link to full settings page.
- **Connected Accounts** (if applicable): List of linked third-party accounts (Meta Ads, Google Ads, GA4) with status indicators and reconnect buttons.

### 3. Approval Queue

Dedicated full-page view for reviewing and actioning all pending approvals. Accessible via `Cmd+J`, the approval count badge in the top bar, or from Command Center.

**Layout**: Single-column, centered content (max-width 720px), with keyboard navigation.

**Header**: "Approvals" in display font + count badge + filter toggles (by agent, by urgency)

**List**: Each approval is a card with:
- **Top Row**: Agent badge (colored pill) + action category (e.g., "Customer Communication", "Discount Campaign", "Content Publish") + urgency indicator (if time-sensitive: amber clock + "Expires in 2h")
- **Summary**: One-line description of what the agent wants to do. Example: "Send 15% recovery email to 23 customers who abandoned carts in the last 48 hours"
- **Context Panel**: Expandable section showing the agent's reasoning. Why it chose this action, what data it analyzed, predicted outcome, estimated cost (if applicable). This is the "evidence" panel — no black boxes.
  - Example: "Based on analysis of 156 abandoned carts from the past 30 days, a 15% discount recovers an average of 31% of carts (historical data from your store). Estimated revenue recovery: ₹18,400. Email template: [Preview →]"
- **Preview** (when applicable): Inline preview of the content — email rendered, ad creative thumbnail, discount code details, SEO meta tag changes
- **Action Buttons**: Right-aligned at card bottom:
  - "Approve" (green, keyboard: `a`) — executes immediately, card animates out
  - "Reject" (ghost/red, keyboard: `r`) — optional rejection reason textarea slides in
  - "Edit & Approve" (ghost/blue) — opens editable version of the action, then approve
  - "Ask Agent" (ghost) — opens inline chat to ask the agent a question about this specific action before deciding
- **Batch Actions**: Checkbox on each card. When multiple selected, floating bottom bar appears: "Approve 3 selected" / "Reject 3 selected"

**Empty State**: When no approvals pending — illustration with "All clear. Your agents are running smoothly." and links to agent workspaces.

**Keyboard Flow**: `j`/`k` to navigate between approvals, `Enter` to expand context, `a` to approve, `r` to reject, `e` to edit-and-approve, `Esc` to collapse.

### 4. Products Page

The existing products page redesigned with Linear's list/table aesthetic and agent intelligence overlays.

**Layout**: Full-width with left sidebar navigation (consistent across all pages).

**Header**: "Products" title + product count + "Add Product" button + search/filter bar

**Product List**: Table-style rows (not cards) with columns:
- Checkbox (for bulk actions)
- Image thumbnail (40x40, rounded-4px)
- Product name + subtitle (category in tertiary text)
- Price (mono font)
- Inventory count (with low-stock amber indicator if < 10)
- Status (Published/Draft badge)
- Agent Activity column: Small agent-colored indicators showing recent agent involvement:
  - Purple sparkle icon: "AI-generated description"
  - Orange tag: "Featured in marketing campaign"
  - Blue chat bubble: "3 support inquiries this week"
  - Green shopping bag: "Included in upsell flow"

**Agent Intelligence Overlay**: A collapsible panel above the product list:
- "Agent Insights" heading with purple AI sparkle icon
- 2-3 actionable suggestions from agents:
  - `[Analytics] 5 products have no sales in 30 days — Review →`
  - `[Marketing] "Blue Kurta Set" is trending in search but has low inventory — Restock? →`
  - `[Technical] 12 products are missing meta descriptions — Auto-generate →`
- Each suggestion has a one-click action button

**Row Interactions**:
- Click row → opens product detail/edit (existing `ProductForm` in edit mode, within new layout shell)
- Right-click → context menu: Edit, Duplicate, Archive, View in Store, Ask Agent About This Product
- Hover → row background shifts to `--bg-elevated`
- Bulk actions bar appears at bottom when items selected: Publish, Unpublish, Delete, "Ask Agent to Optimize"

**Filters/Search**:
- Search input with instant filtering
- Filter pills: Status (All, Published, Draft, Archived), Category, Has Variants, Agent Flags (AI-described, Low Stock, No Sales)
- Sort: Name, Price, Created, Inventory, Sales (with agent-computed "performance" sort option)

### 5. Orders Page

Redesigned with agent activity context woven into each order.

**Layout**: Same left-sidebar layout. Table-style list.

**Header**: "Orders" title + count + filters (Status, Date Range, Agent Involved)

**Order List Columns**:
- Order ID (mono font, `#SF-1234`)
- Customer name + avatar initial
- Items count + total (mono font)
- Status badge (Pending, Confirmed, Shipped, Delivered, Cancelled)
- Payment badge (Paid, COD, Refunded)
- Agent Activity: small inline indicators showing agent involvement:
  - `[Support]` blue bubble: "Customer query resolved"
  - `[Sales]` green tag: "Recovered from abandoned cart (15% discount)"
  - `[Support]` blue reply icon: "Auto-sent shipping update"

**Order Detail Slide-Over**: Clicking an order opens a right-side panel (50% width) rather than navigating away:
- Order summary, items list, customer info, payment details, shipping tracking (all existing data)
- New "Agent Activity" section at bottom: timeline of all agent actions related to this order
  - "Support Agent sent order confirmation email — 2h ago"
  - "Support Agent auto-replied to customer question about delivery date — 1h ago"
  - "Sales Agent added post-purchase recommendation email to queue — 30m ago"

### 6. Analytics Dashboard

Completely reimagined. Instead of static charts the merchant configures, the Analytics Agent curates the insights.

**Layout**: Full-width, masonry-style card grid.

**Top Section — Key Metrics Bar**:
- Horizontal row of 5-6 key metric cards: Revenue (with period comparison), Orders, Average Order Value, Conversion Rate, Active Customers, Agent ROI (value generated by agents)
- Each metric: large mono number, delta badge, sparkline trend. Click to drill into detailed chart.

**Agent-Curated Insights Section**:
- Cards generated by the Analytics Agent, ranked by importance/urgency:
  - "Revenue Anomaly Detected" — chart showing unexpected dip/spike, agent's explanation, suggested action
  - "Top Performing Products This Week" — mini bar chart with product thumbnails
  - "Customer Segment Shift" — "Returning customer rate increased 8%. Your loyalty campaign is working."
  - "Inventory Alert" — "At current sales velocity, 'Blue Silk Saree' will be out of stock in 5 days"
  - "Marketing ROI Update" — "Last week's Meta campaign generated ₹42,000 in attributed revenue on ₹8,000 spend"
- Each insight card has: icon, title, visualization (chart/number/trend), explanation text, action button ("View Details", "Adjust Campaign", "Restock Now")

**Bottom Section — Traditional Charts** (for merchants who want raw data):
- Revenue over time (line chart, configurable period)
- Orders by status (stacked bar)
- Top products (horizontal bar)
- Traffic sources (donut chart, if GA4 connected)
- All charts use the dark theme palette: chart lines in `--text-secondary`, fills in agent/status colors at 20% opacity, grid lines in `--border-subtle`

### 7. Settings / Agent Configuration

**Layout**: Left sidebar with settings categories, content area on right.

**Categories**:
- **Store Settings** — existing store settings (name, logo, policies, etc.) migrated into new layout
- **Payments** — existing Razorpay/Stripe configuration
- **Shipping** — existing shipping provider configuration
- **Notifications** — existing email/WhatsApp configuration
- **Agent Configuration** — NEW
- **Connected Accounts** — NEW
- **Billing** — NEW (future)

**Agent Configuration Page**:
- One expandable section per agent
- Each section contains:
  - **Status Toggle**: On/Off with confirmation
  - **Autonomy Level**: Slider or segmented control (1-5):
    - Level 1: "Suggest Only" — agent suggests, never acts
    - Level 2: "Ask for Everything" — all actions require approval
    - Level 3: "Smart Autonomy" (default) — routine actions auto-execute, significant actions need approval
    - Level 4: "Mostly Autonomous" — only high-impact actions need approval (spend > threshold, bulk operations)
    - Level 5: "Full Autonomy" — agent acts independently, merchant reviews retroactively
  - **Autonomy Threshold Details**: What counts as "routine" vs "significant" for each level. These are pre-defined but visible. Example for Marketing Agent Level 3: "Auto-execute: social media posts, SEO updates. Needs approval: ad campaigns, discount codes, email blasts."
  - **Budget Limits** (Marketing/Sales): Monthly spend cap for ad platforms, discount caps
  - **Tone/Voice** (Support): "Professional", "Friendly", "Casual" — with preview of sample response
  - **Schedule** (Analytics): Report frequency (daily/weekly/monthly), preferred delivery time
  - **Notification Preferences**: Which agent actions trigger push notifications to merchant

**Connected Accounts Page**:
- Grid of integration cards: Meta (Facebook/Instagram), Google Ads, Google Analytics, Shopify (for migration), Etsy (for migration)
- Each card: service logo, connection status (Connected with green dot / Not Connected), account name if connected, "Connect" or "Disconnect" button
- Connect flow: OAuth popup → callback → encrypted token storage → confirmation
- Warning banner if a required connection is missing for an agent (e.g., Marketing Agent needs Meta connection)

### 8. Cmd+K Command Palette

The unified command interface. Always accessible via `Cmd+K` (or clicking the search bar). Feels like Raycast — fast, contextual, powerful.

**Appearance**: Centered modal, 560px wide, max 400px tall, `--bg-surface` background, strong border, slight box-shadow (`0 16px 48px rgba(0,0,0,0.4)`). Opens with 100ms fade-in + translateY(-8px) animation.

**Input**: Single text field at top, 48px tall, large body font, placeholder cycles through hints: "Search products...", "Ask an agent...", "@support check order #1234", "Create a coupon..."

**Result Sections** (appear as user types, instant filtering):
1. **Commands** — Built-in navigation and actions:
   - "Go to Products", "Go to Orders", "Go to Settings", "View Store", "Add Product", "Create Coupon"
   - Each shows keyboard shortcut on the right side
2. **Agents** — When input starts with `@` or an agent name:
   - "@marketing create a flash sale" → routes to Marketing Agent chat
   - "@support what's the status of order #1234" → routes to Support Agent
   - "@analytics how did we do last week" → routes to Analytics Agent
   - Typing `@` shows all 5 agents as selectable targets
3. **Search Results** — Products, orders, customers matching the query:
   - Products: thumbnail + name + price + status
   - Orders: ID + customer + total + status
   - Customers: name + email + order count
4. **Recent** — When palette first opens (empty input), shows recent commands and recent agent interactions
5. **AI Suggestions** — If input doesn't match any command or search result, the palette offers to route to the most appropriate agent: "Ask Marketing Agent about this?" / "Ask Support Agent?"

**Interaction Model**:
- Arrow keys or `j`/`k` to navigate results
- `Enter` to select/execute
- `Tab` to auto-complete (fills in agent name, command, etc.)
- `Esc` to close
- Results update as user types (debounced 100ms)
- Agent responses appear inline in the palette for quick queries, or "Open in workspace →" for complex interactions

**Context Awareness**:
- On Products page: palette prioritizes product search and product-related commands
- On Orders page: palette prioritizes order search
- On Agent Workspace: palette pre-fills `@agentname` prefix

### 9. Onboarding Flow

Two-phase onboarding: instant store creation (inherited from existing 10-step flow, compressed) + gradual agent activation.

**Phase A: Store Creation (30 seconds)**

The existing conversational onboarding is compressed into a single-page form. The goal is to get the store live immediately so agents have something to work with.

- Step 1: Store name + category (dropdown) — auto-generates slug, validates availability
- Step 2: Upload logo (or click "Generate with AI") + pick theme (4 cards: modern/classic/playful/minimal) + pick primary color
- Step 3: Add first product (image upload → AI extraction fills fields) OR skip ("Add products later")
- Step 4: Store is live. Confirmation screen with store URL, "Visit Store" button, and a prominent "Set Up Your AI Agents →" CTA

**Phase B: Agent Setup (30 minutes, guided but interruptible)**

After store creation, merchant lands on the Command Center with a guided setup overlay. The overlay is a checklist sidebar that persists until completed or dismissed.

- **Step 1: Connect Payments** (required) — Razorpay or Stripe setup wizard. Without this, no orders can be processed.
- **Step 2: Activate Support Agent** (recommended first) — Toggle on, set autonomy level, optionally add FAQ content. Agent immediately starts monitoring for customer inquiries via the website chat widget.
- **Step 3: Activate Sales Agent** — Configure abandoned cart recovery settings, review default email templates.
- **Step 4: Connect Google Analytics** (optional) — OAuth flow, enables Analytics Agent.
- **Step 5: Connect Meta Ads** (optional) — OAuth flow, enables Marketing Agent ad features.
- **Step 6: Activate remaining agents** — Quick toggle for Analytics and Technical agents with sane defaults.

Each step has a "Skip for now" option. The checklist shows completion percentage and remains accessible from settings until 100% complete. Agents that are activated start working immediately (Support responds to queries, Technical starts SEO audit, Analytics begins data collection).

---

## 5.3 Responsive Design

**Desktop (1280px+)**: Full experience. Three-column Command Center, side-by-side Agent Workspace, full table views.

**Tablet (768px–1279px)**: Two-column Command Center (agent cards collapse into horizontal scrolling row at top, activity feed takes full width below). Agent Workspace becomes single-column with tabbed navigation between timeline and metrics. Product/Order tables retain most columns but hide agent activity column.

**Mobile (< 768px)**: Single-column everywhere. Designed for "check and approve" use case — the merchant glances at their phone to approve pending agent actions.
- Command Center: Approval count banner at top (large, tappable), then compact activity feed. Agent cards hidden behind hamburger menu.
- Approval Queue: Full-screen card stack. Swipe right to approve, swipe left to reject (with haptic feedback via Vibration API). This is the primary mobile interaction.
- Products/Orders: Simplified list view (name + price + status only). Tap to open detail.
- Cmd+K: Full-screen overlay on mobile, accessible via floating action button (bottom-right, blue accent circle).
- Navigation: Bottom tab bar with 5 icons (Home, Approvals with badge, Products, Orders, Settings). Replaces sidebar.
- Agent Workspace: Full-screen with tab bar (Activity, Chat, Metrics).

---

# Section 6: Technical Architecture

## 6.1 What We Keep, Modify, and Replace

### Keep As-Is
| Path | Reason |
|------|--------|
| `lib/payment/razorpay.ts` | Payment processing logic is production-tested |
| `lib/payment/stripe.ts` | Stripe integration is complete |
| `lib/payment/stripe-client.ts` | Client-side Stripe checkout |
| `lib/shipping/` (all files) | Multi-provider shipping works correctly |
| `lib/products/db-operations.ts` | Product CRUD is solid |
| `lib/products/image-processor.ts` | Image upload/processing pipeline |
| `lib/products/processing-pipeline.ts` | Enhancement + AI analysis orchestration |
| `lib/products/variant-operations.ts` | Variant CRUD |
| `lib/products/variant-utils.ts` | Variant utilities |
| `lib/products/validation.ts` | Zod schemas for products |
| `lib/products/csv-parser.ts` | CSV bulk import |
| `lib/products/demo-products.ts` | Demo product fixtures |
| `lib/encryption.ts` | AES-256-GCM credential encryption |
| `lib/email/` (all files) | Resend email service + templates |
| `lib/whatsapp/msg91.ts` | WhatsApp notification service |
| `lib/migration/` (all files) | Shopify/Etsy migration pipeline |
| `lib/customer/auth.ts` | Customer authentication |
| `lib/cart/abandoned-cart.ts` | Abandoned cart recovery logic (Sales Agent will call this) |
| `lib/ai/google-vision-service.ts` | Cloud Vision API service |
| `lib/ai/vercel-ai-service.ts` | AI text generation service |
| `lib/ai/recommendations.ts` | Product recommendation engine |
| `lib/store/queries.ts` | Store database queries |
| `lib/store/dynamic-styles.ts` | Theme CSS variables |
| `lib/rate-limit.ts` | API rate limiting |
| `lib/webhook-security.ts` | Webhook verification |
| `lib/notifications.ts` | Supabase realtime notifications |
| `lib/logger.ts` | Structured logging |
| `lib/errors.ts` | Custom error classes |
| `lib/utils/sanitize.ts` | PostgREST injection prevention |
| `lib/contexts/customer-context.tsx` | Customer auth context |
| `lib/types/` (all files) | TypeScript types |
| `emails/` (all files) | React Email templates |
| `middleware.ts` | Auth + subdomain routing (extend, don't replace) |
| `app/[storeSlug]/` (all files) | Public storefront + themes |
| `components/store/` (all files) | Storefront theme components |
| `components/products/product-form.tsx` | Product create/edit form |
| `components/products/image-uploader.tsx` | Image upload component |
| `components/products/ai-suggestions.tsx` | AI suggestion display |
| `components/products/description-generator.tsx` | AI description generator |
| `components/products/variant-options-editor.tsx` | Variant editor |
| `components/products/variants-table.tsx` | Variant table |
| `components/products/bulk-upload-modal.tsx` | CSV upload modal |
| `components/products/processing-status.tsx` | Processing indicator |
| `components/ui/` (all files) | Shadcn components (will add new ones) |
| `app/api/products/` (all routes) | Product API routes |
| `app/api/webhooks/` (all routes) | Payment/shipping webhooks |
| `app/api/orders/` (all routes) | Order API routes |
| `app/api/collections/` (all routes) | Collection API routes |
| `app/api/coupons/` (all routes) | Coupon API routes |
| `app/api/customers/` (all routes) | Customer API routes |
| `app/api/store/` (all routes) | Store API routes |
| `app/api/migration/` (all routes) | Migration API routes |
| `app/api/shipping/` (all routes) | Shipping API routes |
| `app/(auth)/` (all files) | Auth pages |
| `app/(marketing)/` (all files) | Landing page (will redesign later in Phase 8) |
| `app/admin/` (all files) | Platform admin dashboard |

### Modify
| Path | Change |
|------|--------|
| `middleware.ts` | Add route guards for new `(platform)` routes, agent API auth |
| `lib/ai/vercel-ai-service.ts` | Expose functions as callable tools for agents, add model routing |
| `lib/ai/recommendations.ts` | Make callable by Sales Agent |
| `lib/cart/abandoned-cart.ts` | Add hooks for Sales Agent to trigger and customize recovery |
| `lib/contexts/auth-context.tsx` | Extend with agent-related user preferences |
| `lib/notifications.ts` | Add agent action notification types, channel routing |
| `app/api/ai/bot/route.ts` | Evolve into agent chat endpoint, support `@agent` routing |
| `components/products/product-card.tsx` | Add agent activity indicators |
| `tailwind.config.ts` / CSS | Add new design tokens, dark theme variables |
| `next.config.ts` | Add security headers for new routes, update rewrites |
| `vercel.json` | Add cron jobs for agent scheduled tasks |

### Replace
| Path | Replacement | Reason |
|------|-------------|--------|
| `app/dashboard/` (all files) | `app/(platform)/` | Complete dashboard redesign with agent-centric UX |
| `app/(dashboard)/` (if exists) | `app/(platform)/` | Same — merged into new platform layout |
| `components/dashboard/` (all files except `ai-bot/`) | `components/platform/` | New dashboard components |
| `components/dashboard/ai-bot/` | `components/platform/agent-chat/` | Evolve AI bot into multi-agent chat interface |
| `lib/ai/bot/` (tools, executor, prompt) | `lib/agents/` | Bot tools become agent tools; single bot becomes 5 specialized agents |
| `lib/admin/` | Keep but extend | Add agent monitoring to admin |

---

## 6.2 New Architecture

```
src/
├── app/
│   ├── (platform)/                    # New: Agent command center (replaces dashboard)
│   │   ├── layout.tsx                 # Platform shell: sidebar + top bar + Cmd+K provider
│   │   ├── page.tsx                   # Home — Command Center
│   │   ├── agents/
│   │   │   └── [agentId]/
│   │   │       └── page.tsx           # Agent workspace (Marketing, Sales, Support, Analytics, Technical)
│   │   ├── approvals/
│   │   │   └── page.tsx               # Full-page approval queue
│   │   ├── products/
│   │   │   ├── page.tsx               # Redesigned product list with agent overlays
│   │   │   ├── new/page.tsx           # Create product (wraps existing ProductForm)
│   │   │   └── [id]/page.tsx          # Edit product (wraps existing ProductForm)
│   │   ├── orders/
│   │   │   └── page.tsx               # Redesigned order list with agent activity
│   │   ├── analytics/
│   │   │   └── page.tsx               # Agent-curated analytics dashboard
│   │   ├── settings/
│   │   │   ├── page.tsx               # Settings hub
│   │   │   ├── agents/page.tsx        # Agent configuration
│   │   │   ├── connections/page.tsx   # Connected accounts (OAuth integrations)
│   │   │   ├── payments/page.tsx      # Payment settings (reuses existing logic)
│   │   │   ├── shipping/page.tsx      # Shipping settings (reuses existing logic)
│   │   │   └── notifications/page.tsx # Notification settings (reuses existing logic)
│   │   └── onboarding/
│   │       └── page.tsx               # Agent setup wizard (Phase B of onboarding)
│   ├── api/
│   │   ├── agents/
│   │   │   ├── [agentId]/
│   │   │   │   ├── route.ts           # GET agent state, PATCH config
│   │   │   │   ├── chat/route.ts      # POST streaming chat with specific agent
│   │   │   │   ├── actions/route.ts   # GET agent action history
│   │   │   │   └── pause/route.ts     # POST pause/resume agent
│   │   │   ├── activity/route.ts      # GET cross-agent activity feed
│   │   │   ├── approvals/
│   │   │   │   ├── route.ts           # GET pending approvals, POST batch approve/reject
│   │   │   │   └── [id]/route.ts      # PATCH approve/reject single
│   │   │   ├── execute/route.ts       # POST trigger agent action (internal, cron-callable)
│   │   │   └── connections/
│   │   │       ├── route.ts           # GET all connections
│   │   │       ├── [provider]/
│   │   │       │   ├── connect/route.ts    # GET initiate OAuth
│   │   │       │   ├── callback/route.ts   # GET OAuth callback
│   │   │       │   └── disconnect/route.ts # POST revoke connection
│   │   └── ...existing API routes (unchanged)
│   └── ...existing app routes (unchanged)
├── components/
│   ├── platform/                      # New: Platform dashboard components
│   │   ├── layout/
│   │   │   ├── sidebar.tsx            # Left navigation sidebar
│   │   │   ├── top-bar.tsx            # Top bar with search + notifications
│   │   │   ├── bottom-bar.tsx         # Status bar
│   │   │   └── mobile-nav.tsx         # Mobile bottom tab bar
│   │   ├── command-center/
│   │   │   ├── agent-card.tsx         # Agent status card
│   │   │   ├── activity-feed.tsx      # Real-time activity feed
│   │   │   ├── activity-item.tsx      # Single feed item
│   │   │   ├── approval-summary.tsx   # Compact approval list for home
│   │   │   └── quick-stats.tsx        # Key metrics panel
│   │   ├── agents/
│   │   │   ├── agent-workspace.tsx    # Agent workspace layout
│   │   │   ├── agent-timeline.tsx     # Agent-specific activity timeline
│   │   │   ├── agent-chat.tsx         # Chat interface with agent
│   │   │   ├── agent-metrics.tsx      # Agent metrics panel
│   │   │   └── agent-config.tsx       # Inline agent configuration
│   │   ├── approvals/
│   │   │   ├── approval-card.tsx      # Full approval card with context
│   │   │   ├── approval-list.tsx      # Approval list with keyboard nav
│   │   │   ├── approval-context.tsx   # Expandable reasoning panel
│   │   │   └── approval-actions.tsx   # Approve/reject/edit buttons
│   │   ├── products/
│   │   │   ├── product-list.tsx       # Redesigned Linear-style product table
│   │   │   ├── agent-insights.tsx     # Agent intelligence overlay
│   │   │   └── product-row.tsx        # Single product row with agent indicators
│   │   ├── orders/
│   │   │   ├── order-list.tsx         # Redesigned order table
│   │   │   ├── order-detail.tsx       # Slide-over order detail
│   │   │   └── order-agent-activity.tsx # Agent activity for an order
│   │   ├── analytics/
│   │   │   ├── metrics-bar.tsx        # Top metrics row
│   │   │   ├── insight-card.tsx       # Agent-curated insight card
│   │   │   └── chart-card.tsx         # Traditional chart wrapper
│   │   ├── command-palette/
│   │   │   ├── command-palette.tsx     # Main Cmd+K palette
│   │   │   ├── command-input.tsx       # Search input
│   │   │   ├── command-results.tsx     # Result list
│   │   │   └── command-item.tsx        # Single result item
│   │   ├── onboarding/
│   │   │   ├── store-setup.tsx         # Phase A: store creation
│   │   │   └── agent-setup.tsx         # Phase B: agent activation checklist
│   │   └── shared/
│   │       ├── status-dot.tsx          # Animated status indicator
│   │       ├── agent-badge.tsx         # Colored agent pill
│   │       ├── metric-card.tsx         # Large number + trend + sparkline
│   │       ├── timeline.tsx            # Reusable timeline component
│   │       ├── sparkline.tsx           # Tiny inline chart
│   │       └── keyboard-hint.tsx       # Keyboard shortcut display
│   ├── ui/                            # Existing Shadcn (keep, extend)
│   ├── store/                         # Existing storefront themes (keep)
│   └── products/                      # Existing product components (keep)
├── lib/
│   ├── agents/                        # New: Agent infrastructure
│   │   ├── types.ts                   # Agent types, enums, interfaces
│   │   ├── constants.ts               # Agent IDs, names, colors, default configs
│   │   ├── state-machine.ts           # Agent state transitions (idle→running→waiting→error)
│   │   ├── orchestrator.ts            # Multi-agent coordination, conflict resolution
│   │   ├── approval.ts               # Approval queue: create, resolve, expire, batch
│   │   ├── activity.ts               # Activity feed: log, query, subscribe
│   │   ├── memory.ts                 # Agent memory: store preferences, learned patterns
│   │   ├── scheduler.ts              # Cron-driven task scheduling per agent
│   │   ├── cost-tracker.ts           # LLM token usage + API cost tracking per store
│   │   ├── model-router.ts           # Select model based on task complexity + budget
│   │   ├── tool-registry.ts          # Registry of tools available to agents
│   │   ├── base-agent.ts             # Abstract base class for all agents
│   │   ├── marketing/
│   │   │   ├── agent.ts              # Marketing agent implementation
│   │   │   ├── tools.ts              # Marketing-specific tools (create ad, schedule post)
│   │   │   ├── meta-ads.ts           # Meta Ads API client
│   │   │   ├── google-ads.ts         # Google Ads API client
│   │   │   └── content-generator.ts  # Ad creative / social post generation
│   │   ├── sales/
│   │   │   ├── agent.ts              # Sales agent implementation
│   │   │   ├── tools.ts              # Sales tools (send discount, recover cart)
│   │   │   ├── segmentation.ts       # Customer segmentation logic
│   │   │   └── campaign-engine.ts    # Discount/upsell campaign management
│   │   ├── support/
│   │   │   ├── agent.ts              # Support agent implementation
│   │   │   ├── tools.ts              # Support tools (reply, escalate, lookup order)
│   │   │   ├── knowledge-base.ts     # FAQ + product knowledge extraction
│   │   │   └── channels.ts           # Multi-channel routing (chat, email, WhatsApp)
│   │   ├── analytics/
│   │   │   ├── agent.ts              # Analytics agent implementation
│   │   │   ├── tools.ts              # Analytics tools (query data, generate report)
│   │   │   ├── anomaly-detection.ts  # Statistical anomaly detection
│   │   │   └── report-generator.ts   # Report formatting + delivery
│   │   └── technical/
│   │       ├── agent.ts              # Technical agent implementation
│   │       ├── tools.ts              # Technical tools (audit SEO, check performance)
│   │       ├── seo-optimizer.ts      # SEO analysis + fix generation
│   │       └── health-checker.ts     # Store health monitoring
│   ├── connections/                   # New: OAuth integration management
│   │   ├── types.ts                  # Provider types, token interfaces
│   │   ├── oauth.ts                  # Generic OAuth flow handler
│   │   ├── token-manager.ts          # Encrypted token storage + refresh
│   │   ├── meta.ts                   # Meta (Facebook/Instagram) OAuth specifics
│   │   ├── google-ads.ts             # Google Ads OAuth specifics
│   │   └── google-analytics.ts       # GA4 OAuth specifics
│   ├── hooks/                         # New: React hooks for platform
│   │   ├── use-agents.ts             # Agent state subscription
│   │   ├── use-activity.ts           # Activity feed subscription (Supabase Realtime)
│   │   ├── use-approvals.ts          # Approval queue subscription
│   │   ├── use-keyboard.ts           # Keyboard shortcut manager
│   │   └── use-command-palette.ts    # Command palette state
│   └── ...existing lib modules (unchanged)
```

---

## 6.3 Database Schema Extensions

All new tables live in the same Supabase PostgreSQL database alongside existing tables. Foreign keys reference `stores.id` for multi-tenant isolation.

```sql
-- ============================================================
-- AGENT STATES — Per-store configuration and runtime state
-- ============================================================
CREATE TABLE agent_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('marketing', 'sales', 'support', 'analytics', 'technical')),
  
  -- Configuration
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  autonomy_level INTEGER NOT NULL DEFAULT 3 CHECK (autonomy_level BETWEEN 1 AND 5),
  config JSONB NOT NULL DEFAULT '{}',  -- Agent-specific settings (tone, budget, schedule, etc.)
  
  -- Runtime state
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'running', 'waiting_approval', 'paused', 'error')),
  last_action_at TIMESTAMPTZ,
  last_error TEXT,
  error_count INTEGER NOT NULL DEFAULT 0,
  
  -- Usage tracking
  total_actions INTEGER NOT NULL DEFAULT 0,
  total_approvals_requested INTEGER NOT NULL DEFAULT 0,
  total_approvals_granted INTEGER NOT NULL DEFAULT 0,
  total_approvals_rejected INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(store_id, agent_type)
);

CREATE INDEX idx_agent_states_store ON agent_states(store_id);
CREATE INDEX idx_agent_states_status ON agent_states(status) WHERE status != 'idle';

-- ============================================================
-- AGENT ACTIONS — Complete log of everything agents do
-- ============================================================
CREATE TABLE agent_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  
  -- Action details
  action_type TEXT NOT NULL,           -- 'email_sent', 'discount_created', 'seo_updated', etc.
  action_category TEXT NOT NULL,       -- 'communication', 'campaign', 'optimization', 'analysis', 'maintenance'
  summary TEXT NOT NULL,               -- Human-readable one-line description
  details JSONB NOT NULL DEFAULT '{}', -- Full action payload (email content, discount details, etc.)
  
  -- Execution
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'pending_approval', 'approved', 'rejected', 'expired', 'cancelled')),
  execution_mode TEXT NOT NULL CHECK (execution_mode IN ('auto', 'approved', 'manual')),
  approval_id UUID REFERENCES agent_approvals(id),
  
  -- Context
  related_entity_type TEXT,            -- 'product', 'order', 'customer', 'campaign'
  related_entity_id TEXT,              -- ID of the related entity
  
  -- Cost tracking
  model_used TEXT,                     -- 'gemini-2.0-flash', 'claude-sonnet', etc.
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  estimated_cost_usd DECIMAL(10,6) DEFAULT 0,
  api_costs JSONB DEFAULT '{}',        -- Third-party API costs (ad spend, etc.)
  
  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_actions_store_time ON agent_actions(store_id, created_at DESC);
CREATE INDEX idx_agent_actions_agent ON agent_actions(store_id, agent_type, created_at DESC);
CREATE INDEX idx_agent_actions_status ON agent_actions(status) WHERE status = 'pending_approval';
CREATE INDEX idx_agent_actions_entity ON agent_actions(related_entity_type, related_entity_id) WHERE related_entity_id IS NOT NULL;

-- ============================================================
-- AGENT APPROVALS — Pending actions awaiting merchant decision
-- ============================================================
CREATE TABLE agent_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  
  -- What the agent wants to do
  action_type TEXT NOT NULL,
  summary TEXT NOT NULL,               -- One-line: "Send 15% discount to 23 at-risk customers"
  reasoning TEXT NOT NULL,             -- Agent's explanation of why
  details JSONB NOT NULL DEFAULT '{}', -- Full payload (preview data, parameters, etc.)
  
  -- Urgency
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  expires_at TIMESTAMPTZ,             -- Null = no expiry. Urgent approvals might expire.
  
  -- Resolution
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'cancelled')),
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  modifications JSONB,                -- If merchant edited before approving
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_approvals_pending ON agent_approvals(store_id, status, created_at DESC) WHERE status = 'pending';
CREATE INDEX idx_agent_approvals_store ON agent_approvals(store_id, created_at DESC);

-- ============================================================
-- AGENT MEMORY — Learned preferences and patterns per store
-- ============================================================
CREATE TABLE agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  
  memory_type TEXT NOT NULL,           -- 'preference', 'pattern', 'feedback', 'context'
  memory_key TEXT NOT NULL,            -- 'email_tone', 'discount_cap', 'peak_hours', etc.
  memory_value JSONB NOT NULL,         -- Structured value
  confidence DECIMAL(3,2) DEFAULT 1.0, -- How confident the agent is in this memory (0-1)
  
  source TEXT NOT NULL,                -- 'merchant_feedback', 'data_analysis', 'approval_pattern', 'explicit_config'
  source_action_id UUID REFERENCES agent_actions(id),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,             -- Some memories are time-bound
  
  UNIQUE(store_id, agent_type, memory_key)
);

CREATE INDEX idx_agent_memory_lookup ON agent_memory(store_id, agent_type, memory_type);

-- ============================================================
-- AGENT SCHEDULES — Recurring tasks for agents
-- ============================================================
CREATE TABLE agent_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  
  task_type TEXT NOT NULL,             -- 'weekly_report', 'daily_seo_check', 'cart_recovery_scan', etc.
  schedule_cron TEXT NOT NULL,         -- Cron expression: '0 8 * * 1' (Monday 8am)
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  
  is_active BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}',  -- Task-specific parameters
  
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  last_run_status TEXT CHECK (last_run_status IN ('completed', 'failed', 'skipped')),
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_schedules_next ON agent_schedules(next_run_at) WHERE is_active = true;
CREATE INDEX idx_agent_schedules_store ON agent_schedules(store_id, agent_type);

-- ============================================================
-- CONNECTED ACCOUNTS — OAuth tokens for third-party services
-- ============================================================
CREATE TABLE connected_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  
  provider TEXT NOT NULL,              -- 'meta', 'google_ads', 'google_analytics'
  provider_account_id TEXT,            -- External account ID
  provider_account_name TEXT,          -- Display name (e.g., "My Business Page")
  
  -- Encrypted tokens (AES-256-GCM via lib/encryption.ts)
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  
  -- Scopes and permissions
  scopes TEXT[] NOT NULL DEFAULT '{}',
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'error')),
  last_used_at TIMESTAMPTZ,
  last_error TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(store_id, provider)
);

CREATE INDEX idx_connected_accounts_store ON connected_accounts(store_id);
CREATE INDEX idx_connected_accounts_refresh ON connected_accounts(token_expires_at) WHERE status = 'active';

-- ============================================================
-- AGENT COST TRACKING — Monthly budget tracking per store
-- ============================================================
CREATE TABLE agent_cost_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  
  period_start DATE NOT NULL,          -- First day of month
  period_end DATE NOT NULL,            -- Last day of month
  
  -- LLM costs
  total_tokens_input BIGINT NOT NULL DEFAULT 0,
  total_tokens_output BIGINT NOT NULL DEFAULT 0,
  total_llm_cost_usd DECIMAL(10,4) NOT NULL DEFAULT 0,
  
  -- Per-agent breakdown
  cost_by_agent JSONB NOT NULL DEFAULT '{}',  -- { "marketing": 1.23, "support": 0.45, ... }
  tokens_by_agent JSONB NOT NULL DEFAULT '{}',
  
  -- Third-party API costs (ad spend managed by agents)
  total_api_cost_usd DECIMAL(10,4) NOT NULL DEFAULT 0,
  api_cost_by_provider JSONB NOT NULL DEFAULT '{}',
  
  -- Budget
  budget_limit_usd DECIMAL(10,2),     -- Null = no limit (platform default applies)
  budget_alert_sent BOOLEAN NOT NULL DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(store_id, period_start)
);

CREATE INDEX idx_agent_costs_store ON agent_cost_tracking(store_id, period_start DESC);

-- ============================================================
-- CUSTOMER CONVERSATIONS — Support agent conversation threads
-- ============================================================
CREATE TABLE customer_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  
  channel TEXT NOT NULL CHECK (channel IN ('website_chat', 'email', 'whatsapp')),
  channel_identifier TEXT,             -- Email address, phone number, session ID
  
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'escalated', 'waiting_customer')),
  assigned_to TEXT NOT NULL DEFAULT 'agent' CHECK (assigned_to IN ('agent', 'merchant')),
  
  subject TEXT,
  last_message_at TIMESTAMPTZ,
  message_count INTEGER NOT NULL DEFAULT 0,
  
  -- Related entities
  related_order_id UUID REFERENCES orders(id),
  related_product_id UUID REFERENCES products(id),
  
  -- Agent performance
  first_response_ms INTEGER,          -- Time to first response
  resolution_ms INTEGER,              -- Time to resolution
  customer_satisfaction INTEGER CHECK (customer_satisfaction BETWEEN 1 AND 5),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversations_store ON customer_conversations(store_id, status, created_at DESC);
CREATE INDEX idx_conversations_customer ON customer_conversations(customer_id) WHERE customer_id IS NOT NULL;

CREATE TABLE conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES customer_conversations(id) ON DELETE CASCADE,
  
  role TEXT NOT NULL CHECK (role IN ('customer', 'agent', 'merchant')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',         -- Attachments, quick replies, etc.
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conversation ON conversation_messages(conversation_id, created_at);

-- ============================================================
-- RLS POLICIES — Multi-tenant isolation
-- ============================================================
-- All agent tables follow the same RLS pattern as existing tables:
-- Merchants can only access rows where store_id matches their store.
-- Service role bypasses RLS for agent execution.

ALTER TABLE agent_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_cost_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

-- Example RLS policy (repeat pattern for each table):
CREATE POLICY "Merchants can view their own agent states"
  ON agent_states FOR SELECT
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

CREATE POLICY "Merchants can update their own agent states"
  ON agent_states FOR UPDATE
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));
```

---

## 6.4 Agent Runtime

### Execution Model

Agents execute as stateless function invocations triggered by events or schedules. There is no long-running process. Each agent run is a short-lived Vercel serverless function (max 60s on Pro, 300s on Enterprise) that reads state, reasons, acts, and exits.

**Trigger Sources**:
1. **Event-driven**: Supabase Realtime triggers or webhook callbacks. Examples: new order placed (triggers Support Agent to send confirmation + Sales Agent to evaluate upsell), customer message received (triggers Support Agent), product inventory change (triggers Analytics Agent anomaly check).
2. **Scheduled (Cron)**: Vercel cron jobs hit `/api/agents/execute` with agent type and task type. Examples: daily SEO audit (Technical), weekly analytics report (Analytics), hourly abandoned cart scan (Sales).
3. **Merchant-initiated**: Merchant sends a message in agent chat or triggers an action via command palette. Hits `/api/agents/[agentId]/chat` endpoint.
4. **Cross-agent**: One agent triggers another via the orchestrator. Example: Analytics Agent detects sales drop → notifies Marketing Agent to adjust campaigns.

**Execution Flow** (single agent invocation):
```
1. Receive trigger (event/cron/chat)
2. Load agent state from agent_states table
3. Check: is agent enabled? Is it paused? Budget remaining?
4. Load agent memory (relevant memories for this task)
5. Build context: store data, recent actions, relevant entities
6. Call LLM with system prompt + tools + context
7. LLM returns tool calls → execute tools
8. For each tool result:
   a. Check autonomy level: can this action auto-execute?
   b. If yes → execute, log to agent_actions
   c. If no → create agent_approval record, log as pending
9. Update agent_states (last_action_at, total_actions, status)
10. Log to agent_actions with cost tracking
11. Broadcast update via Supabase Realtime (activity feed)
```

**Tool Loop Pattern**: Agents use the Vercel AI SDK `generateText` with tools in a loop. The agent calls tools, receives results, and decides whether to call more tools or produce a final response. This matches the existing AI bot pattern in `lib/ai/bot/` but generalized.

```typescript
// Simplified agent execution (lib/agents/base-agent.ts)
abstract class BaseAgent {
  abstract readonly agentType: AgentType;
  abstract readonly systemPrompt: string;
  abstract readonly tools: Record<string, Tool>;

  async execute(trigger: AgentTrigger): Promise<AgentResult> {
    const state = await getAgentState(trigger.storeId, this.agentType);
    if (!state.is_enabled || state.status === 'paused') return { skipped: true };

    const memory = await getAgentMemory(trigger.storeId, this.agentType);
    const budget = await checkBudget(trigger.storeId);
    const model = this.selectModel(trigger.complexity, budget);

    const result = await generateText({
      model,
      system: this.buildSystemPrompt(state, memory, trigger),
      messages: trigger.messages,
      tools: this.wrapToolsWithApproval(this.tools, state.autonomy_level),
      maxSteps: 10,
    });

    await this.logActions(trigger.storeId, result);
    await this.broadcastActivity(trigger.storeId, result);
    return result;
  }
}
```

### Model Routing

The `model-router.ts` module selects the appropriate LLM based on task complexity, budget constraints, and agent requirements.

| Tier | Model | Cost (approx) | Use Cases |
|------|-------|----------------|-----------|
| Fast | Gemini 2.0 Flash | ~$0.10/M tokens | Routine tasks: auto-replies to simple queries, SEO metadata generation, data formatting, status checks |
| Standard | Gemini 2.0 Flash (Thinking) or Claude 3.5 Haiku | ~$0.25-0.80/M tokens | Moderate reasoning: customer email drafts, product descriptions, basic analytics summaries |
| Advanced | Claude Sonnet 4 or GPT-4.1 | ~$3-5/M tokens | Complex reasoning: campaign strategy, anomaly investigation, multi-step planning, conflict resolution |
| Premium | Claude Opus 4 | ~$15/M tokens | Critical decisions: large budget allocation, crisis response, complex customer escalations (rarely used, requires explicit budget allocation) |

**Routing Logic**:
- Default tier: Fast (for all routine/scheduled tasks)
- Upgrade to Standard: when task involves content generation or moderate reasoning
- Upgrade to Advanced: when task involves multi-entity analysis, strategy, or high-stakes decisions
- Upgrade to Premium: only when explicitly configured by merchant or for platform-critical operations
- Budget override: if store's monthly LLM budget is >80% consumed, downgrade all non-critical tasks by one tier
- Fallback chain: if primary model fails, fall back to next available model (Google → Anthropic → OpenAI)

### Cost Control

Each store has a monthly LLM budget tracked in `agent_cost_tracking`.

- **Free tier**: $2/month LLM budget (Flash only, limited agent invocations)
- **Pro tier**: $20/month LLM budget (all models, full autonomy options)
- **Business tier**: $100/month LLM budget (premium models, priority execution)
- Merchants can increase budget in settings (billed accordingly)
- At 80% budget: agents downgrade to Flash-only, merchant notified
- At 100% budget: agents pause (except Support for active conversations), merchant notified urgently
- Ad spend budgets (Marketing Agent) are separate from LLM budgets and set per-agent in config

### Cron Jobs

Added to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/agents/execute?task=abandoned_cart_scan",
      "schedule": "0 */2 * * *"
    },
    {
      "path": "/api/agents/execute?task=daily_seo_audit",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/agents/execute?task=daily_analytics_digest",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/agents/execute?task=weekly_analytics_report",
      "schedule": "0 9 * * 1"
    },
    {
      "path": "/api/agents/execute?task=hourly_support_check",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/agents/execute?task=expire_approvals",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/agents/execute?task=refresh_tokens",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

The `/api/agents/execute` endpoint validates `CRON_SECRET`, then fans out to all stores with the relevant agent enabled. Each store's execution is a separate async invocation to stay within function duration limits.

### Real-Time Updates

The activity feed, approval queue, and agent status cards update in real-time using Supabase Realtime subscriptions.

**Channels**:
- `agent_actions:store_id=eq.{storeId}` — new activity feed items
- `agent_approvals:store_id=eq.{storeId}` — new/resolved approvals
- `agent_states:store_id=eq.{storeId}` — agent status changes

**Client-side** (`lib/hooks/use-activity.ts`):
```typescript
const channel = supabase
  .channel(`agent-activity-${storeId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'agent_actions',
    filter: `store_id=eq.${storeId}`,
  }, (payload) => {
    addActivityItem(payload.new);
  })
  .subscribe();
```

---

## 6.5 Third-Party Integration Architecture

### OAuth Flow

All third-party connections follow a standardized OAuth 2.0 flow managed by `lib/connections/oauth.ts`.

**Flow**:
1. Merchant clicks "Connect" on Connected Accounts page
2. Frontend calls `GET /api/agents/connections/[provider]/connect`
3. Backend generates state token (store_id + CSRF nonce, signed), stores in short-lived Supabase record
4. Backend redirects to provider's OAuth consent page with scopes
5. Provider redirects back to `GET /api/agents/connections/[provider]/callback`
6. Backend validates state token, exchanges code for access + refresh tokens
7. Tokens encrypted via `lib/encryption.ts` and stored in `connected_accounts`
8. Backend redirects merchant to Connected Accounts page with success toast

**Token Refresh** (`lib/connections/token-manager.ts`):
- Before any API call, check `token_expires_at`
- If token expires within 5 minutes, refresh proactively
- If refresh fails, mark connection as `expired`, notify merchant
- Cron job every 6 hours checks all connections expiring within 24 hours and refreshes preemptively

### Provider-Specific Configuration

**Meta (Facebook/Instagram)**:
- App type: Business
- Scopes: `ads_management`, `ads_read`, `pages_manage_posts`, `pages_read_engagement`, `instagram_basic`, `instagram_content_publish`
- Rate limits: 200 calls/hour per ad account (Marketing API), respect `x-business-use-case-usage` headers
- Required: Facebook Business verification for production access

**Google Ads**:
- OAuth scopes: `https://www.googleapis.com/auth/adwords`
- Developer token required (applied for separately, can take weeks)
- Rate limits: 15,000 operations/day per developer token
- API version: v18 (latest stable)
- MCP consideration: Google Ads MCP server could simplify integration if mature enough

**Google Analytics 4**:
- OAuth scopes: `https://www.googleapis.com/auth/analytics.readonly`
- Data API v1 for reading reports
- Admin API for property configuration
- Rate limits: 10 requests/second per project
- Quota: 10,000 requests/day per project

### MCP Servers

Model Context Protocol servers can provide standardized tool interfaces for third-party APIs, reducing custom integration code.

**Evaluate for use**:
| MCP Server | Purpose | Risk | Recommendation |
|------------|---------|------|----------------|
| Meta Ads MCP | Facebook/Instagram ad management | Maturity unknown, may not cover all endpoints | Evaluate, fall back to direct API |
| Google Ads MCP | Google ad campaign management | Developer token still needed | Evaluate for API simplification |
| GA4 MCP | Analytics data reading | Read-only, lower risk | Strong candidate for adoption |

**Decision criteria**: Use MCP server if it covers >80% of needed functionality, is actively maintained, and has acceptable latency. Otherwise, build direct API client. MCP servers can be swapped in later without changing agent tool interfaces.

### Rate Limiting

Each third-party API client implements its own rate limiter with these principles:
- Token bucket algorithm per provider per store
- Respect provider-reported rate limit headers
- Exponential backoff on 429 responses (initial 1s, max 60s, 5 retries)
- Agent actions that would exceed rate limits are queued, not dropped
- Rate limit exhaustion reported as agent warning (not error)

---

# Section 7: What Gets Rebuilt vs Kept

| Item | Action | Reason |
|------|--------|--------|
| **`lib/payment/razorpay.ts`** | Keep | Production-tested payment processing, no changes needed |
| **`lib/payment/stripe.ts`** | Keep | Complete Stripe integration, working correctly |
| **`lib/payment/stripe-client.ts`** | Keep | Client-side Stripe redirect, stable |
| **`lib/shipping/` (all files)** | Keep | Multi-provider shipping abstraction works well |
| **`lib/products/db-operations.ts`** | Keep | Product CRUD is solid, agents will call these same functions |
| **`lib/products/image-processor.ts`** | Keep | Image upload/processing pipeline, agents will use as-is |
| **`lib/products/processing-pipeline.ts`** | Keep | Enhancement pipeline, no changes needed |
| **`lib/products/variant-operations.ts`** | Keep | Variant CRUD, stable |
| **`lib/products/variant-utils.ts`** | Keep | Utility functions, stable |
| **`lib/products/validation.ts`** | Keep | Zod schemas, stable |
| **`lib/products/csv-parser.ts`** | Keep | CSV parsing, stable |
| **`lib/products/demo-products.ts`** | Keep | Demo fixtures, stable |
| **`lib/encryption.ts`** | Keep | AES-256-GCM encryption, will be used for OAuth tokens too |
| **`lib/email/` (all files)** | Keep | Resend integration, Support/Sales agents will call these |
| **`lib/whatsapp/msg91.ts`** | Keep | WhatsApp integration, Support Agent will call this |
| **`lib/migration/` (all files)** | Keep | Shopify/Etsy migration, no changes needed |
| **`lib/customer/auth.ts`** | Keep | Customer auth, stable |
| **`lib/cart/abandoned-cart.ts`** | Modify | Add hooks for Sales Agent to trigger and customize recovery flows |
| **`lib/ai/vercel-ai-service.ts`** | Modify | Expose functions as callable agent tools, add model routing integration |
| **`lib/ai/google-vision-service.ts`** | Keep | Cloud Vision API, Technical Agent may call for image audits |
| **`lib/ai/recommendations.ts`** | Modify | Make callable by Sales Agent for intelligent upselling |
| **`lib/ai/bot/tools.ts`** | Replace | Bot tools become foundation for agent tools, split across 5 agents |
| **`lib/ai/bot/tool-executor.ts`** | Replace | Replaced by per-agent tool execution in `lib/agents/` |
| **`lib/ai/bot/` (system prompt, etc.)** | Replace | Single bot prompt replaced by 5 agent-specific system prompts |
| **`lib/contexts/auth-context.tsx`** | Modify | Extend with agent preferences, active store agent states |
| **`lib/contexts/customer-context.tsx`** | Keep | Customer auth context, stable |
| **`lib/store/queries.ts`** | Keep | Store queries, agents will use these |
| **`lib/store/dynamic-styles.ts`** | Keep | Theme CSS variables for storefronts, unchanged |
| **`lib/rate-limit.ts`** | Modify | Add agent-specific rate limits (per-agent, per-store) |
| **`lib/webhook-security.ts`** | Keep | Webhook verification, stable |
| **`lib/notifications.ts`** | Modify | Add agent notification types, real-time channel for agent activity |
| **`lib/logger.ts`** | Keep | Structured logging, agents will use this |
| **`lib/errors.ts`** | Modify | Add agent-specific error types |
| **`lib/utils/sanitize.ts`** | Keep | Input sanitization, stable |
| **`lib/types/` (all files)** | Modify | Add agent-related type definitions |
| **`lib/admin/` (all files)** | Modify | Add agent monitoring views to platform admin |
| **`middleware.ts`** | Modify | Add route guards for `(platform)` routes, agent API auth |
| **`app/[storeSlug]/` (all files)** | Keep | Public storefront, unchanged |
| **`components/store/` (all files)** | Keep | Storefront themes, unchanged |
| **`components/products/product-form.tsx`** | Keep | Product form, embedded in new products page |
| **`components/products/image-uploader.tsx`** | Keep | Image upload, used by product form |
| **`components/products/ai-suggestions.tsx`** | Keep | AI suggestions, used by product form |
| **`components/products/description-generator.tsx`** | Keep | Description generator, used by product form |
| **`components/products/variant-options-editor.tsx`** | Keep | Variant editor, used by product form |
| **`components/products/variants-table.tsx`** | Keep | Variant table, used by product form |
| **`components/products/bulk-upload-modal.tsx`** | Keep | CSV modal, used in products page |
| **`components/products/processing-status.tsx`** | Keep | Processing indicator, used by product form |
| **`components/products/product-card.tsx`** | Modify | Add agent activity indicators (AI-described badge, campaign tag) |
| **`components/ui/` (all Shadcn files)** | Keep | Shadcn components, extend with new components |
| **`components/dashboard/sidebar.tsx`** | Replace | New `components/platform/layout/sidebar.tsx` with agent-aware navigation |
| **`components/dashboard/notification-bell.tsx`** | Modify | Merge agent notifications into existing notification system |
| **`components/dashboard/ai-bot/` (all files)** | Replace | Evolve into `components/platform/agent-chat/` with multi-agent routing |
| **`components/admin/` (all files)** | Modify | Add agent platform metrics to admin dashboard |
| **`app/dashboard/` (all pages)** | Replace | Entire merchant dashboard replaced by `app/(platform)/` |
| **`app/(dashboard)/` (if exists)** | Replace | Merged into `app/(platform)/` |
| **`app/api/products/` (all routes)** | Keep | Product API routes, unchanged |
| **`app/api/orders/` (all routes)** | Keep | Order API routes, unchanged |
| **`app/api/collections/` (all routes)** | Keep | Collection API routes, unchanged |
| **`app/api/coupons/` (all routes)** | Keep | Coupon API routes, unchanged |
| **`app/api/customers/` (all routes)** | Keep | Customer API routes, unchanged |
| **`app/api/store/` (all routes)** | Keep | Store API routes, unchanged |
| **`app/api/migration/` (all routes)** | Keep | Migration API routes, unchanged |
| **`app/api/shipping/` (all routes)** | Keep | Shipping API routes, unchanged |
| **`app/api/webhooks/` (all routes)** | Keep | Webhook handlers, unchanged |
| **`app/api/ai/bot/route.ts`** | Replace | Replaced by `app/api/agents/[agentId]/chat/route.ts` |
| **`app/api/ai/` (other routes)** | Keep | AI extraction/suggestion routes, agents may call these |
| **`app/(auth)/` (all files)** | Keep | Auth pages, unchanged |
| **`app/(marketing)/` (all files)** | Keep (Phase 8 redesign) | Landing page, redesigned last during polish phase |
| **`app/admin/` (all files)** | Modify | Add agent monitoring panel to admin |
| **`emails/` (all files)** | Keep | React Email templates, agents will use these |
| **`tailwind.config.ts` / CSS** | Modify | Add new design tokens, dark theme variables, agent colors |
| **`next.config.ts`** | Modify | Add security headers for new routes, update rewrites |
| **`vercel.json`** | Modify | Add cron jobs for agent scheduled tasks |
| **`lib/agents/` (new directory)** | New | Entire agent infrastructure: types, orchestrator, 5 agents, memory, scheduling |
| **`lib/connections/` (new directory)** | New | OAuth integration management for Meta, Google Ads, GA4 |
| **`lib/hooks/` (new directory)** | New | React hooks for agent state, activity feed, approvals, keyboard shortcuts |
| **`components/platform/` (new directory)** | New | All new dashboard components |
| **`app/(platform)/` (new directory)** | New | All new dashboard pages |
| **`app/api/agents/` (new directory)** | New | All agent API routes |

---

# Section 8: Phased Build Plan

## Phase 0: Foundation (Week 1–2)

**Goal**: Design system operational, database extended, project structure ready. No visible features yet.

**Deliverables**:
1. Design system CSS tokens and base component styles
2. Database schema migration (all new tables from Section 6.3)
3. New directory structure scaffolded (`lib/agents/`, `lib/connections/`, `lib/hooks/`, `components/platform/`, `app/(platform)/`)
4. Agent type definitions and constants
5. Keyboard shortcut hook infrastructure

**Key Files to Create**:
- `lib/agents/types.ts` — `AgentType` enum, `AgentState`, `AgentAction`, `AgentApproval`, `AgentMemory`, `AgentSchedule`, `AgentTrigger`, `AgentResult` interfaces
- `lib/agents/constants.ts` — Agent IDs, display names, identity colors, default autonomy configs, default schedules
- `lib/hooks/use-keyboard.ts` — Keyboard shortcut registration, conflict detection, `prefers-reduced-motion` detection
- `app/(platform)/layout.tsx` — Shell layout (empty sidebar + top bar + content area), dark theme applied
- `components/platform/shared/status-dot.tsx`, `agent-badge.tsx`, `metric-card.tsx`, `keyboard-hint.tsx` — Base shared components
- Supabase migration file for all new tables

**Modify**:
- `tailwind.config.ts` — Add new color tokens, font scale, design system spacing
- Global CSS — Add CSS custom properties for dark theme palette

**Success Criteria**:
- `npm run build` succeeds with new directory structure
- All new tables exist in Supabase with RLS policies
- Navigating to `/(platform)` renders empty shell with dark theme
- `Cmd+K` opens empty command palette overlay
- Shared components render correctly in isolation (can verify in a test page)

---

## Phase 1: The Shell (Week 3–6)

**Goal**: Full dashboard redesign is visually complete with placeholder/mock data. A merchant can navigate all screens, but agents do nothing yet.

**Deliverables**:
1. Platform layout (sidebar, top bar, bottom status bar, mobile nav)
2. Command Center page with agent cards, activity feed, approval summary, quick stats (all mock data)
3. Agent Workspace page with timeline, chat UI, metrics panel, config panel (mock data)
4. Approval Queue page with full card layout, keyboard navigation, batch actions (mock data)
5. Redesigned Products page (Linear-style table, agent insights overlay, filters)
6. Redesigned Orders page (agent activity column, slide-over detail)
7. Analytics Dashboard (metrics bar, insight cards, chart cards with mock data)
8. Settings pages (agent configuration, connected accounts placeholder)
9. Cmd+K command palette (navigation commands, search, @agent routing skeleton)
10. Mobile responsive layouts (bottom tab bar, swipe-to-approve)

**Key Files to Create**:
- `components/platform/layout/sidebar.tsx` — Left nav with sections: Home, Agents (expandable to 5), Approvals (with count badge), Products, Orders, Analytics, Settings
- `components/platform/layout/top-bar.tsx` — Store name, Cmd+K bar, notification bell, user menu
- `components/platform/layout/bottom-bar.tsx` — Agent status summary, next scheduled action
- `components/platform/layout/mobile-nav.tsx` — Bottom tab bar for mobile
- `components/platform/command-center/agent-card.tsx` — Agent status card with metrics, last action, status dot
- `components/platform/command-center/activity-feed.tsx` — Real-time feed with timeline UI, agent filtering
- `components/platform/command-center/activity-item.tsx` — Single feed item with agent badge, action text, timestamp, expandable detail
- `components/platform/command-center/approval-summary.tsx` — Compact approval list (max 5) for home page
- `components/platform/command-center/quick-stats.tsx` — 2x2 metric grid
- `components/platform/agents/agent-workspace.tsx` — Two-column layout with tabs
- `components/platform/agents/agent-timeline.tsx` — Agent-specific timeline
- `components/platform/agents/agent-chat.tsx` — Chat interface (input + message bubbles)
- `components/platform/agents/agent-metrics.tsx` — Agent KPI cards
- `components/platform/agents/agent-config.tsx` — Inline autonomy slider, budget, preferences
- `components/platform/approvals/approval-card.tsx` — Full card with context, preview, action buttons
- `components/platform/approvals/approval-list.tsx` — Keyboard-navigable list with batch selection
- `components/platform/products/product-list.tsx` — Linear-style table wrapping existing product data
- `components/platform/products/agent-insights.tsx` — Collapsible insights panel
- `components/platform/products/product-row.tsx` — Row with agent indicator icons
- `components/platform/orders/order-list.tsx` — Order table with agent activity column
- `components/platform/orders/order-detail.tsx` — Slide-over panel
- `components/platform/analytics/metrics-bar.tsx` — Horizontal metric cards
- `components/platform/analytics/insight-card.tsx` — Agent-curated insight
- `components/platform/analytics/chart-card.tsx` — Dark-themed chart wrapper
- `components/platform/command-palette/command-palette.tsx` — Modal with input, sections, keyboard nav
- `components/platform/shared/timeline.tsx` — Reusable timeline with connected dots
- `components/platform/shared/sparkline.tsx` — Tiny inline SVG chart
- `app/(platform)/page.tsx` — Command Center page
- `app/(platform)/agents/[agentId]/page.tsx` — Agent workspace
- `app/(platform)/approvals/page.tsx` — Approval queue
- `app/(platform)/products/page.tsx` — Products (fetches real product data, displays in new UI)
- `app/(platform)/products/new/page.tsx` — Wraps existing `ProductForm mode="create"`
- `app/(platform)/products/[id]/page.tsx` — Wraps existing `ProductForm mode="edit"`
- `app/(platform)/orders/page.tsx` — Orders (fetches real order data, displays in new UI)
- `app/(platform)/analytics/page.tsx` — Analytics dashboard
- `app/(platform)/settings/page.tsx` — Settings hub
- `app/(platform)/settings/agents/page.tsx` — Agent configuration
- `app/(platform)/settings/connections/page.tsx` — Connected accounts

**Modify**:
- `middleware.ts` — Route authenticated merchants to `(platform)` instead of `dashboard`
- Products/Orders pages fetch real data from existing API routes but display in new components

**Success Criteria**:
- Merchant logs in and sees Command Center with mock agent activity
- All navigation works (sidebar, Cmd+K, keyboard shortcuts, mobile tabs)
- Products page shows real products in new Linear-style layout
- Orders page shows real orders with new design
- Agent workspace renders with mock timeline and empty chat
- Approval queue shows mock approvals with keyboard nav (j/k/a/r)
- Mobile view shows bottom tab bar and swipe-to-approve gestures
- All screens match the dark theme design system
- No regressions in existing storefront, API routes, or auth

---

## Phase 2: Agent Infrastructure (Week 7–10)

**Goal**: Backend agent infrastructure is complete. Agents can be enabled, execute tool loops, request approvals, log actions, learn from feedback, and run on schedules. No specific agent logic yet — just the framework.

**Deliverables**:
1. Agent state machine (idle → running → waiting_approval → back to idle)
2. Base agent class with tool loop execution
3. Orchestrator (multi-agent coordination, conflict resolution)
4. Approval system backend (create, resolve, expire, notify)
5. Activity logging system (log, query, paginate, filter)
6. Agent memory system (store, retrieve, decay, source tracking)
7. Scheduler (parse cron, compute next run, fan out across stores)
8. Cost tracker (per-action token counting, monthly aggregation, budget enforcement)
9. Model router (select model by task complexity + budget)
10. Tool registry (register, discover, permission-check tools)
11. Real-time hooks (activity feed, approvals, agent status subscriptions)
12. Agent API routes (CRUD, chat, actions, pause/resume)
13. Connect mock data in Phase 1 UI to real backend

**Key Files to Create**:
- `lib/agents/state-machine.ts` — `transitionState(currentStatus, event): newStatus`, validates transitions, logs invalid attempts
- `lib/agents/base-agent.ts` — Abstract class: `execute(trigger)`, `buildSystemPrompt()`, `wrapToolsWithApproval()`, `logActions()`, `broadcastActivity()`
- `lib/agents/orchestrator.ts` — `dispatchTrigger(storeId, trigger)`, `resolveConflicts(actions[])`, `crossAgentNotify(fromAgent, toAgent, message)`
- `lib/agents/approval.ts` — `createApproval(storeId, agentType, action)`, `resolveApproval(id, decision, modifications?)`, `expireStaleApprovals()`, `getPendingApprovals(storeId)`
- `lib/agents/activity.ts` — `logActivity(storeId, agentType, action)`, `getActivityFeed(storeId, filters, pagination)`, `getAgentActions(storeId, agentType, pagination)`
- `lib/agents/memory.ts` — `storeMemory(storeId, agentType, key, value, source)`, `getMemories(storeId, agentType, type?)`, `decayMemory(id)`, `learnFromApproval(approval)`
- `lib/agents/scheduler.ts` — `getNextRun(cronExpr, timezone)`, `getDueSchedules()`, `executeScheduledTasks()`, `updateLastRun(scheduleId, status)`
- `lib/agents/cost-tracker.ts` — `trackUsage(storeId, agentType, model, tokensIn, tokensOut)`, `getMonthlyUsage(storeId)`, `checkBudget(storeId): { remaining, percentUsed, canUseAdvancedModel }`
- `lib/agents/model-router.ts` — `selectModel(complexity, budget, agentType): ModelConfig`, tier selection logic
- `lib/agents/tool-registry.ts` — `registerTool(agentType, tool)`, `getToolsForAgent(agentType)`, `checkToolPermission(agentType, toolName, autonomyLevel)`
- `lib/hooks/use-agents.ts` — `useAgentStates(storeId)`, `useAgentState(storeId, agentType)` with Supabase Realtime
- `lib/hooks/use-activity.ts` — `useActivityFeed(storeId, filters)` with real-time subscription
- `lib/hooks/use-approvals.ts` — `useApprovals(storeId)` with real-time subscription, `approveAction(id)`, `rejectAction(id, reason)`
- `app/api/agents/[agentId]/route.ts` — GET state, PATCH config (autonomy, budget, etc.)
- `app/api/agents/[agentId]/chat/route.ts` — POST streaming chat, routes to correct agent
- `app/api/agents/[agentId]/actions/route.ts` — GET paginated action history
- `app/api/agents/[agentId]/pause/route.ts` — POST pause/resume
- `app/api/agents/activity/route.ts` — GET cross-agent feed
- `app/api/agents/approvals/route.ts` — GET pending, POST batch approve/reject
- `app/api/agents/approvals/[id]/route.ts` — PATCH single approval
- `app/api/agents/execute/route.ts` — POST trigger execution (cron-callable, validates CRON_SECRET)

**Modify**:
- `vercel.json` — Add cron job entries
- `middleware.ts` — Add auth checks for agent API routes
- Phase 1 UI components — Replace mock data with real Supabase queries and real-time subscriptions

**Success Criteria**:
- Can enable/disable agents via settings UI, state persists in database
- Can adjust autonomy level, see it reflected in agent behavior
- Activity feed shows real (test) entries from database, updates in real-time
- Approval queue shows real entries, approve/reject updates database and broadcasts
- Agent execution endpoint works (with a dummy test agent that logs "hello")
- Cost tracking accumulates token usage per action
- Model router selects correct tier based on test inputs
- Scheduler correctly identifies due tasks and triggers execution
- Memory system stores and retrieves key-value pairs
- All API routes are authenticated and respect store ownership

---

## Phase 3: First Agent — Customer Support (Week 11–14)

**Goal**: Support Agent is fully operational. It auto-responds to customer inquiries via website chat, email, and WhatsApp. It escalates complex issues. Merchants see real agent activity in the dashboard.

**Why start here**: The Support Agent has the lowest risk (customer queries are relatively bounded), extends the existing AI bot pattern, and provides immediate value. It also establishes the full agent lifecycle pattern that other agents will follow.

**Deliverables**:
1. Support Agent implementation (system prompt, tools, knowledge base)
2. Website chat widget (embedded on storefront pages)
3. WhatsApp auto-response integration (via MSG91)
4. Email auto-response integration (via Resend, handling inbound via webhook)
5. Knowledge base builder (auto-extracts FAQ from products, policies, store settings)
6. Conversation threading and history
7. Escalation flow (agent → merchant handoff)
8. Customer satisfaction tracking

**Key Files to Create**:
- `lib/agents/support/agent.ts` — `SupportAgent extends BaseAgent`: system prompt includes store policies, shipping info, return policy, product knowledge. Tools: `lookupOrder`, `lookupProduct`, `sendReply`, `escalateToMerchant`, `createReturnRequest`, `updateOrderStatus`, `checkShippingStatus`
- `lib/agents/support/tools.ts` — Tool definitions calling existing `lib/` functions: `lib/products/db-operations.ts` for product lookup, order queries via Supabase, `lib/shipping/` for tracking, `lib/email/` for email replies, `lib/whatsapp/msg91.ts` for WhatsApp replies
- `lib/agents/support/knowledge-base.ts` — `buildKnowledgeBase(storeId)`: extracts store name, description, policies (return, shipping, privacy), product catalog summary (categories, price ranges), shipping providers and estimated times, payment methods. Cached with 1-hour TTL.
- `lib/agents/support/channels.ts` — `routeIncomingMessage(channel, message, storeId)`: determines channel, creates/finds conversation thread, triggers Support Agent execution
- `components/store/chat-widget.tsx` — Floating chat bubble (bottom-right) on storefront pages. Click opens chat panel. Sends messages to `/api/agents/support/chat`. Shows typing indicator. Stores session in localStorage.
- `app/api/agents/support/chat/route.ts` — Public-facing chat endpoint (no auth required, rate-limited by IP). Creates conversation, triggers Support Agent.
- `app/api/agents/support/webhook/route.ts` — Inbound email/WhatsApp webhook handler. Routes to Support Agent.

**Modify**:
- `app/[storeSlug]/layout.tsx` — Add chat widget to storefront layout (conditional on Support Agent being enabled)
- `lib/whatsapp/msg91.ts` — Add inbound message handling (webhook receiver)
- `lib/email/index.ts` — Add inbound email handling (Resend inbound webhook)
- `components/platform/agents/agent-workspace.tsx` — Support Agent workspace now shows real conversations, response times, satisfaction scores

**Success Criteria**:
- Customer visits store, sees chat widget, asks "Where is my order #1234?" → Support Agent looks up order, responds with tracking info, all within 5 seconds
- Customer sends WhatsApp message → Support Agent responds via MSG91
- Customer emails store → Support Agent responds via Resend
- Complex query ("I want a refund but I threw away the packaging") → Agent creates approval for merchant review
- Knowledge base auto-populates from store data without merchant input
- Conversations appear in Support Agent workspace timeline
- Response time and satisfaction metrics display correctly
- Escalated conversations show in approval queue with full context

---

## Phase 4: Sales Agent (Week 15–18)

**Goal**: Sales Agent actively recovers abandoned carts, sends targeted discounts, and recommends upsells. Drives measurable revenue increase.

**Deliverables**:
1. Sales Agent implementation (system prompt, tools, campaign engine)
2. Enhanced abandoned cart recovery (intelligent timing, personalized discounts, multi-step sequences)
3. Customer segmentation (RFM analysis: Recency, Frequency, Monetary)
4. Upsell/cross-sell intelligence (post-purchase recommendations, cart augmentation)
5. Discount campaign creation and management
6. Win-back campaigns for dormant customers

**Key Files to Create**:
- `lib/agents/sales/agent.ts` — `SalesAgent extends BaseAgent`: tools include `getAbandonedCarts`, `sendRecoveryEmail`, `createCoupon`, `getCustomerSegments`, `sendTargetedCampaign`, `getProductRecommendations`, `analyzeCartValue`
- `lib/agents/sales/tools.ts` — Tool definitions. Recovery tools wrap `lib/cart/abandoned-cart.ts`. Coupon tools wrap existing coupon API. Recommendation tools wrap `lib/ai/recommendations.ts`.
- `lib/agents/sales/segmentation.ts` — `segmentCustomers(storeId)`: queries order history, computes RFM scores, returns segments (Champions, Loyal, At Risk, Dormant, New). Cached daily.
- `lib/agents/sales/campaign-engine.ts` — `createCampaign(storeId, type, config)`: manages discount campaigns with target segments, scheduling, and tracking. Types: cart_recovery, win_back, upsell, flash_sale.

**Modify**:
- `lib/cart/abandoned-cart.ts` — Add `getSalesAgentRecoveryPlan(cart)`: returns AI-determined optimal recovery strategy (discount amount, timing, channel)
- `lib/ai/recommendations.ts` — Add `getUpsellsForOrder(orderId)` and `getCrossSellsForCart(cartItems)` for Sales Agent
- `vercel.json` — Ensure abandoned cart scan cron is active

**Success Criteria**:
- Abandoned cart scan runs every 2 hours, identifies recovery opportunities
- Sales Agent sends personalized recovery emails with AI-generated subject lines and discount codes
- Autonomy level 3: recovery emails under 10% discount auto-send, larger discounts need approval
- Customer segments computed and visible in Sales Agent workspace
- Post-purchase upsell emails sent automatically (with approval for high-discount offers)
- Campaign performance metrics visible (recovery rate, revenue recovered, discount spend)
- Sales Agent actions show in activity feed and relevant order details

---

## Phase 5: Analytics Agent (Week 19–22)

**Goal**: Analytics Agent proactively surfaces insights, detects anomalies, and generates reports. Merchants understand their business without opening a spreadsheet.

**Deliverables**:
1. Analytics Agent implementation (system prompt, tools, report generator)
2. Supabase data querying tools (revenue, orders, products, customers)
3. GA4 integration (OAuth connect, data import, attribution)
4. Anomaly detection (statistical deviation alerts)
5. Automated report generation (daily digest, weekly report)
6. Analytics dashboard connected to real agent-curated insights

**Key Files to Create**:
- `lib/agents/analytics/agent.ts` — `AnalyticsAgent extends BaseAgent`: tools include `queryRevenue`, `queryOrders`, `queryProducts`, `queryCustomers`, `detectAnomalies`, `generateReport`, `getGA4Data`, `compareTimePeriods`
- `lib/agents/analytics/tools.ts` — Data query tools that run optimized Supabase queries with date range, grouping, and aggregation. Returns structured data for LLM interpretation.
- `lib/agents/analytics/anomaly-detection.ts` — `detectAnomalies(storeId, metric, period)`: compares recent data against rolling average + standard deviation. Flags deviations > 2 sigma. Metrics: revenue, order count, average order value, cart abandonment rate, product views.
- `lib/agents/analytics/report-generator.ts` — `generateReport(storeId, type, period)`: queries data, feeds to LLM for narrative summary, formats as structured report with metrics + insights + recommendations. Delivers via email and/or dashboard.
- `lib/connections/google-analytics.ts` — GA4 OAuth flow, Data API v1 client, property listing

**Modify**:
- `app/(platform)/analytics/page.tsx` — Replace mock insight cards with real agent-generated insights from `agent_actions` where `agent_type = 'analytics'`
- `vercel.json` — Ensure daily digest and weekly report crons are active

**Success Criteria**:
- Analytics Agent generates daily digest (key metrics summary) delivered to merchant's dashboard and optionally email
- Weekly report includes narrative summary, top/bottom products, customer trends, recommendations
- Anomaly detection flags unusual patterns (e.g., "Revenue dropped 40% compared to last Tuesday") and creates high-priority insight cards
- GA4 can be connected via OAuth, traffic data appears in analytics
- Agent-curated insight cards display on analytics dashboard with one-click drill-down
- Merchant can chat with Analytics Agent: "How did we do last week?" → gets structured answer with data

---

## Phase 6: Technical Agent (Week 23–26)

**Goal**: Technical Agent continuously optimizes the store's technical health — SEO, performance, structured data, broken links, image optimization.

**Deliverables**:
1. Technical Agent implementation (system prompt, tools)
2. SEO audit and auto-fix (meta titles, descriptions, Open Graph, canonical URLs)
3. Structured data generation (JSON-LD Product, Organization, BreadcrumbList)
4. Broken link detection and fix suggestions
5. Image optimization audit (missing alt text, oversized images)
6. Store health score dashboard

**Key Files to Create**:
- `lib/agents/technical/agent.ts` — `TechnicalAgent extends BaseAgent`: tools include `auditSEO`, `fixMetaTags`, `generateStructuredData`, `checkBrokenLinks`, `auditImages`, `getPageSpeedScore`, `updateProductSEO`
- `lib/agents/technical/tools.ts` — SEO tools query products and pages for missing/poor meta data. Image tools check `product_images` for missing alt text and large file sizes.
- `lib/agents/technical/seo-optimizer.ts` — `auditStore(storeId)`: checks all products for SEO completeness (title length, description length, meta description, alt text). Returns scored report. `fixSEOIssues(storeId, issues[])`: auto-generates missing meta descriptions, alt text using AI.
- `lib/agents/technical/health-checker.ts` — `computeHealthScore(storeId)`: weighted score across SEO completeness, image optimization, structured data presence, broken links, page speed. Returns 0-100 score with breakdown.

**Modify**:
- `app/[storeSlug]/` — Inject structured data generated by Technical Agent into storefront pages
- Product pages — Apply SEO improvements generated by agent

**Success Criteria**:
- Daily SEO audit runs, identifies issues, auto-fixes when autonomy allows (meta descriptions, alt text)
- Store health score visible in Technical Agent workspace and Command Center
- Structured data (JSON-LD) auto-generated for all products
- Broken image/link detection finds issues and creates approvals for fixes
- Technical Agent actions appear in activity feed with clear before/after context
- Merchant can ask "How's my store's SEO?" → gets health score + top issues

---

## Phase 7: Marketing Agent (Week 27–34)

**Goal**: Marketing Agent manages paid ads and social media presence. This is the most complex agent due to third-party API integrations and budget management.

**Extended timeline (8 weeks)** because:
- Meta Ads API and Google Ads API have complex approval processes
- Ad creative generation requires careful quality control
- Budget management is high-stakes (spending real money)
- Two major integrations (Meta + Google) each need thorough testing

**Deliverables**:
1. Marketing Agent implementation (system prompt, tools, creative generator)
2. Meta Ads API integration (campaign CRUD, audience targeting, performance reporting)
3. Google Ads API integration (Search + Shopping campaigns)
4. Ad creative generation (copy + image suggestions using AI)
5. Campaign performance tracking and optimization
6. Social media post scheduling (Meta/Instagram)
7. Budget management and ROAS tracking
8. Pixel/conversion tracking setup assistance

**Key Files to Create**:
- `lib/agents/marketing/agent.ts` — `MarketingAgent extends BaseAgent`: tools include `createAdCampaign`, `pauseAdCampaign`, `adjustBudget`, `generateAdCreative`, `getAdPerformance`, `createSocialPost`, `scheduleSocialPost`, `getAudienceInsights`, `optimizeBidding`
- `lib/agents/marketing/tools.ts` — Tool definitions wrapping Meta and Google API clients
- `lib/agents/marketing/meta-ads.ts` — Meta Marketing API client: campaign CRUD, ad set management, audience creation, reporting. Rate-limited, token-refreshing.
- `lib/agents/marketing/google-ads.ts` — Google Ads API client: campaign CRUD, keyword management, Shopping feed, reporting.
- `lib/agents/marketing/content-generator.ts` — `generateAdCreative(product, platform, format)`: uses AI to generate ad copy (headline, description, CTA) and suggests image cropping/overlays for different ad formats.
- `lib/connections/meta.ts` — Meta OAuth flow specifics (Business verification, permissions, long-lived tokens)
- `lib/connections/google-ads.ts` — Google Ads OAuth flow (developer token handling, MCC access)

**Modify**:
- Settings pages — Marketing-specific budget controls, ad account linking
- Command Center — Marketing Agent card shows ad spend, ROAS, active campaigns

**Success Criteria**:
- Meta Ads account can be connected via OAuth
- Marketing Agent can create a campaign with AI-generated ad copy, targeting suggestions, and budget
- All campaign creation requires approval (regardless of autonomy level — this is a hard rule for spend actions)
- Social media posts can be created and scheduled with AI-generated captions
- Campaign performance data syncs and displays in Marketing Agent workspace
- Budget limits enforced — agent cannot exceed configured monthly ad spend
- Google Ads integration works for Search campaigns (Shopping campaigns are a stretch goal)
- ROAS tracking visible per campaign
- Merchant can say "Create a campaign for my new arrivals" → Agent drafts campaign with creative, targeting, budget → merchant approves → campaign goes live

---

## Phase 8: Polish & Launch (Week 35–38)

**Goal**: Production-ready release. Onboarding flow, billing, landing page, documentation, performance optimization.

**Deliverables**:
1. Compressed onboarding flow (30-second store creation + agent setup wizard)
2. Billing/pricing system (free, Pro, Business tiers with Stripe subscription)
3. Landing page redesign (showcase agent capabilities)
4. Performance optimization (bundle size, lazy loading, query optimization)
5. Error handling hardening (agent failure recovery, graceful degradation)
6. Monitoring and alerting (agent health dashboards for platform admin)
7. Documentation (merchant help center, API docs for advanced users)

**Key Files to Create/Modify**:
- `app/(platform)/onboarding/page.tsx` — Compressed store creation form (4 steps in one page) + agent setup wizard checklist
- `components/platform/onboarding/store-setup.tsx` — Phase A: name, category, logo, theme, first product
- `components/platform/onboarding/agent-setup.tsx` — Phase B: checklist with payment setup, agent activation, integrations
- `app/(marketing)/page.tsx` — Redesigned landing page showcasing autonomous agents
- Billing integration — Stripe subscription for platform (separate from per-store Stripe payments)
- `app/admin/` — Add agent platform monitoring (total agent actions, costs, errors across all stores)

**Success Criteria**:
- New merchant can create store and have Support Agent responding to queries within 5 minutes
- Billing works: free tier limits enforced, upgrade flow smooth
- Landing page clearly communicates the AI agent value proposition
- Lighthouse performance score > 90 on dashboard pages
- Agent errors do not crash the merchant dashboard (graceful error boundaries)
- Platform admin can monitor agent health across all stores
- All 5 agents working in concert for a test store over a 1-week period without critical failures

---

# Section 9: Open Questions & Risks

1. **Google Ads Developer Token Approval**: Google Ads API requires a developer token that must be approved by Google. The approval process can take 2-6 weeks and requires demonstrating API usage compliance. If rejected, the Marketing Agent's Google Ads capabilities are blocked. *Mitigation*: Apply early (Phase 5/6), build Meta Ads integration first, design Marketing Agent so Google Ads is an optional add-on.

2. **Meta Business Verification**: Meta requires business verification for production access to the Marketing API with ads_management scope. This requires submitting business documents and can take 1-4 weeks. *Mitigation*: Apply during Phase 6, build with development mode limits initially (5 ad accounts).

3. **LLM Cost Control for Free-Tier Users**: Free-tier stores with a $2/month LLM budget could exhaust it within hours if agents run freely. Need to determine: what happens when budget is exhausted mid-conversation with a customer? *Mitigation*: Support Agent gets a reserved budget slice that cannot be consumed by other agents. When global budget is exhausted, Support Agent falls back to template-based responses, other agents pause. Budget resets monthly.

4. **Agent Error Cascading**: An agent that makes a mistake (e.g., Support Agent gives wrong shipping information) can damage customer trust. What is the recovery flow? *Mitigation*: All customer-facing actions include a "correction window" (5-minute delay on non-urgent communications at autonomy levels 1-3). Merchant can cancel during this window. Agents include confidence scores in their responses; low-confidence responses always require approval regardless of autonomy level. Post-mistake: agent logs the error, learns from merchant correction, adjusts behavior.

5. **Data Privacy and Agent Access Scope**: Agents have access to customer PII (names, addresses, emails, phone numbers, order history). This raises GDPR/data protection concerns, especially for Indian merchants processing international orders. *Mitigation*: Agents never include raw PII in LLM prompts unless necessary for the specific task. Customer data is referenced by ID, with details fetched via tools only when needed. LLM providers' data processing agreements must be reviewed. Add data processing disclosure to merchant terms of service.

6. **Multi-Agent Conflicts**: What happens when the Sales Agent wants to send a 20% discount email to a customer segment at the same time the Marketing Agent is running a full-price campaign targeting the same customers? *Mitigation*: The orchestrator checks for conflicts before executing actions. Conflict types defined: audience overlap (same customers targeted by multiple agents), budget contention (total planned spend exceeds limits), contradictory messaging (discount vs. full-price). Conflicts create a special "conflict resolution" approval that shows both agents' proposals side-by-side.

7. **Platform-Managed Payments Without Payment Aggregator License**: If StoreForge processes payments on behalf of merchants using platform Razorpay/Stripe credentials, this may constitute operating as a payment aggregator/facilitator, which requires regulatory approval in India (RBI guidelines) and potentially other jurisdictions. *Mitigation*: Push merchants to connect their own Razorpay/Stripe accounts as early as possible in onboarding. Platform credentials serve only as a temporary bridge for the first few days. Consult with a fintech compliance advisor before scaling beyond initial beta.

8. **Custom Domain Provisioning Speed**: The PRD mentions 30-second store creation, but custom domains require DNS propagation (minutes to hours). Even subdomain provisioning under `*.storeforge.site` is near-instant with wildcard DNS, but any custom domain flow will be slow. *Mitigation*: Phase 1 stores always use `{slug}.storeforge.site` subdomains. Custom domain support is a future feature with proper expectation-setting ("Your custom domain will be active within 24 hours").

9. **Vercel Serverless Function Duration Limits**: Agent executions involving multiple tool calls (e.g., Marketing Agent creating a campaign with creative generation + audience analysis + bid calculation) may exceed the 60-second Hobby or 300-second Pro function duration limit. *Mitigation*: Break complex agent tasks into multiple sequential function invocations chained via database state. The scheduler checks for "continuation" tasks. Consider Vercel's `maxDuration` configuration. For truly long tasks, use Vercel's streaming responses to keep the connection alive.

10. **Supabase Realtime Connection Limits**: Each merchant's browser session opens Realtime subscriptions for activity feed, approvals, and agent status (3+ channels). At 1,000 concurrent merchants, that's 3,000+ concurrent connections. Supabase's Realtime has connection limits per project (default 200 on free, 500 on Pro). *Mitigation*: Multiplex all agent-related subscriptions into a single channel per store using Supabase's channel multiplexing. Implement connection pooling on the client. Monitor usage and upgrade Supabase plan as needed.

11. **Agent Memory Relevance Decay**: Agent memories accumulate over time. Old memories may become irrelevant or contradictory (e.g., "merchant prefers formal email tone" from 6 months ago, but they've since shifted to casual). *Mitigation*: Implement confidence decay — memories lose confidence score over time unless reinforced by new evidence. Memories below 0.3 confidence are excluded from agent context. Explicit merchant feedback ("I don't like this approach") immediately overrides related memories. Expose memory viewer in agent settings so merchants can see and delete what agents "know."

12. **Inbound Email/WhatsApp Handling**: For the Support Agent to respond to emails and WhatsApp messages, StoreForge needs inbound message routing. Resend supports inbound webhooks but requires DNS configuration (MX records) per store domain. MSG91 supports inbound WhatsApp but requires a WhatsApp Business API number per store. *Mitigation*: Phase 3 starts with website chat only (no DNS/WhatsApp config needed). Inbound email via Resend webhook uses the platform's domain initially (`support@storeforge.site` with store routing). Per-store WhatsApp requires the merchant to have their own MSG91/WhatsApp Business account — platform-level WhatsApp number can be a shared reply channel with store identification.

13. **Ad Creative Quality and Brand Safety**: The Marketing Agent generates ad copy and may suggest images for ads. Low-quality or off-brand creatives waste ad spend and damage brand perception. Meta and Google also have ad policy requirements that AI-generated content must comply with. *Mitigation*: All ad creative goes through approval regardless of autonomy level. Include an "Ad Policy Check" tool that validates creative against known platform rules before submitting for approval. Maintain a store-specific brand guide in agent memory (tone, forbidden words, image style preferences).

14. **Billing Complexity — LLM Costs vs. Platform Subscription**: The cost structure is complex: platform subscription (fixed monthly fee) + LLM usage (variable) + ad spend (pass-through). How do we bill merchants? *Mitigation*: Keep it simple. Three tiers with included LLM budgets ($2/$20/$100). Overage is either blocked (not billed) or billed at a premium rate. Ad spend is entirely managed through the merchant's own Meta/Google accounts — StoreForge never touches ad money. This avoids payment aggregator issues for ad spend too.

15. **Solo Developer Execution Risk**: A 38-week plan for a solo developer assumes no significant interruptions, no major refactors, and consistent productivity. Feature creep, unexpected bugs in third-party APIs, or burnout can derail timelines. *Mitigation*: Each phase is designed to be independently valuable — if development stops after Phase 3, the product still works as an e-commerce platform with a Support Agent. Prioritize ruthlessly within each phase. "Done" means "works for 80% of cases," not "handles every edge case." Use existing libraries and services wherever possible (don't build a custom chat widget framework, use an existing one and style it).

16. **Existing AI Bot Migration**: The current AI bot (`components/dashboard/ai-bot/`, `lib/ai/bot/`) has 27 tools and active users. Replacing it with the multi-agent system must not lose functionality. *Mitigation*: Phase 2 maps all 27 existing bot tools to appropriate agents. The Cmd+K interface without an `@agent` prefix routes to an "auto-dispatch" mode that replicates the current bot's behavior by routing to the correct agent based on intent classification. Existing bot tools are explicitly preserved, just redistributed.

17. **Approval Queue Fatigue**: If agents generate too many approvals, merchants will stop reviewing them — the "notification blindness" problem. This undermines the entire approval system. *Mitigation*: Default autonomy level is 3 ("Smart Autonomy") which auto-executes routine actions. Track approval response times — if median response time exceeds 24 hours, surface a suggestion to increase autonomy level. Limit to 10 active approvals per agent (queue additional ones). Group similar approvals into batches ("Approve all 5 SEO meta description updates?").

18. **Testing Strategy for Agent Behavior**: How do you test that an agent makes good decisions? Unit tests can verify tool execution, but the LLM's reasoning is non-deterministic. *Mitigation*: Test at three levels: (1) deterministic tests for tool functions (existing `lib/` functions already have tests), (2) integration tests with recorded LLM responses (snapshot tests using Vercel AI SDK's test utilities), (3) evaluation suite with predefined scenarios and expected outcomes (e.g., "given this customer query, agent should look up order and respond with tracking info"). Run eval suite on model upgrades.

19. **Storefront Chat Widget Performance**: Adding a chat widget to every storefront page adds JavaScript weight and potentially an always-open WebSocket connection, impacting store performance and customer experience. *Mitigation*: Lazy-load chat widget (only load JS when chat bubble is clicked). Use a lightweight iframe or web component to isolate from store's main bundle. WebSocket connection opens only when chat is active, not on page load. Chat widget JS budget: < 30KB gzipped.

20. **Agent Observability in Production**: When an agent does something unexpected in production, how do you debug it? LLM reasoning is a black box, tool calls may have side effects, and the execution spans multiple async invocations. *Mitigation*: Every agent invocation logs: full prompt (system + user messages), all tool calls with arguments and results, LLM response, token counts, duration, and cost. Stored in `agent_actions.details` JSONB field. Platform admin can view full execution traces. Add a "replay" mode that re-runs an agent invocation with the same inputs but in dry-run mode (tools return cached results, no side effects). This is essential for debugging and also for merchant transparency ("Why did you do this?").
