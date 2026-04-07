import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const maxDuration = 300

const BUCKET_NAME = 'product-images'
const JOBS_PER_RUN = 10

// Image sizes matching image-processor.ts
const IMAGE_SIZES = {
  original: { width: 2000, height: 2000, quality: 90 },
  thumbnail: { width: 600, height: 600, quality: 80 },
}

interface JobDetails {
  image_id: string
  product_id: string
  original_url: string
  optimization_type: 'compress' | 'resize' | 'enhance' | 'convert_format' | 'add_alt_text'
  target_max_kb: number
  status: string
}

/**
 * Extract the storage path from a full Supabase public URL.
 * e.g. "https://xyz.supabase.co/storage/v1/object/public/product-images/products/abc/img.jpg"
 *   -> "products/abc/img.jpg"
 */
function extractStoragePath(url: string): string | null {
  const marker = `/${BUCKET_NAME}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return url.substring(idx + marker.length)
}

/**
 * Fetch an image from a URL and return it as a Buffer.
 */
async function fetchImageBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * Upload a buffer to Supabase Storage, overwriting if it already exists.
 * Returns the public URL.
 */
async function uploadToStorage(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  path: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, buffer, {
      contentType,
      cacheControl: '31536000',
      upsert: true,
    })

  if (error) {
    throw new Error(`Upload failed for ${path}: ${error.message}`)
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(path)

  return urlData.publicUrl
}

/**
 * Compress an image iteratively until it is under the target KB size.
 */
async function compressImage(buffer: Buffer, targetMaxKb: number): Promise<Buffer> {
  let quality = 85
  let result = await sharp(buffer).jpeg({ quality }).toBuffer()

  // Iteratively lower quality until target is met or quality floor reached
  while (result.length > targetMaxKb * 1024 && quality > 20) {
    quality -= 10
    result = await sharp(buffer).jpeg({ quality }).toBuffer()
  }

  return result
}

/**
 * Resize an image to original size spec (2000x2000 inside) + regenerate thumbnail.
 */
async function resizeImage(buffer: Buffer): Promise<{ original: Buffer; thumbnail: Buffer }> {
  const original = await sharp(buffer)
    .resize({
      width: IMAGE_SIZES.original.width,
      height: IMAGE_SIZES.original.height,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: IMAGE_SIZES.original.quality })
    .toBuffer()

  const thumbnail = await sharp(buffer)
    .resize({
      width: IMAGE_SIZES.thumbnail.width,
      height: IMAGE_SIZES.thumbnail.height,
      fit: 'cover',
      withoutEnlargement: true,
    })
    .jpeg({ quality: IMAGE_SIZES.thumbnail.quality })
    .toBuffer()

  return { original, thumbnail }
}

/**
 * Enhance a product image: auto-rotate, normalize, brightness adjust, sharpen.
 * Mirrors the logic in image-processor.ts enhanceProductImage().
 */
async function enhanceImage(buffer: Buffer): Promise<Buffer> {
  // Analyze brightness/contrast via sharp stats
  const stats = await sharp(buffer).stats()
  const avgBrightness =
    stats.channels.reduce((sum, ch) => sum + ch.mean, 0) / stats.channels.length
  const avgStdDev =
    stats.channels.reduce((sum, ch) => sum + ch.stdev, 0) / stats.channels.length

  let processor = sharp(buffer)

  // Auto-rotate from EXIF
  processor = processor.rotate()

  // Normalize contrast
  processor = processor.normalize()

  // Adjust brightness
  if (avgBrightness < 60) {
    processor = processor.modulate({ brightness: 1.15, saturation: 1.05 })
  } else if (avgBrightness > 200) {
    processor = processor.modulate({ brightness: 0.9, saturation: 1.0 })
  } else {
    processor = processor.modulate({ brightness: 1.02, saturation: 1.03 })
  }

  // Sharpen — more aggressive if image looks blurry
  if (avgStdDev < 30) {
    processor = processor.sharpen({ sigma: 1.5, m1: 1.5, m2: 0.7 })
  } else {
    processor = processor.sharpen({ sigma: 1.0, m1: 1.0, m2: 0.5 })
  }

  return processor.toBuffer()
}

/**
 * Convert image to WebP format.
 */
async function convertToWebP(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer).webp({ quality: 90 }).toBuffer()
}

// ---------------------------------------------------------------------------
// Process a single optimization job
// ---------------------------------------------------------------------------
async function processJob(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  jobId: string,
  details: JobDetails
): Promise<{ success: boolean; message: string }> {
  const { image_id, original_url, optimization_type, target_max_kb } = details

  // Skip add_alt_text — handled directly by the tool
  if (optimization_type === 'add_alt_text') {
    return { success: true, message: 'add_alt_text is handled inline — skipped' }
  }

  // Fetch the source image
  const buffer = await fetchImageBuffer(original_url)
  const storagePath = extractStoragePath(original_url)

  if (!storagePath) {
    throw new Error(`Could not extract storage path from URL: ${original_url}`)
  }

  // Determine the thumbnail path from the original path
  // Original: products/{storeId}/{filename}
  // Thumbnail: products/{storeId}/thumbnails/{filename}
  const pathParts = storagePath.split('/')
  const filename = pathParts[pathParts.length - 1]
  const storeDir = pathParts.slice(0, pathParts.length - 1).join('/')
  const thumbnailPath = `${storeDir}/thumbnails/${filename}`

  switch (optimization_type) {
    case 'compress': {
      const compressed = await compressImage(buffer, target_max_kb)
      const newUrl = await uploadToStorage(supabase, storagePath, compressed, 'image/jpeg')

      await supabase
        .from('product_images')
        .update({ original_url: newUrl })
        .eq('id', image_id)

      const savedKb = Math.round((buffer.length - compressed.length) / 1024)
      return {
        success: true,
        message: `Compressed image (saved ~${savedKb} KB, final ${Math.round(compressed.length / 1024)} KB)`,
      }
    }

    case 'resize': {
      const { original, thumbnail } = await resizeImage(buffer)
      const newOriginalUrl = await uploadToStorage(supabase, storagePath, original, 'image/jpeg')
      const newThumbnailUrl = await uploadToStorage(supabase, thumbnailPath, thumbnail, 'image/jpeg')

      await supabase
        .from('product_images')
        .update({ original_url: newOriginalUrl, thumbnail_url: newThumbnailUrl })
        .eq('id', image_id)

      return { success: true, message: 'Resized original + regenerated thumbnail' }
    }

    case 'enhance': {
      const enhanced = await enhanceImage(buffer)
      const newUrl = await uploadToStorage(supabase, storagePath, enhanced, 'image/jpeg')

      await supabase
        .from('product_images')
        .update({ original_url: newUrl })
        .eq('id', image_id)

      return { success: true, message: 'Enhanced image (rotate, normalize, brightness, sharpen)' }
    }

    case 'convert_format': {
      const webpBuffer = await convertToWebP(buffer)
      // Replace .jpg/.jpeg/.png extension with .webp in the storage path
      const webpPath = storagePath.replace(/\.(jpe?g|png)$/i, '.webp')
      const newUrl = await uploadToStorage(supabase, webpPath, webpBuffer, 'image/webp')

      await supabase
        .from('product_images')
        .update({ original_url: newUrl })
        .eq('id', image_id)

      const savedKb = Math.round((buffer.length - webpBuffer.length) / 1024)
      return {
        success: true,
        message: `Converted to WebP (saved ~${savedKb} KB)`,
      }
    }

    default:
      return { success: false, message: `Unknown optimization_type: ${optimization_type}` }
  }
}

// ---------------------------------------------------------------------------
// Main cron handler
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  try {
    // Auth check
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Cron:OptimizeImages] Starting image optimization run...')

    const supabase = getSupabaseAdmin()

    // Fetch queued jobs
    const { data: jobs, error: fetchError } = await supabase
      .from('agent_actions')
      .select('id, store_id, details')
      .eq('action_type', 'optimize_image')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(JOBS_PER_RUN)

    if (fetchError) {
      console.error('[Cron:OptimizeImages] Failed to fetch jobs:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
    }

    // Also pick up any rows still marked 'completed' with details.status = 'queued'
    // (from before the cipher-tools fix)
    const { data: legacyJobs, error: legacyError } = await supabase
      .from('agent_actions')
      .select('id, store_id, details')
      .eq('action_type', 'optimize_image')
      .eq('status', 'completed')
      .order('created_at', { ascending: true })
      .limit(JOBS_PER_RUN - (jobs?.length ?? 0))

    if (legacyError) {
      console.error('[Cron:OptimizeImages] Failed to fetch legacy jobs:', legacyError)
    }

    // Filter legacy jobs to only those with details.status = 'queued'
    const filteredLegacyJobs = (legacyJobs ?? []).filter(
      (j) => (j.details as JobDetails | null)?.status === 'queued'
    )

    const allJobs = [...(jobs ?? []), ...filteredLegacyJobs].slice(0, JOBS_PER_RUN)

    if (allJobs.length === 0) {
      console.log('[Cron:OptimizeImages] No queued jobs found')
      return NextResponse.json({ message: 'No queued jobs', processed: 0, failed: 0 })
    }

    console.log(`[Cron:OptimizeImages] Processing ${allJobs.length} job(s)...`)

    const results: Array<{ id: string; success: boolean; message: string }> = []

    for (const job of allJobs) {
      const details = job.details as JobDetails | null

      if (!details || !details.image_id || !details.original_url) {
        // Mark as failed — missing required data
        await supabase
          .from('agent_actions')
          .update({
            status: 'failed' as string,
            details: { ...(details ?? {}), status: 'failed', error: 'Missing required fields in details' },
            completed_at: new Date().toISOString(),
          })
          .eq('id', job.id)

        results.push({ id: job.id, success: false, message: 'Missing required fields in details' })
        continue
      }

      try {
        const result = await processJob(supabase, job.id, details)

        // Update the agent_actions row
        await supabase
          .from('agent_actions')
          .update({
            status: 'completed',
            details: {
              ...details,
              status: result.success ? 'processed' : 'failed',
              processing_result: result.message,
            },
            completed_at: new Date().toISOString(),
          })
          .eq('id', job.id)

        results.push({ id: job.id, ...result })
        console.log(`[Cron:OptimizeImages] Job ${job.id}: ${result.message}`)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'

        await supabase
          .from('agent_actions')
          .update({
            status: 'failed' as string,
            details: {
              ...details,
              status: 'failed',
              error: errorMessage,
            },
            completed_at: new Date().toISOString(),
          })
          .eq('id', job.id)

        results.push({ id: job.id, success: false, message: errorMessage })
        console.error(`[Cron:OptimizeImages] Job ${job.id} failed:`, errorMessage)
      }
    }

    const processed = results.filter((r) => r.success).length
    const failed = results.filter((r) => !r.success).length

    console.log(
      `[Cron:OptimizeImages] Run complete. Processed: ${processed}, Failed: ${failed}`
    )

    return NextResponse.json({
      message: 'Image optimization run complete',
      total: allJobs.length,
      processed,
      failed,
      results,
    })
  } catch (error) {
    console.error('[Cron:OptimizeImages] Cron run failed:', error)
    return NextResponse.json({ error: 'Image optimization cron failed' }, { status: 500 })
  }
}

// Also support POST for Vercel Cron
export async function POST(request: Request) {
  return GET(request)
}
