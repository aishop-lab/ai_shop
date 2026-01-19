// Product Variant TypeScript Types

import type { Product, ProductImage } from './store'

/**
 * Variant option (e.g., "Size", "Color", "Material")
 */
export interface ProductVariantOption {
  id: string
  product_id: string
  name: string              // "Size", "Color", "Material"
  position: number
  values: ProductVariantOptionValue[]
}

/**
 * Option value (e.g., "S", "M", "L", "Red", "Blue")
 */
export interface ProductVariantOptionValue {
  id: string
  option_id: string
  value: string             // "S", "Red", "Cotton"
  color_code?: string       // "#FF0000" for color swatches
  position: number
}

/**
 * Product variant (actual SKU combination)
 */
export interface ProductVariant {
  id: string
  product_id: string
  attributes: Record<string, string>  // {"Size": "S", "Color": "Red"}
  price?: number | null               // NULL = use base price
  compare_at_price?: number | null
  sku?: string
  barcode?: string
  quantity: number
  track_quantity: boolean
  weight?: number
  image_id?: string
  image?: ProductImage                // Populated when fetched
  is_default: boolean
  status: 'active' | 'disabled'
  created_at?: string
  updated_at?: string
}

/**
 * Product with variants included
 */
export interface ProductWithVariants extends Product {
  has_variants: boolean
  variant_options?: ProductVariantOption[]
  variants?: ProductVariant[]
  variant_count?: number              // Total active variant count
  total_inventory?: number            // Sum of all variant quantities
}

// ============================================
// API Request/Response Types
// ============================================

/**
 * Input for creating/updating variant options
 */
export interface VariantOptionInput {
  id?: string                 // For updates
  name: string
  position?: number
  values: VariantOptionValueInput[]
}

/**
 * Input for creating/updating option values
 */
export interface VariantOptionValueInput {
  id?: string                 // For updates
  value: string
  color_code?: string
  position?: number
}

/**
 * Input for creating/updating variants
 */
export interface VariantInput {
  id?: string                 // For updates
  attributes: Record<string, string>
  price?: number | null
  compare_at_price?: number | null
  sku?: string
  barcode?: string
  quantity?: number
  track_quantity?: boolean
  weight?: number
  image_id?: string | null
  is_default?: boolean
  status?: 'active' | 'disabled'
}

/**
 * Request to update all variants for a product
 */
export interface UpdateVariantsRequest {
  options: VariantOptionInput[]
  variants: VariantInput[]
}

/**
 * Response from variants API
 */
export interface VariantsResponse {
  success: boolean
  options?: ProductVariantOption[]
  variants?: ProductVariant[]
  error?: string
}

/**
 * Request to generate variant combinations
 */
export interface GenerateVariantsRequest {
  preserve_existing?: boolean   // Keep existing variant data (price, sku, etc.)
  default_price?: number | null // Default price for new variants
  default_quantity?: number     // Default quantity for new variants
}

// ============================================
// Helper Types
// ============================================

/**
 * Variant selection state (for storefront)
 */
export interface VariantSelection {
  [optionName: string]: string  // {"Size": "S", "Color": "Red"}
}

/**
 * Result of finding a variant by selection
 */
export interface VariantMatch {
  variant: ProductVariant | null
  isComplete: boolean           // All options selected
  availableValues: Record<string, string[]>  // Available values per option
}

/**
 * Variant with computed display info
 */
export interface VariantDisplayInfo extends ProductVariant {
  displayTitle: string          // "S / Red"
  effectivePrice: number        // Variant price or base price
  effectiveCompareAtPrice?: number
  isAvailable: boolean          // In stock and active
  imageUrl?: string             // From variant image or product
}

// ============================================
// Utility Functions (Type Guards)
// ============================================

export function isProductWithVariants(product: Product | ProductWithVariants): product is ProductWithVariants {
  return 'has_variants' in product && product.has_variants === true
}

export function hasVariantOptions(product: ProductWithVariants): boolean {
  return !!product.variant_options && product.variant_options.length > 0
}

export function hasVariants(product: ProductWithVariants): boolean {
  return !!product.variants && product.variants.length > 0
}

// ============================================
// Default Values
// ============================================

export const DEFAULT_VARIANT_OPTIONS: string[] = [
  'Size',
  'Color',
  'Material',
  'Style',
  'Pattern',
]

export const COMMON_SIZE_VALUES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']
export const COMMON_SHOE_SIZES = ['5', '6', '7', '8', '9', '10', '11', '12']

export const COMMON_COLORS: Array<{ name: string; code: string }> = [
  { name: 'Black', code: '#000000' },
  { name: 'White', code: '#FFFFFF' },
  { name: 'Red', code: '#EF4444' },
  { name: 'Blue', code: '#3B82F6' },
  { name: 'Green', code: '#22C55E' },
  { name: 'Yellow', code: '#EAB308' },
  { name: 'Orange', code: '#F97316' },
  { name: 'Purple', code: '#A855F7' },
  { name: 'Pink', code: '#EC4899' },
  { name: 'Gray', code: '#6B7280' },
  { name: 'Navy', code: '#1E3A5F' },
  { name: 'Beige', code: '#F5F5DC' },
  { name: 'Brown', code: '#92400E' },
  { name: 'Maroon', code: '#7F1D1D' },
  { name: 'Teal', code: '#14B8A6' },
]

export const COMMON_MATERIALS = [
  'Cotton',
  'Polyester',
  'Silk',
  'Wool',
  'Linen',
  'Denim',
  'Leather',
  'Synthetic',
  'Blended',
]
