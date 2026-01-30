// Authentication TypeScript Types

export interface SignUpData {
  email: string
  password: string
  full_name: string
  phone?: string
}

export interface SignInData {
  email: string
  password: string
}

export interface UserPreferences {
  notifications: {
    email_orders: boolean
  }
}

export interface Profile {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  avatar_url: string | null
  role: 'seller' | 'admin' | 'support'
  onboarding_completed: boolean
  onboarding_current_step: number
  preferences: UserPreferences
  last_login_at: string | null
  login_count: number
  created_at: string
  updated_at: string
}

export interface AuthUser {
  id: string
  email: string
}

export interface AuthResponse {
  success: boolean
  message?: string
  user?: AuthUser | null
  profile?: Profile | null
  error?: string
  code?: 'USER_NOT_FOUND' | string
  // 2FA fields
  requires2FA?: boolean
  pendingToken?: string
}

export interface ProfileUpdateData {
  full_name?: string
  phone?: string
  avatar_url?: string
  preferences?: Partial<UserPreferences>
}

export interface SessionUser {
  id: string
  email?: string
  user_metadata?: {
    full_name?: string
    phone?: string
  }
}
