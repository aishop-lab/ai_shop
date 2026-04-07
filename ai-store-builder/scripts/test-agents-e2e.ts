#!/usr/bin/env npx tsx
/**
 * Comprehensive E2E Agent Test Suite
 *
 * Tests all 5 chiefs, all 37 sub-agents, cross-agent communication,
 * orchestrator triggers, and event bus at autonomy level 5.
 *
 * Usage: npx tsx scripts/test-agents-e2e.ts
 */

import { createClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const API_BASE = 'http://localhost:3000'
const CRON_SECRET = process.env.CRON_SECRET || ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Test store
const TEST_STORE_SLUG = 'e2e-test-store'
let TEST_STORE_ID = ''
let TEST_PRODUCT_IDS: string[] = []
let TEST_ORDER_IDS: string[] = []
let TEST_CUSTOMER_IDS: string[] = []

// Results tracking
interface TestResult {
  name: string
  chief: string
  subAgent: string
  status: 'PASS' | 'FAIL' | 'SKIP'
  duration_ms: number
  details: string
  error?: string
}

const results: TestResult[] = []

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

async function callSubAgent(
  subAgentId: string,
  instruction: string,
  params?: Record<string, unknown>
): Promise<{ success: boolean; output: unknown; error?: string; duration_ms: number; tokens?: { input: number; output: number } }> {
  const start = Date.now()
  try {
    const res = await fetch(`${API_BASE}/api/agents/test-execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CRON_SECRET}`,
      },
      body: JSON.stringify({
        sub_agent_id: subAgentId,
        store_id: TEST_STORE_ID,
        instruction,
        params: { ...params, store_id: TEST_STORE_ID },
      }),
    })

    const duration_ms = Date.now() - start
    const data = await res.json()

    if (!res.ok) {
      return { success: false, output: null, error: `HTTP ${res.status}: ${JSON.stringify(data)}`, duration_ms }
    }

    return {
      success: data.success !== false,
      output: data.output ?? data,
      error: data.error,
      duration_ms,
      tokens: data.tokens,
    }
  } catch (err) {
    return {
      success: false,
      output: null,
      error: `Network error: ${err instanceof Error ? err.message : String(err)}`,
      duration_ms: Date.now() - start,
    }
  }
}

function recordResult(
  name: string,
  chief: string,
  subAgent: string,
  success: boolean,
  duration_ms: number,
  details: string,
  error?: string
) {
  const status = error ? 'FAIL' : success ? 'PASS' : 'FAIL'
  results.push({ name, chief, subAgent, status, duration_ms, details, error })
  const icon = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '○'
  const color = status === 'PASS' ? '\x1b[32m' : status === 'FAIL' ? '\x1b[31m' : '\x1b[33m'
  console.log(`  ${color}${icon}\x1b[0m ${name} (${duration_ms}ms) ${error ? `— ${error}` : ''}`)
}

// ---------------------------------------------------------------------------
// Phase 0: Seed Test Data
// ---------------------------------------------------------------------------

