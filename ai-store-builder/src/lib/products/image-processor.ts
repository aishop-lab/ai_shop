// Image Processing for Product Uploads - Enhanced with AI-powered features

import sharp from 'sharp'
import { createClient } from '@/lib/supabase/server'
import type { ProductImage } from '@/lib/types/store'
import { googleVision } from '@/lib/ai/google-vision-service'

// Image sizes configuration
const IMAGE_SIZES = {
  original: { width: 2000, height: 2000, quality: 90 },
  thumbnail: { width: 600, height: 600, quality: 80 },
  small: { width: 300, height: 300, quality: 75 }
}

// Types for enhanced processing
export interface ImageQualityAssessment {
  needsEnhancement: boolean
  needsBackgroundRemoval: boolean
  brightness: 'dark' | 'normal' | 'bright'
  isBlurry: boolean
  score: number
  recommendations: string[]
}

export interface EnhancementResult {
  buffer: Buffer
  wasEnhanced: boolean
  enhancementsApplied: string[]
}

export interface BackgroundRemovalResult {
  buffer: Buffer
  wasRemoved: boolean
  mainObjectDetected: string | null
  confidence: number
}

const BUCKET_NAME = 'product-images'

/**
 * Process and resize image buffer
 */
async function processImage(
  buffer: ArrayBuffer | Buffer,
  size: { width: number; height: number; quality: number },
  fit: 'inside' | 'cover' = 'inside'
): Promise<Buffer> {
  const options: sharp.ResizeOptions = {
    width: size.width,
    height: size.height,
    fit,
    withoutEnlargement: true
  }

  // Convert to Buffer if needed
  const inputBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer)

  return sharp(inputBuffer)
    .resize(options)
    .jpeg({ quality: size.quality })
    .toBuffer()
}

/**
 * Generate unique filename for product image
 */
