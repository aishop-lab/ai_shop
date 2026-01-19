import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/auth/utils'

interface UserResponse {
  success: boolean
  user: { id: string; email: string } | null
  profile: Awaited<ReturnType<typeof getUserProfile>> | null
  store?: { id: string; slug: string; name: string; status: string } | null
  error?: string
}

export async function GET() {
  try {
    const supabase = await createClient()

    // Get current session
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json<UserResponse>(
        {
          success: false,
          user: null,
          profile: null,
          store: null
        },
        { status: 200 }
      )
    }

    // Fetch user profile
    const profile = await getUserProfile(user.id)

    // Fetch user's store (use limit(1) instead of single() for robustness)
    const { data: stores } = await supabase
      .from('stores')
      .select('id, slug, name, status')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    const store = stores?.[0] || null

    return NextResponse.json<UserResponse>(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email!
        },
        profile,
        store: store || null
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json<UserResponse>(
      {
        success: false,
        user: null,
        profile: null,
        store: null,
        error: 'Failed to get user information'
      },
      { status: 500 }
    )
  }
}
