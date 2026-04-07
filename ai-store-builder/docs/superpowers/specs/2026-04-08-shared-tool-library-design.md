# Shared Tool Library & Agent Tool Decomposition

**Date**: 2026-04-08
**Status**: Design approved
**Goal**: Reliability + cost reduction + capability expansion across all 37 sub-agents

---

## Problem

17 of 37 sub-agents have thin tool coverage (0-2 tools). The LLM handles data fetching, formatting, and analysis via long system prompts instead of structured tools. This causes:

1. **Model dependency** — output quality varies significantly by model
2. **Token waste** — LLM re-derives data it could get from a single DB query
3. **Capability gaps** — agents talk about actions they can't actually perform
4. **Code duplication** — 5+ agents query the products table with separate tool definitions

## Solution

Two-part approach:

1. **Shared tool library** — 7 modules with ~20 reusable tools for common data access
2. **Per-agent wiring** — connect shared + new tools to all 17 under-tooled agents

---

## Part 1: Shared Tool Library

Location: `src/lib/agents/sub-agents/tools/shared/`

Each module exports named `tool()` definitions using AI SDK + Zod schemas. All tools follow the existing pattern in the codebase (getSupabaseAdmin, structured returns with `success` boolean).

### Module: `shared/products.ts`

**`get_products`** — List products for a store with optional filters.
- Params: `store_id`, `status?`, `category?`, `search?`, `sort_by?`, `limit?`
- Returns: `{ success, count, products[] }` with id, title, price, compare_at_price, category, tags, inventory_quantity, status, has_variants
- Used by: chat-responder, upsell-agent, price-strategist, reel-director, copysmith, seo-scout, influencer-finder, competitor-watcher, faq-builder, lead-scorer, report-writer

**`get_product_details`** — Get full details for a single product including images, variants, and reviews summary.
- Params: `store_id`, `product_id`
- Returns: `{ success, product }` with all fields + `product_images[]`, `product_variants[]`, review_count, avg_rating
- Used by: reel-director, copysmith, cart-whisperer, email-handler

**`get_product_categories`** — Get distinct categories and their product counts.
- Params: `store_id`
- Returns: `{ success, categories[] }` with category name, product count, avg price
- Used by: campaign-architect, seo-scout, competitor-watcher

**`get_trending_products`** — Products ranked by recent sales volume (last N days).
- Params: `store_id`, `days?` (default 30), `limit?` (default 10)
- Returns: `{ success, products[] }` with id, title, price, units_sold, revenue
- Implementation: JOIN orders + order_items, GROUP BY product_id, ORDER BY units_sold DESC
- Used by: reel-director, copysmith, social-composer, deal-engineer

### Module: `shared/orders.ts`

**`get_orders`** — Query orders with flexible filters.
- Params: `store_id`, `status?`, `payment_status?`, `customer_email?`, `days?`, `limit?`
- Returns: `{ success, count, orders[] }` with core order fields + order_items[]
- Used by: email-handler, returns-manager, escalation-detector

**`get_order_details`** — Full order details by order_id or order_number.
- Params: `store_id`, `order_id?`, `order_number?`
- Returns: `{ success, order }` with all fields + order_items[], shipping, payment
- Note: Replaces duplicate tools in email-handler and returns-manager
- Used by: email-handler, returns-manager, checkout-doctor, escalation-detector

**`get_order_stats`** — Aggregated order metrics for a period.
- Params: `store_id`, `days?` (default 30)
- Returns: `{ success, stats }` with total_orders, total_revenue, avg_order_value, orders_by_status, orders_by_payment_status, top_products[]
- Used by: price-strategist, deal-engineer, upsell-agent, report-writer

**`get_revenue_summary`** — Revenue breakdown by day/week/month.
- Params: `store_id`, `days?` (default 30), `group_by?` ('day' | 'week' | 'month')
- Returns: `{ success, summary[] }` with period, revenue, order_count, avg_order_value
- Used by: campaign-architect, deal-engineer, competitor-watcher, report-writer

### Module: `shared/customers.ts`

