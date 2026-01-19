// Product Variants API Route
// GET - Fetch product with all variants
// POST - Create/update variant options and variants
// DELETE - Remove all variants (convert to simple product)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getProductWithVariants,
  saveVariantOptions,
  bulkUpdateVariants,
  deleteAllVariants,
  enableVariants,
} from '@/lib/products/variant-operations'
import { verifyProductOwnership } from '@/lib/products/db-operations'
import type { UpdateVariantsRequest, ProductVariant } from '@/lib/types/variant'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/products/[id]/variants
 * Fetch product with all variant options and variants
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: productId } = await params

    const product = await getProductWithVariants(productId)

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      product,
      options: product.variant_options || [],
      variants: product.variants || [],
    })
  } catch (error) {
    console.error('Error fetching product variants:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch variants' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/products/[id]/variants
 * Create or update variant options and variants
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: productId } = await params

    // Verify ownership
    const hasAccess = await verifyProductOwnership(user.id, productId)
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Product not found or access denied' },
        { status: 404 }
      )
    }

    const body: UpdateVariantsRequest = await request.json()
    const { options, variants } = body

    if (!options || !Array.isArray(options)) {
      return NextResponse.json(
        { success: false, error: 'Options array is required' },
        { status: 400 }
      )
    }

    // Validate options
    for (const opt of options) {
      if (!opt.name || typeof opt.name !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Each option must have a name' },
          { status: 400 }
        )
      }
      if (!opt.values || !Array.isArray(opt.values) || opt.values.length === 0) {
        return NextResponse.json(
          { success: false, error: `Option "${opt.name}" must have at least one value` },
          { status: 400 }
        )
      }
    }

    // Enable variants flag on product
    await enableVariants(productId)

    // Save options
    const savedOptions = await saveVariantOptions(productId, options)

    // Save variants if provided
    let savedVariants: ProductVariant[] = []
    if (variants && Array.isArray(variants) && variants.length > 0) {
      // Validate variant attributes match options
      for (const variant of variants) {
        if (!variant.attributes || typeof variant.attributes !== 'object') {
          return NextResponse.json(
            { success: false, error: 'Each variant must have attributes' },
            { status: 400 }
          )
        }

        const optionNames = new Set(options.map(o => o.name))
        const attrNames = Object.keys(variant.attributes)

        for (const name of attrNames) {
          if (!optionNames.has(name)) {
            return NextResponse.json(
              { success: false, error: `Variant has unknown option "${name}"` },
              { status: 400 }
            )
          }
        }
      }

      savedVariants = await bulkUpdateVariants(productId, variants)
    }

    return NextResponse.json({
      success: true,
      options: savedOptions,
      variants: savedVariants,
    })
  } catch (error) {
    console.error('Error saving variants:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save variants' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/products/[id]/variants
 * Remove all variants (convert to simple product)
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: productId } = await params

    // Verify ownership
    const hasAccess = await verifyProductOwnership(user.id, productId)
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Product not found or access denied' },
        { status: 404 }
      )
    }

    await deleteAllVariants(productId)

    return NextResponse.json({
      success: true,
      message: 'All variants removed',
    })
  } catch (error) {
    console.error('Error deleting variants:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete variants' },
      { status: 500 }
    )
  }
}
