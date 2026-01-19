// Cart TypeScript Types

import type { Product } from './store'
import type { ProductVariant } from './variant'

/**
 * Cart item input from client (minimal data for validation)
 */
export interface CartItemInput {
  product_id: string
  variant_id?: string           // Optional variant ID
  quantity: number
}

/**
 * Validated cart item with full product data and issues
 */
export interface ValidatedCartItem {
  product_id: string
  variant_id?: string
  variant?: ProductVariant        // Full variant data if applicable
  variant_attributes?: Record<string, string>  // {"Size": "S", "Color": "Red"}
  product: Product
  quantity: number
  available_quantity: number
  price: number                   // Effective price (variant or base)
  subtotal: number
  issues?: string[]  // "Out of stock", "Only X available", "Price changed"
}

/**
 * Cart totals breakdown
 */
export interface CartTotals {
  subtotal: number
  shipping: number
  tax: number
  discount: number
  total: number
}

/**
 * Cart validation API response
 */
export interface CartValidationResult {
  success: boolean
  valid: boolean
  items: ValidatedCartItem[]
  totals: CartTotals
  errors?: string[]
}

/**
 * Cart validation API request
 */
export interface CartValidationRequest {
  store_id: string
  items: CartItemInput[]
  payment_method?: string
  coupon_code?: string
}

/**
 * Inventory check API request
 */
export interface InventoryCheckRequest {
  items: CartItemInput[]
}

/**
 * Inventory check item result
 */
export interface InventoryCheckItem {
  product_id: string
  variant_id?: string
  variant_attributes?: Record<string, string>
  available_quantity: number
  requested_quantity: number
  in_stock: boolean
}

/**
 * Inventory check API response
 */
export interface InventoryCheckResult {
  success: boolean
  available: boolean
  items: InventoryCheckItem[]
}
