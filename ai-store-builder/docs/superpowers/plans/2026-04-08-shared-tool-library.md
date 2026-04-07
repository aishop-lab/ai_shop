# Shared Tool Library & Agent Tool Decomposition — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a shared tool library of ~20 reusable tools and wire them into all 17 under-tooled sub-agents, eliminating duplicate code and grounding every agent in real store data.

**Architecture:** 7 shared tool modules under `src/lib/agents/sub-agents/tools/shared/` export AI SDK `tool()` definitions. Each agent's registry file imports the tools it needs and merges them into its `tools` object. Existing agent-specific tools (email sending, image generation, ad APIs) remain untouched.

**Tech Stack:** TypeScript, AI SDK `tool()` + Zod schemas, Supabase admin client, existing codebase patterns.

**Note on testing:** This codebase has no unit test framework (only Playwright E2E). Verification is done via TypeScript compilation (`npx tsc --noEmit`) and manual API testing. Each task includes a compile-check step.

---

## File Structure

### New files (shared tool library)
- `src/lib/agents/sub-agents/tools/shared/products.ts` — Product queries (get_products, get_product_details, get_product_categories, get_trending_products)
- `src/lib/agents/sub-agents/tools/shared/orders.ts` — Order queries (get_orders, get_order_details, get_order_stats, get_revenue_summary)
- `src/lib/agents/sub-agents/tools/shared/customers.ts` — Customer queries (get_customers, get_customer_history, get_customer_segments)
- `src/lib/agents/sub-agents/tools/shared/store.ts` — Store config queries (get_store_config, get_store_policies, get_brand_guidelines, get_shipping_config)
- `src/lib/agents/sub-agents/tools/shared/coupons.ts` — Coupon queries (get_coupons, get_coupon_performance, deactivate_coupon)
- `src/lib/agents/sub-agents/tools/shared/reviews.ts` — Review queries (get_reviews, get_review_stats)
- `src/lib/agents/sub-agents/tools/shared/analytics.ts` — Analytics queries (get_funnel_data, get_payment_failures, get_recovery_stats)
- `src/lib/agents/sub-agents/tools/shared/index.ts` — Barrel export for all shared tools

### Modified files (agent registries — wire in shared tools)
- `src/lib/agents/sub-agents/registry/prism.ts` — Wire shared tools into 5 PRISM agents
- `src/lib/agents/sub-agents/registry/forge.ts` — Wire shared tools into 7 FORGE agents
- `src/lib/agents/sub-agents/registry/sentinel.ts` — Wire shared tools into 7 SENTINEL agents
- `src/lib/agents/sub-agents/registry/pulse.ts` — Wire shared tools into 2 PULSE agents
- `src/lib/agents/sub-agents/registry/cipher.ts` — No changes needed (CIPHER agents are well-tooled)

### Modified files (cleanup — remove duplicates after wiring)
- `src/lib/agents/sub-agents/tools/new-agent-tools.ts` — Remove `get_active_coupons`, `get_checkout_funnel`, `get_trending_products`, `get_store_analytics_summary`
- `src/lib/agents/sub-agents/tools/sentinel-tools.ts` — Remove `get_store_products`, `get_store_policies`, `get_order_details` (chat-responder), `get_pending_reviews`
- `src/lib/agents/sub-agents/tools/forge-tools.ts` — Remove `get_product_catalog`

---

## Phase 1: Build Shared Tool Library (Tasks 1-7)

No agent changes in this phase — only new files. Zero breaking changes.

### Task 1: shared/products.ts

**Files:**
- Create: `src/lib/agents/sub-agents/tools/shared/products.ts`

- [ ] **Step 1: Create the products shared tool module**

```typescript
// src/lib/agents/sub-agents/tools/shared/products.ts
// Shared product query tools — used by 11+ sub-agents

import { tool } from 'ai'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

// ---------------------------------------------------------------------------
// get_products — List products with flexible filters
// ---------------------------------------------------------------------------

export const get_products = tool({
  description:
    'Query products for a store. Supports filtering by status, category, keyword search, and sorting. ' +
    'Returns compact product data suitable for analysis, recommendations, and customer-facing responses.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    status: z
      .enum(['active', 'draft', 'archived', 'all'])
      .optional()
      .describe('Filter by product status (default: active)'),
    category: z.string().optional().describe('Filter by product category (case-insensitive partial match)'),
    search: z.string().optional().describe('Keyword search across title and description'),
    sort_by: z
      .enum(['title', 'price_asc', 'price_desc', 'newest', 'oldest'])
      .optional()
      .describe('Sort order (default: title)'),
    limit: z.number().optional().describe('Max products to return (default: 50)'),
  }),
  execute: async ({ store_id, status = 'active', category, search, sort_by = 'title', limit = 50 }) => {
    const supabase = getSupabaseAdmin()

    let query = supabase
      .from('products')
      .select(
        `id, title, description, price, compare_at_price, category, tags,
         inventory_quantity, status, has_variants, created_at`
      )
      .eq('store_id', store_id)
      .eq('is_demo', false)
      .limit(limit)

    if (status !== 'all') {
      query = query.eq('status', status)
    }
    if (category) {
      query = query.ilike('category', `%${category}%`)
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }

    switch (sort_by) {
      case 'price_asc':
        query = query.order('price', { ascending: true })
        break
      case 'price_desc':
        query = query.order('price', { ascending: false })
        break
      case 'newest':
        query = query.order('created_at', { ascending: false })
        break
      case 'oldest':
        query = query.order('created_at', { ascending: true })
        break
      default:
        query = query.order('title')
    }

    const { data, error } = await query

    if (error) {
      return { success: false, error: error.message, products: [] }
    }

    return { success: true, count: data?.length ?? 0, products: data ?? [] }
  },
})

// ---------------------------------------------------------------------------
// get_product_details — Full details for a single product
// ---------------------------------------------------------------------------

export const get_product_details = tool({
  description:
    'Get complete details for a single product including images, variants, and review summary. ' +
    'Use this when you need deep information about a specific product.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    product_id: z.string().describe('The product UUID'),
  }),
  execute: async ({ store_id, product_id }) => {
    const supabase = getSupabaseAdmin()

    const { data: product, error } = await supabase
      .from('products')
      .select(
        `id, title, description, price, compare_at_price, cost_per_item,
         category, tags, inventory_quantity, status, has_variants,
         meta_description, seo_title, slug, created_at, updated_at`
      )
      .eq('id', product_id)
      .eq('store_id', store_id)
      .eq('is_demo', false)
      .single()

    if (error) {
      return { success: false, error: error.message, product: null }
    }

    // Fetch images
    const { data: images } = await supabase
      .from('product_images')
      .select('id, original_url, thumbnail_url, alt_text, position, is_primary')
      .eq('product_id', product_id)
      .order('position')

    // Fetch variants
    const { data: variants } = await supabase
      .from('product_variants')
      .select('id, title, price, compare_at_price, inventory_quantity, sku, options')
      .eq('product_id', product_id)
      .order('title')

    // Fetch review summary
    const { data: reviews, count: reviewCount } = await supabase
      .from('product_reviews')
      .select('rating', { count: 'exact' })
      .eq('product_id', product_id)

    const avgRating =
      reviews && reviews.length > 0
        ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
        : null

    return {
      success: true,
      product: {
        ...product,
        images: images ?? [],
        variants: variants ?? [],
        review_count: reviewCount ?? 0,
        avg_rating: avgRating,
      },
    }
  },
})

// ---------------------------------------------------------------------------
// get_product_categories — Distinct categories with counts
// ---------------------------------------------------------------------------

export const get_product_categories = tool({
  description:
    'Get distinct product categories for a store with product counts and average price per category.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
  }),
  execute: async ({ store_id }) => {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('products')
      .select('category, price')
      .eq('store_id', store_id)
      .eq('is_demo', false)
      .eq('status', 'active')

    if (error) {
      return { success: false, error: error.message, categories: [] }
    }

    const categoryMap: Record<string, { count: number; totalPrice: number }> = {}
    for (const p of data ?? []) {
      const cat = p.category || 'Uncategorized'
      if (!categoryMap[cat]) categoryMap[cat] = { count: 0, totalPrice: 0 }
      categoryMap[cat].count++
      categoryMap[cat].totalPrice += p.price ?? 0
    }

    const categories = Object.entries(categoryMap)
      .map(([name, stats]) => ({
        category: name,
        product_count: stats.count,
        avg_price: Math.round((stats.totalPrice / stats.count) * 100) / 100,
      }))
      .sort((a, b) => b.product_count - a.product_count)

    return { success: true, count: categories.length, categories }
  },
})

// ---------------------------------------------------------------------------
// get_trending_products — Products ranked by recent sales volume
// ---------------------------------------------------------------------------

export const get_trending_products = tool({
  description:
    'Get products ranked by recent sales volume. ' +
    'Identifies what is actually selling well to inform content, promos, and recommendations.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    days: z.number().optional().describe('Look-back period in days (default: 30)'),
    limit: z.number().optional().describe('Max products to return (default: 10)'),
  }),
  execute: async ({ store_id, days = 30, limit = 10 }) => {
    const supabase = getSupabaseAdmin()
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    // Get paid orders in the period
    const { data: orders } = await supabase
      .from('orders')
      .select('id, order_items(product_id, title, quantity, price)')
      .eq('store_id', store_id)
      .eq('payment_status', 'paid')
      .gte('created_at', since)
      .limit(500)

    if (!orders || orders.length === 0) {
      return { success: true, period_days: days, count: 0, products: [] }
    }

    // Aggregate by product
    const productMap: Record<string, { title: string; units_sold: number; revenue: number }> = {}
    for (const order of orders) {
      const items = (order.order_items as Array<{ product_id: string; title: string; quantity: number; price: number }>) ?? []
      for (const item of items) {
        if (!item.product_id) continue
        if (!productMap[item.product_id]) {
          productMap[item.product_id] = { title: item.title, units_sold: 0, revenue: 0 }
        }
        productMap[item.product_id].units_sold += item.quantity || 1
        productMap[item.product_id].revenue += (item.price || 0) * (item.quantity || 1)
      }
    }

    const trending = Object.entries(productMap)
      .map(([id, stats]) => ({
        product_id: id,
        title: stats.title,
        units_sold: stats.units_sold,
        revenue: Math.round(stats.revenue * 100) / 100,
      }))
      .sort((a, b) => b.units_sold - a.units_sold)
      .slice(0, limit)

    return { success: true, period_days: days, count: trending.length, products: trending }
  },
})
```

