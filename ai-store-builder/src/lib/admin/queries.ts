/**
 * Admin Database Queries
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin'

export interface PlatformStats {
  totalStores: number
  activeStores: number
  draftStores: number
  suspendedStores: number
  totalSellers: number
  onboardedSellers: number
  totalOrders: number
  todayOrders: number
  totalRevenue: number
  todayRevenue: number
  totalCustomers: number
  totalProducts: number
}

export interface StoreWithDetails {
  id: string
  name: string
  slug: string
  status: string
  logo_url: string | null
  created_at: string
  activated_at: string | null
  owner_id: string
  owner_email: string
  owner_name: string
  products_count: number
  orders_count: number
  revenue: number
}

export interface SellerDetails {
  id: string
  email: string
  full_name: string
  phone: string | null
  created_at: string
  last_login_at: string | null
  login_count: number
  onboarding_completed: boolean
  store_name: string | null
  store_slug: string | null
  store_status: string | null
}

export interface CustomerDetails {
  id: string
  email: string
  name: string
  phone: string | null
  created_at: string
  store_id: string
  store_name: string
  store_slug: string
  orders_count: number
  total_spent: number
}

export interface OrderWithDetails {
  id: string
  order_number: string
  customer_name: string
  customer_email: string
  total_amount: number
  payment_status: string
  order_status: string
  created_at: string
  store_id: string
  store_name: string
  store_slug: string
}

export interface ProductWithStore {
  id: string
  title: string
  price: number
  stock_quantity: number
  status: string
  created_at: string
  store_id: string
  store_name: string
  store_slug: string
  image_url: string | null
}

export interface RevenueTrendData {
  date: string
  revenue: number
  orders: number
}

export interface SignupsTrendData {
  date: string
  sellers: number
  stores: number
  customers: number
}

export interface TopStore {
  id: string
  name: string
  slug: string
  logo_url: string | null
  revenue: number
  orders_count: number
}

/**
 * Get platform overview stats
 */
export async function getPlatformStats(): Promise<PlatformStats> {
  const supabase = getSupabaseAdmin()
  const today = new Date().toISOString().split('T')[0]

  // Run queries in parallel
  const [
    storesResult,
    sellersResult,
    ordersResult,
    todayOrdersResult,
    customersResult,
    productsResult
  ] = await Promise.all([
    // Stores by status
    supabase.from('stores').select('status'),
    // Sellers
    supabase.from('profiles').select('onboarding_completed').eq('role', 'seller'),
    // Total orders + revenue (paid)
    supabase.from('orders').select('total_amount, payment_status'),
    // Today's orders
    supabase.from('orders').select('total_amount').gte('created_at', today).eq('payment_status', 'paid'),
    // Total customers
    supabase.from('customers').select('id', { count: 'exact', head: true }),
    // Total products
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'published')
  ])

  const stores = storesResult.data || []
  const sellers = sellersResult.data || []
  const orders = ordersResult.data || []
  const todayOrders = todayOrdersResult.data || []

  const paidOrders = orders.filter(o => o.payment_status === 'paid')
  const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
  const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)

  return {
    totalStores: stores.length,
    activeStores: stores.filter(s => s.status === 'active').length,
    draftStores: stores.filter(s => s.status === 'draft').length,
    suspendedStores: stores.filter(s => s.status === 'suspended').length,
    totalSellers: sellers.length,
    onboardedSellers: sellers.filter(s => s.onboarding_completed).length,
    totalOrders: orders.length,
    todayOrders: todayOrders.length,
    totalRevenue,
    todayRevenue,
    totalCustomers: customersResult.count || 0,
    totalProducts: productsResult.count || 0
  }
}

/**
 * Get stores with details for admin list
 */