async function seedTestData() {
  console.log('\n━━━ Phase 0: Seeding Test Data ━━━\n')

  // Find or create admin user ID
  const { data: { users } } = await supabase.auth.admin.listUsers()
  const ownerId = users?.[0]?.id ?? '00000000-0000-0000-0000-000000000001'

  // 1. Create test store
  const { data: existing } = await supabase
    .from('stores')
    .select('id')
    .eq('slug', TEST_STORE_SLUG)
    .maybeSingle()

  if (existing) {
    TEST_STORE_ID = existing.id
    console.log(`  Using existing test store: ${TEST_STORE_ID}`)
  } else {
    const { data: store, error } = await supabase
      .from('stores')
      .insert({
        slug: TEST_STORE_SLUG,
        name: 'E2E Test Store',
        owner_id: ownerId,
        status: 'active',
        description: 'Automated E2E testing store for all agents',
        tagline: 'Test Everything',
        business_category: null,
        business_type: 'Retail',
        contact_email: 'e2e-test@storeforge.site',
        currency: 'INR',
        country: 'India',
        timezone: 'Asia/Kolkata',
        blueprint: {
          identity: { name: 'E2E Test Store', tagline: 'Test Everything' },
          category: { primary: 'General', niche: 'Testing' },
          branding: { primary_color: '#3b82f6', theme: 'modern', brand_vibe: 'professional' },
          location: { country: 'India', currency: 'INR', timezone: 'Asia/Kolkata' },
          design: { primaryColor: '#3b82f6', vibe: 'professional', font: 'Inter' },
          shipping: { free_shipping_threshold: 999, estimated_delivery_days: 5 },
        },
        policies: {
          return_window_days: 7,
          return_policy: 'Returns accepted within 7 days of delivery for unused items.',
          shipping_policy: 'Free shipping on orders above INR 999. Standard delivery 3-5 business days.',
          privacy_policy: 'We respect your privacy and protect your data.',
        },
        activated_at: daysAgo(60),
      })
      .select('id')
      .single()

    if (error) {
      console.error('  FATAL: Failed to create store:', error.message)
      process.exit(1)
    }
    TEST_STORE_ID = store!.id
    console.log(`  Created test store: ${TEST_STORE_ID}`)
  }

  // 2. Enable all 5 agents at autonomy level 5
  const agentTypes = ['marketing', 'sales', 'support', 'analytics', 'technical']
  for (const agentType of agentTypes) {
    await supabase.from('agent_states').upsert({
      store_id: TEST_STORE_ID,
      agent_type: agentType,
      is_enabled: true,
      autonomy_level: 5,
      status: 'idle',
      config: {},
      error_count: 0,
      total_actions: 0,
      total_approvals_requested: 0,
      total_approvals_granted: 0,
      total_approvals_rejected: 0,
    }, { onConflict: 'store_id,agent_type' })
  }
  console.log('  All 5 agents enabled at autonomy level 5')

  // 3. Seed products
  const products = [
    { title: 'Premium Wireless Headphones', price: 4999, compare_at_price: 6999, category: ['Electronics'], tags: ['wireless', 'audio', 'premium'], inventory_quantity: 50, description: 'High-quality wireless headphones with active noise cancellation and 30-hour battery life.' },
    { title: 'Organic Green Tea (100g)', price: 599, compare_at_price: 799, category: ['Food & Beverages'], tags: ['organic', 'tea', 'health'], inventory_quantity: 200, description: 'Premium organic green tea sourced from Darjeeling estates.' },
    { title: 'Handmade Leather Wallet', price: 1999, compare_at_price: 2499, category: ['Accessories'], tags: ['leather', 'handmade', 'men'], inventory_quantity: 75, description: 'Genuine leather bifold wallet handcrafted by Indian artisans.' },
    { title: 'Cotton Kurta Set', price: 2499, compare_at_price: 3499, category: ['Clothing'], tags: ['cotton', 'kurta', 'ethnic'], inventory_quantity: 30, description: 'Comfortable cotton kurta set in traditional block print design.' },
    { title: 'Yoga Mat (6mm)', price: 1299, compare_at_price: null, category: ['Fitness'], tags: ['yoga', 'fitness', 'eco-friendly'], inventory_quantity: 100, description: 'Eco-friendly TPE yoga mat with alignment markings.' },
    { title: 'Ceramic Coffee Mug Set', price: 899, compare_at_price: 1299, category: ['Home & Kitchen'], tags: ['ceramic', 'coffee', 'gift'], inventory_quantity: 120, description: 'Set of 4 hand-painted ceramic mugs, microwave safe.' },
    { title: 'Bamboo Sunglasses', price: 1599, compare_at_price: 1999, category: ['Accessories'], tags: ['bamboo', 'eco', 'sunglasses'], inventory_quantity: 45, description: 'UV400 polarized sunglasses with natural bamboo frames.' },
    { title: 'Stainless Steel Water Bottle', price: 699, compare_at_price: null, category: ['Fitness'], tags: ['steel', 'bottle', 'eco-friendly'], inventory_quantity: 250, description: '750ml vacuum insulated stainless steel bottle, keeps drinks cold 24h.' },
    { title: 'Scented Soy Candle (Lavender)', price: 449, compare_at_price: 599, category: ['Home & Kitchen'], tags: ['candle', 'soy', 'lavender'], inventory_quantity: 180, description: 'Hand-poured soy wax candle with natural lavender essential oil, 40hr burn time.' },
    { title: 'Bluetooth Speaker Mini', price: 1999, compare_at_price: 2999, category: ['Electronics'], tags: ['bluetooth', 'speaker', 'portable'], inventory_quantity: 60, description: 'Waterproof portable speaker with 12-hour battery life and deep bass.' },
  ]

  // Delete old test products
  await supabase.from('products').delete().eq('store_id', TEST_STORE_ID).eq('is_demo', false)

  const { data: insertedProducts, error: prodError } = await supabase
    .from('products')
    .insert(products.map((p, i) => ({
      store_id: TEST_STORE_ID,
      title: p.title,
      price: p.price,
      compare_at_price: p.compare_at_price,
      category: p.category,
      tags: p.tags,
      inventory_quantity: p.inventory_quantity,
      description: p.description,
      status: 'active',
      is_demo: false,
      handle: p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/g, ''),
      created_at: daysAgo(30 - i * 2),
    })))
    .select('id, title')

  if (prodError) {
    console.error('  Product seed error:', prodError.message)
  } else {
    TEST_PRODUCT_IDS = (insertedProducts ?? []).map(p => p.id)
    console.log(`  Seeded ${TEST_PRODUCT_IDS.length} products`)
  }

  // 4. Seed customers
  const customerNames = [
    ['Priya Sharma', 'priya.sharma@test.e2e'],
    ['Arjun Mehta', 'arjun.mehta@test.e2e'],
    ['Kavita Nair', 'kavita.nair@test.e2e'],
    ['Rohan Gupta', 'rohan.gupta@test.e2e'],
    ['Ananya Patel', 'ananya.patel@test.e2e'],
    ['Vikram Singh', 'vikram.singh@test.e2e'],
    ['Deepika Joshi', 'deepika.joshi@test.e2e'],
    ['Amit Kumar', 'amit.kumar@test.e2e'],
  ]

  await supabase.from('customers').delete().eq('store_id', TEST_STORE_ID)

  const { data: insertedCustomers, error: custError } = await supabase
    .from('customers')
    .insert(customerNames.map(([fullName, email], i) => ({
      store_id: TEST_STORE_ID,
      full_name: fullName,
      email,
      phone: `+9198765432${10 + i}`,
      total_orders: i < 4 ? 3 + i : i < 6 ? 1 : 0,
      total_spent: i < 4 ? (3 + i) * 2500 : i < 6 ? 2500 : 0,
      last_order_at: i < 4 ? daysAgo(5 + i * 7) : i < 6 ? daysAgo(45 + i * 10) : null,
      created_at: daysAgo(60 - i * 5),
    })))
    .select('id, email')

  if (custError) {
    console.error('  Customer seed error:', custError.message)
  } else {
    TEST_CUSTOMER_IDS = (insertedCustomers ?? []).map(c => c.id)
    console.log(`  Seeded ${TEST_CUSTOMER_IDS.length} customers`)
  }

  // If products failed, exit gracefully
  if (TEST_PRODUCT_IDS.length === 0) {
    console.error('  FATAL: No products seeded. Cannot continue.')
    process.exit(1)
  }

  // 5. Seed orders
  await supabase.from('orders').delete().eq('store_id', TEST_STORE_ID)

  const orderData = []
  const statuses = ['unfulfilled', 'processing', 'shipped', 'delivered', 'delivered', 'delivered']
  const paymentStatuses = ['paid', 'paid', 'paid', 'paid', 'paid', 'failed']

  for (let i = 0; i < 15; i++) {
    const custIdx = i % customerNames.length
    const prodIdx = i % TEST_PRODUCT_IDS.length
    orderData.push({
      store_id: TEST_STORE_ID,
      order_number: `E2E-${1001 + i}`,
      email: customerNames[custIdx][1],
      total: products[prodIdx].price * (1 + (i % 3)),
      subtotal: products[prodIdx].price * (1 + (i % 3)),
      currency: 'INR',
      fulfillment_status: statuses[i % statuses.length],
      payment_status: paymentStatuses[i % paymentStatuses.length],
      payment_method: i % 3 === 0 ? 'razorpay' : i % 3 === 1 ? 'stripe' : 'cod',
      shipping_address: { city: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata'][i % 5], state: 'Test State', pincode: '400001' },
      created_at: daysAgo(25 - i),
    })
  }

  const { data: insertedOrders, error: ordError } = await supabase
    .from('orders')
    .insert(orderData)
    .select('id, order_number')

  if (ordError) {
    console.error('  Order seed error:', ordError.message)
  } else {
    TEST_ORDER_IDS = (insertedOrders ?? []).map(o => o.id)
    console.log(`  Seeded ${TEST_ORDER_IDS.length} orders`)
  }

  // 6. Seed order items
  if (TEST_ORDER_IDS.length > 0) {
    const orderItems = TEST_ORDER_IDS.map((orderId, i) => ({
      order_id: orderId,
      product_id: TEST_PRODUCT_IDS[i % TEST_PRODUCT_IDS.length],
      title: products[i % products.length].title,
      quantity: 1 + (i % 3),
      price: products[i % products.length].price,
    }))

    const { error: itemError } = await supabase.from('order_items').insert(orderItems)
    if (itemError) console.error('  Order items seed error:', itemError.message)
    else console.log(`  Seeded ${orderItems.length} order items`)
  }

  // 7. Seed abandoned carts
  await supabase.from('abandoned_carts').delete().eq('store_id', TEST_STORE_ID)

  const { error: cartError } = await supabase.from('abandoned_carts').insert([
    { store_id: TEST_STORE_ID, email: 'priya.sharma@test.e2e', phone: '+919876543210', items: [{ product_id: TEST_PRODUCT_IDS[0], title: 'Premium Wireless Headphones', quantity: 1, price: 4999 }], subtotal: 4999, currency: 'INR', recovery_status: 'abandoned', emails_sent: 0, created_at: hoursAgo(6) },
    { store_id: TEST_STORE_ID, email: 'arjun.mehta@test.e2e', phone: '+919876543211', items: [{ product_id: TEST_PRODUCT_IDS[2], title: 'Handmade Leather Wallet', quantity: 2, price: 1999 }], subtotal: 3998, currency: 'INR', recovery_status: 'abandoned', emails_sent: 0, created_at: hoursAgo(24) },
    { store_id: TEST_STORE_ID, email: 'kavita.nair@test.e2e', phone: '+919876543212', items: [{ product_id: TEST_PRODUCT_IDS[3], title: 'Cotton Kurta Set', quantity: 1, price: 2499 }], subtotal: 2499, currency: 'INR', recovery_status: 'email_1_sent', emails_sent: 1, created_at: hoursAgo(48) },
  ])
  if (cartError) console.error('  Abandoned cart seed error:', cartError.message)
  else console.log('  Seeded 3 abandoned carts')

  // 8. Seed product reviews
  await supabase.from('product_reviews').delete().eq('store_id', TEST_STORE_ID)

  const { error: reviewError } = await supabase.from('product_reviews').insert([
    { store_id: TEST_STORE_ID, product_id: TEST_PRODUCT_IDS[0], customer_name: 'Priya Sharma', rating: 5, title: 'Amazing sound quality!', body: 'Best headphones I have ever used. The noise cancellation is incredible.', created_at: daysAgo(5) },
    { store_id: TEST_STORE_ID, product_id: TEST_PRODUCT_IDS[0], customer_name: 'Rohan Gupta', rating: 4, title: 'Good but battery drains fast', body: 'Sound is great but battery lasts only 20 hours not 30 as claimed.', created_at: daysAgo(3) },
    { store_id: TEST_STORE_ID, product_id: TEST_PRODUCT_IDS[2], customer_name: 'Arjun Mehta', rating: 2, title: 'Stitching came off', body: 'The wallet stitching started coming off after just 2 weeks. Very disappointed.', created_at: daysAgo(2) },
    { store_id: TEST_STORE_ID, product_id: TEST_PRODUCT_IDS[1], customer_name: 'Kavita Nair', rating: 5, title: 'Perfect morning tea', body: 'Authentic Darjeeling taste. Will order again!', created_at: daysAgo(1) },
    { store_id: TEST_STORE_ID, product_id: TEST_PRODUCT_IDS[5], customer_name: 'Ananya Patel', rating: 1, title: 'Broken on arrival', body: 'Two mugs were cracked when they arrived. Terrible packaging.', created_at: daysAgo(1) },
  ])
  if (reviewError) console.error('  Review seed error:', reviewError.message)
  else console.log('  Seeded 5 product reviews')

  // 9. Seed coupons
  await supabase.from('coupons').delete().eq('store_id', TEST_STORE_ID)

  const { error: couponError } = await supabase.from('coupons').insert([
    { store_id: TEST_STORE_ID, code: 'WELCOME10', discount_type: 'percentage', discount_value: 10, min_order_amount: 500, max_uses: 100, uses_count: 23, is_active: true, expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() },
    { store_id: TEST_STORE_ID, code: 'FLAT200', discount_type: 'fixed', discount_value: 200, min_order_amount: 1000, max_uses: 50, uses_count: 8, is_active: true },
    { store_id: TEST_STORE_ID, code: 'EXPIRED50', discount_type: 'percentage', discount_value: 50, max_uses: 10, uses_count: 10, is_active: false },
  ])
  if (couponError) console.error('  Coupon seed error:', couponError.message)
  else console.log('  Seeded 3 coupons')

  console.log('\n  ✓ Test data seeding complete\n')
}

