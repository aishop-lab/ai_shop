import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import crypto from 'crypto'
import { sendEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  storeId: z.string().uuid('Invalid store ID')
})

// Token expires in 1 hour
const TOKEN_EXPIRY_HOURS = 1

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = forgotPasswordSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        error: validation.error.errors[0]?.message || 'Invalid input'
      }, { status: 400 })
    }

    const { email, storeId } = validation.data
    const supabase = await createAdminClient()

    // Get store info for email
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, name, slug')
      .eq('id', storeId)
      .single()

    if (storeError || !store) {
      // Don't reveal if store exists
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.'
      })
    }

    // Find customer
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, email, full_name')
      .eq('store_id', storeId)
      .eq('email', email.toLowerCase())
      .single()

    if (customerError || !customer) {
      // Don't reveal if customer exists - return same message
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.'
      })
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex')
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)

    // Store token in database
    // First, invalidate any existing reset tokens for this customer
    await supabase
      .from('customer_password_resets')
      .delete()
      .eq('customer_id', customer.id)

    // Insert new reset token
    const { error: insertError } = await supabase
      .from('customer_password_resets')
      .insert({
        customer_id: customer.id,
        token_hash: resetTokenHash,
        expires_at: expiresAt.toISOString()
      })

    if (insertError) {
      console.error('Failed to store reset token:', insertError)
      return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
    }

    // Build reset URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://storeforge.site'
    const resetUrl = `${baseUrl}/${store.slug}/account/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`

    // Send reset email
    try {
      await sendEmail({
        to: email,
        subject: `Reset your password - ${store.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Reset Your Password</h2>
            <p>Hi ${customer.full_name || 'there'},</p>
            <p>You requested to reset your password for your ${store.name} account.</p>
            <p>Click the button below to set a new password:</p>
            <div style="margin: 30px 0;">
              <a href="${resetUrl}"
                 style="background-color: #000; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">
              This link will expire in ${TOKEN_EXPIRY_HOURS} hour${TOKEN_EXPIRY_HOURS > 1 ? 's' : ''}.
            </p>
            <p style="color: #666; font-size: 14px;">
              If you didn't request this, you can safely ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
            <p style="color: #999; font-size: 12px;">
              ${store.name}<br/>
              This is an automated message, please do not reply.
            </p>
          </div>
        `
      })
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError)
      // Delete the token if email fails
      await supabase
        .from('customer_password_resets')
        .delete()
        .eq('customer_id', customer.id)
      return NextResponse.json({ error: 'Failed to send reset email' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.'
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
