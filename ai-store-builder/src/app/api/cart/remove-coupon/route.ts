// Remove Coupon API
// Removes an applied coupon from the cart

import { NextResponse } from 'next/server'

export async function POST() {
    try {
        // This endpoint is mostly for client state management
        // The actual coupon removal is handled by the frontend
        // This provides a consistent API surface

        return NextResponse.json({
            success: true,
            message: 'Coupon removed successfully'
        })

    } catch (error) {
        console.error('Remove coupon error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to remove coupon' },
            { status: 500 }
        )
    }
}