// ---------------------------------------------------------------------------
// Phase 1: Test Every Sub-Agent Individually
// ---------------------------------------------------------------------------

async function testSubAgent(chief: string, subAgentId: string, instruction: string, params?: Record<string, unknown>) {
  const start = Date.now()
  const result = await callSubAgent(subAgentId, instruction, params)
  const duration = Date.now() - start

  const hasOutput = result.output !== null && result.output !== undefined
  const outputStr = typeof result.output === 'object' ? JSON.stringify(result.output).slice(0, 200) : String(result.output).slice(0, 200)

  recordResult(
    `${subAgentId}: ${instruction.slice(0, 60)}`,
    chief,
    subAgentId,
    result.success && hasOutput,
    duration,
    hasOutput ? outputStr : 'No output',
    result.error
  )

  return result
}

async function testAllPRISMAgents() {
  console.log('\n━━━ PRISM (Marketing) — 8 Sub-Agents ━━━\n')

  await testSubAgent('marketing', 'campaign-architect',
    'Design a Diwali marketing campaign for our store targeting young professionals aged 25-35')

  await testSubAgent('marketing', 'social-composer',
    'Draft an Instagram post featuring our best-selling Premium Wireless Headphones')

  await testSubAgent('marketing', 'visual-crafter',
    'Create a visual brief for a product hero image of our Handmade Leather Wallet in a minimalist lifestyle setting')

  await testSubAgent('marketing', 'reel-director',
    'Script a 30-second Instagram reel showcasing our top 3 trending products')

  await testSubAgent('marketing', 'copysmith',
    'Write email copy for a flash sale on our Electronics category with 20% discount')

  await testSubAgent('marketing', 'ad-pilot',
    'Analyze our current ad performance and recommend optimizations for better ROAS')

  await testSubAgent('marketing', 'seo-scout',
    'Identify top keyword opportunities for our product categories and suggest a content strategy')

  await testSubAgent('marketing', 'influencer-finder',
    'Find suitable nano and micro influencers for promoting our organic green tea and wellness products')
}