function generateFilename(productId: string, position: number): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${productId}_${position}_${timestamp}_${random}.jpg`
}

/**
 * Upload a single file to Supabase Storage
 */
async function uploadToStorage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string,
  buffer: Buffer
): Promise<string> {
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, buffer, {
      contentType: 'image/jpeg',
      cacheControl: '31536000', // 1 year cache
      upsert: false
    })

  if (error) {
    throw new Error(`Upload failed: ${error.message}`)
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(path)

  return urlData.publicUrl
}

/**
 * Upload and process product images
 */
export async function uploadProductImages(
  storeId: string,
  productId: string,
  files: File[]
): Promise<ProductImage[]> {
  const supabase = await createClient()
  const images: ProductImage[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const filename = generateFilename(productId, i)
    const arrayBuffer = await file.arrayBuffer()

    try {
      // Process and upload original (resized to max dimensions)
      const originalBuffer = await processImage(arrayBuffer, IMAGE_SIZES.original, 'inside')
      const originalPath = `products/${storeId}/${filename}`
      const originalUrl = await uploadToStorage(supabase, originalPath, originalBuffer)

      // Process and upload thumbnail
      const thumbnailBuffer = await processImage(arrayBuffer, IMAGE_SIZES.thumbnail, 'cover')
      const thumbnailPath = `products/${storeId}/thumbnails/${filename}`
      const thumbnailUrl = await uploadToStorage(supabase, thumbnailPath, thumbnailBuffer)

      // Save to database
      const { data: imageData, error: dbError } = await supabase
        .from('product_images')
        .insert({
          product_id: productId,
          url: originalUrl,
          thumbnail_url: thumbnailUrl,
          position: i,
          alt_text: `${file.name.split('.')[0] || 'Product image'} ${i + 1}`
        })
        .select()
        .single()

      if (dbError) {
        console.error('Database insert error:', dbError)
        // Try to clean up uploaded files
        await supabase.storage.from(BUCKET_NAME).remove([originalPath, thumbnailPath])
        throw new Error(`Failed to save image record: ${dbError.message}`)
      }

      images.push({
        id: imageData.id,
        product_id: imageData.product_id,
        url: imageData.url,
        thumbnail_url: imageData.thumbnail_url,
        position: imageData.position,
        alt_text: imageData.alt_text
      })
    } catch (error) {
      console.error(`Failed to process image ${i}:`, error)
      throw error
    }
  }

  return images
}

/**
 * Upload a single product image from URL
 */
export async function uploadProductImageFromUrl(
  storeId: string,
  productId: string,
  imageUrl: string,
  position: number
): Promise<ProductImage> {
  const supabase = await createClient()
  const filename = generateFilename(productId, position)

  // Fetch the image
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch image from URL: ${response.statusText}`)
  }

  const arrayBuffer = await response.arrayBuffer()

  // Process and upload original
  const originalBuffer = await processImage(arrayBuffer, IMAGE_SIZES.original, 'inside')
  const originalPath = `products/${storeId}/${filename}`
  const originalUrl = await uploadToStorage(supabase, originalPath, originalBuffer)

  // Process and upload thumbnail
  const thumbnailBuffer = await processImage(arrayBuffer, IMAGE_SIZES.thumbnail, 'cover')
  const thumbnailPath = `products/${storeId}/thumbnails/${filename}`
  const thumbnailUrl = await uploadToStorage(supabase, thumbnailPath, thumbnailBuffer)

  // Save to database
  const { data: imageData, error: dbError } = await supabase
    .from('product_images')
    .insert({
      product_id: productId,
      url: originalUrl,
      thumbnail_url: thumbnailUrl,
      position,
      alt_text: `Product image ${position + 1}`
    })
    .select()
    .single()

  if (dbError) {
    // Clean up uploaded files
    await supabase.storage.from(BUCKET_NAME).remove([originalPath, thumbnailPath])
    throw new Error(`Failed to save image record: ${dbError.message}`)
  }

  return {
    id: imageData.id,
    product_id: imageData.product_id,
    url: imageData.url,
    thumbnail_url: imageData.thumbnail_url,
    position: imageData.position,
    alt_text: imageData.alt_text
  }
}

/**
 * Delete product images from storage and database
 */
export async function deleteProductImages(productId: string): Promise<void> {
  const supabase = await createClient()

  // Get all image records
  const { data: images, error: fetchError } = await supabase
    .from('product_images')
    .select('*')
    .eq('product_id', productId)

  if (fetchError) {
    console.error('Error fetching images for deletion:', fetchError)
    return
  }

  if (!images || images.length === 0) {
    return
  }

  // Extract storage paths from URLs
  const pathsToDelete: string[] = []
  for (const image of images) {
    // Extract path from full URL
    const urlParts = image.url.split(`/${BUCKET_NAME}/`)
    if (urlParts[1]) {
      pathsToDelete.push(urlParts[1])
    }

    if (image.thumbnail_url) {
      const thumbParts = image.thumbnail_url.split(`/${BUCKET_NAME}/`)
      if (thumbParts[1]) {
        pathsToDelete.push(thumbParts[1])
      }
    }
  }

  // Delete from storage
  if (pathsToDelete.length > 0) {
    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(pathsToDelete)

    if (storageError) {
      console.error('Error deleting from storage:', storageError)
    }
  }

  // Delete from database
  const { error: dbError } = await supabase
    .from('product_images')
    .delete()
    .eq('product_id', productId)

  if (dbError) {
    console.error('Error deleting image records:', dbError)
  }
}

/**
 * Delete a single product image
 */
