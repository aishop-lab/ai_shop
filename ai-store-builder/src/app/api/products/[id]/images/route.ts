// Product Images Management API - POST (add), DELETE (remove), PATCH (reorder)

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyProductOwnership } from '@/lib/products/db-operations'
import {
  uploadProductImages,
  deleteProductImage,
  reorderProductImages
} from '@/lib/products/image-processor'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/products/[id]/images - Add images to existing product
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: productId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const isOwner = await verifyProductOwnership(user.id, productId)
    if (!isOwner) {
      return NextResponse.json({ success: false, error: 'Product not found or access denied' }, { status: 404 })
    }

    // Get store_id for the product
    const { data: product } = await supabase
      .from('products')
      .select('store_id')
      .eq('id', productId)
      .single()

    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })
    }

    // Get max current position
    const { data: maxPosResult } = await supabase
      .from('product_images')
      .select('position')
      .eq('product_id', productId)
      .order('position', { ascending: false })
      .limit(1)
      .single()

    const startPosition = (maxPosResult?.position ?? -1) + 1

    // Parse multipart form data
    const formData = await request.formData()
    const files = formData.getAll('images') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, error: 'No images provided' }, { status: 400 })
    }

    // Check total image count
    const { count: existingCount } = await supabase
      .from('product_images')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', productId)

    if ((existingCount || 0) + files.length > 10) {
      return NextResponse.json(
        { success: false, error: `Cannot add ${files.length} images. Maximum 10 images allowed (${existingCount} existing).` },
        { status: 400 }
      )
    }

    const newImages = await uploadProductImages(product.store_id, productId, files, startPosition)

    return NextResponse.json({ success: true, images: newImages })
  } catch (error) {
    console.error('Image upload error:', error)
    return NextResponse.json({ success: false, error: 'Failed to upload images' }, { status: 500 })
  }
}

/**
 * DELETE /api/products/[id]/images - Remove a single image
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id: productId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const isOwner = await verifyProductOwnership(user.id, productId)
    if (!isOwner) {
      return NextResponse.json({ success: false, error: 'Product not found or access denied' }, { status: 404 })
    }

    const { imageId } = await request.json()
    if (!imageId) {
      return NextResponse.json({ success: false, error: 'imageId is required' }, { status: 400 })
    }

    // Verify image belongs to this product
    const { data: image } = await supabase
      .from('product_images')
      .select('id')
      .eq('id', imageId)
      .eq('product_id', productId)
      .single()

    if (!image) {
      return NextResponse.json({ success: false, error: 'Image not found' }, { status: 404 })
    }

    await deleteProductImage(imageId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Image delete error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete image' }, { status: 500 })
  }
}

/**
 * PATCH /api/products/[id]/images - Reorder images
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id: productId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const isOwner = await verifyProductOwnership(user.id, productId)
    if (!isOwner) {
      return NextResponse.json({ success: false, error: 'Product not found or access denied' }, { status: 404 })
    }

    const { imageIds } = await request.json()
    if (!imageIds || !Array.isArray(imageIds)) {
      return NextResponse.json({ success: false, error: 'imageIds array is required' }, { status: 400 })
    }

    await reorderProductImages(productId, imageIds)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Image reorder error:', error)
    return NextResponse.json({ success: false, error: 'Failed to reorder images' }, { status: 500 })
  }
}
