// Product Variant Database Operations

import { createClient } from '@/lib/supabase/server'
import type {
  ProductVariantOption,
  ProductVariantOptionValue,
  ProductVariant,
  ProductWithVariants,
  VariantOptionInput,
  VariantInput,
} from '@/lib/types/variant'
import type { Product, ProductImage } from '@/lib/types/store'

// ============================================
// GET OPERATIONS
// ============================================

/**
 * Get variant options with their values for a product
 */
export async function getVariantOptions(
  productId: string
): Promise<ProductVariantOption[]> {
  const supabase = await createClient()

  const { data: options, error } = await supabase
    .from('product_variant_options')
    .select(`
      id,
      product_id,
      name,
      position,
      product_variant_option_values (
        id,
        option_id,
        value,
        color_code,
        position
      )
    `)
    .eq('product_id', productId)
    .order('position', { ascending: true })

  if (error) {
    console.error('Error fetching variant options:', error)
    throw new Error(`Failed to fetch variant options: ${error.message}`)
  }

  return (options || []).map(opt => ({
    id: opt.id,
    product_id: opt.product_id,
    name: opt.name,
    position: opt.position,
    values: (opt.product_variant_option_values || [])
      .sort((a, b) => a.position - b.position)
      .map(val => ({
        id: val.id,
        option_id: val.option_id,
        value: val.value,
        color_code: val.color_code || undefined,
        position: val.position,
      })),
  }))
}

/**
 * Get all variants for a product
 */
export async function getVariants(productId: string): Promise<ProductVariant[]> {
  const supabase = await createClient()

  const { data: variants, error } = await supabase
    .from('product_variants')
    .select(`
      *,
      image:product_images!image_id (
        id,
        url,
        thumbnail_url,
        alt_text
      )
    `)
    .eq('product_id', productId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching variants:', error)
    throw new Error(`Failed to fetch variants: ${error.message}`)
  }

  return (variants || []).map(transformVariant)
}

/**
 * Get a single variant by ID
 */
export async function getVariantById(variantId: string): Promise<ProductVariant | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('product_variants')
    .select(`
      *,
      image:product_images!image_id (
        id,
        url,
        thumbnail_url,
        alt_text
      )
    `)
    .eq('id', variantId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('Error fetching variant:', error)
    throw new Error(`Failed to fetch variant: ${error.message}`)
  }

  return transformVariant(data)
}

/**
 * Get product with all variant data
 */
export async function getProductWithVariants(
  productId: string
): Promise<ProductWithVariants | null> {
  const supabase = await createClient()

  // Fetch base product
  const { data: product, error: productError } = await supabase
    .from('products')
    .select(`
      *,
      product_images (
        id,
        url,
        thumbnail_url,
        position,
        alt_text
      )
    `)
    .eq('id', productId)
    .single()

  if (productError) {
    if (productError.code === 'PGRST116') return null
    console.error('Error fetching product:', productError)
    throw new Error(`Failed to fetch product: ${productError.message}`)
  }

  const transformedProduct = transformProduct(product)

  // If product has variants, fetch them
  if (product.has_variants) {
    const [options, variants] = await Promise.all([
      getVariantOptions(productId),
      getVariants(productId),
    ])

    return {
      ...transformedProduct,
      has_variants: true,
      variant_options: options,
      variants: variants,
      variant_count: variants.filter(v => v.status === 'active').length,
      total_inventory: variants
        .filter(v => v.status === 'active')
        .reduce((sum, v) => sum + v.quantity, 0),
    }
  }

  return {
    ...transformedProduct,
    has_variants: false,
  }
}

// ============================================
// CREATE/UPDATE OPERATIONS
// ============================================

/**
 * Create or update variant options for a product
 */
export async function saveVariantOptions(
  productId: string,
  options: VariantOptionInput[]
): Promise<ProductVariantOption[]> {
  const supabase = await createClient()

  // Get existing options
  const { data: existingOptions } = await supabase
    .from('product_variant_options')
    .select('id, name')
    .eq('product_id', productId)

  const existingMap = new Map((existingOptions || []).map(o => [o.name, o.id]))

  const savedOptions: ProductVariantOption[] = []

  for (let i = 0; i < options.length; i++) {
    const opt = options[i]
    const existingId = existingMap.get(opt.name)

    let optionId: string

    if (existingId) {
      // Update existing option
      const { error } = await supabase
        .from('product_variant_options')
        .update({ position: i })
        .eq('id', existingId)

      if (error) throw new Error(`Failed to update option: ${error.message}`)
      optionId = existingId
    } else {
      // Create new option
      const { data, error } = await supabase
        .from('product_variant_options')
        .insert({
          product_id: productId,
          name: opt.name,
          position: i,
        })
        .select()
        .single()

      if (error) throw new Error(`Failed to create option: ${error.message}`)
      optionId = data.id
    }

    // Save option values
    const savedValues = await saveOptionValues(optionId, opt.values)

    savedOptions.push({
      id: optionId,
      product_id: productId,
      name: opt.name,
      position: i,
      values: savedValues,
    })
  }

  // Delete options that are no longer present
  const newOptionNames = new Set(options.map(o => o.name))
  const optionsToDelete = (existingOptions || [])
    .filter(o => !newOptionNames.has(o.name))
    .map(o => o.id)

  if (optionsToDelete.length > 0) {
    await supabase
      .from('product_variant_options')
      .delete()
      .in('id', optionsToDelete)
  }

  return savedOptions
}