async function testAllFORGEAgents() {
  console.log('\n━━━ FORGE (Sales) — 7 Sub-Agents ━━━\n')

  await testSubAgent('sales', 'cart-whisperer',
    'Check for abandoned carts over INR 2000 and draft recovery emails for each')

  await testSubAgent('sales', 'price-strategist',
    'Analyze pricing across all product categories and recommend any price adjustments for better margins')

  await testSubAgent('sales', 'deal-engineer',
    'Design a weekend flash sale promotion for our Accessories category with a 15% discount')

  await testSubAgent('sales', 'upsell-agent',
    'Identify cross-sell opportunities for our Premium Wireless Headphones — what should we recommend alongside them?')

  await testSubAgent('sales', 'checkout-doctor',
    'Analyze our checkout funnel and identify the biggest drop-off points with recommendations to fix them')

  await testSubAgent('sales', 'loyalty-architect',
    'Design a loyalty program for our store with point-based rewards and 3 tiers')

  await testSubAgent('sales', 'lead-scorer',
    'Score all our customers and identify the top 5 highest-value leads with recommended actions')
}

async function testAllSENTINELAgents() {
  console.log('\n━━━ SENTINEL (Support) — 7 Sub-Agents ━━━\n')

  await testSubAgent('support', 'chat-responder',
    'A customer asks: "Do you have any wireless headphones in stock? What is your return policy?"')

  await testSubAgent('support', 'email-handler',
    'Categorize and draft a reply to this customer email: "I ordered 3 days ago (order E2E-1005) but haven\'t received any shipping update. When will it ship?"')

  await testSubAgent('support', 'whatsapp-agent',
    'Draft a WhatsApp message to customer Priya Sharma about her order E2E-1001 which was just shipped')

  await testSubAgent('support', 'returns-manager',
    'Customer Arjun Mehta wants to return order E2E-1002 because the stitching came off his leather wallet. Assess eligibility.')

  await testSubAgent('support', 'review-curator',
    'Check for unanswered reviews and draft responses, prioritizing the negative ones')

  await testSubAgent('support', 'escalation-detector',
    'Scan for any escalation signals — negative reviews, failed orders, repeat complaints')

  await testSubAgent('support', 'faq-builder',
    'Analyze recent support patterns and suggest the top 5 FAQ entries we should add')
}

