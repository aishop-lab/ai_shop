// Product Image Enhancement Service
// Uses Remove.bg for background removal + Sharp.js for image processing

import sharp from 'sharp'

const REMOVE_BG_API_KEY = process.env.REMOVE_BG_API_KEY
const REMOVE_BG_API_URL = 'https://api.remove.bg/v1.0/removebg'

export interface EnhanceOptions {
  removeBackground?: boolean
  autoRotate?: boolean
  fixLighting?: boolean
  centerAndPad?: boolean
  sharpen?: boolean
  backgroundColor?: string // hex color, default white
  outputSize?: number // square output size, default 1024
  outputFormat?: 'png' | 'jpeg' | 'webp'
  quality?: number // 1-100 for jpeg/webp
}

export interface EnhanceResult {
  success: boolean
  enhancedBuffer?: Buffer
  mimeType?: string
  transformationsApplied: string[]
  error?: string
  details?: {
    originalSize: { width: number; height: number }
    finalSize: { width: number; height: number }
    backgroundRemoved: boolean
  }
}

/**
 * Remove background using Remove.bg API
 */
async function removeBackground(imageBuffer: Buffer): Promise<Buffer | null> {
  if (!REMOVE_BG_API_KEY) {
    console.error('[ImageEnhance] REMOVE_BG_API_KEY not configured')
    return null
  }

  try {
    const formData = new FormData()
    formData.append('image_file', new Blob([new Uint8Array(imageBuffer)]), 'image.png')
    formData.append('size', 'auto') // auto, preview, small, regular, medium, hd, 4k
    formData.append('type', 'product') // auto, person, product, car
    formData.append('format', 'png')
    formData.append('bg_color', '') // transparent

    const response = await fetch(REMOVE_BG_API_URL, {
      method: 'POST',
      headers: {
        'X-Api-Key': REMOVE_BG_API_KEY,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[ImageEnhance] Remove.bg API error:', response.status, errorText)
      return null
    }

    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error) {
    console.error('[ImageEnhance] Remove.bg failed:', error)
    return null
  }
}

/**
 * Auto-rotate image based on EXIF and content analysis
 */
async function autoRotate(imageBuffer: Buffer): Promise<Buffer> {
  try {
    // Sharp's rotate() with no arguments uses EXIF orientation
    return await sharp(imageBuffer)
      .rotate() // Auto-rotate based on EXIF
      .toBuffer()
  } catch (error) {
    console.error('[ImageEnhance] Auto-rotate failed:', error)
    return imageBuffer
  }
}

/**
 * Fix lighting and color balance
 */
async function fixLighting(imageBuffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(imageBuffer)
      // Normalize histogram for better contrast
      .normalize()
      // Moderate adjustments for product photos
      .modulate({
        brightness: 1.05, // Slightly brighter
        saturation: 1.1,  // Slightly more vibrant
      })
      // Remove color cast (slight toward neutral)
      .gamma(1.1)
      .toBuffer()
  } catch (error) {
    console.error('[ImageEnhance] Fix lighting failed:', error)
    return imageBuffer
  }
}

/**
 * Center product and add padding with background color
 */
async function centerAndPad(
  imageBuffer: Buffer,
  backgroundColor: string = '#FFFFFF',
  outputSize: number = 1024
): Promise<Buffer> {
  try {
    const metadata = await sharp(imageBuffer).metadata()
    const { width = 0, height = 0 } = metadata

    // Calculate padding to make square with product at 80% of frame
    const maxDim = Math.max(width, height)
    const padding = Math.round(maxDim * 0.1) // 10% padding on each side
    const newSize = maxDim + (padding * 2)

    // Parse background color
    const bgColor = backgroundColor.startsWith('#')
      ? backgroundColor
      : `#${backgroundColor}`

    return await sharp(imageBuffer)
      // Extend canvas to make square with padding
      .extend({
        top: Math.round((newSize - height) / 2),
        bottom: Math.round((newSize - height) / 2),
        left: Math.round((newSize - width) / 2),
        right: Math.round((newSize - width) / 2),
        background: bgColor,
      })
      // Resize to target output size
      .resize(outputSize, outputSize, {
        fit: 'contain',
        background: bgColor,
      })
      .toBuffer()
  } catch (error) {
    console.error('[ImageEnhance] Center and pad failed:', error)
    return imageBuffer
  }
}

/**
 * Sharpen image for crisp product details
 */
async function sharpenImage(imageBuffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(imageBuffer)
      .sharpen({
        sigma: 1.0,      // Sharpening strength
        m1: 1.0,         // Flat areas
        m2: 2.0,         // Jagged areas
        x1: 2.0,         // Threshold for flat
        y2: 10.0,        // Maximum brightening
        y3: 5.0,         // Maximum darkening
      })
      .toBuffer()
  } catch (error) {
    console.error('[ImageEnhance] Sharpen failed:', error)
    return imageBuffer
  }
}

/**
 * Flatten transparent PNG onto background color
 */