export async function deleteProductImage(imageId: string): Promise<void> {
  const supabase = await createClient()

  // Get the image record
  const { data: image, error: fetchError } = await supabase
    .from('product_images')
    .select('*')
    .eq('id', imageId)
    .single()

  if (fetchError || !image) {
    console.error('Error fetching image for deletion:', fetchError)
    return
  }

  // Extract storage paths
  const pathsToDelete: string[] = []
  const urlParts = image.url.split(`/${BUCKET_NAME}/`)
  if (urlParts[1]) {
    pathsToDelete.push(urlParts[1])
  }

  if (image.thumbnail_url) {
    const thumbParts = image.thumbnail_url.split(`/${BUCKET_NAME}/`)
    if (thumbParts[1]) {
      pathsToDelete.push(thumbParts[1])
    }
  }

  // Delete from storage
  if (pathsToDelete.length > 0) {
    await supabase.storage.from(BUCKET_NAME).remove(pathsToDelete)
  }

  // Delete from database
  await supabase
    .from('product_images')
    .delete()
    .eq('id', imageId)
}

/**
 * Reorder product images
 */
export async function reorderProductImages(
  productId: string,
  imageIds: string[]
): Promise<void> {
  const supabase = await createClient()

  // Update positions
  for (let i = 0; i < imageIds.length; i++) {
    await supabase
      .from('product_images')
      .update({ position: i })
      .eq('id', imageIds[i])
      .eq('product_id', productId)
  }
}

/**
 * Update image alt text
 */
export async function updateImageAltText(
  imageId: string,
  altText: string
): Promise<void> {
  const supabase = await createClient()

  await supabase
    .from('product_images')
    .update({ alt_text: altText })
    .eq('id', imageId)
}

/**
 * Get first image URL for a product (for AI extraction)
 */
export async function getFirstProductImageUrl(productId: string): Promise<string | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('product_images')
    .select('url')
    .eq('product_id', productId)
    .order('position', { ascending: true })
    .limit(1)
    .single()

  return data?.url || null
}

// ============================================
// ENHANCED IMAGE PROCESSING FUNCTIONS
// ============================================

/**
 * Analyze image quality and determine what processing is needed
 */
export async function analyzeImageQuality(buffer: Buffer): Promise<ImageQualityAssessment> {
  try {
    // Get image metadata and statistics
    const image = sharp(buffer)
    const metadata = await image.metadata()
    const stats = await image.stats()

    // Calculate brightness from channel means
    const avgBrightness = stats.channels.reduce((sum, ch) => sum + ch.mean, 0) / stats.channels.length

    // Determine brightness level
    let brightness: 'dark' | 'normal' | 'bright' = 'normal'
    if (avgBrightness < 60) {
      brightness = 'dark'
    } else if (avgBrightness > 200) {
      brightness = 'bright'
    }

    // Check for blur using standard deviation (lower = more uniform = possibly blurry)
    const avgStdDev = stats.channels.reduce((sum, ch) => sum + ch.stdev, 0) / stats.channels.length
    const isBlurry = avgStdDev < 30

    // Build recommendations
    const recommendations: string[] = []
    let needsEnhancement = false

    if (brightness === 'dark') {
      recommendations.push('Image is too dark - brightness adjustment needed')
      needsEnhancement = true
    } else if (brightness === 'bright') {
      recommendations.push('Image is overexposed - brightness adjustment needed')
      needsEnhancement = true
    }

    if (isBlurry) {
      recommendations.push('Image appears blurry - sharpening may help')
      needsEnhancement = true
    }

    // Check contrast (difference between min and max)
    const avgRange = stats.channels.reduce((sum, ch) => sum + (ch.max - ch.min), 0) / stats.channels.length
    if (avgRange < 150) {
      recommendations.push('Low contrast - normalization recommended')
      needsEnhancement = true
    }

    // Check if background removal would help using Vision API
    let needsBackgroundRemoval = false
    try {
      const bgAnalysis = await googleVision.shouldRemoveBackground(buffer)
      needsBackgroundRemoval = bgAnalysis.shouldRemove
      if (needsBackgroundRemoval) {
        recommendations.push(`Background removal recommended - main object: ${bgAnalysis.mainObject?.name || 'detected'}`)
      }
    } catch {
      // Vision API might not be available
      console.log('[ImageProcessor] Vision API not available for background analysis')
    }

    // Calculate overall quality score (0-10)
    let score = 10

    if (brightness !== 'normal') score -= 2
    if (isBlurry) score -= 3
    if (avgRange < 150) score -= 1
    if (metadata.width && metadata.height) {
      // Penalize very small images
      if (metadata.width < 500 || metadata.height < 500) score -= 2
    }

    score = Math.max(0, Math.min(10, score))

    return {
      needsEnhancement,
      needsBackgroundRemoval,
      brightness,
      isBlurry,
      score,
      recommendations
    }
  } catch (error) {
    console.error('[ImageProcessor] Quality analysis failed:', error)
    return {
      needsEnhancement: false,
      needsBackgroundRemoval: false,
      brightness: 'normal',
      isBlurry: false,
      score: 5,
      recommendations: ['Could not analyze image quality']
    }
  }
}