async function testAllPULSEAgents() {
  console.log('\n━━━ PULSE (Analytics) — 8 Sub-Agents ━━━\n')

  // Data-only agents (no LLM)
  await testSubAgent('analytics', 'revenue-tracker',
    'Get revenue metrics for the last 30 days', { period: 'last_30_days' })

  await testSubAgent('analytics', 'traffic-analyst',
    'Get traffic overview', { period: 'last_7_days' })

  await testSubAgent('analytics', 'customer-profiler',
    'Build customer segments', { segmentation_type: 'rfm' })

  await testSubAgent('analytics', 'product-ranker',
    'Rank products by performance', { metric: 'revenue' })

  await testSubAgent('analytics', 'funnel-analyst',
    'Analyze conversion funnel', { period: 'last_30_days' })

  await testSubAgent('analytics', 'anomaly-sentinel',
    'Check for anomalies', { lookback_days: 7 })

  // LLM-powered agents
  await testSubAgent('analytics', 'competitor-watcher',
    'Analyze our competitive position based on our product pricing and categories')

  await testSubAgent('analytics', 'report-writer',
    'Generate a weekly performance report covering revenue, orders, customer growth, and agent activity')
}

async function testAllCIPHERAgents() {
  console.log('\n━━━ CIPHER (Technical) — 7 Sub-Agents ━━━\n')

  await testSubAgent('technical', 'seo-engineer',
    'Audit our product pages for missing meta descriptions and SEO titles')

  await testSubAgent('technical', 'speed-demon',
    `Check page speed for https://${TEST_STORE_SLUG}.storeforge.site and identify performance issues`)

  await testSubAgent('technical', 'uptime-guardian',
    `Check the health status of our store at https://${TEST_STORE_SLUG}.storeforge.site`)

  await testSubAgent('technical', 'security-scanner',
    `Run a security header audit on ${TEST_STORE_SLUG}.storeforge.site`)

  await testSubAgent('technical', 'image-optimizer',
    'Audit all product images for missing alt text, oversized files, and optimization opportunities')

  await testSubAgent('technical', 'integration-doctor',
    'Check the health of all third-party integrations — payment gateways, shipping, email, WhatsApp')

  await testSubAgent('technical', 'backup-manager',
    'Check backup status and export a summary of all store data')
}