- [ ] **Step 2: Verify compilation**

Run: `cd /Users/manan/Downloads/aistore_cursor/ai-store-builder && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors from the new file. Pre-existing errors are OK.

- [ ] **Step 3: Commit**

```bash
git add src/lib/agents/sub-agents/tools/shared/products.ts
git commit -m "feat(agents): add shared products tool module (4 tools)"
```

---

### Task 2: shared/orders.ts

**Files:**
- Create: `src/lib/agents/sub-agents/tools/shared/orders.ts`

- [ ] **Step 1: Create the orders shared tool module**

```typescript
// src/lib/agents/sub-agents/tools/shared/orders.ts
// Shared order query tools — used by 10+ sub-agents

import { tool } from 'ai'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

// ---------------------------------------------------------------------------
// get_orders — Query orders with flexible filters
// ---------------------------------------------------------------------------

export const get_orders = tool({
  description:
    'Query orders for a store with flexible filters. ' +
    'Supports filtering by status, payment status, customer email, and time period.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    status: z
      .enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned', 'all'])
      .optional()
      .describe('Filter by fulfillment status (default: all)'),
    payment_status: z
      .enum(['pending', 'paid', 'failed', 'refunded', 'all'])
      .optional()
      .describe('Filter by payment status (default: all)'),
    customer_email: z.string().optional().describe('Filter by customer email'),
    order_number: z.string().optional().describe('Look up by exact order number (e.g. "ORD-1234")'),
    days: z.number().optional().describe('Only orders from the last N days'),
    limit: z.number().optional().describe('Max orders to return (default: 50)'),
  }),
  execute: async ({ store_id, status, payment_status, customer_email, order_number, days, limit = 50 }) => {
    const supabase = getSupabaseAdmin()

    let query = supabase
      .from('orders')
      .select(
        `id, order_number, status, fulfillment_status, payment_status, payment_method,
         total_amount, currency, customer_email, customer_name,
         tracking_number, courier_name, estimated_delivery,
         created_at, updated_at,
         order_items(id, product_id, title, quantity, price, variant_title)`
      )
      .eq('store_id', store_id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status && status !== 'all') {
      query = query.eq('fulfillment_status', status)
    }
    if (payment_status && payment_status !== 'all') {
      query = query.eq('payment_status', payment_status)
    }
    if (customer_email) {
      query = query.eq('customer_email', customer_email)
    }
    if (order_number) {
      query = query.eq('order_number', order_number)
    }
    if (days) {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
      query = query.gte('created_at', since)
    }

    const { data, error } = await query

    if (error) {
      return { success: false, error: error.message, orders: [] }
    }

    return { success: true, count: data?.length ?? 0, orders: data ?? [] }
  },
})

// ---------------------------------------------------------------------------
// get_order_details — Full details for a single order
// ---------------------------------------------------------------------------

export const get_order_details = tool({
  description:
    'Get complete details for a single order by order_id or order_number. ' +
    'Returns items, payment info, shipping address, and tracking.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    order_id: z.string().optional().describe('The order UUID'),
    order_number: z.string().optional().describe('The order number (e.g. "ORD-1234")'),
  }),
  execute: async ({ store_id, order_id, order_number }) => {
    if (!order_id && !order_number) {
      return { success: false, error: 'Provide either order_id or order_number', order: null }
    }

    const supabase = getSupabaseAdmin()

    let query = supabase
      .from('orders')
      .select(
        `id, order_number, status, fulfillment_status, payment_status, payment_method,
         subtotal, total_amount, currency,
         customer_email, customer_name, customer_phone,
         shipping_address, billing_address,
         tracking_number, courier_name, estimated_delivery, shipped_at, delivered_at,
         notes, created_at, updated_at,
         order_items(id, product_id, title, quantity, price, variant_title)`
      )
      .eq('store_id', store_id)

    if (order_id) {
      query = query.eq('id', order_id)
    } else if (order_number) {
      query = query.eq('order_number', order_number)
    }

    const { data, error } = await query.single()

    if (error) {
      return { success: false, error: error.message, order: null }
    }

    return { success: true, order: data }
  },
})

// ---------------------------------------------------------------------------
// get_order_stats — Aggregated order metrics
// ---------------------------------------------------------------------------

