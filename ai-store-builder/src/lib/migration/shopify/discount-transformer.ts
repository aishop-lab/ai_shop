// Transform Shopify discounts to StoreForge normalized coupon format

import type { ShopifyDiscount, MigrationCoupon } from '../types'

/**
 * Extract numeric ID from Shopify GID
 */
function extractGid(gid: string): string {
  const parts = gid.split('/')
  return parts[parts.length - 1]
}

/**
 * Transform a Shopify discount to StoreForge coupon format.
 * Only imports code-based discounts (DiscountCodeBasic and DiscountCodeFreeShipping).
 * Automatic discounts are skipped.
 */
export function transformShopifyDiscount(discount: ShopifyDiscount): MigrationCoupon | null {
  const typename = discount.__typename

  // Only handle code-based discounts
  if (typename !== 'DiscountCodeBasic' && typename !== 'DiscountCodeFreeShipping') {
    return null
  }

  // Must have at least one code
  const code = discount.codes?.edges?.[0]?.node?.code
  if (!code) return null

  let discountType: 'percentage' | 'fixed_amount' | 'free_shipping'
  let discountValue = 0

  if (typename === 'DiscountCodeFreeShipping') {
    discountType = 'free_shipping'
    discountValue = 0
  } else if (discount.customerGets?.value) {
    const value = discount.customerGets.value
    if (value.__typename === 'DiscountPercentage' && value.percentage != null) {
      discountType = 'percentage'
      // Shopify stores percentage as decimal (0.10 = 10%)
      discountValue = value.percentage * 100
    } else if (value.__typename === 'DiscountAmount' && value.amount?.amount) {
      discountType = 'fixed_amount'
      discountValue = parseFloat(value.amount.amount)
    } else {
      return null // Unknown value type
    }
  } else {
    return null // No value info
  }

  // Parse minimum requirement
  let minimumOrderValue: number | undefined
  if (discount.minimumRequirement?.__typename === 'DiscountMinimumSubtotal' &&
      discount.minimumRequirement.greaterThanOrEqualToSubtotal?.amount) {
    minimumOrderValue = parseFloat(discount.minimumRequirement.greaterThanOrEqualToSubtotal.amount)
  }

  return {
    source_id: extractGid(discount.id),
    code: code.toUpperCase(),
    description: discount.title || undefined,
    discount_type: discountType,
    discount_value: discountValue,
    minimum_order_value: minimumOrderValue,
    usage_limit: discount.usageLimit || undefined,
    usage_count: discount.asyncUsageCount || 0,
    starts_at: discount.startsAt || undefined,
    expires_at: discount.endsAt || undefined,
    active: discount.status === 'ACTIVE',
  }
}
