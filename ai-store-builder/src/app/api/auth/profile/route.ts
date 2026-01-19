import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { profileUpdateSchema } from '@/lib/validations/auth'
import { handleAuthError } from '@/lib/utils/errors'
import type { AuthResponse, Profile } from '@/lib/types/auth'

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json<AuthResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate input
    const validationResult = profileUpdateSchema.safeParse(body)
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(', ')
      return NextResponse.json<AuthResponse>(
        { success: false, error: errors },
        { status: 400 }
      )
    }

    const updates = validationResult.data

    // Build update object, handling nested preferences merge
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (updates.full_name !== undefined) {
      updateData.full_name = updates.full_name
    }

    if (updates.phone !== undefined) {
      updateData.phone = updates.phone || null
    }

    if (updates.avatar_url !== undefined) {
      updateData.avatar_url = updates.avatar_url || null
    }

    if (updates.preferences) {
      // Fetch current preferences to merge
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('id', user.id)
        .single()

      const currentPreferences = currentProfile?.preferences || {
        notifications: { email_orders: true }
      }

      // Deep merge preferences
      updateData.preferences = {
        ...currentPreferences,
        notifications: {
          ...currentPreferences.notifications,
          ...updates.preferences.notifications
        }
      }
    }

    // Update profile in database
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Profile update error:', updateError)
      const errorResponse = handleAuthError(updateError)
      return NextResponse.json<AuthResponse>(
        { success: false, error: errorResponse.error },
        { status: errorResponse.statusCode }
      )
    }

    return NextResponse.json<AuthResponse>(
      {
        success: true,
        message: 'Profile updated successfully',
        profile: updatedProfile as Profile
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Profile update error:', error)
    const errorResponse = handleAuthError(error)
    return NextResponse.json<AuthResponse>(
      { success: false, error: errorResponse.error },
      { status: errorResponse.statusCode }
    )
  }
}

export async function GET() {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json<AuthResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch profile
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (fetchError) {
      console.error('Profile fetch error:', fetchError)
      return NextResponse.json<AuthResponse>(
        { success: false, error: 'Failed to fetch profile' },
        { status: 500 }
      )
    }

    return NextResponse.json<AuthResponse>(
      {
        success: true,
        profile: profile as Profile
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json<AuthResponse>(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