export const get_order_stats = tool({
  description:
    'Get aggregated order metrics for a store over a time period. ' +
    'Returns total orders, revenue, AOV, status breakdown, and top-selling products.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    days: z.number().optional().describe('Period in days (default: 30)'),
  }),
  execute: async ({ store_id, days = 30 }) => {
    const supabase = getSupabaseAdmin()
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, total_amount, currency, payment_status, fulfillment_status, order_items(product_id, title, quantity, price)')
      .eq('store_id', store_id)
      .gte('created_at', since)

    if (error) {
      return { success: false, error: error.message, stats: null }
    }

    const allOrders = orders ?? []
    const paidOrders = allOrders.filter((o) => o.payment_status === 'paid')
    const totalRevenue = paidOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0)

    // Status breakdown
    const statusCounts: Record<string, number> = {}
    for (const o of allOrders) {
      const st = o.fulfillment_status || 'unknown'
      statusCounts[st] = (statusCounts[st] || 0) + 1
    }

    const paymentCounts: Record<string, number> = {}
    for (const o of allOrders) {
      const ps = o.payment_status || 'unknown'
      paymentCounts[ps] = (paymentCounts[ps] || 0) + 1
    }

    // Top products by units sold
    const productMap: Record<string, { title: string; units: number; revenue: number }> = {}
    for (const o of paidOrders) {
      const items = (o.order_items as Array<{ product_id: string; title: string; quantity: number; price: number }>) ?? []
      for (const item of items) {
        if (!item.product_id) continue
        if (!productMap[item.product_id]) {
          productMap[item.product_id] = { title: item.title, units: 0, revenue: 0 }
        }
        productMap[item.product_id].units += item.quantity || 1
        productMap[item.product_id].revenue += (item.price || 0) * (item.quantity || 1)
      }
    }

    const topProducts = Object.entries(productMap)
      .map(([id, s]) => ({ product_id: id, title: s.title, units_sold: s.units, revenue: Math.round(s.revenue * 100) / 100 }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    return {
      success: true,
      period_days: days,
      stats: {
        total_orders: allOrders.length,
        paid_orders: paidOrders.length,
        total_revenue: Math.round(totalRevenue * 100) / 100,
        avg_order_value: paidOrders.length > 0 ? Math.round((totalRevenue / paidOrders.length) * 100) / 100 : 0,
        currency: allOrders[0]?.currency ?? 'INR',
        by_fulfillment_status: statusCounts,
        by_payment_status: paymentCounts,
        top_products: topProducts,
      },
    }
  },
})

// ---------------------------------------------------------------------------
// get_revenue_summary — Revenue breakdown by period
// ---------------------------------------------------------------------------

export const get_revenue_summary = tool({
  description:
    'Get revenue breakdown grouped by day, week, or month. ' +
    'Useful for spotting trends, timing campaigns, and reporting.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    days: z.number().optional().describe('Look-back period in days (default: 30)'),
    group_by: z
      .enum(['day', 'week', 'month'])
      .optional()
      .describe('Group revenue by period (default: day)'),
  }),
  execute: async ({ store_id, days = 30, group_by = 'day' }) => {
    const supabase = getSupabaseAdmin()
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const { data: orders, error } = await supabase
      .from('orders')
      .select('total_amount, currency, payment_status, created_at')
      .eq('store_id', store_id)
      .eq('payment_status', 'paid')
      .gte('created_at', since)
      .order('created_at', { ascending: true })

    if (error) {
      return { success: false, error: error.message, summary: [] }
    }

    // Group orders by period
    const buckets: Record<string, { revenue: number; order_count: number }> = {}

    for (const o of orders ?? []) {
      const date = new Date(o.created_at)
      let key: string

      switch (group_by) {
        case 'week': {
          const weekStart = new Date(date)
          weekStart.setDate(date.getDate() - date.getDay())
          key = weekStart.toISOString().split('T')[0]
          break
        }
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          break
        default:
          key = date.toISOString().split('T')[0]
      }

      if (!buckets[key]) buckets[key] = { revenue: 0, order_count: 0 }
      buckets[key].revenue += Number(o.total_amount) || 0
      buckets[key].order_count++
    }

    const summary = Object.entries(buckets)
      .map(([period, stats]) => ({
        period,
        revenue: Math.round(stats.revenue * 100) / 100,
        order_count: stats.order_count,
        avg_order_value: stats.order_count > 0 ? Math.round((stats.revenue / stats.order_count) * 100) / 100 : 0,
      }))
      .sort((a, b) => a.period.localeCompare(b.period))

    return {
      success: true,
      period_days: days,
      group_by,
      currency: (orders ?? [])[0]?.currency ?? 'INR',
      summary,
    }
  },
})
```

- [ ] **Step 2: Verify compilation**

Run: `cd /Users/manan/Downloads/aistore_cursor/ai-store-builder && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No new errors from the file.

- [ ] **Step 3: Commit**

```bash
git add src/lib/agents/sub-agents/tools/shared/orders.ts
git commit -m "feat(agents): add shared orders tool module (4 tools)"
```

---

### Task 3: shared/customers.ts

**Files:**
- Create: `src/lib/agents/sub-agents/tools/shared/customers.ts`

- [ ] **Step 1: Create the customers shared tool module**

```typescript
// src/lib/agents/sub-agents/tools/shared/customers.ts
// Shared customer query tools — used by 8+ sub-agents

import { tool } from 'ai'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

// ---------------------------------------------------------------------------
// get_customers — List customers with segment filters
// ---------------------------------------------------------------------------

export const get_customers = tool({
  description:
    'Query customers for a store with RFM-style segment filters. ' +
    'Supports filtering by activity segment, minimum orders, and spend.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    segment: z
      .enum(['active', 'at_risk', 'churned', 'new', 'all'])
      .optional()
      .describe('Customer segment: active (<30d), at_risk (30-90d), churned (>90d), new (<1 order), all (default: all)'),
    min_orders: z.number().optional().describe('Minimum total orders'),
    min_spent: z.number().optional().describe('Minimum total spent'),
    limit: z.number().optional().describe('Max customers to return (default: 100)'),
  }),
  execute: async ({ store_id, segment = 'all', min_orders, min_spent, limit = 100 }) => {
    const supabase = getSupabaseAdmin()

    let query = supabase
      .from('customers')
      .select('id, name, email, total_orders, total_spent, last_order_at, created_at')
      .eq('store_id', store_id)
      .order('total_spent', { ascending: false })
      .limit(limit)

    if (min_orders) {
      query = query.gte('total_orders', min_orders)
    }
    if (min_spent) {
      query = query.gte('total_spent', min_spent)
    }

    // Segment filters based on last_order_at
    const now = new Date()
    if (segment === 'active') {
      const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
      query = query.gte('last_order_at', cutoff)
    } else if (segment === 'at_risk') {
      const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()
      const end = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
      query = query.gte('last_order_at', start).lt('last_order_at', end)
    } else if (segment === 'churned') {
      const cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()
      query = query.lt('last_order_at', cutoff).gte('total_orders', 1)
    } else if (segment === 'new') {
      query = query.lt('total_orders', 1)
    }

    const { data, error } = await query

    if (error) {
      return { success: false, error: error.message, customers: [] }
    }

    return { success: true, count: data?.length ?? 0, customers: data ?? [] }
  },
})

// ---------------------------------------------------------------------------
// get_customer_history — Full history for a single customer
// ---------------------------------------------------------------------------

export const get_customer_history = tool({
  description:
    'Get complete purchase history for a customer by customer_id or email. ' +
    'Returns customer profile, all orders, and computed metrics.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    customer_id: z.string().optional().describe('Customer UUID'),
    customer_email: z.string().optional().describe('Customer email address'),
  }),
  execute: async ({ store_id, customer_id, customer_email }) => {
    if (!customer_id && !customer_email) {
      return { success: false, error: 'Provide either customer_id or customer_email', customer: null }
    }

    const supabase = getSupabaseAdmin()

    // Find the customer
    let customerQuery = supabase
      .from('customers')
      .select('id, name, email, phone, total_orders, total_spent, last_order_at, created_at')
      .eq('store_id', store_id)

    if (customer_id) {
      customerQuery = customerQuery.eq('id', customer_id)
    } else if (customer_email) {
      customerQuery = customerQuery.eq('email', customer_email)
    }

    const { data: customer, error: customerError } = await customerQuery.single()

    if (customerError) {
      return { success: false, error: customerError.message, customer: null }
    }

    // Fetch their orders
    const { data: orders } = await supabase
      .from('orders')
      .select(
        `id, order_number, total_amount, currency, payment_status, fulfillment_status,
         created_at, order_items(title, quantity, price)`
      )
      .eq('store_id', store_id)
      .eq('customer_email', customer?.email)
      .order('created_at', { ascending: false })
      .limit(50)

    const orderList = orders ?? []
    const paidOrders = orderList.filter((o) => o.payment_status === 'paid')

    return {
      success: true,
      customer,
      orders: orderList,
      metrics: {
        total_orders: orderList.length,
        paid_orders: paidOrders.length,
        total_spent: paidOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0),
        avg_order_value:
          paidOrders.length > 0
            ? Math.round(
                (paidOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0) / paidOrders.length) * 100
              ) / 100
            : 0,
        first_order_at: orderList.length > 0 ? orderList[orderList.length - 1].created_at : null,
        last_order_at: orderList.length > 0 ? orderList[0].created_at : null,
      },
    }
  },
})

// ---------------------------------------------------------------------------
// get_customer_segments — Aggregate segment breakdown
// ---------------------------------------------------------------------------

export const get_customer_segments = tool({
  description:
    'Get aggregate customer segment breakdown with counts and average metrics. ' +
    'Segments: active (<30d), at_risk (30-90d), churned (>90d), new (0 orders).',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
  }),
  execute: async ({ store_id }) => {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('customers')
      .select('id, total_orders, total_spent, last_order_at')
      .eq('store_id', store_id)

    if (error) {
      return { success: false, error: error.message, segments: [] }
    }

    const now = Date.now()
    const day30 = 30 * 24 * 60 * 60 * 1000
    const day90 = 90 * 24 * 60 * 60 * 1000

    const segments = {
      active: { count: 0, total_spent: 0, total_orders: 0 },
      at_risk: { count: 0, total_spent: 0, total_orders: 0 },
      churned: { count: 0, total_spent: 0, total_orders: 0 },
      new: { count: 0, total_spent: 0, total_orders: 0 },
    }

    for (const c of data ?? []) {
      const orders = c.total_orders || 0
      const spent = c.total_spent || 0

      if (orders === 0) {
        segments.new.count++
        segments.new.total_spent += spent
        segments.new.total_orders += orders
      } else {
        const lastOrder = c.last_order_at ? now - new Date(c.last_order_at).getTime() : Infinity
        if (lastOrder <= day30) {
          segments.active.count++
          segments.active.total_spent += spent
          segments.active.total_orders += orders
        } else if (lastOrder <= day90) {
          segments.at_risk.count++
          segments.at_risk.total_spent += spent
          segments.at_risk.total_orders += orders
        } else {
          segments.churned.count++
          segments.churned.total_spent += spent
          segments.churned.total_orders += orders
        }
      }
    }

    const result = Object.entries(segments).map(([name, s]) => ({
      segment: name,
      count: s.count,
      avg_spent: s.count > 0 ? Math.round((s.total_spent / s.count) * 100) / 100 : 0,
      avg_orders: s.count > 0 ? Math.round((s.total_orders / s.count) * 10) / 10 : 0,
    }))

    return {
      success: true,
      total_customers: (data ?? []).length,
      segments: result,
    }
  },
})
```

