// Cart Calculation Utilities

import type { StoreSettings } from '@/lib/types/store'
import type { ValidatedCartItem, CartTotals } from '@/lib/types/cart'
import { calculateZoneShipping } from '@/lib/shipping/zones'

/**
 * Calculate cart subtotal from validated items
 */
export function calculateSubtotal(items: ValidatedCartItem[]): number {
  return items.reduce((total, item) => {
    return total + item.subtotal
  }, 0)
}

/**
 * Calculate total weight from items
 */
export function calculateTotalWeight(items: ValidatedCartItem[]): number {
  return items.reduce((total, item) => {
    const weight = item.product.weight || 0.5  // Default 0.5kg if not specified
    return total + (weight * item.quantity)
  }, 0)
}

/**
 * Calculate shipping cost based on store settings
 * Supports both simple flat rate and zone-based pricing
 */
export function calculateShipping(
  subtotal: number,
  settings: StoreSettings,
  paymentMethod?: string,
  shippingAddress?: { state?: string; pincode?: string },
  totalWeight?: number
): number {
  const shippingSettings = settings.shipping || {
    free_shipping_threshold: 999,
    flat_rate_national: 49,
    cod_enabled: true,
    cod_fee: 20
  }

  // If zone-based shipping is configured and we have address info, use it
  if (shippingSettings.config?.use_zones && shippingAddress?.state && shippingAddress?.pincode) {
    const zoneResult = calculateZoneShipping(
      shippingAddress.state,
      shippingAddress.pincode,
      settings,
      {
        subtotal,
        paymentMethod: paymentMethod as 'razorpay' | 'cod' | undefined,
        totalWeight,
      }
    )
    return zoneResult.totalShipping
  }

  // Fall back to simple flat rate calculation
  // Free shipping if above threshold
  if (subtotal >= shippingSettings.free_shipping_threshold) {
    // Still add COD fee if applicable
    if (paymentMethod === 'cod' && shippingSettings.cod_enabled && shippingSettings.cod_fee) {
      return shippingSettings.cod_fee
    }
    return 0
  }

  let shipping = shippingSettings.flat_rate_national

  // Add COD fee if applicable
  if (paymentMethod === 'cod' && shippingSettings.cod_enabled && shippingSettings.cod_fee) {
    shipping += shippingSettings.cod_fee
  }

  return shipping
}

/**
 * Calculate tax (placeholder for future implementation)
 * Currently returns 0 - can be extended for GST calculation
 */
export function calculateTax(
  subtotal: number,
  settings: StoreSettings
): number {
  // Tax calculation placeholder
  // Can be implemented later with GST rates
  // Example: return subtotal * 0.18 for 18% GST
  return 0
}

/**
 * Calculate discount (placeholder for coupon system)
 */
export function calculateDiscount(
  subtotal: number,
  couponCode?: string
): number {
  // Coupon validation placeholder
  // Will be implemented in Phase 2 (Slice 17)
  return 0
}

/**
 * Calculate complete cart totals
 */
export function calculateCartTotal(
  items: ValidatedCartItem[],
  settings: StoreSettings,
  paymentMethod?: string,
  couponCode?: string,
  shippingAddress?: { state?: string; pincode?: string }
): CartTotals {
  const subtotal = calculateSubtotal(items)
  const totalWeight = calculateTotalWeight(items)
  const shipping = items.length > 0
    ? calculateShipping(subtotal, settings, paymentMethod, shippingAddress, totalWeight)
    : 0
  const tax = calculateTax(subtotal, settings)
  const discount = calculateDiscount(subtotal, couponCode)

  const total = Math.max(0, subtotal + shipping + tax - discount)

  return {
    subtotal,
    shipping,
    tax,
    discount,
    total
  }
}

/**
 * Format price for display (helper)
 */
export function formatPrice(price: number, currency: string = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(price)
}

/**
 * Calculate savings from compare_at_price
 */
export function calculateSavings(items: ValidatedCartItem[]): number {
  return items.reduce((total, item) => {
    const comparePrice = item.product.compare_at_price || item.product.price
    const savings = (comparePrice - item.product.price) * item.quantity
    return total + Math.max(0, savings)
  }, 0)
}

/**
 * Check if cart qualifies for free shipping
 */
export function qualifiesForFreeShipping(
  subtotal: number,
  settings: StoreSettings
): boolean {
  const threshold = settings.shipping?.free_shipping_threshold || 999
  return subtotal >= threshold
}

/**
 * Calculate amount needed for free shipping
 */
export function amountToFreeShipping(
  subtotal: number,
  settings: StoreSettings
): number {
  const threshold = settings.shipping?.free_shipping_threshold || 999
  const remaining = threshold - subtotal
  return Math.max(0, remaining)
}