/**
 * Save option values for an option
 */
async function saveOptionValues(
  optionId: string,
  values: VariantOptionInput['values']
): Promise<ProductVariantOptionValue[]> {
  const supabase = await createClient()

  // Get existing values
  const { data: existingValues } = await supabase
    .from('product_variant_option_values')
    .select('id, value')
    .eq('option_id', optionId)

  const existingMap = new Map((existingValues || []).map(v => [v.value, v.id]))

  const savedValues: ProductVariantOptionValue[] = []

  for (let i = 0; i < values.length; i++) {
    const val = values[i]
    const existingId = existingMap.get(val.value)

    if (existingId) {
      // Update existing value
      const { error } = await supabase
        .from('product_variant_option_values')
        .update({
          color_code: val.color_code || null,
          position: i,
        })
        .eq('id', existingId)

      if (error) throw new Error(`Failed to update option value: ${error.message}`)

      savedValues.push({
        id: existingId,
        option_id: optionId,
        value: val.value,
        color_code: val.color_code,
        position: i,
      })
    } else {
      // Create new value
      const { data, error } = await supabase
        .from('product_variant_option_values')
        .insert({
          option_id: optionId,
          value: val.value,
          color_code: val.color_code || null,
          position: i,
        })
        .select()
        .single()

      if (error) throw new Error(`Failed to create option value: ${error.message}`)

      savedValues.push({
        id: data.id,
        option_id: optionId,
        value: data.value,
        color_code: data.color_code || undefined,
        position: data.position,
      })
    }
  }

  // Delete values that are no longer present
  const newValues = new Set(values.map(v => v.value))
  const valuesToDelete = (existingValues || [])
    .filter(v => !newValues.has(v.value))
    .map(v => v.id)

  if (valuesToDelete.length > 0) {
    await supabase
      .from('product_variant_option_values')
      .delete()
      .in('id', valuesToDelete)
  }

  return savedValues
}

/**
 * Generate all variant combinations from options
 */