- [ ] **Step 2: Verify compilation**

Run: `cd /Users/manan/Downloads/aistore_cursor/ai-store-builder && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add src/lib/agents/sub-agents/tools/shared/customers.ts
git commit -m "feat(agents): add shared customers tool module (3 tools)"
```

---

### Task 4: shared/store.ts

**Files:**
- Create: `src/lib/agents/sub-agents/tools/shared/store.ts`

- [ ] **Step 1: Create the store shared tool module**

```typescript
// src/lib/agents/sub-agents/tools/shared/store.ts
// Shared store config/policy query tools — used by 8+ sub-agents

import { tool } from 'ai'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

// ---------------------------------------------------------------------------
// get_store_config — Core store settings
// ---------------------------------------------------------------------------

export const get_store_config = tool({
  description:
    'Get core store configuration — name, currency, category, payment methods enabled, checkout settings.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
  }),
  execute: async ({ store_id }) => {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('stores')
      .select('id, name, slug, currency, category, description, blueprint, notification_settings')
      .eq('id', store_id)
      .single()

    if (error) {
      return { success: false, error: error.message, config: null }
    }

    const blueprint = (data?.blueprint as Record<string, unknown>) ?? {}

    return {
      success: true,
      config: {
        id: data.id,
        name: data.name,
        slug: data.slug,
        currency: data.currency,
        category: data.category,
        description: data.description,
        notification_settings: data.notification_settings,
        checkout: blueprint.checkout ?? null,
      },
    }
  },
})

// ---------------------------------------------------------------------------
// get_store_policies — Return, shipping, privacy policies
// ---------------------------------------------------------------------------

export const get_store_policies = tool({
  description:
    'Retrieve store policies including return policy, shipping policy, privacy policy, and terms. ' +
    'Use this to answer customer questions about returns, shipping, and policies.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
  }),
  execute: async ({ store_id }) => {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('stores')
      .select('name, policies, blueprint')
      .eq('id', store_id)
      .single()

    if (error) {
      return { success: false, error: error.message, policies: null }
    }

    return {
      success: true,
      store_name: data?.name,
      policies: data?.policies ?? {},
      shipping_info: (data?.blueprint as Record<string, unknown>)?.shipping ?? null,
    }
  },
})

// ---------------------------------------------------------------------------
// get_brand_guidelines — Brand vibe, colors, logo
// ---------------------------------------------------------------------------

export const get_brand_guidelines = tool({
  description:
    'Get brand guidelines — vibe, primary/secondary colors, logo URL, description, and category. ' +
    'Use this to ensure content matches the store brand.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
  }),
  execute: async ({ store_id }) => {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('stores')
      .select('name, category, description, logo_url, blueprint')
      .eq('id', store_id)
      .single()

    if (error) {
      return { success: false, error: error.message, brand: null }
    }

    const blueprint = (data?.blueprint as Record<string, unknown>) ?? {}
    const design = (blueprint.design as Record<string, unknown>) ?? {}

    return {
      success: true,
      brand: {
        store_name: data.name,
        category: data.category,
        description: data.description,
        logo_url: data.logo_url,
        brand_vibe: (design.vibe as string) ?? 'modern',
        primary_color: (design.primaryColor as string) ?? '#000000',
        secondary_color: (design.secondaryColor as string) ?? null,
        font: (design.font as string) ?? null,
      },
    }
  },
})

// ---------------------------------------------------------------------------
// get_shipping_config — Configured shipping providers
// ---------------------------------------------------------------------------

export const get_shipping_config = tool({
  description:
    'Get configured shipping providers and methods for a store. ' +
    'Returns which providers are active and what options are available.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
  }),
  execute: async ({ store_id }) => {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('stores')
      .select('name, shipping_providers, blueprint')
      .eq('id', store_id)
      .single()

    if (error) {
      return { success: false, error: error.message, providers: [] }
    }

    const providers = (data?.shipping_providers as Array<Record<string, unknown>>) ?? []
    const blueprint = (data?.blueprint as Record<string, unknown>) ?? {}
    const shippingConfig = (blueprint.shipping as Record<string, unknown>) ?? {}

    const formattedProviders = providers.map((p) => ({
      type: p.type,
      name: p.name || p.type,
      is_configured: !!(p.credentials || p.is_configured),
      is_default: p.is_default ?? false,
    }))

    return {
      success: true,
      store_name: data?.name,
      providers: formattedProviders,
      shipping_settings: shippingConfig,
      has_any_provider: formattedProviders.some((p) => p.is_configured),
    }
  },
})
```

- [ ] **Step 2: Verify compilation**

Run: `cd /Users/manan/Downloads/aistore_cursor/ai-store-builder && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add src/lib/agents/sub-agents/tools/shared/store.ts
git commit -m "feat(agents): add shared store config tool module (4 tools)"
```

