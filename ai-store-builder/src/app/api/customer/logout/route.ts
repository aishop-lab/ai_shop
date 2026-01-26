import { NextRequest, NextResponse } from 'next/server'
import { logoutCustomer } from '@/lib/customer/auth'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('customer_session')?.value

    if (token) {
      await logoutCustomer(token)
    }

    const response = NextResponse.json({ success: true })
    response.cookies.delete('customer_session')

    return response
  } catch (error) {
    console.error('Customer logout error:', error)
    return NextResponse.json({ success: true })
  }
}
