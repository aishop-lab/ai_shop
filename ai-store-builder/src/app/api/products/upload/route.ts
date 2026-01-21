// Product Upload API Route - Enhanced with AI processing pipeline

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { productUploadSchema, validateImageFiles, sanitizeProductData, validatePricing } from '@/lib/products/validation'
import { createProduct, verifyStoreOwnership } from '@/lib/products/db-operations'
import { uploadProductImages, enhanceProductImage } from '@/lib/products/image-processor'
import { unifiedAI, AUTO_APPLY_THRESHOLD as LEGACY_AUTO_APPLY_THRESHOLD } from '@/lib/ai/unified-ai-service'
import { vercelAI, AUTO_APPLY_THRESHOLD } from '@/lib/ai/vercel-ai-service'
import { USE_VERCEL_AI } from '@/lib/ai/provider'
import { productExtractor } from '@/lib/ai/product-extractor'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds for image processing

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse multipart form data
    const formData = await request.formData()
    
    // Extract store_id and verify ownership
    const storeId = formData.get('store_id') as string
    if (!storeId) {
      return NextResponse.json(
        { success: false, error: 'store_id is required' },
        { status: 400 }
      )
    }

    const isOwner = await verifyStoreOwnership(user.id, storeId)
    if (!isOwner) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to add products to this store' },
        { status: 403 }
      )
    }

    // Check for demo products and delete them when adding first real product
    try {
      const { data: demoProducts } = await supabase
        .from('products')
        .select('id')
        .eq('store_id', storeId)
        .eq('is_demo', true)

      if (demoProducts && demoProducts.length > 0) {
        const demoProductIds = demoProducts.map(p => p.id)
        console.log(`[Upload] Removing ${demoProductIds.length} demo products from store ${storeId}`)

        // Delete product images first
        await supabase
          .from('product_images')
          .delete()
          .in('product_id', demoProductIds)

        // Delete demo products
        await supabase
          .from('products')
          .delete()
          .in('id', demoProductIds)

        console.log('[Upload] Demo products removed successfully')
      }
    } catch (demoCleanupError) {
      console.error('[Upload] Failed to cleanup demo products (non-blocking):', demoCleanupError)
      // Don't fail the upload - continue with real product creation
    }

    // Extract and validate images
    const images: File[] = []
    formData.getAll('images').forEach(item => {
      if (item instanceof File) {
        images.push(item)
      }
    })

    // Also check for single 'image' field
    const singleImage = formData.get('image')
    if (singleImage instanceof File) {
      images.push(singleImage)
    }

    if (images.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one image is required' },
        { status: 400 }
      )
    }

    const imageValidation = validateImageFiles(images)
    if (!imageValidation.valid) {
      return NextResponse.json(
        { success: false, error: 'Image validation failed', details: imageValidation.errors },
        { status: 400 }
      )
    }

    // Extract product data from form
    const productData: Record<string, unknown> = {
      store_id: storeId,
      title: formData.get('title') as string || undefined,
      description: formData.get('description') as string || undefined,
      price: formData.get('price') ? parseFloat(formData.get('price') as string) : undefined,
      compare_at_price: formData.get('compare_at_price') ? parseFloat(formData.get('compare_at_price') as string) : undefined,
      cost_per_item: formData.get('cost_per_item') ? parseFloat(formData.get('cost_per_item') as string) : undefined,
      sku: formData.get('sku') as string || undefined,
      barcode: formData.get('barcode') as string || undefined,
      quantity: formData.get('quantity') ? parseInt(formData.get('quantity') as string) : 0,
      track_quantity: formData.get('track_quantity') === 'true',
      weight: formData.get('weight') ? parseFloat(formData.get('weight') as string) : undefined,
      requires_shipping: formData.get('requires_shipping') !== 'false',
      categories: formData.get('categories') ? JSON.parse(formData.get('categories') as string) : undefined,
      tags: formData.get('tags') ? JSON.parse(formData.get('tags') as string) : undefined,
      status: (formData.get('status') as 'draft' | 'published') || 'draft'
    }

    // Validate basic structure
    const validation = productUploadSchema.safeParse(productData)
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid product data', 
          details: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`) 
        },
        { status: 400 }
      )
    }

    // Create temporary product to get ID for image upload
    // We'll update it with final data after AI extraction
    const tempProduct = await createProduct(storeId, {
      title: productData.title as string || 'Processing...',
      description: productData.description as string || 'Processing...',
      price: productData.price as number || 0,
      compare_at_price: productData.compare_at_price as number | undefined,
      cost_per_item: productData.cost_per_item as number | undefined,
      sku: productData.sku as string | undefined,
      barcode: productData.barcode as string | undefined,
      quantity: productData.quantity as number || 0,
      track_quantity: productData.track_quantity as boolean ?? true,
      weight: productData.weight as number | undefined,
      requires_shipping: productData.requires_shipping as boolean ?? true,
      categories: productData.categories as string[] || [],
      tags: productData.tags as string[] || [],
      status: 'draft', // Always create as draft initially
      featured: false
    })

    // Upload images
    let uploadedImages
    try {
      uploadedImages = await uploadProductImages(storeId, tempProduct.id, images)
    } catch (uploadError) {
      // Clean up the product if image upload fails
      const { hardDeleteProduct } = await import('@/lib/products/db-operations')
      await hardDeleteProduct(tempProduct.id)
      
      console.error('Image upload failed:', uploadError)
      return NextResponse.json(
        { success: false, error: 'Failed to upload images' },
        { status: 500 }
      )
    }

    // Get AI suggestions if title or description is missing
    let aiSuggestions = null
    let shouldAutoApply = false
    const needsTitle = !productData.title
    const needsDescription = !productData.description
    const firstImageUrl = uploadedImages[0]?.url

    if ((needsTitle || needsDescription) && firstImageUrl) {
      try {
        if (USE_VERCEL_AI) {
          // Use new Vercel AI SDK service
          const aiResult = await vercelAI.analyzeProductImage({ url: firstImageUrl })

          aiSuggestions = {
            ai_suggested_title: aiResult.title,
            ai_suggested_description: aiResult.description,
            ai_suggested_category: aiResult.categories,
            ai_suggested_tags: aiResult.tags,
            ai_suggested_attributes: aiResult.attributes,
            ocr_text: aiResult.ocr_text,
            confidence: aiResult.confidence
          }

          // Check if we should auto-apply
          shouldAutoApply = aiResult.confidence >= AUTO_APPLY_THRESHOLD

          console.log(`[Upload] Vercel AI analysis complete. Confidence: ${aiResult.confidence}, Auto-apply: ${shouldAutoApply}`)
        } else {
          // Use legacy unified AI service
          const unifiedResult = await unifiedAI.analyzeProductImage({ url: firstImageUrl })

          aiSuggestions = {
            ai_suggested_title: unifiedResult.title,
            ai_suggested_description: unifiedResult.description,
            ai_suggested_category: unifiedResult.categories,
            ai_suggested_tags: unifiedResult.tags,
            ai_suggested_attributes: unifiedResult.attributes,
            ocr_text: unifiedResult.ocr_text,
            confidence: unifiedResult.confidence
          }

          // Check if we should auto-apply
          shouldAutoApply = unifiedResult.confidence >= LEGACY_AUTO_APPLY_THRESHOLD

          console.log(`[Upload] Legacy AI analysis complete. Confidence: ${unifiedResult.confidence}, Auto-apply: ${shouldAutoApply}`)
        }
      } catch (aiError) {
        console.warn('Primary AI extraction failed, falling back to basic:', aiError)

        // Fallback to basic extractor
        try {
          const basicResult = await productExtractor.getProductSuggestions(
            firstImageUrl,
            productData.title as string | undefined,
            productData.description as string | undefined
          )
          aiSuggestions = basicResult
        } catch (basicError) {
          console.error('AI extraction failed:', basicError)
          // Continue without AI suggestions
        }
      }
    }

    // Prepare final product data
    const finalTitle = productData.title as string || aiSuggestions?.ai_suggested_title || 'Untitled Product'
    const finalDescription = productData.description as string || aiSuggestions?.ai_suggested_description || 'Product description'
    const finalCategories = (productData.categories as string[])?.length > 0 
      ? productData.categories as string[]
      : aiSuggestions?.ai_suggested_category || []
    const finalTags = (productData.tags as string[])?.length > 0
      ? productData.tags as string[]
      : aiSuggestions?.ai_suggested_tags || []

    // Validate pricing if provided
    if (productData.price) {
      const priceValidation = validatePricing(
        productData.price as number,
        productData.compare_at_price as number | undefined
      )
      if (!priceValidation.valid) {
        return NextResponse.json(
          { success: false, error: priceValidation.error },
          { status: 400 }
        )
      }
    }

    // Update product with final data
    const { updateProduct } = await import('@/lib/products/db-operations')
    const finalProduct = await updateProduct(tempProduct.id, sanitizeProductData({
      title: finalTitle,
      description: finalDescription,
      price: productData.price as number || 0,
      categories: finalCategories,
      tags: finalTags,
      status: productData.status as 'draft' | 'published' || 'draft'
    }))

    // Return the product with images and AI suggestions
    return NextResponse.json({
      success: true,
      product: {
        ...finalProduct,
        images: uploadedImages,
        extracted_data: aiSuggestions ? {
          ai_suggested_title: aiSuggestions.ai_suggested_title,
          ai_suggested_description: aiSuggestions.ai_suggested_description,
          ai_suggested_category: aiSuggestions.ai_suggested_category,
          ai_suggested_tags: aiSuggestions.ai_suggested_tags,
          ai_suggested_attributes: aiSuggestions.ai_suggested_attributes || {},
          ocr_text: aiSuggestions.ocr_text || [],
          confidence: aiSuggestions.confidence,
          was_auto_applied: shouldAutoApply
        } : null
      }
    })

  } catch (error) {
    console.error('Product upload error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to upload product' },
      { status: 500 }
    )
  }
}