---

### Task 5: shared/coupons.ts

**Files:**
- Create: `src/lib/agents/sub-agents/tools/shared/coupons.ts`

- [ ] **Step 1: Create the coupons shared tool module**

```typescript
// src/lib/agents/sub-agents/tools/shared/coupons.ts
// Shared coupon query tools — used by deal-engineer, chat-responder, cart-whisperer

import { tool } from 'ai'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

// ---------------------------------------------------------------------------
// get_coupons — List coupons with status
// ---------------------------------------------------------------------------

export const get_coupons = tool({
  description:
    'List coupons for a store with optional active-only filter. ' +
    'Returns coupon details including usage counts and expiry.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    active_only: z.boolean().optional().describe('Only return active coupons (default: true)'),
    limit: z.number().optional().describe('Max coupons to return (default: 50)'),
  }),
  execute: async ({ store_id, active_only = true, limit = 50 }) => {
    const supabase = getSupabaseAdmin()

    let query = supabase
      .from('coupons')
      .select(
        'id, code, discount_type, discount_value, min_order_amount, max_uses, uses_count, is_active, expires_at, created_at'
      )
      .eq('store_id', store_id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (active_only) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      return { success: false, error: error.message, coupons: [] }
    }

    return { success: true, count: data?.length ?? 0, coupons: data ?? [] }
  },
})

// ---------------------------------------------------------------------------
// get_coupon_performance — Usage stats and revenue impact
// ---------------------------------------------------------------------------

export const get_coupon_performance = tool({
  description:
    'Get performance metrics for coupons — usage rates, revenue impact, and conversion data. ' +
    'Analyzes orders that used each coupon code.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    coupon_id: z.string().optional().describe('Filter to a specific coupon'),
    days: z.number().optional().describe('Analysis period in days (default: 30)'),
  }),
  execute: async ({ store_id, coupon_id, days = 30 }) => {
    const supabase = getSupabaseAdmin()
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    // Get coupons
    let couponQuery = supabase
      .from('coupons')
      .select('id, code, discount_type, discount_value, max_uses, uses_count, is_active, created_at')
      .eq('store_id', store_id)

    if (coupon_id) {
      couponQuery = couponQuery.eq('id', coupon_id)
    }

    const { data: coupons, error } = await couponQuery

    if (error) {
      return { success: false, error: error.message, coupons: [] }
    }

    // Get orders with coupon codes in the period
    const { data: orders } = await supabase
      .from('orders')
      .select('id, total_amount, payment_status, coupon_code, created_at')
      .eq('store_id', store_id)
      .gte('created_at', since)
      .not('coupon_code', 'is', null)

    // Map coupon usage
    const couponOrders: Record<string, { order_count: number; paid_count: number; total_revenue: number }> = {}
    for (const o of orders ?? []) {
      const code = (o.coupon_code as string)?.toUpperCase()
      if (!code) continue
      if (!couponOrders[code]) couponOrders[code] = { order_count: 0, paid_count: 0, total_revenue: 0 }
      couponOrders[code].order_count++
      if (o.payment_status === 'paid') {
        couponOrders[code].paid_count++
        couponOrders[code].total_revenue += Number(o.total_amount) || 0
      }
    }

    const performance = (coupons ?? []).map((c) => {
      const usage = couponOrders[c.code?.toUpperCase()] ?? { order_count: 0, paid_count: 0, total_revenue: 0 }
      return {
        coupon_id: c.id,
        code: c.code,
        discount_type: c.discount_type,
        discount_value: c.discount_value,
        is_active: c.is_active,
        max_uses: c.max_uses,
        total_uses: c.uses_count ?? 0,
        period_orders: usage.order_count,
        period_paid_orders: usage.paid_count,
        period_revenue: Math.round(usage.total_revenue * 100) / 100,
        utilization_pct: c.max_uses ? Math.round(((c.uses_count ?? 0) / c.max_uses) * 100) : null,
      }
    })

    return { success: true, period_days: days, count: performance.length, coupons: performance }
  },
})

// ---------------------------------------------------------------------------
// deactivate_coupon — Set is_active=false
// ---------------------------------------------------------------------------

export const deactivate_coupon = tool({
  description:
    'Deactivate a coupon by setting is_active to false. Use to clean up expired or underperforming promotions.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    coupon_id: z.string().describe('The coupon UUID to deactivate'),
  }),
  execute: async ({ store_id, coupon_id }) => {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('coupons')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', coupon_id)
      .eq('store_id', store_id)
      .select('id, code, is_active')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, coupon: data, message: `Coupon ${data?.code} deactivated` }
  },
})
```

- [ ] **Step 2: Verify compilation**

Run: `cd /Users/manan/Downloads/aistore_cursor/ai-store-builder && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add src/lib/agents/sub-agents/tools/shared/coupons.ts
git commit -m "feat(agents): add shared coupons tool module (3 tools)"
```

---

### Task 6: shared/reviews.ts + shared/analytics.ts

**Files:**
- Create: `src/lib/agents/sub-agents/tools/shared/reviews.ts`
- Create: `src/lib/agents/sub-agents/tools/shared/analytics.ts`

- [ ] **Step 1: Create the reviews shared tool module**

```typescript
// src/lib/agents/sub-agents/tools/shared/reviews.ts
// Shared review query tools — used by review-curator, copysmith, escalation-detector, report-writer

import { tool } from 'ai'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

// ---------------------------------------------------------------------------
// get_reviews — Query reviews with filters
// ---------------------------------------------------------------------------

export const get_reviews = tool({
  description:
    'Query product reviews for a store with filters for rating, product, and response status.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    product_id: z.string().optional().describe('Filter to a specific product'),
    min_rating: z.number().min(1).max(5).optional().describe('Minimum star rating (default: 1)'),
    max_rating: z.number().min(1).max(5).optional().describe('Maximum star rating (default: 5)'),
    unanswered_only: z.boolean().optional().describe('Only reviews without merchant reply (default: false)'),
    limit: z.number().optional().describe('Max reviews to return (default: 50)'),
  }),
  execute: async ({ store_id, product_id, min_rating = 1, max_rating = 5, unanswered_only = false, limit = 50 }) => {
    const supabase = getSupabaseAdmin()

    let query = supabase
      .from('product_reviews')
      .select(
        `id, product_id, customer_name, rating, title, body, merchant_reply, merchant_reply_at,
         created_at, products(title)`
      )
      .eq('store_id', store_id)
      .gte('rating', min_rating)
      .lte('rating', max_rating)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (product_id) {
      query = query.eq('product_id', product_id)
    }
    if (unanswered_only) {
      query = query.is('merchant_reply', null)
    }

    const { data, error } = await query

    if (error) {
      return { success: false, error: error.message, reviews: [] }
    }

    return { success: true, count: data?.length ?? 0, reviews: data ?? [] }
  },
})

// ---------------------------------------------------------------------------
// get_review_stats — Aggregate review metrics
// ---------------------------------------------------------------------------

export const get_review_stats = tool({
  description:
    'Get aggregate review metrics — total reviews, average rating, rating distribution, and response rate.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    product_id: z.string().optional().describe('Filter to a specific product'),
  }),
  execute: async ({ store_id, product_id }) => {
    const supabase = getSupabaseAdmin()

    let query = supabase
      .from('product_reviews')
      .select('rating, merchant_reply')
      .eq('store_id', store_id)

    if (product_id) {
      query = query.eq('product_id', product_id)
    }

    const { data, error } = await query

    if (error) {
      return { success: false, error: error.message, stats: null }
    }

    const reviews = data ?? []
    const total = reviews.length
    if (total === 0) {
      return {
        success: true,
        stats: {
          total_reviews: 0, avg_rating: null, rating_distribution: {}, response_rate: 0,
        },
      }
    }

    const avgRating = Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / total) * 10) / 10
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    let responded = 0
    for (const r of reviews) {
      distribution[r.rating] = (distribution[r.rating] || 0) + 1
      if (r.merchant_reply) responded++
    }

    return {
      success: true,
      stats: {
        total_reviews: total,
        avg_rating: avgRating,
        rating_distribution: distribution,
        response_rate: Math.round((responded / total) * 100),
        unanswered: total - responded,
      },
    }
  },
})
```

