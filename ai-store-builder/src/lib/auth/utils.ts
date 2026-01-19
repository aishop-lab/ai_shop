import { createClient } from '@/lib/supabase/server'
import type { Profile, SessionUser } from '@/lib/types/auth'

// Get current authenticated user session
export async function getCurrentUser(): Promise<SessionUser | null> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return {
    id: user.id,
    email: user.email,
    user_metadata: user.user_metadata as SessionUser['user_metadata']
  }
}

// Check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser()
  return user !== null
}

// Get user profile from database
export async function getUserProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error || !data) {
    console.error('Error fetching profile:', error)
    return null
  }

  return data as Profile
}

// Update login tracking (last_login_at and login_count)
export async function updateLoginTracking(userId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .update({
      last_login_at: new Date().toISOString(),
      login_count: supabase.rpc('increment_login_count', { user_id: userId })
    })
    .eq('id', userId)

  if (error) {
    // Use a simpler approach if RPC doesn't exist
    const { data: profile } = await supabase
      .from('profiles')
      .select('login_count')
      .eq('id', userId)
      .single()

    await supabase
      .from('profiles')
      .update({
        last_login_at: new Date().toISOString(),
        login_count: (profile?.login_count || 0) + 1
      })
      .eq('id', userId)
  }
}

// Get current user with profile (combined)
export async function getCurrentUserWithProfile(): Promise<{
  user: SessionUser | null
  profile: Profile | null
}> {
  const user = await getCurrentUser()

  if (!user) {
    return { user: null, profile: null }
  }

  const profile = await getUserProfile(user.id)
  return { user, profile }
}

// Verify authentication for API routes - extracts user from request
export async function verifyAuth(): Promise<{
  user: SessionUser
  profile: Profile
} | null> {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  const profile = await getUserProfile(user.id)

  if (!profile) {
    return null
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata as SessionUser['user_metadata']
    },
    profile
  }
}

// Check if user has specific role
export async function hasRole(
  userId: string,
  allowedRoles: Array<'seller' | 'admin' | 'support'>
): Promise<boolean> {
  const profile = await getUserProfile(userId)

  if (!profile) {
    return false
  }

  return allowedRoles.includes(profile.role)
}

// Update user profile
export async function updateUserProfile(
  userId: string,
  updates: Partial<Omit<Profile, 'id' | 'created_at'>>
): Promise<Profile | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating profile:', error)
    return null
  }

  return data as Profile
}
