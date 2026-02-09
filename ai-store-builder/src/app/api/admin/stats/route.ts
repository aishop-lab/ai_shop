import { NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/admin/auth'
import { getPlatformStats } from '@/lib/admin/queries'

export async function GET() {
  try {
    const admin = await verifyAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const stats = await getPlatformStats()

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch platform stats' },
      { status: 500 }
    )
  }
}