**`get_customers`** — List customers with RFM-like filters.
- Params: `store_id`, `segment?` ('active' | 'at_risk' | 'churned' | 'new'), `min_orders?`, `min_spent?`, `limit?`
- Returns: `{ success, count, customers[] }` with id, name, email, total_orders, total_spent, last_order_at
- Used by: lead-scorer, loyalty-architect, escalation-detector

**`get_customer_history`** — Full history for a single customer (orders, support interactions).
- Params: `store_id`, `customer_id?`, `customer_email?`
- Returns: `{ success, customer, orders[], total_spent, first_order_at, last_order_at, order_count }`
- Used by: cart-whisperer, email-handler, chat-responder, escalation-detector, lead-scorer

**`get_customer_segments`** — Aggregate customer segments with counts and metrics.
- Params: `store_id`
- Returns: `{ success, segments[] }` with segment name, count, avg_ltv, avg_orders
- Implementation: Segment by recency (active <30d, at_risk 30-90d, churned >90d, new <1 order)
- Used by: campaign-architect, upsell-agent, loyalty-architect, report-writer

### Module: `shared/store.ts`

**`get_store_config`** — Core store settings, payment methods, currency, checkout config.
- Params: `store_id`
- Returns: `{ success, config }` with name, slug, currency, category, description, payment methods enabled, checkout settings
- Used by: checkout-doctor, faq-builder

**`get_store_policies`** — Return, shipping, privacy policies.
- Params: `store_id`
- Returns: `{ success, policies }` with return_window_days, shipping_policy, privacy_policy, terms
- Note: Already exists in sentinel-tools — move to shared, import from there
- Used by: chat-responder, email-handler, returns-manager, faq-builder

**`get_brand_guidelines`** — Brand vibe, colors, logo, fonts from store blueprint.
- Params: `store_id`
- Returns: `{ success, brand }` with brand_vibe, primary_color, secondary_color, logo_url, description, category
- Used by: reel-director, copysmith, social-composer

**`get_shipping_config`** — Configured shipping providers and methods.
- Params: `store_id`
- Returns: `{ success, providers[] }` with provider name, type, is_configured, methods/zones if available
- Used by: checkout-doctor, chat-responder, faq-builder

### Module: `shared/coupons.ts`

**`get_coupons`** — List coupons with status.
- Params: `store_id`, `active_only?`, `limit?`
- Returns: `{ success, count, coupons[] }`
- Note: Replaces `get_active_coupons` in new-agent-tools
- Used by: deal-engineer, chat-responder, cart-whisperer

**`get_coupon_performance`** — Usage stats and revenue impact per coupon.
- Params: `store_id`, `coupon_id?`, `days?`
- Returns: `{ success, coupons[] }` with code, uses_count, max_uses, total_discount_given, orders_using_coupon
- Implementation: JOIN orders where coupon_code matches, aggregate
- Used by: deal-engineer, price-strategist, report-writer

**`deactivate_coupon`** — Set is_active=false on a coupon.
- Params: `store_id`, `coupon_id`
- Returns: `{ success, coupon }`
- Used by: deal-engineer

### Module: `shared/reviews.ts`

**`get_reviews`** — Query product reviews with filters.
- Params: `store_id`, `product_id?`, `min_rating?`, `max_rating?`, `unanswered_only?`, `limit?`
- Returns: `{ success, count, reviews[] }`
- Note: Replaces `get_pending_reviews` in sentinel-tools (superset)
- Used by: review-curator, escalation-detector

**`get_review_stats`** — Aggregate review metrics.
- Params: `store_id`, `product_id?`
- Returns: `{ success, stats }` with total_reviews, avg_rating, rating_distribution, response_rate, common_themes (top words from review bodies)
- Used by: copysmith, escalation-detector, report-writer

### Module: `shared/analytics.ts`

**`get_funnel_data`** — Enhanced checkout funnel with granular stages.
- Params: `store_id`, `days?`
- Returns: `{ success, funnel }` with carts_created, abandoned, checkout_started, payment_attempted, payment_successful, payment_failed, conversion_rate, abandonment_rate
- Note: Superset of existing `get_checkout_funnel` in new-agent-tools
- Used by: checkout-doctor, report-writer