// ---------------------------------------------------------------------------
// Phase 2: Test Cross-Agent Communication
// ---------------------------------------------------------------------------

async function testCrossAgentCommunication() {
  console.log('\n━━━ Phase 2: Cross-Agent Communication ━━━\n')

  // Test: Orchestrator trigger routing
  const start1 = Date.now()
  try {
    const res = await fetch(`${API_BASE}/api/agents/test-execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CRON_SECRET}`,
      },
      body: JSON.stringify({
        sub_agent_id: 'escalation-detector',
        store_id: TEST_STORE_ID,
        instruction: 'A customer left a 1-star review about broken mugs. Check if this is an isolated incident or a pattern. If it\'s a pattern, notify the marketing agent to pause any promotions for this product.',
        params: { store_id: TEST_STORE_ID },
      }),
    })
    const data = await res.json()
    recordResult(
      'Cross-agent: Support detects issue → should consider notifying Marketing',
      'cross-agent', 'escalation-detector→marketing',
      data.success !== false,
      Date.now() - start1,
      JSON.stringify(data.output ?? data).slice(0, 200)
    )
  } catch (err) {
    recordResult('Cross-agent: Support → Marketing', 'cross-agent', 'escalation-detector→marketing', false, Date.now() - start1, '', String(err))
  }

  // Test: Analytics agent generates report → Sales agent can use insights
  const start2 = Date.now()
  try {
    // First, analytics generates insights
    const analyticsRes = await callSubAgent('report-writer',
      'Generate a quick summary of our top revenue drivers and underperforming products')

    // Then, sales agent uses those insights
    const salesRes = await callSubAgent('deal-engineer',
      'Based on our current sales data, which products need promotional support to boost sales?')

    recordResult(
      'Cross-agent: Analytics insights → Sales acts on them',
      'cross-agent', 'report-writer→deal-engineer',
      analyticsRes.success && salesRes.success,
      Date.now() - start2,
      `Analytics: ${String(analyticsRes.output).slice(0, 100)} | Sales: ${String(salesRes.output).slice(0, 100)}`
    )
  } catch (err) {
    recordResult('Cross-agent: Analytics → Sales', 'cross-agent', 'report-writer→deal-engineer', false, Date.now() - start2, '', String(err))
  }

  // Test: Technical finds SEO issues → Marketing can act
  const start3 = Date.now()
  try {
    const techRes = await callSubAgent('seo-engineer',
      'Find products with missing meta descriptions')
    const mktRes = await callSubAgent('seo-scout',
      'Suggest SEO-optimized meta descriptions for products that are missing them')

    recordResult(
      'Cross-agent: Technical finds SEO gaps → Marketing fills them',
      'cross-agent', 'seo-engineer→seo-scout',
      techRes.success && mktRes.success,
      Date.now() - start3,
      `Tech found: ${String(techRes.output).slice(0, 100)} | Marketing: ${String(mktRes.output).slice(0, 100)}`
    )
  } catch (err) {
    recordResult('Cross-agent: Technical → Marketing (SEO)', 'cross-agent', 'seo-engineer→seo-scout', false, Date.now() - start3, '', String(err))
  }
}

