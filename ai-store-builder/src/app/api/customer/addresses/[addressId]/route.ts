import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { validateSession } from '@/lib/customer/auth'

const updateSchema = z.object({
  label: z.string().max(50).optional(),
  fullName: z.string().min(2).optional(),
  phone: z.string().regex(/^[6-9]\d{9}$/).optional(),
  addressLine1: z.string().min(5).optional(),
  addressLine2: z.string().optional(),
  city: z.string().min(2).optional(),
  state: z.string().min(2).optional(),
  pincode: z.string().regex(/^\d{6}$/).optional(),
  country: z.string().optional(),
  isDefault: z.boolean().optional()
})

// Update address
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ addressId: string }> }
) {
  try {
    const { addressId } = await params
    const token = request.cookies.get('customer_session')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const sessionResult = await validateSession(token)
    if (!sessionResult.success || !sessionResult.customer) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    // Verify ownership
    const { data: existing } = await getSupabaseAdmin()
      .from('customer_addresses')
      .select('customer_id')
      .eq('id', addressId)
      .single()

    if (!existing || existing.customer_id !== sessionResult.customer.id) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 })
    }

    const body = await request.json()
    const validation = updateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (validation.data.label !== undefined) updateData.label = validation.data.label
    if (validation.data.fullName !== undefined) updateData.full_name = validation.data.fullName
    if (validation.data.phone !== undefined) updateData.phone = validation.data.phone
    if (validation.data.addressLine1 !== undefined) updateData.address_line1 = validation.data.addressLine1
    if (validation.data.addressLine2 !== undefined) updateData.address_line2 = validation.data.addressLine2
    if (validation.data.city !== undefined) updateData.city = validation.data.city
    if (validation.data.state !== undefined) updateData.state = validation.data.state
    if (validation.data.pincode !== undefined) updateData.pincode = validation.data.pincode
    if (validation.data.country !== undefined) updateData.country = validation.data.country
    if (validation.data.isDefault !== undefined) updateData.is_default = validation.data.isDefault

    const { data: address, error } = await getSupabaseAdmin()
      .from('customer_addresses')
      .update(updateData)
      .eq('id', addressId)
      .select()
      .single()

    if (error) {
      console.error('Failed to update address:', error)
      return NextResponse.json({ error: 'Failed to update address' }, { status: 500 })
    }

    return NextResponse.json({ success: true, address })
  } catch (error) {
    console.error('Update address error:', error)
    return NextResponse.json({ error: 'Failed to update address' }, { status: 500 })
  }
}

// Delete address
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ addressId: string }> }
) {
  try {
    const { addressId } = await params
    const token = request.cookies.get('customer_session')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const sessionResult = await validateSession(token)
    if (!sessionResult.success || !sessionResult.customer) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    // Verify ownership and delete
    const { error } = await getSupabaseAdmin()
      .from('customer_addresses')
      .delete()
      .eq('id', addressId)
      .eq('customer_id', sessionResult.customer.id)

    if (error) {
      console.error('Failed to delete address:', error)
      return NextResponse.json({ error: 'Failed to delete address' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete address error:', error)
    return NextResponse.json({ error: 'Failed to delete address' }, { status: 500 })
  }
}
