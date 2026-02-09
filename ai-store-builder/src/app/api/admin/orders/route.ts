import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/admin/auth'
import { getAdminOrders } from '@/lib/admin/queries'

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || undefined
    const storeId = searchParams.get('store_id') || undefined
    const status = searchParams.get('status') || undefined
    const paymentStatus = searchParams.get('payment_status') || undefined

    const { orders, total } = await getAdminOrders({
      page,
      limit,
      search,
      storeId,
      status,
      paymentStatus
    })

    return NextResponse.json({
      orders,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error) {
    console.error('Admin orders error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}
