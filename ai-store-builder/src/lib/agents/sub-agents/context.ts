import { getSupabaseAdmin } from '@/lib/supabase/admin'
import type { StoreContext, ProductSummary, OrderSummary, CustomerSummary } from './types'
import type { AutonomyLevel, AgentAction } from '@/lib/agents/types'

export async function loadStoreContext(storeId: string, autonomyLevel: AutonomyLevel = 3): Promise<StoreContext> {
  const supabase = getSupabaseAdmin()

  const { data: store } = await supabase
    .from('stores')
    .select('name, slug, blueprint, status')
    .eq('id', storeId)
    .single()

  if (!store) {
    throw new Error(`Store not found: ${storeId}`)
  }

  const blueprint = (store.blueprint || {}) as Record<string, any>

  return {
    storeId,
    storeName: store.name || 'My Store',
    storeSlug: store.slug || '',
    category: blueprint.business_type || blueprint.category || 'General',
    description: blueprint.description || '',
    brandVibe: blueprint.brand_vibe || 'modern',
    primaryColor: blueprint.primary_color || '#6366f1',
    currency: blueprint.location?.currency || 'INR',
    autonomyLevel,
    products: async () => {
      const { data } = await supabase
        .from('products')
        .select('id, title, price, inventory, status, category, created_at')
        .eq('store_id', storeId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(100)
      return (data as ProductSummary[]) || []
    },
    orders: async () => {
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, total_amount, order_status, payment_status, customer_name, created_at')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .limit(100)
      return (data as OrderSummary[]) || []
    },
    customers: async () => {
      const { data } = await supabase
        .from('customers')
        .select('id, name, email, created_at')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .limit(100)
      // Note: total_orders and total_spent would need aggregation - simplified for now
      return (data || []).map(c => ({ ...c, total_orders: 0, total_spent: 0 } as CustomerSummary))
    },
    recentActions: async () => {
      const { data } = await supabase
        .from('agent_actions')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .limit(50)
      return (data as AgentAction[]) || []
    },
  }
}