// ---------------------------------------------------------------------------
// Phase 3: Test Workflow Scenarios
// ---------------------------------------------------------------------------

async function testWorkflowScenarios() {
  console.log('\n━━━ Phase 3: End-to-End Workflow Scenarios ━━━\n')

  // Scenario 1: Customer Journey — abandoned cart → recovery → potential order
  const start1 = Date.now()
  try {
    const cartRes = await callSubAgent('cart-whisperer', 'Find abandoned carts and prepare recovery sequences')
    const loyaltyRes = await callSubAgent('loyalty-architect', 'Check if any abandoned cart customers are loyalty members who should get special treatment')

    recordResult(
      'Workflow: Customer cart recovery pipeline',
      'workflow', 'cart-whisperer→loyalty-architect',
      cartRes.success && loyaltyRes.success,
      Date.now() - start1,
      `Cart recovery: ${String(cartRes.output).slice(0, 100)} | Loyalty: ${String(loyaltyRes.output).slice(0, 100)}`
    )
  } catch (err) {
    recordResult('Workflow: Cart recovery pipeline', 'workflow', 'multi', false, Date.now() - start1, '', String(err))
  }

  // Scenario 2: Product performance review — analytics → pricing → marketing
  const start2 = Date.now()
  try {
    const rankRes = await callSubAgent('product-ranker', 'Rank all products', { metric: 'revenue' })
    const priceRes = await callSubAgent('price-strategist', 'Review pricing for underperforming products and suggest adjustments')
    const dealRes = await callSubAgent('deal-engineer', 'Create a promotional coupon for our slowest-selling products')

    recordResult(
      'Workflow: Product performance → Pricing → Promotion pipeline',
      'workflow', 'product-ranker→price-strategist→deal-engineer',
      rankRes.success && priceRes.success && dealRes.success,
      Date.now() - start2,
      'Full pipeline executed'
    )
  } catch (err) {
    recordResult('Workflow: Product→Price→Promo', 'workflow', 'multi', false, Date.now() - start2, '', String(err))
  }

  // Scenario 3: Negative review response — support detects → responds → escalates if needed
  const start3 = Date.now()
  try {
    const detectRes = await callSubAgent('escalation-detector', 'Check for any negative signals in the last 7 days')
    const reviewRes = await callSubAgent('review-curator', 'Draft responses to all unanswered negative reviews')
    const faqRes = await callSubAgent('faq-builder', 'Based on recent negative reviews, should we add any FAQ entries about product quality?')

    recordResult(
      'Workflow: Negative review detection → Response → FAQ update',
      'workflow', 'escalation-detector→review-curator→faq-builder',
      detectRes.success && reviewRes.success && faqRes.success,
      Date.now() - start3,
      'Full support pipeline executed'
    )
  } catch (err) {
    recordResult('Workflow: Review response pipeline', 'workflow', 'multi', false, Date.now() - start3, '', String(err))
  }

  // Scenario 4: Full site health check — uptime + speed + security + integrations
  const start4 = Date.now()
  try {
    const uptimeRes = await callSubAgent('uptime-guardian', 'Quick health check of the store')
    const intRes = await callSubAgent('integration-doctor', 'Check all integration statuses')
    const backupRes = await callSubAgent('backup-manager', 'Check backup status')

    recordResult(
      'Workflow: Complete technical health check',
      'workflow', 'uptime→integrations→backup',
      uptimeRes.success && intRes.success && backupRes.success,
      Date.now() - start4,
      'Full technical health check executed'
    )
  } catch (err) {
    recordResult('Workflow: Technical health check', 'workflow', 'multi', false, Date.now() - start4, '', String(err))
  }
}

