import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Cron] Starting scheduled publish check...')

    const supabase = getSupabaseAdmin()
    const now = new Date().toISOString()

    // Find all draft products with a published_at date in the past
    const { data: scheduledProducts, error: fetchError } = await supabase
      .from('products')
      .select('id, title, store_id')
      .eq('status', 'draft')
      .not('published_at', 'is', null)
      .lte('published_at', now)

    if (fetchError) {
      console.error('[Cron] Failed to fetch scheduled products:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch scheduled products' }, { status: 500 })
    }

    if (!scheduledProducts || scheduledProducts.length === 0) {
      console.log('[Cron] No scheduled products to publish')
      return NextResponse.json({ message: 'No scheduled products to publish', published: 0 })
    }

    console.log(`[Cron] Found ${scheduledProducts.length} product(s) to publish`)

    let publishedCount = 0
    const errors: string[] = []

    for (const product of scheduledProducts) {
      const { error: updateError } = await supabase
        .from('products')
        .update({ status: 'active', published_at: null })
        .eq('id', product.id)

      if (updateError) {
        console.error(`[Cron] Failed to publish product ${product.id}:`, updateError)
        errors.push(`${product.title} (${product.id}): ${updateError.message}`)
      } else {
        publishedCount++
        console.log(`[Cron] Published product: ${product.title} (${product.id})`)
      }
    }

    console.log(`[Cron] Scheduled publish complete. Published: ${publishedCount}/${scheduledProducts.length}`)

    return NextResponse.json({
      message: 'Scheduled publish check complete',
      found: scheduledProducts.length,
      published: publishedCount,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error) {
    console.error('[Cron] Scheduled publish check failed:', error)
    return NextResponse.json(
      { error: 'Scheduled publish check failed' },
      { status: 500 }
    )
  }
}

// Also support POST for Vercel Cron
export async function POST(request: Request) {
  return GET(request)
}