export async function getStoresWithDetails(options: {
  page?: number
  limit?: number
  search?: string
  status?: string
}): Promise<{ stores: StoreWithDetails[]; total: number }> {
  const supabase = getSupabaseAdmin()
  const { page = 1, limit = 20, search, status } = options
  const offset = (page - 1) * limit

  // Build query - fetch stores without join first
  let query = supabase
    .from('stores')
    .select('id, name, slug, status, logo_url, created_at, activated_at, owner_id', { count: 'exact' })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`)
  }

  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

  const { data: stores, count, error } = await query

  if (error) {
    console.error('Error fetching stores:', error)
    return { stores: [], total: 0 }
  }

  if (!stores || stores.length === 0) {
    return { stores: [], total: count || 0 }
  }

  // Get owner IDs and store IDs
  const ownerIds = stores.map(s => s.owner_id)
  const storeIds = stores.map(s => s.id)

  // Fetch profiles, products, and orders in parallel
  const [profilesResult, productsResult, ordersResult] = await Promise.all([
    supabase.from('profiles').select('id, email, full_name').in('id', ownerIds),
    supabase.from('products').select('store_id').in('store_id', storeIds),
    supabase.from('orders').select('store_id, total_amount, payment_status').in('store_id', storeIds)
  ])

  // Build lookup maps
  const profilesById: Record<string, { email: string; full_name: string }> = {}
  for (const p of profilesResult.data || []) {
    profilesById[p.id] = { email: p.email, full_name: p.full_name }
  }

  const productsCounts: Record<string, number> = {}
  const ordersCounts: Record<string, number> = {}
  const revenues: Record<string, number> = {}

  for (const p of productsResult.data || []) {
    productsCounts[p.store_id] = (productsCounts[p.store_id] || 0) + 1
  }

  for (const o of ordersResult.data || []) {
    ordersCounts[o.store_id] = (ordersCounts[o.store_id] || 0) + 1
    if (o.payment_status === 'paid') {
      revenues[o.store_id] = (revenues[o.store_id] || 0) + (o.total_amount || 0)
    }
  }

  const storesWithDetails: StoreWithDetails[] = stores.map(store => {
    const profile = profilesById[store.owner_id]
    return {
      id: store.id,
      name: store.name,
      slug: store.slug,
      status: store.status,
      logo_url: store.logo_url,
      created_at: store.created_at,
      activated_at: store.activated_at,
      owner_id: store.owner_id,
      owner_email: profile?.email || 'Unknown',
      owner_name: profile?.full_name || 'Unknown',
      products_count: productsCounts[store.id] || 0,
      orders_count: ordersCounts[store.id] || 0,
      revenue: revenues[store.id] || 0
    }
  })

  return { stores: storesWithDetails, total: count || 0 }
}

/**
 * Get single store details
 */
export async function getStoreDetails(storeId: string): Promise<StoreWithDetails | null> {
  const supabase = getSupabaseAdmin()

  const { data: store, error } = await supabase
    .from('stores')
    .select('id, name, slug, status, logo_url, created_at, activated_at, owner_id')
    .eq('id', storeId)
    .single()

  if (error || !store) {
    return null
  }

  // Get profile and aggregates in parallel
  const [profileResult, productsResult, ordersResult] = await Promise.all([
    supabase.from('profiles').select('email, full_name').eq('id', store.owner_id).single(),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('store_id', storeId),
    supabase.from('orders').select('total_amount, payment_status').eq('store_id', storeId)
  ])

  const orders = ordersResult.data || []
  const paidOrders = orders.filter(o => o.payment_status === 'paid')
  const revenue = paidOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)

  const profile = profileResult.data

  return {
    id: store.id,
    name: store.name,
    slug: store.slug,
    status: store.status,
    logo_url: store.logo_url,
    created_at: store.created_at,
    activated_at: store.activated_at,
    owner_id: store.owner_id,
    owner_email: profile?.email || 'Unknown',
    owner_name: profile?.full_name || 'Unknown',
    products_count: productsResult.count || 0,
    orders_count: orders.length,
    revenue
  }
}

/**
 * Update store status
 */
export async function updateStoreStatus(storeId: string, status: 'active' | 'suspended' | 'draft') {
  const supabase = getSupabaseAdmin()

  const { error } = await supabase
    .from('stores')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', storeId)

  if (error) {
    throw new Error(`Failed to update store status: ${error.message}`)
  }

  return true
}

/**
 * Get sellers list
 */
export async function getSellers(options: {
  page?: number
  limit?: number
  search?: string
}): Promise<{ sellers: SellerDetails[]; total: number }> {
  const supabase = getSupabaseAdmin()
  const { page = 1, limit = 20, search } = options
  const offset = (page - 1) * limit

  let query = supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .eq('role', 'seller')

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
  }

  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

  const { data: profiles, count, error } = await query

  if (error) {
    console.error('Error fetching sellers:', error)
    return { sellers: [], total: 0 }
  }

  // Get store info for each seller
  const sellerIds = (profiles || []).map(p => p.id)

  if (sellerIds.length === 0) {
    return { sellers: [], total: count || 0 }
  }

  const { data: stores } = await supabase
    .from('stores')
    .select('owner_id, name, slug, status')
    .in('owner_id', sellerIds)

  const storesByOwner: Record<string, { name: string; slug: string; status: string }> = {}
  for (const store of stores || []) {
    storesByOwner[store.owner_id] = {
      name: store.name,
      slug: store.slug,
      status: store.status
    }
  }

  const sellers: SellerDetails[] = (profiles || []).map(profile => {
    const store = storesByOwner[profile.id]
    return {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      phone: profile.phone,
      created_at: profile.created_at,
      last_login_at: profile.last_login_at,
      login_count: profile.login_count || 0,
      onboarding_completed: profile.onboarding_completed,
      store_name: store?.name || null,
      store_slug: store?.slug || null,
      store_status: store?.status || null
    }
  })

  return { sellers, total: count || 0 }
}

/**
 * Get customers list
 */
export async function getCustomers(options: {
  page?: number
  limit?: number
  search?: string
  storeId?: string
}): Promise<{ customers: CustomerDetails[]; total: number }> {
  const supabase = getSupabaseAdmin()
  const { page = 1, limit = 20, search, storeId } = options
  const offset = (page - 1) * limit

  let query = supabase
    .from('customers')
    .select('id, email, name, phone, created_at, store_id', { count: 'exact' })

  if (storeId) {
    query = query.eq('store_id', storeId)
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
  }

  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

  const { data: customers, count, error } = await query

  if (error) {
    console.error('Error fetching customers:', error)
    return { customers: [], total: 0 }
  }

  if (!customers || customers.length === 0) {
    return { customers: [], total: count || 0 }
  }

  // Get store IDs and customer IDs
  const storeIds = [...new Set(customers.map(c => c.store_id))]
  const customerIds = customers.map(c => c.id)

  // Fetch stores and orders in parallel
  const [storesResult, ordersResult] = await Promise.all([
    supabase.from('stores').select('id, name, slug').in('id', storeIds),
    supabase.from('orders').select('customer_id, total_amount, payment_status').in('customer_id', customerIds)
  ])

  // Build lookup maps
  const storesById: Record<string, { name: string; slug: string }> = {}
  for (const s of storesResult.data || []) {
    storesById[s.id] = { name: s.name, slug: s.slug }
  }

  const orderStats: Record<string, { count: number; spent: number }> = {}
  for (const order of ordersResult.data || []) {
    if (!order.customer_id) continue
    if (!orderStats[order.customer_id]) {
      orderStats[order.customer_id] = { count: 0, spent: 0 }
    }
    orderStats[order.customer_id].count++
    if (order.payment_status === 'paid') {
      orderStats[order.customer_id].spent += order.total_amount || 0
    }
  }

  const result: CustomerDetails[] = customers.map(customer => {
    const store = storesById[customer.store_id]
    const stats = orderStats[customer.id] || { count: 0, spent: 0 }
    return {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      phone: customer.phone,
      created_at: customer.created_at,
      store_id: customer.store_id,
      store_name: store?.name || 'Unknown',
      store_slug: store?.slug || '',
      orders_count: stats.count,
      total_spent: stats.spent
    }
  })

  return { customers: result, total: count || 0 }
}

/**
 * Get orders list for admin
 */
export async function getAdminOrders(options: {
  page?: number
  limit?: number
  search?: string
  storeId?: string
  status?: string
  paymentStatus?: string
}): Promise<{ orders: OrderWithDetails[]; total: number }> {
  const supabase = getSupabaseAdmin()
  const { page = 1, limit = 20, search, storeId, status, paymentStatus } = options
  const offset = (page - 1) * limit

  let query = supabase
    .from('orders')
    .select('id, order_number, customer_name, customer_email, total_amount, payment_status, order_status, created_at, store_id', { count: 'exact' })

  if (storeId) {
    query = query.eq('store_id', storeId)
  }

  if (status && status !== 'all') {
    query = query.eq('order_status', status)
  }

  if (paymentStatus && paymentStatus !== 'all') {
    query = query.eq('payment_status', paymentStatus)
  }

  if (search) {
    query = query.or(`order_number.ilike.%${search}%,customer_name.ilike.%${search}%,customer_email.ilike.%${search}%`)
  }

  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

  const { data: orders, count, error } = await query

  if (error) {
    console.error('Error fetching orders:', error)
    return { orders: [], total: 0 }
  }

  if (!orders || orders.length === 0) {
    return { orders: [], total: count || 0 }
  }

  // Get unique store IDs and fetch stores
  const storeIds = [...new Set(orders.map(o => o.store_id))]
  const { data: stores } = await supabase.from('stores').select('id, name, slug').in('id', storeIds)

  const storesById: Record<string, { name: string; slug: string }> = {}
  for (const s of stores || []) {
    storesById[s.id] = { name: s.name, slug: s.slug }
  }

  const result: OrderWithDetails[] = orders.map(order => {
    const store = storesById[order.store_id]
    return {
      id: order.id,
      order_number: order.order_number,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      total_amount: order.total_amount,
      payment_status: order.payment_status,
      order_status: order.order_status,
      created_at: order.created_at,
      store_id: order.store_id,
      store_name: store?.name || 'Unknown',
      store_slug: store?.slug || ''
    }
  })

  return { orders: result, total: count || 0 }
}

/**
 * Get products list for admin
 */
export async function getAdminProducts(options: {
  page?: number
  limit?: number
  search?: string
  storeId?: string
  status?: string
}): Promise<{ products: ProductWithStore[]; total: number }> {
  const supabase = getSupabaseAdmin()
  const { page = 1, limit = 20, search, storeId, status } = options
  const offset = (page - 1) * limit

  let query = supabase
    .from('products')
    .select('id, title, price, stock_quantity, status, created_at, store_id', { count: 'exact' })

  if (storeId) {
    query = query.eq('store_id', storeId)
  }

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  if (search) {
    query = query.ilike('title', `%${search}%`)
  }

  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

  const { data: products, count, error } = await query

  if (error) {
    console.error('Error fetching products:', error)
    return { products: [], total: 0 }
  }

  if (!products || products.length === 0) {
    return { products: [], total: count || 0 }
  }

  // Get unique store IDs and product IDs
  const storeIds = [...new Set(products.map(p => p.store_id))]
  const productIds = products.map(p => p.id)

  // Fetch stores and images in parallel
  const [storesResult, imagesResult] = await Promise.all([
    supabase.from('stores').select('id, name, slug').in('id', storeIds),
    supabase.from('product_images').select('product_id, url').in('product_id', productIds).order('position', { ascending: true })
  ])

  // Build lookup maps
  const storesById: Record<string, { name: string; slug: string }> = {}
  for (const s of storesResult.data || []) {
    storesById[s.id] = { name: s.name, slug: s.slug }
  }

  const imagesByProductId: Record<string, string> = {}
  for (const img of imagesResult.data || []) {
    if (!imagesByProductId[img.product_id]) {
      imagesByProductId[img.product_id] = img.url
    }
  }

  const result: ProductWithStore[] = products.map(product => {
    const store = storesById[product.store_id]
    return {
      id: product.id,
      title: product.title,
      price: product.price,
      stock_quantity: product.stock_quantity,
      status: product.status,
      created_at: product.created_at,
      store_id: product.store_id,
      store_name: store?.name || 'Unknown',
      store_slug: store?.slug || '',
      image_url: imagesByProductId[product.id] || null
    }
  })

  return { products: result, total: count || 0 }
}

/**
 * Get revenue trend data for analytics
 */
export async function getRevenueTrend(days: number = 30): Promise<RevenueTrendData[]> {
  const supabase = getSupabaseAdmin()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data: orders, error } = await supabase
    .from('orders')
    .select('created_at, total_amount')
    .eq('payment_status', 'paid')
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching revenue trend:', error)
    return []
  }

  // Group by date
  const byDate: Record<string, { revenue: number; orders: number }> = {}

  for (const order of orders || []) {
    const date = order.created_at.split('T')[0]
    if (!byDate[date]) {
      byDate[date] = { revenue: 0, orders: 0 }
    }
    byDate[date].revenue += order.total_amount || 0
    byDate[date].orders++
  }

  // Fill in missing dates
  const result: RevenueTrendData[] = []
  const current = new Date(startDate)
  const today = new Date()

  while (current <= today) {
    const dateStr = current.toISOString().split('T')[0]
    result.push({
      date: dateStr,
      revenue: byDate[dateStr]?.revenue || 0,
      orders: byDate[dateStr]?.orders || 0
    })
    current.setDate(current.getDate() + 1)
  }

  return result
}

/**
 * Get signups trend data for analytics
 */
export async function getSignupsTrend(days: number = 30): Promise<SignupsTrendData[]> {
  const supabase = getSupabaseAdmin()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startStr = startDate.toISOString()

  const [sellersResult, storesResult, customersResult] = await Promise.all([
    supabase.from('profiles').select('created_at').eq('role', 'seller').gte('created_at', startStr),
    supabase.from('stores').select('created_at').gte('created_at', startStr),
    supabase.from('customers').select('created_at').gte('created_at', startStr)
  ])

  // Group by date
  const byDate: Record<string, { sellers: number; stores: number; customers: number }> = {}

  for (const s of sellersResult.data || []) {
    const date = s.created_at.split('T')[0]
    if (!byDate[date]) byDate[date] = { sellers: 0, stores: 0, customers: 0 }
    byDate[date].sellers++
  }

  for (const s of storesResult.data || []) {
    const date = s.created_at.split('T')[0]
    if (!byDate[date]) byDate[date] = { sellers: 0, stores: 0, customers: 0 }
    byDate[date].stores++
  }

  for (const c of customersResult.data || []) {
    const date = c.created_at.split('T')[0]
    if (!byDate[date]) byDate[date] = { sellers: 0, stores: 0, customers: 0 }
    byDate[date].customers++
  }

  // Fill in missing dates
  const result: SignupsTrendData[] = []
  const current = new Date(startDate)
  const today = new Date()

  while (current <= today) {
    const dateStr = current.toISOString().split('T')[0]
    result.push({
      date: dateStr,
      sellers: byDate[dateStr]?.sellers || 0,
      stores: byDate[dateStr]?.stores || 0,
      customers: byDate[dateStr]?.customers || 0
    })
    current.setDate(current.getDate() + 1)
  }

  return result
}

/**
 * Get top stores by revenue
 */
export async function getTopStoresByRevenue(limit: number = 10): Promise<TopStore[]> {
  const supabase = getSupabaseAdmin()

  // Get all paid orders
  const { data: orders, error } = await supabase
    .from('orders')
    .select('store_id, total_amount')
    .eq('payment_status', 'paid')

  if (error) {
    console.error('Error fetching top stores:', error)
    return []
  }

  if (!orders || orders.length === 0) {
    return []
  }

  // Aggregate by store
  const storeRevenue: Record<string, { revenue: number; orders_count: number }> = {}

  for (const order of orders) {
    if (!storeRevenue[order.store_id]) {
      storeRevenue[order.store_id] = { revenue: 0, orders_count: 0 }
    }
    storeRevenue[order.store_id].revenue += order.total_amount || 0
    storeRevenue[order.store_id].orders_count++
  }

  // Get top store IDs by revenue
  const topStoreIds = Object.entries(storeRevenue)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, limit)
    .map(([id]) => id)

  if (topStoreIds.length === 0) {
    return []
  }

  // Fetch store details
  const { data: stores } = await supabase
    .from('stores')
    .select('id, name, slug, logo_url')
    .in('id', topStoreIds)

  const storesById: Record<string, { name: string; slug: string; logo_url: string | null }> = {}
  for (const s of stores || []) {
    storesById[s.id] = { name: s.name, slug: s.slug, logo_url: s.logo_url }
  }

  // Build result maintaining revenue order
  return topStoreIds.map(storeId => {
    const store = storesById[storeId]
    const stats = storeRevenue[storeId]
    return {
      id: storeId,
      name: store?.name || 'Unknown',
      slug: store?.slug || '',
      logo_url: store?.logo_url || null,
      revenue: stats.revenue,
      orders_count: stats.orders_count
    }
  })
}

/**
 * Get recent orders for admin dashboard
 */
export async function getRecentOrders(limit: number = 10): Promise<OrderWithDetails[]> {
  const supabase = getSupabaseAdmin()

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, order_number, customer_name, customer_email, total_amount, payment_status, order_status, created_at, store_id')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching recent orders:', error)
    return []
  }

  if (!orders || orders.length === 0) {
    return []
  }

  // Get unique store IDs and fetch stores
  const storeIds = [...new Set(orders.map(o => o.store_id))]
  const { data: stores } = await supabase.from('stores').select('id, name, slug').in('id', storeIds)

  const storesById: Record<string, { name: string; slug: string }> = {}
  for (const s of stores || []) {
    storesById[s.id] = { name: s.name, slug: s.slug }
  }

  return orders.map(order => {
    const store = storesById[order.store_id]
    return {
      id: order.id,
      order_number: order.order_number,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      total_amount: order.total_amount,
      payment_status: order.payment_status,
      order_status: order.order_status,
      created_at: order.created_at,
      store_id: order.store_id,
      store_name: store?.name || 'Unknown',
      store_slug: store?.slug || ''
    }
  })
}
