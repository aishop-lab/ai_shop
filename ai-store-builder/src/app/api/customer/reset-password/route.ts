import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import crypto from 'crypto'
import { hashPassword } from '@/lib/customer/auth'

export const dynamic = 'force-dynamic'

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = resetPasswordSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        error: validation.error.errors[0]?.message || 'Invalid input'
      }, { status: 400 })
    }

    const { token, email, password } = validation.data
    const supabase = await createAdminClient()

    // Hash the token to compare with stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    // Find the reset token
    const { data: resetRecord, error: resetError } = await supabase
      .from('customer_password_resets')
      .select('id, customer_id, expires_at')
      .eq('token_hash', tokenHash)
      .single()

    if (resetError || !resetRecord) {
      return NextResponse.json({
        error: 'Invalid or expired reset link. Please request a new one.'
      }, { status: 400 })
    }

    // Check if token has expired
    if (new Date(resetRecord.expires_at) < new Date()) {
      // Delete expired token
      await supabase
        .from('customer_password_resets')
        .delete()
        .eq('id', resetRecord.id)

      return NextResponse.json({
        error: 'Reset link has expired. Please request a new one.'
      }, { status: 400 })
    }

    // Verify the email matches the customer
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, email')
      .eq('id', resetRecord.customer_id)
      .single()

    if (customerError || !customer) {
      return NextResponse.json({
        error: 'Invalid reset link'
      }, { status: 400 })
    }

    if (customer.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({
        error: 'Email does not match'
      }, { status: 400 })
    }

    // Hash the new password
    const passwordHash = await hashPassword(password)

    // Update customer password
    const { error: updateError } = await supabase
      .from('customers')
      .update({
        password_hash: passwordHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', customer.id)

    if (updateError) {
      console.error('Failed to update password:', updateError)
      return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
    }

    // Delete the used reset token
    await supabase
      .from('customer_password_resets')
      .delete()
      .eq('id', resetRecord.id)

    // Invalidate all existing sessions for security
    await supabase
      .from('customer_sessions')
      .delete()
      .eq('customer_id', customer.id)

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully. You can now sign in with your new password.'
    })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