- [ ] **Step 2: Create the analytics shared tool module**

```typescript
// src/lib/agents/sub-agents/tools/shared/analytics.ts
// Shared analytics query tools — used by checkout-doctor, cart-whisperer, report-writer

import { tool } from 'ai'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

// ---------------------------------------------------------------------------
// get_funnel_data — Enhanced checkout funnel
// ---------------------------------------------------------------------------

export const get_funnel_data = tool({
  description:
    'Get checkout funnel data with granular stages — carts, abandonments, payments, completions. ' +
    'More detailed than basic checkout funnel — includes payment failure breakdown.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    days: z.number().optional().describe('Period in days (default: 30)'),
  }),
  execute: async ({ store_id, days = 30 }) => {
    const supabase = getSupabaseAdmin()
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const [cartsResult, ordersResult] = await Promise.all([
      supabase
        .from('abandoned_carts')
        .select('id, recovery_status', { count: 'exact' })
        .eq('store_id', store_id)
        .gte('created_at', since),
      supabase
        .from('orders')
        .select('id, payment_status, fulfillment_status')
        .eq('store_id', store_id)
        .gte('created_at', since),
    ])

    const abandonedCount = cartsResult.count ?? 0
    const orders = ordersResult.data ?? []
    const orderCount = orders.length
    const paid = orders.filter((o) => o.payment_status === 'paid').length
    const failed = orders.filter((o) => o.payment_status === 'failed').length
    const pending = orders.filter((o) => o.payment_status === 'pending').length
    const totalFunnel = abandonedCount + orderCount

    // Recovery stats from abandoned carts
    const recovered = (cartsResult.data ?? []).filter((c) => c.recovery_status === 'recovered').length

    return {
      success: true,
      period_days: days,
      funnel: {
        total_carts: totalFunnel,
        abandoned: abandonedCount,
        recovered,
        checkout_completed: orderCount,
        payments_successful: paid,
        payments_failed: failed,
        payments_pending: pending,
        cart_to_checkout_rate: totalFunnel > 0 ? Math.round((orderCount / totalFunnel) * 10000) / 100 : 0,
        checkout_to_payment_rate: orderCount > 0 ? Math.round((paid / orderCount) * 10000) / 100 : 0,
        overall_conversion_rate: totalFunnel > 0 ? Math.round((paid / totalFunnel) * 10000) / 100 : 0,
        recovery_rate: abandonedCount > 0 ? Math.round((recovered / abandonedCount) * 10000) / 100 : 0,
      },
    }
  },
})

// ---------------------------------------------------------------------------
// get_payment_failures — Failed payment analysis
// ---------------------------------------------------------------------------

export const get_payment_failures = tool({
  description:
    'Analyze orders with failed payments. Groups by payment method and failure patterns.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    days: z.number().optional().describe('Period in days (default: 30)'),
  }),
  execute: async ({ store_id, days = 30 }) => {
    const supabase = getSupabaseAdmin()
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('orders')
      .select('id, order_number, payment_status, payment_method, total_amount, currency, notes, created_at')
      .eq('store_id', store_id)
      .eq('payment_status', 'failed')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      return { success: false, error: error.message, failures: [] }
    }

    const failedOrders = data ?? []

    // Group by payment method
    const byMethod: Record<string, number> = {}
    for (const o of failedOrders) {
      const method = (o.payment_method as string) || 'unknown'
      byMethod[method] = (byMethod[method] || 0) + 1
    }

    const totalLostRevenue = failedOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0)

    return {
      success: true,
      period_days: days,
      total_failures: failedOrders.length,
      lost_revenue: Math.round(totalLostRevenue * 100) / 100,
      currency: failedOrders[0]?.currency ?? 'INR',
      by_payment_method: byMethod,
      recent_failures: failedOrders.slice(0, 10).map((o) => ({
        order_number: o.order_number,
        amount: o.total_amount,
        payment_method: o.payment_method,
        notes: o.notes,
        created_at: o.created_at,
      })),
    }
  },
})

// ---------------------------------------------------------------------------
// get_recovery_stats — Cart recovery performance
// ---------------------------------------------------------------------------

export const get_recovery_stats = tool({
  description:
    'Get cart recovery performance — total abandoned, recovered, and recovery rate by email sequence step.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    days: z.number().optional().describe('Period in days (default: 30)'),
  }),
  execute: async ({ store_id, days = 30 }) => {
    const supabase = getSupabaseAdmin()
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('abandoned_carts')
      .select('id, recovery_status, emails_sent, subtotal')
      .eq('store_id', store_id)
      .gte('created_at', since)

    if (error) {
      return { success: false, error: error.message, stats: null }
    }

    const carts = data ?? []
    const total = carts.length
    const recovered = carts.filter((c) => c.recovery_status === 'recovered').length
    const totalValue = carts.reduce((sum, c) => sum + (Number(c.subtotal) || 0), 0)
    const recoveredValue = carts
      .filter((c) => c.recovery_status === 'recovered')
      .reduce((sum, c) => sum + (Number(c.subtotal) || 0), 0)

    // Breakdown by emails_sent stage
    const byStep: Record<string, { total: number; recovered: number }> = {}
    for (const c of carts) {
      const step = String(c.emails_sent ?? 0)
      if (!byStep[step]) byStep[step] = { total: 0, recovered: 0 }
      byStep[step].total++
      if (c.recovery_status === 'recovered') byStep[step].recovered++
    }

    return {
      success: true,
      period_days: days,
      stats: {
        total_abandoned: total,
        recovered,
        recovery_rate: total > 0 ? Math.round((recovered / total) * 10000) / 100 : 0,
        total_abandoned_value: Math.round(totalValue * 100) / 100,
        recovered_value: Math.round(recoveredValue * 100) / 100,
        by_email_step: Object.entries(byStep).map(([step, s]) => ({
          emails_sent: Number(step),
          total: s.total,
          recovered: s.recovered,
          recovery_rate: s.total > 0 ? Math.round((s.recovered / s.total) * 10000) / 100 : 0,
        })),
      },
    }
  },
})
```

- [ ] **Step 3: Verify compilation**

Run: `cd /Users/manan/Downloads/aistore_cursor/ai-store-builder && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 4: Commit**

```bash
git add src/lib/agents/sub-agents/tools/shared/reviews.ts src/lib/agents/sub-agents/tools/shared/analytics.ts
git commit -m "feat(agents): add shared reviews (2 tools) and analytics (3 tools) modules"
```

---

### Task 7: shared/index.ts — Barrel export

**Files:**
- Create: `src/lib/agents/sub-agents/tools/shared/index.ts`

- [ ] **Step 1: Create barrel export**

```typescript
// src/lib/agents/sub-agents/tools/shared/index.ts
// Barrel export for all shared tools