/**
 * Full auto-enhancement pipeline for product images
 * Applies: auto-rotate, normalize contrast, adjust brightness, sharpen
 */
export async function enhanceProductImage(
  buffer: Buffer,
  options: {
    autoRotate?: boolean
    normalize?: boolean
    adjustBrightness?: boolean
    sharpen?: boolean
  } = {}
): Promise<EnhancementResult> {
  const {
    autoRotate = true,
    normalize = true,
    adjustBrightness = true,
    sharpen = true
  } = options

  const enhancementsApplied: string[] = []

  try {
    // Analyze current quality
    const quality = await analyzeImageQuality(buffer)

    let processor = sharp(buffer)

    // 1. Auto-rotate from EXIF data
    if (autoRotate) {
      processor = processor.rotate() // Auto-rotates based on EXIF orientation
      enhancementsApplied.push('auto-rotate')
    }

    // 2. Normalize contrast if needed
    if (normalize && quality.score < 8) {
      processor = processor.normalize()
      enhancementsApplied.push('normalize-contrast')
    }

    // 3. Adjust brightness if needed
    if (adjustBrightness) {
      if (quality.brightness === 'dark') {
        processor = processor.modulate({
          brightness: 1.15,
          saturation: 1.05
        })
        enhancementsApplied.push('brighten')
      } else if (quality.brightness === 'bright') {
        processor = processor.modulate({
          brightness: 0.9,
          saturation: 1.0
        })
        enhancementsApplied.push('reduce-brightness')
      } else {
        // Slight enhancement for normal images
        processor = processor.modulate({
          brightness: 1.02,
          saturation: 1.03
        })
        enhancementsApplied.push('subtle-enhance')
      }
    }

    // 4. Sharpen if blurry or for general enhancement
    if (sharpen) {
      if (quality.isBlurry) {
        // More aggressive sharpening for blurry images
        processor = processor.sharpen({
          sigma: 1.5,
          m1: 1.5,
          m2: 0.7
        })
        enhancementsApplied.push('sharpen-aggressive')
      } else {
        // Light sharpening for crisp product images
        processor = processor.sharpen({
          sigma: 1.0,
          m1: 1.0,
          m2: 0.5
        })
        enhancementsApplied.push('sharpen-light')
      }
    }

    const enhancedBuffer = await processor.toBuffer()

    return {
      buffer: enhancedBuffer,
      wasEnhanced: enhancementsApplied.length > 0,
      enhancementsApplied
    }
  } catch (error) {
    console.error('[ImageProcessor] Enhancement failed:', error)
    // Return original on failure
    return {
      buffer,
      wasEnhanced: false,
      enhancementsApplied: ['enhancement-failed']
    }
  }
}

/**
 * Remove background from product image using Cloud Vision object detection
 * Creates a white background version focused on the main product
 */
