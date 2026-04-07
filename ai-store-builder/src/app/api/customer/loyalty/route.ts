import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { validateSession } from '@/lib/customer/auth'

// GET customer loyalty data: balance, tier, recent transactions, program info
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('customer_session')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const sessionResult = await validateSession(token)
    if (!sessionResult.success || !sessionResult.customer) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    const customer = sessionResult.customer
    const supabase = getSupabaseAdmin()

    // Fetch the store's loyalty program
    const { data: program } = await supabase
      .from('loyalty_programs')
      .select('*')
      .eq('store_id', customer.store_id)
      .eq('is_active', true)
      .single()

    if (!program) {
      return NextResponse.json({
        success: true,
        program: null,
        points: null,
        transactions: [],
        message: 'No active loyalty program for this store',
      })
    }

    // Fetch customer's point balance
    const { data: points } = await supabase
      .from('loyalty_points')
      .select('*')
      .eq('store_id', customer.store_id)
      .eq('customer_id', customer.id)
      .single()

    // Fetch recent transactions
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')

    const { data: transactions } = await supabase
      .from('loyalty_transactions')
      .select('*')
      .eq('store_id', customer.store_id)
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Determine next tier info
    let nextTier: { name: string; min_points: number; points_needed: number } | null = null
    const lifetimeEarned = points?.lifetime_earned ?? 0

    if (program.tiers && Array.isArray(program.tiers)) {
      const tiers = program.tiers as Array<{ name: string; min_points: number; multiplier: number; benefits: string[] }>
      const sortedTiers = [...tiers].sort((a, b) => a.min_points - b.min_points)

      // Find the next tier the customer hasn't reached yet
      for (const tier of sortedTiers) {
        if (lifetimeEarned < tier.min_points) {
          nextTier = {
            name: tier.name,
            min_points: tier.min_points,
            points_needed: tier.min_points - lifetimeEarned,
          }
          break
        }
      }
    }

    return NextResponse.json({
      success: true,
      program: {
        name: program.name,
        description: program.description,
        points_per_currency_unit: program.points_per_currency_unit,
        min_redemption_points: program.min_redemption_points,
        redemption_value_per_point: program.redemption_value_per_point,
        tiers: program.tiers,
      },
      points: points
        ? {
            balance: points.balance,
            lifetime_earned: points.lifetime_earned,
            lifetime_redeemed: points.lifetime_redeemed,
            tier: points.tier,
          }
        : {
            balance: 0,
            lifetime_earned: 0,
            lifetime_redeemed: 0,
            tier: 'base',
          },
      next_tier: nextTier,
      transactions: transactions ?? [],
    })
  } catch (error) {
    console.error('Get loyalty data error:', error)
    return NextResponse.json({ error: 'Failed to fetch loyalty data' }, { status: 500 })
  }
}
