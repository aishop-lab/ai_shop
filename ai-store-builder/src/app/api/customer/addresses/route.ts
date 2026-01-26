import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { validateSession } from '@/lib/customer/auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const addressSchema = z.object({
  label: z.string().max(50).optional().default('Home'),
  fullName: z.string().min(2),
  phone: z.string().regex(/^[6-9]\d{9}$/),
  addressLine1: z.string().min(5),
  addressLine2: z.string().optional(),
  city: z.string().min(2),
  state: z.string().min(2),
  pincode: z.string().regex(/^\d{6}$/),
  country: z.string().optional().default('India'),
  isDefault: z.boolean().optional().default(false)
})

// Get all addresses
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

    const { data: addresses, error } = await supabase
      .from('customer_addresses')
      .select('*')
      .eq('customer_id', sessionResult.customer.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch addresses:', error)
      return NextResponse.json({ error: 'Failed to fetch addresses' }, { status: 500 })
    }

    return NextResponse.json({ success: true, addresses })
  } catch (error) {
    console.error('Get addresses error:', error)
    return NextResponse.json({ error: 'Failed to fetch addresses' }, { status: 500 })
  }
}

// Add new address
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('customer_session')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const sessionResult = await validateSession(token)
    if (!sessionResult.success || !sessionResult.customer) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    const body = await request.json()
    const validation = addressSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { data: address, error } = await supabase
      .from('customer_addresses')
      .insert({
        customer_id: sessionResult.customer.id,
        label: validation.data.label,
        full_name: validation.data.fullName,
        phone: validation.data.phone,
        address_line1: validation.data.addressLine1,
        address_line2: validation.data.addressLine2,
        city: validation.data.city,
        state: validation.data.state,
        pincode: validation.data.pincode,
        country: validation.data.country,
        is_default: validation.data.isDefault
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create address:', error)
      return NextResponse.json({ error: 'Failed to save address' }, { status: 500 })
    }

    return NextResponse.json({ success: true, address })
  } catch (error) {
    console.error('Create address error:', error)
    return NextResponse.json({ error: 'Failed to save address' }, { status: 500 })
  }
}