export async function removeBackground(
  buffer: Buffer
): Promise<BackgroundRemovalResult> {
  try {
    // Check if Vision API is available
    const isAvailable = await googleVision.isAvailable()
    if (!isAvailable) {
      console.log('[ImageProcessor] Vision API not available for background removal')
      return {
        buffer,
        wasRemoved: false,
        mainObjectDetected: null,
        confidence: 0
      }
    }

    // Detect objects to find main product
    const objects = await googleVision.detectObjects(buffer)

    if (objects.length === 0) {
      return {
        buffer,
        wasRemoved: false,
        mainObjectDetected: null,
        confidence: 0
      }
    }

    // Find the main (highest confidence) object
    const mainObject = objects.reduce((prev, curr) =>
      curr.score > prev.score ? curr : prev
    )

    // Get bounding box
    const vertices = mainObject.boundingPoly.normalizedVertices
    if (vertices.length < 4) {
      return {
        buffer,
        wasRemoved: false,
        mainObjectDetected: mainObject.name,
        confidence: mainObject.score
      }
    }

    // Get image metadata
    const metadata = await sharp(buffer).metadata()
    const width = metadata.width || 1000
    const height = metadata.height || 1000

    // Calculate crop region with padding
    const padding = 0.05 // 5% padding
    const left = Math.max(0, Math.floor((vertices[0].x - padding) * width))
    const top = Math.max(0, Math.floor((vertices[0].y - padding) * height))
    const right = Math.min(width, Math.ceil((vertices[2].x + padding) * width))
    const bottom = Math.min(height, Math.ceil((vertices[2].y + padding) * height))

    const cropWidth = right - left
    const cropHeight = bottom - top

    // Create a new image with white background and centered product
    const outputSize = Math.max(cropWidth, cropHeight)

    // Extract the product region
    const cropped = await sharp(buffer)
      .extract({
        left,
        top,
        width: cropWidth,
        height: cropHeight
      })
      .toBuffer()

    // Create white background and composite
    const result = await sharp({
      create: {
        width: outputSize,
        height: outputSize,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    })
      .composite([{
        input: cropped,
        gravity: 'center'
      }])
      .jpeg({ quality: 95 })
      .toBuffer()

    return {
      buffer: result,
      wasRemoved: true,
      mainObjectDetected: mainObject.name,
      confidence: mainObject.score
    }
  } catch (error) {
    console.error('[ImageProcessor] Background removal failed:', error)
    return {
      buffer,
      wasRemoved: false,
      mainObjectDetected: null,
      confidence: 0
    }
  }
}

/**
 * Convert image buffer to a specific format
 */
export async function convertImageFormat(
  buffer: Buffer,
  format: 'jpeg' | 'png' | 'webp',
  quality = 90
): Promise<Buffer> {
  let processor = sharp(buffer)

  switch (format) {
    case 'jpeg':
      processor = processor.jpeg({ quality })
      break
    case 'png':
      processor = processor.png({ quality })
      break
    case 'webp':
      processor = processor.webp({ quality })
      break
  }

  return processor.toBuffer()
}

/**
 * Get image dimensions and basic info
 */
export async function getImageInfo(buffer: Buffer): Promise<{
  width: number
  height: number
  format: string
  size: number
  hasAlpha: boolean
}> {
  const metadata = await sharp(buffer).metadata()

  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format || 'unknown',
    size: buffer.length,
    hasAlpha: metadata.hasAlpha || false
  }
}

/**
 * Create multiple sizes of an image
 */
export async function createImageVariants(
  buffer: Buffer
): Promise<{
  original: Buffer
  thumbnail: Buffer
  small: Buffer
}> {
  const [original, thumbnail, small] = await Promise.all([
    processImage(buffer, IMAGE_SIZES.original, 'inside'),
    processImage(buffer, IMAGE_SIZES.thumbnail, 'cover'),
    processImage(buffer, IMAGE_SIZES.small, 'cover')
  ])

  return { original, thumbnail, small }
}
