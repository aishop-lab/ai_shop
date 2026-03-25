// Duplicate Product API Route

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyProductOwnership } from '@/lib/products/db-operations'
import { getProductWithVariants } from '@/lib/products/variant-operations'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/products/[id]/duplicate - Duplicate a product
 *
 * Creates a copy of the product with:
 * - Title appended with " (Copy)"
 * - Status set to "draft"
 * - Variant options and variants copied (without images)
 * - Images are NOT copied (they stay with the original)
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: productId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify ownership
    const isOwner = await verifyProductOwnership(user.id, productId)
    if (!isOwner) {
      return NextResponse.json(
        { success: false, error: 'Product not found or access denied' },
        { status: 404 }
      )
    }

    // Get the full product with variants
    const product = await getProductWithVariants(productId)
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    // Generate a unique handle
    const handle = product.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 90) + '-copy-' + Date.now().toString(36)

    // Create the duplicate product
    const { data: newProduct, error: createError } = await supabase
      .from('products')
      .insert({
        store_id: product.store_id,
        title: `${product.title} (Copy)`,
        handle,
        description: product.description,
        price: product.price,
        compare_at_price: product.compare_at_price || null,
        cost_per_item: product.cost_per_item || null,
        sku: product.sku ? `${product.sku}-COPY` : null,
        barcode: null, // Don't copy barcode (must be unique)
        quantity: product.quantity,
        track_quantity: product.track_quantity,
        weight: product.weight || null,
        requires_shipping: product.requires_shipping,
        categories: product.categories || [],
        tags: product.tags || [],
        featured: false,
        status: 'draft',
        has_variants: product.has_variants,
        is_demo: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (createError) {
      console.error('Product duplication error:', createError)
      return NextResponse.json(
        { success: false, error: `Failed to duplicate product: ${createError.message}` },
        { status: 500 }
      )
    }

    // Copy variant options and variants if the product has them
    if (product.has_variants && 'variant_options' in product && product.variant_options) {
      try {
        // Copy variant options
        for (const option of product.variant_options) {
          const { data: newOption, error: optionError } = await supabase
            .from('product_variant_options')
            .insert({
              product_id: newProduct.id,
              name: option.name,
              position: option.position,
            })
            .select()
            .single()

          if (optionError) {
            console.error('Failed to copy variant option:', optionError)
            continue
          }

          // Copy option values
          if (option.values && option.values.length > 0) {
            const valueInserts = option.values.map(val => ({
              option_id: newOption.id,
              value: val.value,
              color_code: val.color_code || null,
              position: val.position,
            }))

            await supabase
              .from('product_variant_option_values')
              .insert(valueInserts)
          }
        }

        // Copy variants (without image_id since images aren't copied)
        if ('variants' in product && product.variants && product.variants.length > 0) {
          const variantInserts = product.variants.map(v => ({
            product_id: newProduct.id,
            attributes: v.attributes,
            price: v.price ?? null,
            compare_at_price: v.compare_at_price ?? null,
            sku: v.sku ? `${v.sku}-COPY` : null,
            barcode: null,
            quantity: v.quantity,
            track_quantity: v.track_quantity,
            weight: v.weight ?? null,
            image_id: null, // Don't copy image references
            is_default: v.is_default,
            status: v.status,
          }))

          await supabase
            .from('product_variants')
            .insert(variantInserts)
        }
      } catch (variantError) {
        console.error('Failed to copy variants (product was still created):', variantError)
      }
    }

    return NextResponse.json({
      success: true,
      product: {
        id: newProduct.id,
        title: newProduct.title,
        status: newProduct.status,
      },
      message: 'Product duplicated successfully'
    })

  } catch (error) {
    console.error('Product duplication error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to duplicate product' },
      { status: 500 }
    )
  }
}