**`get_payment_failures`** — Orders with failed payments, grouped by failure reason.
- Params: `store_id`, `days?`
- Returns: `{ success, failures[] }` with failure_reason, count, pct, example_order_ids
- Implementation: Query orders where payment_status='failed', group by notes/payment_method
- Used by: checkout-doctor, escalation-detector

**`get_recovery_stats`** — Cart recovery performance by sequence step.
- Params: `store_id`, `days?`
- Returns: `{ success, stats }` with total_abandoned, recovered, recovery_rate, by_step (email_1_sent, email_2_sent, etc. with conversion per step)
- Used by: cart-whisperer, report-writer

---

## Part 2: Per-Agent Wiring

For each agent: which shared tools get wired in, which existing tools get replaced by shared versions, and whether the category changes.

### PRISM (Marketing)

#### reel-director
- **Category change**: `llm-only` → `llm-api`
- **Add**: `get_trending_products`, `get_product_details`, `get_brand_guidelines`
- **Replace**: nothing (had no tools)
- **Impact**: Scripts now reference real products with accurate names/prices/descriptions

#### campaign-architect
- **Add**: `get_customer_segments`, `get_revenue_summary`, `get_product_categories`
- **Keep**: existing CAMPAIGN_ARCHITECT_TOOLS
- **Impact**: Campaign plans grounded in real customer data and revenue context

#### copysmith
- **Add**: `get_product_details`, `get_brand_guidelines`, `get_review_stats`
- **Keep**: existing COPYSMITH_TOOLS
- **Impact**: Copy uses real product specs and social proof, not hallucinated features

#### seo-scout
- **Add**: `get_products`, `get_product_categories`
- **Keep**: existing SEO_SCOUT_TOOLS
- **Impact**: Keyword strategy mapped to actual catalog structure

#### influencer-finder
- **Add**: `get_trending_products`
- **Keep**: existing INFLUENCER_FINDER_TOOLS
- **Impact**: Recommends featuring products that are actually selling

### FORGE (Sales)

#### cart-whisperer
- **Add**: `get_product_details`, `get_recovery_stats`, `get_customer_history`, `get_coupons`
- **Keep**: `list_abandoned_carts`, `send_recovery_email`
- **Impact**: Recovery emails include real product images, personalized based on customer history

#### price-strategist
- **Add**: `get_order_stats`, `get_revenue_summary`, `get_coupon_performance`
- **Keep**: `get_product_prices`, `update_product_price`
- **Impact**: Pricing recommendations grounded in actual sales velocity and margin data

#### deal-engineer
- **Add**: `get_coupon_performance`, `deactivate_coupon`, `get_revenue_summary`, `get_order_stats`, `get_trending_products`
- **Replace**: `get_active_coupons` → `get_coupons` (shared superset)
- **Keep**: `create_coupon`
- **Impact**: Can analyze what promos work, clean up dead coupons, time campaigns to revenue trends

#### upsell-agent
- **Add**: `get_order_stats`, `get_customer_segments`
- **Keep**: `get_frequently_bought_together`, `get_product_catalog`
- **Impact**: Recommendations tailored by customer tier, measured against actual AOV

#### checkout-doctor
- **Add**: `get_payment_failures`, `get_shipping_config`, `get_store_config`
- **Replace**: `get_checkout_funnel` → `get_funnel_data` (shared superset)
- **Impact**: Goes from 1 tool guessing at problems → 4 tools diagnosing specific issues

#### loyalty-architect
- **Add**: `get_customer_segments`
- **Keep**: all 8 existing tools
- **Impact**: Loyalty tiers aligned to real customer behavior segments

#### lead-scorer
- **Add**: `get_customer_history`, `get_products`
- **Keep**: `score_customers`
- **Impact**: Richer scoring with actual purchase details, product affinity

### SENTINEL (Support)

