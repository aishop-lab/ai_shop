// Bulk Product Upload API Route (CSV)

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyStoreOwnership, createProduct } from '@/lib/products/db-operations'
import { uploadProductImages } from '@/lib/products/image-processor'
import { parseCSVFile, validateCSVFile, matchImagesToProducts } from '@/lib/products/csv-parser'
import { sanitizeProductData } from '@/lib/products/validation'
import { productExtractor } from '@/lib/ai/product-extractor'
import type { Product } from '@/lib/types/store'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // Allow up to 5 minutes for bulk upload

interface BulkUploadResult {
  success: number
  failed: number
  errors: Array<{
    row: number
    error: string
  }>
  products: Product[]
}

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

    // Extract CSV file
    const csvFile = formData.get('csv_file') as File
    if (!csvFile) {
      return NextResponse.json(
        { success: false, error: 'CSV file is required' },
        { status: 400 }
      )
    }

    // Validate CSV file
    const csvValidation = validateCSVFile(csvFile)
    if (!csvValidation.valid) {
      return NextResponse.json(
        { success: false, error: csvValidation.error },
        { status: 400 }
      )
    }

    // Parse CSV
    const parseResult = await parseCSVFile(csvFile)
    
    if (!parseResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'CSV parsing failed', 
          details: parseResult.errors,
          warnings: parseResult.warnings
        },
        { status: 400 }
      )
    }

    // Extract image files
    const imageFiles = new Map<string, File>()
    formData.getAll('images').forEach(item => {
      if (item instanceof File) {
        imageFiles.set(item.name, item)
      }
    })

    // Match images to products by filename
    const imageMatches = matchImagesToProducts(parseResult.products, imageFiles)

    // Process results
    const result: BulkUploadResult = {
      success: 0,
      failed: 0,
      errors: [],
      products: []
    }

    // Process each product
    for (let i = 0; i < parseResult.products.length; i++) {
      const productInput = parseResult.products[i]
      const rowNumber = i + 2 // Account for header and 0-index
      const productImages = imageMatches.get(i) || []

      try {
        // Sanitize product data
        const sanitizedData = sanitizeProductData(productInput)

        // Create the product
        const product = await createProduct(storeId, {
          ...sanitizedData,
          status: 'draft' // Always create as draft in bulk upload
        })

        // Upload images if available
        if (productImages.length > 0) {
          try {
            await uploadProductImages(storeId, product.id, productImages)
          } catch (imageError) {
            console.error(`Image upload failed for row ${rowNumber}:`, imageError)
            // Continue without images - don't fail the entire product
            result.errors.push({
              row: rowNumber,
              error: 'Product created but image upload failed'
            })
          }
        }

        // Try to enhance with AI if description is generic
        if (productImages.length > 0 && sanitizedData.description.length < 50) {
          try {
            const imageProcessor = await import('@/lib/products/image-processor')
            const imageUrl = await imageProcessor.getFirstProductImageUrl(product.id)

            if (imageUrl) {
              const aiSuggestions = await productExtractor.getProductSuggestions(
                imageUrl,
                sanitizedData.title,
                sanitizedData.description
              )

              if (aiSuggestions.confidence > 0.7) {
                const { updateProduct } = await import('@/lib/products/db-operations')
                await updateProduct(product.id, {
                  description: aiSuggestions.ai_suggested_description,
                  categories: aiSuggestions.ai_suggested_category,
                  tags: aiSuggestions.ai_suggested_tags
                })
              }
            }
          } catch (aiError) {
            // Ignore AI errors in bulk upload - continue with original data
            console.error(`AI enhancement failed for row ${rowNumber}:`, aiError)
          }
        }

        result.products.push(product)
        result.success++

      } catch (error) {
        console.error(`Failed to create product for row ${rowNumber}:`, error)
        result.failed++
        result.errors.push({
          row: rowNumber,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Include CSV warnings in response
    const warnings = parseResult.warnings.map(w => ({
      row: w.row,
      message: w.message
    }))

    return NextResponse.json({
      success: result.failed === 0,
      uploaded: result.success,
      failed: result.failed,
      errors: result.errors,
      products: result.products,
      warnings,
      total_rows: parseResult.products.length
    })

  } catch (error) {
    console.error('Bulk upload error:', error)
    return NextResponse.json(
      { success: false, error: 'Bulk upload failed' },
      { status: 500 }
    )
  }
}

/**
 * GET - Download sample CSV template
 */
export async function GET() {
  const { generateSampleCSV } = await import('@/lib/products/csv-parser')
  const csvContent = generateSampleCSV()

  return new Response(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="product_upload_template.csv"'
    }
  })
}
