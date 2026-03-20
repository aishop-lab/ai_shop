// src/lib/agents/support/knowledge-base.ts
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export interface StoreKnowledgeBase {
  storeName: string
  storeDescription: string
  returnPolicy: string
  shippingPolicy: string
  privacyPolicy: string
  productSummary: {
    totalProducts: number
    categories: string[]
    priceRange: { min: number; max: number }
  }
  shippingProviders: string[]
  paymentMethods: string[]
  contactInfo: { email?: string; phone?: string }
}

// Cache with 1-hour TTL
const cache = new Map<string, { data: StoreKnowledgeBase; expires: number }>()

export async function buildKnowledgeBase(storeId: string): Promise<StoreKnowledgeBase> {
  const now = Date.now()
  const cached = cache.get(storeId)
  if (cached && cached.expires > now) {
    return cached.data
  }

  const supabase = getSupabaseAdmin()

  // Fetch store info
  const { data: store } = await supabase
    .from('stores')
    .select('name, description, blueprint, notification_settings')
    .eq('id', storeId)
    .single()

  // Fetch product summary
  const { data: products } = await supabase
    .from('products')
    .select('price, categories')
    .eq('store_id', storeId)
    .eq('status', 'active')
    .eq('is_demo', false)

  // Build product summary
  const totalProducts = products?.length ?? 0
  const categoriesSet = new Set<string>()
  let priceMin = Infinity
  let priceMax = 0

  for (const p of products ?? []) {
    const price = typeof p.price === 'number' ? p.price : parseFloat(p.price ?? '0')
    if (price > 0) {
      if (price < priceMin) priceMin = price
      if (price > priceMax) priceMax = price
    }
    if (Array.isArray(p.categories)) {
      for (const cat of p.categories) {
        if (cat) categoriesSet.add(cat)
      }
    }
  }

  const blueprint = (store?.blueprint ?? {}) as Record<string, unknown>
  const policies = (blueprint.policies ?? {}) as Record<string, string>
  const location = (blueprint.location ?? {}) as Record<string, unknown>
  const contact = (blueprint.contact ?? {}) as Record<string, string>
  const shippingProviders = (blueprint.shipping_providers ?? []) as string[]
  const paymentMethods: string[] = []

  // Detect payment methods from blueprint/settings
  const currency = (location.currency as string) ?? 'INR'
  if (currency === 'INR') {
    paymentMethods.push('Razorpay (UPI, Cards, Net Banking, COD)')
  } else {
    paymentMethods.push('Stripe (International Cards)')
  }

  const kb: StoreKnowledgeBase = {
    storeName: store?.name ?? 'Our Store',
    storeDescription: store?.description ?? '',
    returnPolicy: policies.return_policy ?? 'Please contact us for returns within 7 days of delivery.',
    shippingPolicy: policies.shipping_policy ?? 'We ship within 2-5 business days.',
    privacyPolicy: policies.privacy_policy ?? 'We value your privacy and protect your personal information.',
    productSummary: {
      totalProducts,
      categories: Array.from(categoriesSet),
      priceRange: {
        min: priceMin === Infinity ? 0 : priceMin,
        max: priceMax,
      },
    },
    shippingProviders: shippingProviders.length > 0 ? shippingProviders : ['Standard Delivery'],
    paymentMethods,
    contactInfo: {
      email: contact.email ?? (store?.notification_settings as Record<string, string> | null)?.email,
      phone: contact.phone,
    },
  }

  cache.set(storeId, { data: kb, expires: now + 60 * 60 * 1000 })
  return kb
}

export function formatKnowledgeBaseForPrompt(kb: StoreKnowledgeBase): string {
  const lines: string[] = []

  lines.push(`**Store**: ${kb.storeName}`)
  if (kb.storeDescription) {
    lines.push(`**About**: ${kb.storeDescription}`)
  }

  lines.push('')
  lines.push('### Policies')
  lines.push(`**Return Policy**: ${kb.returnPolicy}`)
  lines.push(`**Shipping Policy**: ${kb.shippingPolicy}`)
  lines.push(`**Privacy Policy**: ${kb.privacyPolicy}`)

  lines.push('')
  lines.push('### Product Catalog')
  lines.push(`- Total active products: ${kb.productSummary.totalProducts}`)
  if (kb.productSummary.categories.length > 0) {
    lines.push(`- Categories: ${kb.productSummary.categories.join(', ')}`)
  }
  if (kb.productSummary.priceRange.max > 0) {
    lines.push(
      `- Price range: ₹${kb.productSummary.priceRange.min} – ₹${kb.productSummary.priceRange.max}`
    )
  }

  lines.push('')
  lines.push('### Logistics')
  lines.push(`**Shipping Providers**: ${kb.shippingProviders.join(', ')}`)
  lines.push(`**Payment Methods**: ${kb.paymentMethods.join(', ')}`)

  if (kb.contactInfo.email || kb.contactInfo.phone) {
    lines.push('')
    lines.push('### Contact')
    if (kb.contactInfo.email) lines.push(`- Email: ${kb.contactInfo.email}`)
    if (kb.contactInfo.phone) lines.push(`- Phone: ${kb.contactInfo.phone}`)
  }

  return lines.join('\n')
}
