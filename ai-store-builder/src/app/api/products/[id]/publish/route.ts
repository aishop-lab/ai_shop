// Product Publish API Route

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { 
  getProductById,
  publishProduct, 
  unpublishProduct,
  verifyProductOwnership 
} from '@/lib/products/db-operations'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/products/[id]/publish - Publish product (draft → published)
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

    // Get current product to validate
    const currentProduct = await getProductById(productId)
    if (!currentProduct) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    // Validate product is ready for publishing
    const validationErrors: string[] = []

    if (!currentProduct.title || currentProduct.title === 'Processing...') {
      validationErrors.push('Product title is required')
    }

    if (!currentProduct.description || currentProduct.description === 'Processing...') {
      validationErrors.push('Product description is required')
    }

    if (!currentProduct.price || currentProduct.price <= 0) {
      validationErrors.push('Product price must be greater than 0')
    }

    if (!currentProduct.images || currentProduct.images.length === 0) {
      validationErrors.push('At least one product image is required')
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Product is not ready for publishing',
          validation_errors: validationErrors
        },
        { status: 400 }
      )
    }

    // Publish the product
    const publishedProduct = await publishProduct(productId)

    return NextResponse.json({
      success: true,
      product: publishedProduct,
      message: 'Product published successfully'
    })

  } catch (error) {
    console.error('Product publish error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to publish product' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/products/[id]/publish - Unpublish product (published → draft)
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

    // Unpublish the product
    const unpublishedProduct = await unpublishProduct(productId)

    return NextResponse.json({
      success: true,
      product: unpublishedProduct,
      message: 'Product unpublished successfully'
    })

  } catch (error) {
    console.error('Product unpublish error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to unpublish product' },
      { status: 500 }
    )
  }
}