export { get_products, get_product_details, get_product_categories, get_trending_products } from './products'
export { get_orders, get_order_details, get_order_stats, get_revenue_summary } from './orders'
export { get_customers, get_customer_history, get_customer_segments } from './customers'
export { get_store_config, get_store_policies, get_brand_guidelines, get_shipping_config } from './store'
export { get_coupons, get_coupon_performance, deactivate_coupon } from './coupons'
export { get_reviews, get_review_stats } from './reviews'
export { get_funnel_data, get_payment_failures, get_recovery_stats } from './analytics'
```

- [ ] **Step 2: Verify compilation**

Run: `cd /Users/manan/Downloads/aistore_cursor/ai-store-builder && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add src/lib/agents/sub-agents/tools/shared/index.ts
git commit -m "feat(agents): add shared tools barrel export"
```

---

## Phase 2: Wire Shared Tools into Top 5 Agents (Tasks 8-12)

These are the highest-impact agents. Each task modifies one registry file to merge shared tools into the agent's `tools` object.

### Task 8: Wire reel-director (llm-only → llm-api)

**Files:**
- Modify: `src/lib/agents/sub-agents/registry/prism.ts`

- [ ] **Step 1: Add shared tool imports to prism.ts**

At the top of `src/lib/agents/sub-agents/registry/prism.ts`, add after the existing imports:

```typescript
import { get_trending_products, get_product_details, get_brand_guidelines } from '../tools/shared'
```

- [ ] **Step 2: Update reel-director definition**

In the `reel-director` object in `PRISM_SUB_AGENTS`, change:
- `category: 'llm-only'` → `category: 'llm-api'`
- Add `tools` property:

```typescript
    category: 'llm-api',
    tools: {
      get_trending_products,
      get_product_details,
      get_brand_guidelines,
    },
```

- [ ] **Step 3: Verify compilation**

Run: `cd /Users/manan/Downloads/aistore_cursor/ai-store-builder && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 4: Commit**

```bash
git add src/lib/agents/sub-agents/registry/prism.ts
git commit -m "feat(agents): upgrade reel-director from llm-only to llm-api with 3 shared tools"
```

---

### Task 9: Wire checkout-doctor (1 tool → 4 tools)

**Files:**
- Modify: `src/lib/agents/sub-agents/registry/forge.ts`

- [ ] **Step 1: Add shared tool imports to forge.ts**

At the top of `src/lib/agents/sub-agents/registry/forge.ts`, add after the existing imports:

```typescript
import {
  get_funnel_data, get_payment_failures,
  get_shipping_config, get_store_config,
  get_order_stats, get_revenue_summary, get_coupon_performance,
  get_customer_segments, get_customer_history,
  get_product_details, get_coupons,
  get_trending_products, get_products,
  deactivate_coupon,
  get_recovery_stats,
} from '../tools/shared'
```

- [ ] **Step 2: Update checkout-doctor tools**

In the `checkout-doctor` object, replace the tools property:

```typescript
    tools: {
      ...CHECKOUT_DOCTOR_TOOLS,
      get_funnel_data,
      get_payment_failures,
      get_shipping_config,
      get_store_config,
    },
```

- [ ] **Step 3: Verify compilation**

Run: `cd /Users/manan/Downloads/aistore_cursor/ai-store-builder && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 4: Commit**

```bash
git add src/lib/agents/sub-agents/registry/forge.ts
git commit -m "feat(agents): wire checkout-doctor with 4 shared tools (funnel, payments, shipping, config)"
```

---

### Task 10: Wire cart-whisperer + deal-engineer + remaining FORGE agents

**Files:**
- Modify: `src/lib/agents/sub-agents/registry/forge.ts`

- [ ] **Step 1: Update cart-whisperer tools**

In the `cart-whisperer` object, merge shared tools:

```typescript
    tools: {
      ...CART_WHISPERER_TOOLS,
      get_product_details,
      get_recovery_stats,
      get_customer_history,
      get_coupons,
    },
```

- [ ] **Step 2: Update deal-engineer tools**

In the `deal-engineer` object:

```typescript
    tools: {
      ...DEAL_ENGINEER_TOOLS,
      get_coupon_performance,
      deactivate_coupon,
      get_revenue_summary,
      get_order_stats,
      get_trending_products,
    },
```

- [ ] **Step 3: Update price-strategist tools**

```typescript
    tools: {
      ...PRICE_STRATEGIST_TOOLS,
      get_order_stats,
      get_revenue_summary,
      get_coupon_performance,
    },
```

- [ ] **Step 4: Update upsell-agent tools**

```typescript
    tools: {
      ...UPSELL_AGENT_TOOLS,
      get_order_stats,
      get_customer_segments,
    },
```

- [ ] **Step 5: Update loyalty-architect tools**

```typescript
    tools: {
      ...LOYALTY_ARCHITECT_TOOLS,
      get_customer_segments,
    },
```

- [ ] **Step 6: Update lead-scorer tools**

```typescript
    tools: {
      ...LEAD_SCORER_TOOLS,
      get_customer_history,
      get_products,
    },
```

- [ ] **Step 7: Verify compilation**

Run: `cd /Users/manan/Downloads/aistore_cursor/ai-store-builder && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 8: Commit**

```bash
git add src/lib/agents/sub-agents/registry/forge.ts
git commit -m "feat(agents): wire all FORGE agents with shared tools"
```

---

### Task 11: Wire all SENTINEL agents

**Files:**
- Modify: `src/lib/agents/sub-agents/registry/sentinel.ts`

- [ ] **Step 1: Add shared tool imports to sentinel.ts**

At the top, add after existing imports:

```typescript
import {
  get_coupons, get_shipping_config, get_customer_history,
  get_store_policies as shared_get_store_policies,
  get_orders, get_order_details as shared_get_order_details,
  get_reviews, get_review_stats,
  get_payment_failures, get_products,
  get_store_config,
} from '../tools/shared'
```

- [ ] **Step 2: Update chat-responder tools**

```typescript
    tools: {
      ...CHAT_RESPONDER_TOOLS,
      get_coupons,
      get_shipping_config,
      get_customer_history,
    },
```

- [ ] **Step 3: Update email-handler tools**

```typescript
    tools: {
      ...EMAIL_HANDLER_TOOLS,
      get_customer_history,
      get_orders,
      shared_get_store_policies,
    },
```

- [ ] **Step 4: Update escalation-detector tools**

```typescript
    tools: {
      ...ESCALATION_DETECTOR_TOOLS,
      get_customer_history,
      get_orders,
      get_review_stats,
      get_payment_failures,
    },
```

- [ ] **Step 5: Update faq-builder tools**

```typescript
    tools: {
      ...FAQ_BUILDER_TOOLS,
      shared_get_store_policies,
      get_products,
      get_shipping_config,
      get_store_config,
    },
```

- [ ] **Step 6: Verify compilation**

Run: `cd /Users/manan/Downloads/aistore_cursor/ai-store-builder && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 7: Commit**

```bash
git add src/lib/agents/sub-agents/registry/sentinel.ts
git commit -m "feat(agents): wire all SENTINEL agents with shared tools"
```

---

### Task 12: Wire remaining PRISM + PULSE agents

**Files:**
- Modify: `src/lib/agents/sub-agents/registry/prism.ts`
- Modify: `src/lib/agents/sub-agents/registry/pulse.ts`

- [ ] **Step 1: Update prism.ts shared imports**

Expand the existing shared import at the top of prism.ts to include all needed tools:

```typescript
import {
  get_trending_products, get_product_details, get_brand_guidelines,
  get_customer_segments, get_revenue_summary, get_product_categories,
  get_review_stats, get_products,
} from '../tools/shared'
```

- [ ] **Step 2: Update campaign-architect tools**

```typescript
    tools: {
      ...CAMPAIGN_ARCHITECT_TOOLS,
      get_customer_segments,
      get_revenue_summary,
      get_product_categories,
    },
```

- [ ] **Step 3: Update copysmith tools**

```typescript
    tools: {
      ...COPYSMITH_TOOLS,
      get_product_details,
      get_brand_guidelines,
      get_review_stats,
    },
```

- [ ] **Step 4: Update seo-scout tools**

```typescript
    tools: {
      ...SEO_SCOUT_TOOLS,
      get_products,
      get_product_categories,
    },
