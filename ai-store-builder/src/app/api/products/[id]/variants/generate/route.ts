// Generate Variant Combinations API Route
// POST - Auto-generate all variant combinations from options

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getVariantOptions,
  getVariants,
  generateVariantCombinations,
  createVariants,
  findVariantByAttributes,
} from '@/lib/products/variant-operations'
import { verifyProductOwnership } from '@/lib/products/db-operations'
import type { GenerateVariantsRequest, VariantInput, ProductVariant } from '@/lib/types/variant'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/products/[id]/variants/generate
 * Auto-generate variant combinations from existing options
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

    const body: GenerateVariantsRequest = await request.json()
    const {
      preserve_existing = true,
      default_price = null,
      default_quantity = 0,
    } = body

    // Get existing options
    const options = await getVariantOptions(productId)

    if (options.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No variant options defined. Add options first.' },
        { status: 400 }
      )
    }

    // Validate all options have at least one value
    for (const opt of options) {
      if (opt.values.length === 0) {
        return NextResponse.json(
          { success: false, error: `Option "${opt.name}" has no values` },
          { status: 400 }
        )
      }
    }

    // Generate all combinations
    const combinations = generateVariantCombinations(options)

    if (combinations.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No combinations could be generated' },
        { status: 400 }
      )
    }

    // Check for reasonable number of variants
    const MAX_VARIANTS = 100
    if (combinations.length > MAX_VARIANTS) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many combinations (${combinations.length}). Maximum is ${MAX_VARIANTS}.`,
        },
        { status: 400 }
      )
    }

    // Get existing variants for preservation
    let existingVariants: ProductVariant[] = []
    if (preserve_existing) {
      existingVariants = await getVariants(productId)
    }

    // Create new variant inputs
    const newVariants: VariantInput[] = combinations.map((attrs, index) => {
      // Check if this combination already exists
      const existing = preserve_existing
        ? findVariantByAttributes(existingVariants, attrs)
        : undefined

      if (existing) {
        // Preserve existing data
        return {
          id: existing.id,
          attributes: attrs,
          price: existing.price,
          compare_at_price: existing.compare_at_price,
          sku: existing.sku,
          barcode: existing.barcode,
          quantity: existing.quantity,
          track_quantity: existing.track_quantity,
          weight: existing.weight,
          image_id: existing.image_id,
          is_default: existing.is_default,
          status: existing.status,
        }
      }

      // Create new variant with defaults
      return {
        attributes: attrs,
        price: default_price,
        quantity: default_quantity,
        track_quantity: true,
        is_default: index === 0, // First variant is default
        status: 'active' as const,
      }
    })

    // Filter to only new variants (not existing)
    const variantsToCreate = newVariants.filter(v => !v.id)

    let createdVariants = []
    if (variantsToCreate.length > 0) {
      createdVariants = await createVariants(productId, variantsToCreate)
    }

    // Get all variants after creation
    const allVariants = await getVariants(productId)

    return NextResponse.json({
      success: true,
      generated: variantsToCreate.length,
      preserved: newVariants.length - variantsToCreate.length,
      total: allVariants.length,
      variants: allVariants,
    })
  } catch (error) {
    console.error('Error generating variants:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate variants' },
      { status: 500 }
    )
  }
}