#### chat-responder
- **Add**: `get_coupons`, `get_shipping_config`, `get_customer_history`
- **Replace**: `get_store_policies` → shared version
- **Keep**: `get_store_products`, `get_order_status`
- **Impact**: Self-resolves discount/shipping/policy questions without escalating

#### email-handler
- **Add**: `get_customer_history`, `get_orders`, `get_store_policies`
- **Replace**: `get_order_details` → shared version
- **Keep**: `send_email_reply`
- **Impact**: Categorizes and responds with full customer context

#### escalation-detector
- **Add**: `get_customer_history`, `get_orders`, `get_review_stats`, `get_payment_failures`
- **Keep**: existing ESCALATION_DETECTOR_TOOLS
- **Impact**: Detects patterns from real data (serial contacts, product defect clusters)

#### faq-builder
- **Add**: `get_store_policies`, `get_products`, `get_shipping_config`, `get_store_config`
- **Keep**: existing FAQ_BUILDER_TOOLS
- **Impact**: FAQ answers grounded in actual policies and product catalog

### PULSE (Analytics)

#### competitor-watcher
- **Add**: `get_products`, `get_revenue_summary`
- **Keep**: existing COMPETITOR_WATCHER_TOOLS
- **Impact**: Competitive analysis contextualized against own pricing and revenue

#### report-writer
- **Add**: `get_revenue_summary`, `get_customer_segments`, `get_funnel_data`, `get_review_stats`, `get_recovery_stats`, `get_order_stats`
- **Keep**: existing REPORT_WRITER_TOOLS
- **Impact**: Reports built from real data instead of LLM-generated estimates

---

## Part 3: Migration Strategy

### What gets replaced (deduplicated)

These existing tools get replaced by shared equivalents:

| Current Tool | Current Location | Replaced By |
|---|---|---|
| `get_active_coupons` | new-agent-tools.ts | `shared/coupons.ts → get_coupons` |
| `get_checkout_funnel` | new-agent-tools.ts | `shared/analytics.ts → get_funnel_data` |
| `get_store_policies` | sentinel-tools.ts | `shared/store.ts → get_store_policies` |
| `get_order_details` | sentinel-tools.ts | `shared/orders.ts → get_order_details` |
| `get_pending_reviews` | sentinel-tools.ts | `shared/reviews.ts → get_reviews` |
| `get_store_products` | sentinel-tools.ts | `shared/products.ts → get_products` |
| `get_product_catalog` | forge-tools.ts | `shared/products.ts → get_products` |

Old tools are removed after migration. Imports in registry files updated to point to shared.

### What stays untouched

Agent-specific action tools that aren't data access:
- `send_recovery_email`, `send_email_reply`, `send_whatsapp_message` (communication)
- `generate_product_image` (AI generation)
- `update_product_price`, `process_refund`, `update_order_status` (mutations)
- `create_coupon`, `post_review_response`, `optimize_image` (agent-specific writes)
- All Meta/Google Ads API tools (external API)
- All loyalty program tools (domain-specific CRUD)
- `export_store_data`, `get_backup_status` (backup-specific)
- All CIPHER tools (PageSpeed, SSL, security headers, health checks)

### Build sequence

1. **Phase 1**: Build shared tool library (7 modules, ~20 tools) — no agent changes yet
2. **Phase 2**: Wire shared tools into the 5 highest-impact agents (reel-director, checkout-doctor, cart-whisperer, deal-engineer, email-handler) — validate pattern works
3. **Phase 3**: Wire remaining 13 agents, replace duplicates
4. **Phase 4**: Remove old duplicate tool definitions, update exports

Each phase is independently shippable. Phase 1 has zero breaking changes. Phase 2-3 only change tool imports in registry files. Phase 4 is cleanup.

---

## Metrics

After implementation, we can verify success by:

- **Reliability**: Same prompt → same structured tool calls across Gemini Flash, Claude Haiku, other models
- **Cost**: Track tokens_input per agent execution — expect 20-40% reduction due to less prompt-derived data
- **Capability**: Agents reference real data (product names, prices, customer history) instead of generic placeholders
- **Code health**: 7 duplicate tool definitions eliminated, single source of truth for data access