async function flattenOnBackground(
  imageBuffer: Buffer,
  backgroundColor: string = '#FFFFFF'
): Promise<Buffer> {
  try {
    return await sharp(imageBuffer)
      .flatten({ background: backgroundColor })
      .toBuffer()
  } catch (error) {
    console.error('[ImageEnhance] Flatten failed:', error)
    return imageBuffer
  }
}

/**
 * Main enhancement function - processes image through all steps
 */
export async function enhanceProductImage(
  imageBuffer: Buffer,
  options: EnhanceOptions = {}
): Promise<EnhanceResult> {
  const {
    removeBackground: shouldRemoveBg = true,
    autoRotate: shouldAutoRotate = true,
    fixLighting: shouldFixLighting = true,
    centerAndPad: shouldCenterPad = true,
    sharpen: shouldSharpen = true,
    backgroundColor = '#FFFFFF',
    outputSize = 1024,
    outputFormat = 'png',
    quality = 90,
  } = options

  const transformationsApplied: string[] = []
  let currentBuffer = imageBuffer
  let backgroundRemoved = false

  try {
    // Get original dimensions
    const originalMetadata = await sharp(imageBuffer).metadata()
    const originalSize = {
      width: originalMetadata.width || 0,
      height: originalMetadata.height || 0,
    }

    console.log('[ImageEnhance] Starting enhancement pipeline')
    console.log('[ImageEnhance] Original size:', originalSize)

    // Step 1: Auto-rotate (do first to fix orientation)
    if (shouldAutoRotate) {
      console.log('[ImageEnhance] Step 1: Auto-rotating...')
      currentBuffer = await autoRotate(currentBuffer)
      transformationsApplied.push('auto_rotated')
    }

    // Step 2: Remove background
    if (shouldRemoveBg) {
      console.log('[ImageEnhance] Step 2: Removing background...')
      const bgRemovedBuffer = await removeBackground(currentBuffer)
      if (bgRemovedBuffer) {
        currentBuffer = bgRemovedBuffer
        backgroundRemoved = true
        transformationsApplied.push('background_removed')
      } else {
        console.log('[ImageEnhance] Background removal skipped (API unavailable or failed)')
      }
    }

    // Step 3: Fix lighting (only if background wasn't removed, as remove.bg already optimizes)
    if (shouldFixLighting && !backgroundRemoved) {
      console.log('[ImageEnhance] Step 3: Fixing lighting...')
      currentBuffer = await fixLighting(currentBuffer)
      transformationsApplied.push('lighting_fixed')
    }

    // Step 4: Center and pad
    if (shouldCenterPad) {
      console.log('[ImageEnhance] Step 4: Centering and padding...')
      // If we have transparency, flatten first
      if (backgroundRemoved) {
        currentBuffer = await flattenOnBackground(currentBuffer, backgroundColor)
      }
      currentBuffer = await centerAndPad(currentBuffer, backgroundColor, outputSize)
      transformationsApplied.push('centered_padded')
    }

    // Step 5: Sharpen
    if (shouldSharpen) {
      console.log('[ImageEnhance] Step 5: Sharpening...')
      currentBuffer = await sharpenImage(currentBuffer)
      transformationsApplied.push('sharpened')
    }

    // Step 6: Final output format conversion
    let finalBuffer: Buffer
    let mimeType: string

    const sharpOutput = sharp(currentBuffer)

    switch (outputFormat) {
      case 'jpeg':
        finalBuffer = await sharpOutput.jpeg({ quality }).toBuffer()
        mimeType = 'image/jpeg'
        break
      case 'webp':
        finalBuffer = await sharpOutput.webp({ quality }).toBuffer()
        mimeType = 'image/webp'
        break
      case 'png':
      default:
        finalBuffer = await sharpOutput.png({ compressionLevel: 6 }).toBuffer()
        mimeType = 'image/png'
        break
    }

    // Get final dimensions
    const finalMetadata = await sharp(finalBuffer).metadata()
    const finalSize = {
      width: finalMetadata.width || 0,
      height: finalMetadata.height || 0,
    }

    console.log('[ImageEnhance] Enhancement complete!')
    console.log('[ImageEnhance] Final size:', finalSize)
    console.log('[ImageEnhance] Transformations:', transformationsApplied)

    return {
      success: true,
      enhancedBuffer: finalBuffer,
      mimeType,
      transformationsApplied,
      details: {
        originalSize,
        finalSize,
        backgroundRemoved,
      },
    }
  } catch (error) {
    console.error('[ImageEnhance] Enhancement pipeline failed:', error)
    return {
      success: false,
      transformationsApplied,
      error: error instanceof Error ? error.message : 'Enhancement failed',
    }
  }
}

/**
 * Check if Remove.bg API is configured
 */
export function isRemoveBgConfigured(): boolean {
  return !!REMOVE_BG_API_KEY
}

/**
 * Quick background removal only (for simpler use cases)
 */
export async function removeBackgroundOnly(imageBuffer: Buffer): Promise<Buffer | null> {
  return removeBackground(imageBuffer)
}
