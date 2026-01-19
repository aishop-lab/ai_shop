// Individual Product API Route - GET, PATCH, DELETE

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getProductById,
  updateProduct,
  deleteProduct,
  verifyProductOwnership
} from '@/lib/products/db-operations'
import { getProductWithVariants } from '@/lib/products/variant-operations'
import { deleteProductImages } from '@/lib/products/image-processor'
import { productUpdateSchema, sanitizeProductData, validatePricing } from '@/lib/products/validation'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/products/[id] - Get single product with images
 */
export async function GET(request: Request, { params }: RouteParams) {
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

    // Check if client wants variant data
    const { searchParams } = new URL(request.url)
    const includeVariants = searchParams.get('include_variants') !== 'false'

    // Get product with images (and variants if requested)
    const product = includeVariants
      ? await getProductWithVariants(productId)
      : await getProductById(productId)

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    // Type cast for variant properties that may be present
    const productWithVariants = product as typeof product & {
      variants?: unknown[]
      variant_count?: number
      total_inventory?: number
    }

    return NextResponse.json({
      success: true,
      product,
      images: product.images,
      // Include variant data in response if product has variants
      ...(product.has_variants && 'variant_options' in product && {
        variant_options: product.variant_options,
        variants: productWithVariants.variants,
        variant_count: productWithVariants.variant_count,
        total_inventory: productWithVariants.total_inventory,
      }),
    })

  } catch (error) {
    console.error('Product fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch product' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/products/[id] - Update product
 */
export async function PATCH(request: Request, { params }: RouteParams) {
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

    // Parse request body
    const body = await request.json()

    // Validate update data
    const validation = productUpdateSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid update data',
          details: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        },
        { status: 400 }
      )
    }

    const updates = validation.data

    // Validate pricing if both price and compare_at_price are provided
    if (updates.price !== undefined || updates.compare_at_price !== undefined) {
      // Get current product to check pricing
      const currentProduct = await getProductById(productId)
      if (currentProduct) {
        const price = updates.price ?? currentProduct.price
        const compareAtPrice = updates.compare_at_price ?? currentProduct.compare_at_price

        const priceValidation = validatePricing(price, compareAtPrice)
        if (!priceValidation.valid) {
          return NextResponse.json(
            { success: false, error: priceValidation.error },
            { status: 400 }
          )
        }
      }
    }

    // Sanitize and update
    const sanitizedUpdates = sanitizeProductData(updates)
    const updatedProduct = await updateProduct(productId, sanitizedUpdates)

    return NextResponse.json({
      success: true,
      product: updatedProduct
    })

  } catch (error) {
    console.error('Product update error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update product' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/products/[id] - Delete product (soft delete by default)
 */
export async function DELETE(request: Request, { params }: RouteParams) {
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

    // Check for hard delete parameter
    const { searchParams } = new URL(request.url)
    const hardDelete = searchParams.get('hard') === 'true'

    if (hardDelete) {
      // Delete images from storage first
      await deleteProductImages(productId)
      
      // Hard delete product
      const { hardDeleteProduct } = await import('@/lib/products/db-operations')
      await hardDeleteProduct(productId)
    } else {
      // Soft delete (archive)
      await deleteProduct(productId)
    }

    return NextResponse.json({
      success: true,
      message: hardDelete ? 'Product permanently deleted' : 'Product archived'
    })

  } catch (error) {
    console.error('Product deletion error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete product' },
      { status: 500 }
    )
  }
}