```

- [ ] **Step 5: Update influencer-finder tools**

```typescript
    tools: {
      ...INFLUENCER_FINDER_TOOLS,
      get_trending_products,
    },
```

- [ ] **Step 6: Add shared imports to pulse.ts**

At the top of `src/lib/agents/sub-agents/registry/pulse.ts`, add:

```typescript
import {
  get_products, get_revenue_summary,
  get_customer_segments, get_funnel_data,
  get_review_stats, get_recovery_stats, get_order_stats,
} from '../tools/shared'
```

- [ ] **Step 7: Update competitor-watcher tools**

```typescript
    tools: {
      ...COMPETITOR_WATCHER_TOOLS,
      get_products,
      get_revenue_summary,
    },
```

- [ ] **Step 8: Update report-writer tools**

```typescript
    tools: {
      ...REPORT_WRITER_TOOLS,
      get_revenue_summary,
      get_customer_segments,
      get_funnel_data,
      get_review_stats,
      get_recovery_stats,
      get_order_stats,
    },
```

- [ ] **Step 9: Verify compilation**

Run: `cd /Users/manan/Downloads/aistore_cursor/ai-store-builder && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 10: Commit**

```bash
git add src/lib/agents/sub-agents/registry/prism.ts src/lib/agents/sub-agents/registry/pulse.ts
git commit -m "feat(agents): wire remaining PRISM and PULSE agents with shared tools"
```

---

## Phase 3: Cleanup Duplicates (Task 13)

### Task 13: Remove duplicate tool definitions

**Files:**
- Modify: `src/lib/agents/sub-agents/tools/new-agent-tools.ts`
- Modify: `src/lib/agents/sub-agents/tools/sentinel-tools.ts`
- Modify: `src/lib/agents/sub-agents/tools/forge-tools.ts`

Now that shared tools are wired, the old duplicate tools can be removed. This is done carefully — only remove tools that are fully replaced by shared versions.

- [ ] **Step 1: Remove `get_active_coupons` from new-agent-tools.ts**

Remove the `get_active_coupons` tool definition (lines ~58-78) and update the `DEAL_ENGINEER_TOOLS` export:

```typescript
// Before:
export const DEAL_ENGINEER_TOOLS = { create_coupon, get_active_coupons }

// After:
export const DEAL_ENGINEER_TOOLS = { create_coupon }
```

- [ ] **Step 2: Remove `get_trending_products` from new-agent-tools.ts**

Remove the `get_trending_products` tool definition (lines ~609-728) and update `SOCIAL_COMPOSER_TOOLS` export to not include it. Add the shared version to social-composer's tools in prism.ts instead.

In `new-agent-tools.ts`, update:
```typescript
// Before:
export const SOCIAL_COMPOSER_TOOLS = {
  get_trending_products,
  publish_social_post,
  publish_instagram_post,
}

// After:
export const SOCIAL_COMPOSER_TOOLS = {
  publish_social_post,
  publish_instagram_post,
}
```

Then in `prism.ts`, update social-composer's tools to include the shared version:
```typescript
    tools: {
      ...SOCIAL_COMPOSER_TOOLS,
      get_trending_products,
    },
```

- [ ] **Step 3: Remove `get_store_analytics_summary` from new-agent-tools.ts**

Remove the `get_store_analytics_summary` tool definition (lines ~546-603) and update:

```typescript
// Before:
export const CAMPAIGN_ARCHITECT_TOOLS = { get_store_analytics_summary }

// After:
export const CAMPAIGN_ARCHITECT_TOOLS = {}
```

The shared tools (`get_customer_segments`, `get_revenue_summary`, `get_product_categories`) already replace this single monolithic tool with more focused alternatives.

- [ ] **Step 4: Remove duplicate tools from sentinel-tools.ts**

In `sentinel-tools.ts`, remove these tools that are now in shared:
- `get_store_products` (replaced by shared `get_products`)
- `get_store_policies` (replaced by shared `get_store_policies`)
- `get_order_details` from EMAIL_HANDLER_TOOLS (replaced by shared `get_order_details`)
- `get_pending_reviews` (replaced by shared `get_reviews`)

Update exports:
```typescript
// CHAT_RESPONDER_TOOLS — remove get_store_products and get_store_policies
// Keep only get_order_status (unique: searches by order_number or customer_email directly)
export const CHAT_RESPONDER_TOOLS = {
  get_order_status,
}

// EMAIL_HANDLER_TOOLS — remove get_order_details
export const EMAIL_HANDLER_TOOLS = {
  send_email_reply,
}

// REVIEW_CURATOR_TOOLS — remove get_pending_reviews
export const REVIEW_CURATOR_TOOLS = {
  post_review_response,
}
```

Then update sentinel.ts registry to add shared replacements:
```typescript
// chat-responder:
    tools: {
      ...CHAT_RESPONDER_TOOLS,
      get_products,
      shared_get_store_policies,
      get_coupons,
      get_shipping_config,
      get_customer_history,
    },

// review-curator:
    tools: {
      ...REVIEW_CURATOR_TOOLS,
      get_reviews,
    },
```

- [ ] **Step 5: Remove `get_product_catalog` from forge-tools.ts**

```typescript
// Before:
export const UPSELL_AGENT_TOOLS = {
  get_frequently_bought_together,
  get_product_catalog,
}

// After:
export const UPSELL_AGENT_TOOLS = {
  get_frequently_bought_together,
}
```

Then in forge.ts, add the shared replacement:
```typescript
// upsell-agent:
    tools: {
      ...UPSELL_AGENT_TOOLS,
      get_products,
      get_order_stats,
      get_customer_segments,
    },
```

- [ ] **Step 6: Verify compilation**

Run: `cd /Users/manan/Downloads/aistore_cursor/ai-store-builder && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors. All removed tools are replaced by shared equivalents.

- [ ] **Step 7: Commit**

```bash
git add src/lib/agents/sub-agents/tools/new-agent-tools.ts src/lib/agents/sub-agents/tools/sentinel-tools.ts src/lib/agents/sub-agents/tools/forge-tools.ts src/lib/agents/sub-agents/registry/prism.ts src/lib/agents/sub-agents/registry/sentinel.ts src/lib/agents/sub-agents/registry/forge.ts
git commit -m "refactor(agents): remove 7 duplicate tool definitions, replaced by shared library"
```

---

## Phase 4: Verification (Task 14)

### Task 14: Full compilation check and tool count verification

- [ ] **Step 1: Full TypeScript compilation check**

Run: `cd /Users/manan/Downloads/aistore_cursor/ai-store-builder && npx tsc --noEmit --pretty 2>&1 | tail -5`
Expected: Either no errors or only pre-existing errors. No new errors from shared tools or registry changes.

- [ ] **Step 2: Verify tool counts per agent**

Run a quick grep to verify all agents now have tools:

```bash
cd /Users/manan/Downloads/aistore_cursor/ai-store-builder
grep -c "tools:" src/lib/agents/sub-agents/registry/prism.ts
grep -c "tools:" src/lib/agents/sub-agents/registry/forge.ts
grep -c "tools:" src/lib/agents/sub-agents/registry/sentinel.ts
grep -c "tools:" src/lib/agents/sub-agents/registry/pulse.ts
```

Expected: Every agent in every registry file should have a `tools:` property.

- [ ] **Step 3: Verify no `llm-only` agents remain**

```bash
grep "category: 'llm-only'" src/lib/agents/sub-agents/registry/*.ts
```

Expected: No matches (reel-director was the only one and is now `llm-api`).

- [ ] **Step 4: Verify shared module exports**

```bash
grep "export const" src/lib/agents/sub-agents/tools/shared/*.ts | wc -l
```

Expected: ~20 (the number of shared tools).

- [ ] **Step 5: Commit verification results**

No code changes needed. If everything passes, the implementation is complete.

```bash
git log --oneline -10
```

Review that all commits are in place.
