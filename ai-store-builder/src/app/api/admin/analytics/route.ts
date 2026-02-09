import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/admin/auth'
import {
  getRevenueTrend,
  getSignupsTrend,
  getTopStoresByRevenue,
  getRecentOrders
} from '@/lib/admin/queries'

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30d'

    // Map period to days
    const daysMap: Record<string, number> = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365,
      'all': 1000 // Essentially all time
    }

    const days = daysMap[period] || 30

    // Fetch all analytics data in parallel
    const [revenueTrend, signupsTrend, topStores, recentOrders] = await Promise.all([
      getRevenueTrend(days),
      getSignupsTrend(days),
      getTopStoresByRevenue(10),
      getRecentOrders(10)
    ])

    return NextResponse.json({
      revenueTrend,
      signupsTrend,
      topStores,
      recentOrders
    })
  } catch (error) {
    console.error('Admin analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