export function generateVariantCombinations(
  options: ProductVariantOption[]
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

/**
 * Create variants from combinations
 */
export async function createVariants(
  productId: string,
  variants: VariantInput[]
): Promise<ProductVariant[]> {
  const supabase = await createClient()

  const inserts = variants.map(v => ({
    product_id: productId,
    attributes: v.attributes,
    price: v.price ?? null,
    compare_at_price: v.compare_at_price ?? null,
    sku: v.sku || null,
    barcode: v.barcode || null,
    quantity: v.quantity ?? 0,
    track_quantity: v.track_quantity ?? true,
    weight: v.weight ?? null,
    image_id: v.image_id || null,
    is_default: v.is_default ?? false,
    status: v.status || 'active',
  }))

  const { data, error } = await supabase
    .from('product_variants')
    .insert(inserts)
    .select()

  if (error) {
    console.error('Error creating variants:', error)
    throw new Error(`Failed to create variants: ${error.message}`)
  }

  return (data || []).map(transformVariant)
}

/**
 * Update a single variant
 */
export async function updateVariant(
  variantId: string,
  updates: Partial<VariantInput>
): Promise<ProductVariant> {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = {}

  if (updates.attributes !== undefined) updateData.attributes = updates.attributes
  if (updates.price !== undefined) updateData.price = updates.price
  if (updates.compare_at_price !== undefined) updateData.compare_at_price = updates.compare_at_price
  if (updates.sku !== undefined) updateData.sku = updates.sku
  if (updates.barcode !== undefined) updateData.barcode = updates.barcode
  if (updates.quantity !== undefined) updateData.quantity = updates.quantity
  if (updates.track_quantity !== undefined) updateData.track_quantity = updates.track_quantity
  if (updates.weight !== undefined) updateData.weight = updates.weight
  if (updates.image_id !== undefined) updateData.image_id = updates.image_id
  if (updates.is_default !== undefined) updateData.is_default = updates.is_default
  if (updates.status !== undefined) updateData.status = updates.status

  const { data, error } = await supabase
    .from('product_variants')
    .update(updateData)
    .eq('id', variantId)
    .select()
    .single()

  if (error) {
    console.error('Error updating variant:', error)
    throw new Error(`Failed to update variant: ${error.message}`)
  }

  return transformVariant(data)
}

/**
 * Bulk update variants
 */
export async function bulkUpdateVariants(
  productId: string,
  variants: VariantInput[]
): Promise<ProductVariant[]> {
  const supabase = await createClient()

  // Get existing variants
  const { data: existingVariants } = await supabase
    .from('product_variants')
    .select('id, attributes')
    .eq('product_id', productId)

  // Create a map of existing variants by attributes (serialized)
  const existingMap = new Map(
    (existingVariants || []).map(v => [
      JSON.stringify(v.attributes),
      v.id,
    ])
  )

  const savedVariants: ProductVariant[] = []
  const newVariants: VariantInput[] = []

  for (const variant of variants) {
    const key = JSON.stringify(variant.attributes)
    const existingId = variant.id || existingMap.get(key)

    if (existingId) {
      // Update existing variant
      const updated = await updateVariant(existingId, variant)
      savedVariants.push(updated)
      existingMap.delete(key) // Mark as processed
    } else {
      // Queue for bulk insert
      newVariants.push(variant)
    }
  }

  // Create new variants
  if (newVariants.length > 0) {
    const created = await createVariants(productId, newVariants)
    savedVariants.push(...created)
  }

  // Delete variants that are no longer present
  const variantsToDelete = Array.from(existingMap.values())
  if (variantsToDelete.length > 0) {
    await supabase
      .from('product_variants')
      .delete()
      .in('id', variantsToDelete)
  }

  return savedVariants
}

/**
 * Delete a single variant
 */
export async function deleteVariant(variantId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('product_variants')
    .delete()
    .eq('id', variantId)

  if (error) {
    console.error('Error deleting variant:', error)
    throw new Error(`Failed to delete variant: ${error.message}`)
  }
}

/**
 * Delete all variants for a product
 */
export async function deleteAllVariants(productId: string): Promise<void> {
  const supabase = await createClient()

  // Delete variants
  await supabase
    .from('product_variants')
    .delete()
    .eq('product_id', productId)

  // Delete option values (cascade will handle from options)
  await supabase
    .from('product_variant_options')
    .delete()
    .eq('product_id', productId)

  // Update product to not have variants
  await supabase
    .from('products')
    .update({ has_variants: false })
    .eq('id', productId)
}

/**
 * Enable variants for a product
 */
export async function enableVariants(productId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('products')
    .update({ has_variants: true })
    .eq('id', productId)

  if (error) {
    throw new Error(`Failed to enable variants: ${error.message}`)
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

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

// ============================================
// TRANSFORM FUNCTIONS
// ============================================

function transformVariant(data: Record<string, unknown>): ProductVariant {
  const image = data.image as Record<string, unknown> | null

  return {
    id: data.id as string,
    product_id: data.product_id as string,
    attributes: data.attributes as Record<string, string>,
    price: data.price as number | null | undefined,
    compare_at_price: data.compare_at_price as number | null | undefined,
    sku: data.sku as string | undefined,
    barcode: data.barcode as string | undefined,
    quantity: data.quantity as number,
    track_quantity: data.track_quantity as boolean,
    weight: data.weight as number | undefined,
    image_id: data.image_id as string | undefined,
    image: image ? {
      id: image.id as string,
      product_id: data.product_id as string,
      url: image.url as string,
      thumbnail_url: image.thumbnail_url as string | undefined,
      position: 0,
      alt_text: image.alt_text as string | undefined,
    } : undefined,
    is_default: data.is_default as boolean,
    status: data.status as 'active' | 'disabled',
    created_at: data.created_at as string | undefined,
    updated_at: data.updated_at as string | undefined,
  }
}

function transformProduct(data: Record<string, unknown>): Product {
  const images = (data.product_images as Record<string, unknown>[] || [])
    .sort((a, b) => (a.position as number || 0) - (b.position as number || 0))
    .map(img => ({
      id: img.id as string,
      product_id: data.id as string,
      url: img.url as string,
      thumbnail_url: img.thumbnail_url as string | undefined,
      position: img.position as number,
      alt_text: img.alt_text as string | undefined,
    }))

  return {
    id: data.id as string,
    store_id: data.store_id as string,
    title: data.title as string,
    description: data.description as string || '',
    price: data.price as number,
    compare_at_price: data.compare_at_price as number | undefined,
    cost_per_item: data.cost_per_item as number | undefined,
    sku: data.sku as string | undefined,
    barcode: data.barcode as string | undefined,
    quantity: data.quantity as number || 0,
    track_quantity: data.track_quantity as boolean ?? true,
    featured: data.featured as boolean ?? false,
    status: data.status as 'draft' | 'published',
    images,
    categories: data.categories as string[] || [],
    tags: data.tags as string[] || [],
    weight: data.weight as number | undefined,
    requires_shipping: data.requires_shipping as boolean ?? true,
    has_variants: data.has_variants as boolean ?? false,
    created_at: data.created_at as string,
    updated_at: data.updated_at as string,
  }
}
