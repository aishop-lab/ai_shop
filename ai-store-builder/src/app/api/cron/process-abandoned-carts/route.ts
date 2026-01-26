import { NextResponse } from 'next/server'
import { processAbandonedCarts } from '@/lib/cart/abandoned-cart'

export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Cron] Processing abandoned carts...')

    const result = await processAbandonedCarts()

    console.log(`[Cron] Abandoned cart processing complete:`, result)

    return NextResponse.json({
      success: true,
      ...result
    })
  } catch (error) {
    console.error('[Cron] Abandoned cart processing failed:', error)
    return NextResponse.json(
      { error: 'Processing failed' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  return GET(request)
}
