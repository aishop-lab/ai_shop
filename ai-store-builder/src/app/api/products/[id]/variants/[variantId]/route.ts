// Single Product Variant API Route
// GET - Fetch single variant
// PATCH - Update variant
// DELETE - Delete variant

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getVariantById,
  updateVariant,
  deleteVariant,
} from '@/lib/products/variant-operations'
import { verifyProductOwnership } from '@/lib/products/db-operations'
import type { VariantInput } from '@/lib/types/variant'

interface RouteParams {
  params: Promise<{ id: string; variantId: string }>
}

/**
 * GET /api/products/[id]/variants/[variantId]
 * Fetch single variant
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { variantId } = await params

    const variant = await getVariantById(variantId)

    if (!variant) {
      return NextResponse.json(
        { success: false, error: 'Variant not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      variant,
    })
  } catch (error) {
    console.error('Error fetching variant:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch variant' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/products/[id]/variants/[variantId]
 * Update single variant
 */
export async function PATCH(
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

    const { id: productId, variantId } = await params

    // Verify ownership
    const hasAccess = await verifyProductOwnership(user.id, productId)
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Product not found or access denied' },
        { status: 404 }
      )
    }

    // Check variant exists and belongs to product
    const existingVariant = await getVariantById(variantId)
    if (!existingVariant || existingVariant.product_id !== productId) {
      return NextResponse.json(
        { success: false, error: 'Variant not found' },
        { status: 404 }
      )
    }

    const body: Partial<VariantInput> = await request.json()

    // Validate updates
    if (body.price !== undefined && body.price !== null && typeof body.price !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Price must be a number' },
        { status: 400 }
      )
    }

    if (body.quantity !== undefined && (typeof body.quantity !== 'number' || body.quantity < 0)) {
      return NextResponse.json(
        { success: false, error: 'Quantity must be a non-negative number' },
        { status: 400 }
      )
    }

    if (body.status !== undefined && !['active', 'disabled'].includes(body.status)) {
      return NextResponse.json(
        { success: false, error: 'Status must be "active" or "disabled"' },
        { status: 400 }
      )
    }

    const updatedVariant = await updateVariant(variantId, body)

    return NextResponse.json({
      success: true,
      variant: updatedVariant,
    })
  } catch (error) {
    console.error('Error updating variant:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update variant' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/products/[id]/variants/[variantId]
 * Delete single variant
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

    const { id: productId, variantId } = await params

    // Verify ownership
    const hasAccess = await verifyProductOwnership(user.id, productId)
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Product not found or access denied' },
        { status: 404 }
      )
    }

    // Check variant exists and belongs to product
    const existingVariant = await getVariantById(variantId)
    if (!existingVariant || existingVariant.product_id !== productId) {
      return NextResponse.json(
        { success: false, error: 'Variant not found' },
        { status: 404 }
      )
    }

    await deleteVariant(variantId)

    return NextResponse.json({
      success: true,
      message: 'Variant deleted',
    })
  } catch (error) {
    console.error('Error deleting variant:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete variant' },
      { status: 500 }
    )
  }
}
