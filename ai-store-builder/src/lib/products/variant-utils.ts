// Client-safe variant utility functions
// These functions don't require server-side code and can be used in client components

import type { ProductVariant } from '@/lib/types/variant'
import type { Product } from '@/lib/types/store'

/**
 * Format variant attributes as display string
 */
export function formatVariantAttributes(
  attributes: Record<string, string>
): string {
  return Object.entries(attributes)
    .map(([, value]) => value)
    .join(' / ')
}

/**
 * Find variant by attributes
 */
export function findVariantByAttributes(
  variants: ProductVariant[],
  attributes: Record<string, string>
): ProductVariant | undefined {
  return variants.find(v => {
    const keys = Object.keys(attributes)
    if (keys.length !== Object.keys(v.attributes).length) return false
    return keys.every(key => v.attributes[key] === attributes[key])
  })
}

/**
 * Get effective price for a variant (variant price or base product price)
 */
export function getEffectivePrice(
  product: Product,
  variant?: ProductVariant | null
): number {
  if (variant?.price != null) {
    return variant.price
  }
  return product.price
}

/**
 * Get effective quantity for a variant or product
 */
export function getEffectiveQuantity(
  product: Product,
  variant?: ProductVariant | null
): number {
  if (variant) {
    return variant.quantity
  }
  return product.quantity
}

/**
 * Check if a variant is available (in stock and active)
 */
export function isVariantAvailable(
  variant: ProductVariant,
  trackQuantity: boolean = true
): boolean {
  if (variant.status !== 'active') return false
  if (!trackQuantity || !variant.track_quantity) return true
  return variant.quantity > 0
}

/**
 * Generate all variant combinations from options
 */
export function generateVariantCombinations(
  options: { name: string; values: { value: string }[] }[]
): Record<string, string>[] {
  if (options.length === 0) return []

  const combinations: Record<string, string>[] = []

  function generate(
    currentIndex: number,
    currentCombination: Record<string, string>
  ) {
    if (currentIndex >= options.length) {
      combinations.push({ ...currentCombination })
      return
    }

    const option = options[currentIndex]
    for (const value of option.values) {
      currentCombination[option.name] = value.value
      generate(currentIndex + 1, currentCombination)
    }
  }

  generate(0, {})
  return combinations
}
