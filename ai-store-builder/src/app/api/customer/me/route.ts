import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateSession, updateCustomerProfile, changePassword } from '@/lib/customer/auth'

// GET current customer
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('customer_session')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const result = await validateSession(token)

    if (!result.success) {
      const response = NextResponse.json(
        { error: 'Session expired' },
        { status: 401 }
      )
      response.cookies.delete('customer_session')
      return response
    }

    return NextResponse.json({
      success: true,
      customer: result.customer
    })
  } catch (error) {
    console.error('Get customer error:', error)
    return NextResponse.json(
      { error: 'Failed to get profile' },
      { status: 500 }
    )
  }
}

// Update customer profile
const updateSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().regex(/^[6-9]\d{9}$/).optional(),
  marketingConsent: z.boolean().optional()
})

export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get('customer_session')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const sessionResult = await validateSession(token)
    if (!sessionResult.success || !sessionResult.customer) {
      return NextResponse.json(
        { error: 'Session expired' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validation = updateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input' },
        { status: 400 }
      )
    }

    const result = await updateCustomerProfile(sessionResult.customer.id, validation.data)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      customer: result.customer
    })
  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}

// Change password
const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8)
})

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('customer_session')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const sessionResult = await validateSession(token)
    if (!sessionResult.success || !sessionResult.customer) {
      return NextResponse.json(
        { error: 'Session expired' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validation = passwordSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input' },
        { status: 400 }
      )
    }

    const result = await changePassword(
      sessionResult.customer.id,
      validation.data.currentPassword,
      validation.data.newPassword
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    // Clear session cookie since all sessions are invalidated
    const response = NextResponse.json({ success: true })
    response.cookies.delete('customer_session')

    return response
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json(
      { error: 'Failed to change password' },
      { status: 500 }
    )
  }
}
