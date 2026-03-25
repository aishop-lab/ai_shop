import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { ADMIN_EMAIL } from '@/lib/admin/constants'
import { AGENT_TYPES, DEFAULT_AUTONOMY_LEVEL } from '@/lib/agents/constants'
import { createClient } from '@/lib/supabase/server'

const DEMO_STORE_SLUG = 'demo-store-artisan'
const DEMO_OWNER_EMAIL = 'demo-artisan@storeforge.site'

// ─── Helper ────────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

function hoursAgo(n: number): string {
  const d = new Date()
  d.setHours(d.getHours() - n)
  return d.toISOString()
}

// ─── Auth (admin session OR SEED_SECRET header) ────────────────────────────

async function authorize(request: NextRequest): Promise<boolean> {
  // Allow via secret env var (e.g., curl/CI access)
  const seedSecret = process.env.SEED_SECRET
  if (seedSecret) {
    const authHeader = request.headers.get('authorization')
    if (authHeader === `Bearer ${seedSecret}`) return true
  }

  // Fallback: verify logged-in admin session
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email === ADMIN_EMAIL) return true
  } catch {
    // ignore — not a session-based request
  }

  return false
}

// ─── Main handler ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const allowed = await authorize(request)
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = getSupabaseAdmin()

    // ── 1. STORE ─────────────────────────────────────────────────────────

    // Find or look up a demo owner profile (use a fixed UUID so this is idempotent)
    // We need an owner_id — use the admin user's id if available, else a dummy UUID.
    // Look up admin profile by email.
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', supabase.from('profiles').select('id').eq('email' as never, ADMIN_EMAIL).limit(1).single() as never)
      .limit(1)
      .maybeSingle()

    // Try to find admin user directly
    const { data: { users: adminUsers } } = await supabase.auth.admin.listUsers()
    const adminUser = adminUsers.find((u) => u.email === ADMIN_EMAIL)
    const ownerId = adminUser?.id ?? '00000000-0000-0000-0000-000000000001'

    // Upsert the store by slug
    const { data: existingStore } = await supabase
      .from('stores')
      .select('id')
      .eq('slug', DEMO_STORE_SLUG)
      .maybeSingle()

    let storeId: string

    if (existingStore) {
      storeId = existingStore.id
    } else {
      const blueprint = {
        identity: {
          name: 'Artisan Collective',
          tagline: 'Handcrafted with soul, delivered with care',
          description:
            'A curated marketplace of premium handmade goods crafted by skilled Indian artisans. Every piece tells a story.',
        },
        category: {
          primary: 'Art & Crafts',
          niche: 'Handmade Goods',
          business_type: 'Retail',
        },
        branding: {
          primary_color: '#6366f1',
          theme: 'modern',
          brand_vibe: 'warm',
          logo_style: 'wordmark',
        },
        location: {
          country: 'India',
          currency: 'INR',
          timezone: 'Asia/Kolkata',
        },
      }

      const { data: newStore, error: storeError } = await supabase
        .from('stores')
        .insert({
          slug: DEMO_STORE_SLUG,
          name: 'Artisan Collective',
          owner_id: ownerId,
          status: 'active',
          blueprint,
          description: 'Premium handmade goods crafted by skilled Indian artisans.',
          tagline: 'Handcrafted with soul, delivered with care',
          activated_at: daysAgo(30),
        })
        .select('id')
        .single()

      if (storeError || !newStore) {
        console.error('Seed: store insert error:', storeError)
        return NextResponse.json({ error: 'Failed to create demo store', detail: storeError?.message }, { status: 500 })
      }

      storeId = newStore.id
    }

    // ── 2. AGENT STATES ──────────────────────────────────────────────────

    // Upsert agent states for all 5 agents (ignore conflict)
    const agentRows = AGENT_TYPES.map((agentType) => ({
      store_id: storeId,
      agent_type: agentType,
      is_enabled: true,
      autonomy_level: DEFAULT_AUTONOMY_LEVEL,
      status: 'idle',
      config: {},
      error_count: 0,
      total_actions: 30,
      total_approvals_requested: 3,
      total_approvals_granted: 0,
      total_approvals_rejected: 0,
    }))

    await supabase
      .from('agent_states')
      .upsert(agentRows, { onConflict: 'store_id,agent_type', ignoreDuplicates: false })

    // ── 3. PRODUCTS ───────────────────────────────────────────────────────

    const productsToSeed = [
      {
        title: 'Handwoven Silk Scarf',
        description:
          'Luxuriously soft silk scarf handwoven by master weavers in Varanasi. Features intricate geometric patterns in jewel tones. Each piece is unique and takes 3 days to craft.',
        price: 2499,
        inventory: 25,
        category: 'Textiles',
        tags: ['silk', 'scarf', 'handwoven', 'varanasi', 'luxury'],
      },
      {
        title: 'Ceramic Tea Set',
        description:
          'A complete 6-piece ceramic tea set wheel-thrown by a Jaipur artisan. Includes teapot, 4 cups, and a serving tray. Food-safe glaze in earthy terracotta and ivory tones.',
        price: 3999,
        inventory: 15,
        category: 'Ceramics',
        tags: ['ceramic', 'tea-set', 'handmade', 'jaipur', 'kitchenware'],
      },
      {
        title: 'Hand-painted Canvas',
        description:
          'Original hand-painted canvas featuring a vibrant Madhubani-inspired landscape. Acrylic on stretched canvas (24×36 inches). Each painting is signed and comes with a certificate of authenticity.',
        price: 7500,
        inventory: 10,
        category: 'Art',
        tags: ['painting', 'canvas', 'madhubani', 'original-art', 'wall-decor'],
      },
      {
        title: 'Organic Soy Candle Set',
        description:
          'Set of 3 hand-poured soy candles in hand-thrown ceramic pots. Scents include jasmine & sandalwood, rose & oud, and vetiver & black pepper. 40-hour burn time each.',
        price: 1299,
        inventory: 40,
        category: 'Home Decor',
        tags: ['candles', 'soy', 'organic', 'ceramic', 'aromatherapy'],
      },
      {
        title: 'Macramé Wall Hanging',
        description:
          'Statement macramé wall hanging handcrafted from natural cotton rope. Features intricate knotting patterns with wooden bead accents. Measures 30×60 cm, comes with a drift-wood hanger.',
        price: 2199,
        inventory: 20,
        category: 'Home Decor',
        tags: ['macrame', 'wall-hanging', 'cotton', 'boho', 'handmade'],
      },
      {
        title: 'Brass Incense Holder',
        description:
          'Hand-cast solid brass incense holder with traditional temple motifs. Compatible with both stick and cone incense. Naturally develops a beautiful patina over time.',
        price: 899,
        inventory: 50,
        category: 'Home Decor',
        tags: ['brass', 'incense', 'holder', 'handcast', 'temple-motif'],
      },
      {
        title: 'Block Print Cushion Covers',
        description:
          'Set of 2 cushion covers (45×45 cm) hand block-printed using natural indigo dye on 100% cotton. Jaipur craftspeople use century-old wooden blocks to create each unique print. Zip closure.',
        price: 1599,
        inventory: 35,
        category: 'Textiles',
        tags: ['block-print', 'cushion', 'indigo', 'cotton', 'jaipur'],
      },
      {
        title: 'Terracotta Planter Set',
        description:
          'Set of 3 hand-moulded terracotta planters in nesting sizes (small, medium, large). Unglazed exterior allows roots to breathe. Painted with traditional geometric motifs in white and ochre.',
        price: 1899,
        inventory: 22,
        category: 'Ceramics',
        tags: ['terracotta', 'planter', 'handmoulded', 'garden', 'home-decor'],
      },
      {
        title: 'Hand-stitched Leather Journal',
        description:
          'A5 journal crafted from full-grain vegetable-tanned leather with hand-stitched binding. Contains 200 pages of acid-free paper. Gets better with age — develops a rich patina.',
        price: 1499,
        inventory: 18,
        category: 'Stationery',
        tags: ['leather', 'journal', 'handstitched', 'full-grain', 'stationery'],
      },
      {
        title: 'Bamboo Serving Board',
        description:
          'Handcrafted end-grain bamboo serving and cutting board with carved handle. Naturally antimicrobial and knife-friendly. Dimensions: 35×22 cm. Includes a food-safe beeswax finish.',
        price: 1799,
        inventory: 30,
        category: 'Kitchen',
        tags: ['bamboo', 'serving-board', 'cutting-board', 'kitchen', 'eco-friendly'],
      },
    ]

    // Check which products already exist for this store
    const { data: existingProducts } = await supabase
      .from('products')
      .select('title')
      .eq('store_id', storeId)

    const existingTitles = new Set((existingProducts ?? []).map((p: { title: string }) => p.title))

    const newProducts = productsToSeed.filter((p) => !existingTitles.has(p.title))

    let productIds: string[] = []

    if (newProducts.length > 0) {
      const productRows = newProducts.map((p, i) => ({
        store_id: storeId,
        handle: `${p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}-${i}`,
        title: p.title,
        description: p.description,
        price: p.price,
        quantity: p.inventory,
        status: 'active',
        categories: [p.category],
        tags: p.tags,
        is_demo: true,
        track_quantity: true,
        featured: true,
      }))

      const { data: insertedProducts, error: productError } = await supabase
        .from('products')
        .insert(productRows)
        .select('id')

      if (productError) {
        console.error('Seed: product insert error:', productError)
      } else {
        productIds = (insertedProducts ?? []).map((p: { id: string }) => p.id)
      }
    }

    // Collect all product IDs for this store (existing + newly inserted)
    const { data: allProducts } = await supabase
      .from('products')
      .select('id')
      .eq('store_id', storeId)

    const allProductIds = (allProducts ?? []).map((p: { id: string }) => p.id)

    // ── 4. CUSTOMERS ──────────────────────────────────────────────────────

    const customerData = [
      { name: 'Priya Sharma', email: 'priya.sharma@example.com', days: 58 },
      { name: 'Arjun Mehta', email: 'arjun.mehta@example.com', days: 55 },
      { name: 'Kavita Nair', email: 'kavita.nair@example.com', days: 52 },
      { name: 'Rohit Gupta', email: 'rohit.gupta@example.com', days: 49 },
      { name: 'Anjali Singh', email: 'anjali.singh@example.com', days: 46 },
      { name: 'Vikram Patel', email: 'vikram.patel@example.com', days: 43 },
      { name: 'Sneha Reddy', email: 'sneha.reddy@example.com', days: 40 },
      { name: 'Rahul Joshi', email: 'rahul.joshi@example.com', days: 37 },
      { name: 'Deepika Rao', email: 'deepika.rao@example.com', days: 34 },
      { name: 'Amit Kumar', email: 'amit.kumar@example.com', days: 31 },
      { name: 'Pooja Iyer', email: 'pooja.iyer@example.com', days: 28 },
      { name: 'Suresh Verma', email: 'suresh.verma@example.com', days: 25 },
      { name: 'Meena Pillai', email: 'meena.pillai@example.com', days: 22 },
      { name: 'Nikhil Banerjee', email: 'nikhil.banerjee@example.com', days: 15 },
      { name: 'Tanya Agarwal', email: 'tanya.agarwal@example.com', days: 7 },
    ]

    const { data: existingCustomers } = await supabase
      .from('customers')
      .select('email')
      .eq('store_id', storeId)

    const existingEmails = new Set((existingCustomers ?? []).map((c: { email: string }) => c.email))

    const newCustomers = customerData.filter((c) => !existingEmails.has(c.email))

    let customerIds: string[] = []

    if (newCustomers.length > 0) {
      const customerRows = newCustomers.map((c) => ({
        store_id: storeId,
        name: c.name,
        email: c.email,
        total_orders: 0,
        total_spent: 0,
        created_at: daysAgo(c.days),
      }))

      const { data: insertedCustomers, error: customerError } = await supabase
        .from('customers')
        .insert(customerRows)
        .select('id')

      if (customerError) {
        console.error('Seed: customer insert error:', customerError)
      } else {
        customerIds = (insertedCustomers ?? []).map((c: { id: string }) => c.id)
      }
    }

    // Collect all customer IDs
    const { data: allCustomers } = await supabase
      .from('customers')
      .select('id, name')
      .eq('store_id', storeId)

    const allCustomerRecords = allCustomers ?? []

    // ── 5. ORDERS ─────────────────────────────────────────────────────────

    const { data: existingOrders } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId)

    const existingOrderCount = existingOrders ? 1 : 0 // head: true returns null data

    const { count: orderCount } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId)

    const ordersToCreate = Math.max(0, 20 - (orderCount ?? 0))

    const fulfillmentStatuses = ['confirmed', 'processing', 'shipped', 'delivered'] as const
    const paymentStatuses = ['paid', 'pending'] as const
    const totals = [899, 1299, 1499, 1599, 1799, 1899, 2199, 2499, 3999, 4999, 7500, 9999, 12000, 15000]
    const indianNames = allCustomerRecords.map((c: { name: string }) => c.name)
    const fallbackNames = [
      'Priya Sharma', 'Arjun Mehta', 'Kavita Nair', 'Rohit Gupta', 'Anjali Singh',
      'Vikram Patel', 'Sneha Reddy', 'Rahul Joshi', 'Deepika Rao', 'Amit Kumar',
    ]
    const namePool = indianNames.length > 0 ? indianNames : fallbackNames

    if (ordersToCreate > 0) {
      const orderRows = Array.from({ length: ordersToCreate }, (_, i) => {
        const dayOffset = Math.floor((i / ordersToCreate) * 30)
        const fulfillmentStatus = fulfillmentStatuses[i % fulfillmentStatuses.length]
        const paymentStatus = fulfillmentStatus === 'confirmed' ? 'pending' : 'paid'
        const total = totals[i % totals.length]
        const customerName = namePool[i % namePool.length]
        const orderNum = `AC-${String(1001 + i).padStart(4, '0')}`

        return {
          store_id: storeId,
          order_number: orderNum,
          customer_name: customerName,
          customer_email: `${customerName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
          fulfillment_status: fulfillmentStatus,
          payment_status: paymentStatus,
          total: total,
          subtotal: Math.round(total * 0.9),
          shipping_total: Math.round(total * 0.1),
          currency: 'INR',
          shipping_address: {
            name: customerName,
            line1: `${100 + i} Artisan Lane`,
            city: ['Mumbai', 'Delhi', 'Bengaluru', 'Chennai', 'Jaipur'][i % 5],
            state: ['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'Rajasthan'][i % 5],
            postal_code: `4${String(i).padStart(5, '0')}`,
            country: 'India',
          },
          created_at: daysAgo(dayOffset),
        }
      })

      const { error: orderError } = await supabase.from('orders').insert(orderRows)
      if (orderError) {
        console.error('Seed: order insert error:', orderError)
      }
    }

    // ── 6. AGENT ACTIONS ─────────────────────────────────────────────────

    const { count: existingActionCount } = await supabase
      .from('agent_actions')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId)

    const actionsToCreate = Math.max(0, 30 - (existingActionCount ?? 0))

    if (actionsToCreate > 0) {
      const actionTemplates: Array<{
        agent_type: string
        sub_agent_type: string
        action_type: string
        action_category: string
        summary: string
        details: Record<string, unknown>
        status: string
        execution_mode: string
        hoursOffset: number
      }> = [
        // cart-whisperer (5)
        {
          agent_type: 'sales', sub_agent_type: 'cart-whisperer',
          action_type: 'send_recovery_email', action_category: 'communication',
          summary: 'Sent cart recovery email to Priya Sharma — ₹2,499 silk scarf in cart',
          details: { cart_value: 2499, customer: 'Priya Sharma', recovery_step: 1, channel: 'email' },
          status: 'completed', execution_mode: 'auto', hoursOffset: 3,
        },
        {
          agent_type: 'sales', sub_agent_type: 'cart-whisperer',
          action_type: 'send_recovery_email', action_category: 'communication',
          summary: 'Sent 24h cart recovery email to Arjun Mehta — ceramic tea set',
          details: { cart_value: 3999, customer: 'Arjun Mehta', recovery_step: 2, channel: 'email' },
          status: 'completed', execution_mode: 'auto', hoursOffset: 28,
        },
        {
          agent_type: 'sales', sub_agent_type: 'cart-whisperer',
          action_type: 'send_recovery_whatsapp', action_category: 'communication',
          summary: 'Sent WhatsApp nudge to Kavita Nair — macramé wall hanging left in cart',
          details: { cart_value: 2199, customer: 'Kavita Nair', recovery_step: 1, channel: 'whatsapp' },
          status: 'completed', execution_mode: 'auto', hoursOffset: 52,
        },
        {
          agent_type: 'sales', sub_agent_type: 'cart-whisperer',
          action_type: 'detect_abandoned_cart', action_category: 'analysis',
          summary: 'Detected 3 new abandoned carts totalling ₹7,697',
          details: { cart_count: 3, total_value: 7697, top_product: 'Handwoven Silk Scarf' },
          status: 'completed', execution_mode: 'auto', hoursOffset: 72,
        },
        {
          agent_type: 'sales', sub_agent_type: 'cart-whisperer',
          action_type: 'report_cart_metrics', action_category: 'analysis',
          summary: 'Weekly cart recovery report — 38% recovery rate, ₹18,240 recovered',
          details: { recovery_rate: 0.38, revenue_recovered: 18240, emails_sent: 12, conversions: 4 },
          status: 'completed', execution_mode: 'auto', hoursOffset: 120,
        },
        // revenue-tracker (5)
        {
          agent_type: 'analytics', sub_agent_type: 'revenue-tracker',
          action_type: 'daily_revenue_report', action_category: 'analysis',
          summary: 'Daily revenue report — ₹34,500 today, up 12% vs yesterday',
          details: { revenue: 34500, orders: 8, aov: 4312, change_pct: 12 },
          status: 'completed', execution_mode: 'auto', hoursOffset: 24,
        },
        {
          agent_type: 'analytics', sub_agent_type: 'revenue-tracker',
          action_type: 'daily_revenue_report', action_category: 'analysis',
          summary: 'Daily revenue report — ₹28,200, strong ceramic category performance',
          details: { revenue: 28200, orders: 7, aov: 4028, top_category: 'Ceramics' },
          status: 'completed', execution_mode: 'auto', hoursOffset: 48,
        },
        {
          agent_type: 'analytics', sub_agent_type: 'revenue-tracker',
          action_type: 'daily_revenue_report', action_category: 'analysis',
          summary: 'Daily revenue report — ₹41,750 today, new record this week',
          details: { revenue: 41750, orders: 11, aov: 3795, record: true },
          status: 'completed', execution_mode: 'auto', hoursOffset: 54,
        },
        {
          agent_type: 'analytics', sub_agent_type: 'revenue-tracker',
          action_type: 'daily_revenue_report', action_category: 'analysis',
          summary: 'Daily revenue report — ₹19,800, slower Monday performance',
          details: { revenue: 19800, orders: 5, aov: 3960, day: 'Monday' },
          status: 'completed', execution_mode: 'auto', hoursOffset: 96,
        },
        {
          agent_type: 'analytics', sub_agent_type: 'revenue-tracker',
          action_type: 'weekly_summary', action_category: 'analysis',
          summary: 'Weekly revenue summary — ₹1,84,250 total, 42 orders placed',
          details: { total_revenue: 184250, orders: 42, aov: 4387, top_product: 'Ceramic Tea Set' },
          status: 'completed', execution_mode: 'auto', hoursOffset: 168,
        },
        // anomaly-sentinel (3)
        {
          agent_type: 'analytics', sub_agent_type: 'anomaly-sentinel',
          action_type: 'detect_traffic_spike', action_category: 'analysis',
          summary: 'Traffic spike detected — 340% above baseline, likely Instagram referral',
          details: { spike_multiplier: 3.4, source: 'instagram', duration_minutes: 85, page: '/products/handwoven-silk-scarf' },
          status: 'completed', execution_mode: 'auto', hoursOffset: 18,
        },
        {
          agent_type: 'analytics', sub_agent_type: 'anomaly-sentinel',
          action_type: 'detect_revenue_anomaly', action_category: 'analysis',
          summary: 'Revenue anomaly: 2 high-value orders (₹15,000 each) in 10 minutes — fraud risk low',
          details: { orders: 2, total: 30000, risk_score: 0.12, flagged: false },
          status: 'completed', execution_mode: 'auto', hoursOffset: 36,
        },
        {
          agent_type: 'analytics', sub_agent_type: 'anomaly-sentinel',
          action_type: 'detect_inventory_anomaly', action_category: 'analysis',
          summary: 'Low stock alert: Brass Incense Holder at 4 units — reorder recommended',
          details: { product: 'Brass Incense Holder', current_stock: 4, reorder_threshold: 10 },
          status: 'completed', execution_mode: 'auto', hoursOffset: 60,
        },
        // chat-responder (4)
        {
          agent_type: 'support', sub_agent_type: 'chat-responder',
          action_type: 'resolve_customer_query', action_category: 'communication',
          summary: 'Resolved shipping query from Rohit Gupta — order AC-1003 expected Thursday',
          details: { customer: 'Rohit Gupta', query_type: 'shipping', resolution_time_min: 2, csat: 5 },
          status: 'completed', execution_mode: 'auto', hoursOffset: 8,
        },
        {
          agent_type: 'support', sub_agent_type: 'chat-responder',
          action_type: 'resolve_customer_query', action_category: 'communication',
          summary: 'Answered product care query for Handwoven Silk Scarf — sent care guide PDF',
          details: { query_type: 'product_care', product: 'Handwoven Silk Scarf', attachment_sent: true, csat: 5 },
          status: 'completed', execution_mode: 'auto', hoursOffset: 15,
        },
        {
          agent_type: 'support', sub_agent_type: 'chat-responder',
          action_type: 'resolve_customer_query', action_category: 'communication',
          summary: 'Handled customization enquiry — referred to merchant for bespoke orders',
          details: { query_type: 'customization', escalated_to: 'merchant', reason: 'bespoke_order' },
          status: 'completed', execution_mode: 'auto', hoursOffset: 32,
        },
        {
          agent_type: 'support', sub_agent_type: 'chat-responder',
          action_type: 'resolve_customer_query', action_category: 'communication',
          summary: 'Resolved return query for Anjali Singh — return window still open, label sent',
          details: { customer: 'Anjali Singh', query_type: 'returns', label_sent: true, csat: 4 },
          status: 'completed', execution_mode: 'auto', hoursOffset: 44,
        },
        // copysmith (3)
        {
          agent_type: 'marketing', sub_agent_type: 'copysmith',
          action_type: 'write_product_description', action_category: 'optimization',
          summary: 'Rewrote description for Bamboo Serving Board — SEO-optimised, +23% length',
          details: { product: 'Bamboo Serving Board', words_before: 42, words_after: 120, seo_score: 87 },
          status: 'completed', execution_mode: 'auto', hoursOffset: 40,
        },
        {
          agent_type: 'marketing', sub_agent_type: 'copysmith',
          action_type: 'write_product_description', action_category: 'optimization',
          summary: 'Enhanced description for Terracotta Planter Set — storytelling approach',
          details: { product: 'Terracotta Planter Set', tone: 'storytelling', confidence: 0.91 },
          status: 'completed', execution_mode: 'auto', hoursOffset: 65,
        },
        {
          agent_type: 'marketing', sub_agent_type: 'copysmith',
          action_type: 'write_collection_copy', action_category: 'optimization',
          summary: 'Wrote homepage hero copy — "Where Every Thread Tells a Story"',
          details: { placement: 'homepage_hero', headline: 'Where Every Thread Tells a Story', cta: 'Shop Now' },
          status: 'completed', execution_mode: 'auto', hoursOffset: 90,
        },
        // seo-engineer (3)
        {
          agent_type: 'technical', sub_agent_type: 'seo-engineer',
          action_type: 'update_meta_tags', action_category: 'optimization',
          summary: 'Updated meta title & description for 5 products — avg score improved to 88/100',
          details: { products_updated: 5, avg_score_before: 64, avg_score_after: 88 },
          status: 'completed', execution_mode: 'auto', hoursOffset: 20,
        },
        {
          agent_type: 'technical', sub_agent_type: 'seo-engineer',
          action_type: 'add_structured_data', action_category: 'optimization',
          summary: 'Added Product schema markup to all active products — eligible for rich results',
          details: { products_updated: 10, schema_type: 'Product', rich_results_eligible: true },
          status: 'completed', execution_mode: 'auto', hoursOffset: 50,
        },
        {
          agent_type: 'technical', sub_agent_type: 'seo-engineer',
          action_type: 'seo_audit', action_category: 'analysis',
          summary: 'SEO audit complete — store score 76/100, 3 high-priority fixes identified',
          details: { score: 76, critical_issues: 0, high_issues: 3, medium_issues: 7 },
          status: 'completed', execution_mode: 'auto', hoursOffset: 76,
        },
        // price-strategist (2)
        {
          agent_type: 'sales', sub_agent_type: 'price-strategist',
          action_type: 'analyze_pricing', action_category: 'analysis',
          summary: 'Price analysis: Hand-painted Canvas underpriced by ~18% vs market — suggest ₹8,750',
          details: { product: 'Hand-painted Canvas', current_price: 7500, suggested_price: 8750, confidence: 'high' },
          status: 'completed', execution_mode: 'auto', hoursOffset: 30,
        },
        {
          agent_type: 'sales', sub_agent_type: 'price-strategist',
          action_type: 'detect_pricing_opportunities', action_category: 'analysis',
          summary: 'Festive pricing opportunity detected — Diwali demand spike in 18 days',
          details: { event: 'Diwali', days_ahead: 18, recommended_premium_pct: 12, products_affected: 8 },
          status: 'completed', execution_mode: 'auto', hoursOffset: 42,
        },
        // uptime-guardian (2)
        {
          agent_type: 'technical', sub_agent_type: 'uptime-guardian',
          action_type: 'health_check', action_category: 'maintenance',
          summary: 'Hourly health check passed — all endpoints responding, p95 latency 142ms',
          details: { status: 'healthy', p95_latency_ms: 142, endpoints_checked: 8, errors: 0 },
          status: 'completed', execution_mode: 'auto', hoursOffset: 1,
        },
        {
          agent_type: 'technical', sub_agent_type: 'uptime-guardian',
          action_type: 'health_check', action_category: 'maintenance',
          summary: 'Hourly health check passed — checkout latency slightly elevated at 310ms',
          details: { status: 'healthy', p95_latency_ms: 310, endpoints_checked: 8, errors: 0, note: 'checkout_latency_elevated' },
          status: 'completed', execution_mode: 'auto', hoursOffset: 25,
        },
        // report-writer (3)
        {
          agent_type: 'analytics', sub_agent_type: 'report-writer',
          action_type: 'generate_weekly_report', action_category: 'analysis',
          summary: 'Weekly business report generated — ₹1,84,250 revenue, 42 orders, 15 new customers',
          details: { revenue: 184250, orders: 42, new_customers: 15, report_format: 'pdf' },
          status: 'completed', execution_mode: 'auto', hoursOffset: 170,
        },
        {
          agent_type: 'analytics', sub_agent_type: 'report-writer',
          action_type: 'generate_category_report', action_category: 'analysis',
          summary: 'Category performance report — Ceramics leads with ₹47,880 revenue (26% share)',
          details: { top_category: 'Ceramics', category_revenue: 47880, share_pct: 26 },
          status: 'completed', execution_mode: 'auto', hoursOffset: 100,
        },
        {
          agent_type: 'analytics', sub_agent_type: 'report-writer',
          action_type: 'generate_customer_report', action_category: 'analysis',
          summary: 'Customer cohort report — 68% repeat purchase rate, avg LTV ₹12,400',
          details: { repeat_rate: 0.68, avg_ltv: 12400, churn_risk_count: 3 },
          status: 'completed', execution_mode: 'auto', hoursOffset: 145,
        },
      ]

      // Only insert as many as we still need
      const templatesSlice = actionTemplates.slice(0, actionsToCreate)
      const now = new Date()

      const actionRows = templatesSlice.map((t) => {
        const startedAt = new Date(now.getTime() - t.hoursOffset * 60 * 60 * 1000)
        const completedAt = new Date(startedAt.getTime() + Math.floor(Math.random() * 5000) + 500)
        return {
          store_id: storeId,
          agent_type: t.agent_type,
          sub_agent_type: t.sub_agent_type,
          action_type: t.action_type,
          action_category: t.action_category,
          summary: t.summary,
          details: t.details,
          status: t.status,
          execution_mode: t.execution_mode,
          tokens_input: Math.floor(Math.random() * 800) + 200,
          tokens_output: Math.floor(Math.random() * 400) + 100,
          estimated_cost_usd: parseFloat((Math.random() * 0.002 + 0.0001).toFixed(6)),
          api_costs: {},
          started_at: startedAt.toISOString(),
          completed_at: completedAt.toISOString(),
          duration_ms: completedAt.getTime() - startedAt.getTime(),
          created_at: startedAt.toISOString(),
        }
      })

      const { error: actionError } = await supabase.from('agent_actions').insert(actionRows)
      if (actionError) {
        console.error('Seed: agent_actions insert error:', actionError)
      }
    }

    // ── 7. PENDING APPROVALS ─────────────────────────────────────────────

    const { count: existingApprovalCount } = await supabase
      .from('agent_approvals')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .eq('status', 'pending')

    if ((existingApprovalCount ?? 0) === 0) {
      const approvalRows = [
        {
          store_id: storeId,
          agent_type: 'sales',
          sub_agent_type: 'deal-engineer',
          action_type: 'launch_campaign',
          summary: 'Create 15% monsoon sale for ceramics collection',
          reasoning:
            'Monsoon season historically drives 22% higher ceramic product searches. A targeted 15% discount on the Ceramics category is projected to increase revenue by ₹28,000 over 7 days while maintaining 61% margin.',
          details: {
            discount_type: 'percentage',
            discount_value: 15,
            applicable_category: 'Ceramics',
            duration_days: 7,
            estimated_revenue_impact: '₹28,000',
            estimated_margin_impact: '-4.2%',
            coupon_code: 'MONSOON15',
          },
          priority: 'high',
          expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          status: 'pending',
        },
        {
          store_id: storeId,
          agent_type: 'marketing',
          sub_agent_type: 'social-composer',
          action_type: 'post_social_content',
          summary: 'Post Instagram reel showcasing new leather journals',
          reasoning:
            'The Hand-stitched Leather Journal has the highest save rate on the store\'s Instagram profile (4.8%). A 30-second reel demonstrating the crafting process typically drives 3× the engagement of static posts for craft products.',
          details: {
            platform: 'instagram',
            content_type: 'reel',
            product: 'Hand-stitched Leather Journal',
            caption_preview: 'Sixty hours of hand-stitching. One journal that gets better with every page. 🪡',
            estimated_reach: 12000,
            best_time_to_post: '7:30 PM IST Saturday',
          },
          priority: 'normal',
          expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
          status: 'pending',
        },
        {
          store_id: storeId,
          agent_type: 'support',
          sub_agent_type: 'returns-manager',
          action_type: 'process_refund',
          summary: 'Process ₹3,999 refund for damaged tea set',
          reasoning:
            'Customer Anjali Singh (order AC-1005) received the Ceramic Tea Set with a cracked teapot. Photo evidence provided confirms manufacturing damage. Customer satisfaction risk is high — prompt refund recommended to prevent negative review.',
          details: {
            order_number: 'AC-1005',
            customer: 'Anjali Singh',
            refund_amount: 3999,
            currency: 'INR',
            reason: 'manufacturing_damage',
            evidence: 'photo_provided',
            risk: 'negative_review_if_delayed',
          },
          priority: 'normal',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending',
        },
      ]

      const { error: approvalError } = await supabase.from('agent_approvals').insert(approvalRows)
      if (approvalError) {
        console.error('Seed: agent_approvals insert error:', approvalError)
      }
    }

    // ── Done ─────────────────────────────────────────────────────────────

    return NextResponse.json({
      success: true,
      storeId,
      storeSlug: DEMO_STORE_SLUG,
      message: 'Demo store seeded successfully',
      seeded: {
        store: 'Artisan Collective',
        productsInserted: newProducts.length,
        productsTotal: allProductIds.length,
        customersInserted: newCustomers.length,
        customersTotal: allCustomerRecords.length,
        ordersRequested: ordersToCreate,
        agentActionsRequested: actionsToCreate,
        approvalsRequested: (existingApprovalCount ?? 0) === 0 ? 3 : 0,
      },
    })
  } catch (error) {
    console.error('Seed demo error:', error)
    return NextResponse.json(
      { error: 'Seed failed', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