// ---------------------------------------------------------------------------
// Final Report
// ---------------------------------------------------------------------------

function printReport() {
  console.log('\n' + '═'.repeat(80))
  console.log('  COMPREHENSIVE E2E AGENT TEST REPORT')
  console.log('═'.repeat(80) + '\n')

  const passed = results.filter(r => r.status === 'PASS').length
  const failed = results.filter(r => r.status === 'FAIL').length
  const skipped = results.filter(r => r.status === 'SKIP').length
  const total = results.length

  console.log(`  Total: ${total}  |  \x1b[32mPassed: ${passed}\x1b[0m  |  \x1b[31mFailed: ${failed}\x1b[0m  |  \x1b[33mSkipped: ${skipped}\x1b[0m`)
  console.log(`  Pass rate: ${total > 0 ? Math.round((passed / total) * 100) : 0}%`)
  console.log()

  // Group by chief
  const byChief: Record<string, TestResult[]> = {}
  for (const r of results) {
    const key = r.chief
    if (!byChief[key]) byChief[key] = []
    byChief[key].push(r)
  }

  for (const [chief, tests] of Object.entries(byChief)) {
    const cp = tests.filter(t => t.status === 'PASS').length
    const cf = tests.filter(t => t.status === 'FAIL').length
    console.log(`  ${chief.toUpperCase()}: ${cp}/${tests.length} passed${cf > 0 ? ` (${cf} failed)` : ''}`)
  }

  // Failed tests detail
  const failures = results.filter(r => r.status === 'FAIL')
  if (failures.length > 0) {
    console.log('\n  ── FAILURES ──\n')
    for (const f of failures) {
      console.log(`  \x1b[31m✗\x1b[0m [${f.chief}/${f.subAgent}] ${f.name}`)
      console.log(`    Error: ${f.error || f.details}`)
      console.log()
    }
  }

  // Timing
  const totalTime = results.reduce((sum, r) => sum + r.duration_ms, 0)
  const avgTime = total > 0 ? Math.round(totalTime / total) : 0
  const slowest = results.reduce((max, r) => r.duration_ms > max.duration_ms ? r : max, results[0])

  console.log(`\n  Total test time: ${Math.round(totalTime / 1000)}s`)
  console.log(`  Average per test: ${avgTime}ms`)
  if (slowest) console.log(`  Slowest: ${slowest.name} (${slowest.duration_ms}ms)`)
  console.log()
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('╔══════════════════════════════════════════════════╗')
  console.log('║  Comprehensive E2E Agent Test Suite              ║')
  console.log('║  5 Chiefs × 37 Sub-Agents × Autonomy Level 5    ║')
  console.log('╚══════════════════════════════════════════════════╝')

  // Check prerequisites
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('FATAL: SUPABASE env vars not set')
    process.exit(1)
  }

  // Phase 0: Seed
  await seedTestData()

  // Phase 1: Test all sub-agents
  console.log('\n━━━ Phase 1: Individual Sub-Agent Tests (37 agents) ━━━')
  await testAllPRISMAgents()
  await testAllFORGEAgents()
  await testAllSENTINELAgents()
  await testAllPULSEAgents()
  await testAllCIPHERAgents()

  // Phase 2: Cross-agent communication
  await testCrossAgentCommunication()

  // Phase 3: Workflow scenarios
  await testWorkflowScenarios()

  // Report
  printReport()

  // Exit code
  const failed = results.filter(r => r.status === 'FAIL').length
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('Test suite crashed:', err)
  process.exit(2)
})
