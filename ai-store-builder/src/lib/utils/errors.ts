// Authentication Error Handling Utilities

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code?: string
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

interface ErrorResponse {
  success: false
  error: string
  statusCode: number
}

export function handleAuthError(error: unknown): ErrorResponse {
  if (error instanceof AuthError) {
    return {
      success: false,
      error: error.message,
      statusCode: error.statusCode
    }
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    // User already exists
    if (message.includes('already registered') || message.includes('already exists')) {
      return {
        success: false,
        error: 'An account with this email already exists',
        statusCode: 409
      }
    }

    // Invalid credentials
    if (message.includes('invalid login credentials') || message.includes('invalid credentials')) {
      return {
        success: false,
        error: 'Invalid email or password',
        statusCode: 401
      }
    }

    // Email not confirmed
    if (message.includes('email not confirmed')) {
      return {
        success: false,
        error: 'Please verify your email before signing in',
        statusCode: 401
      }
    }

    // Invalid email format
    if (message.includes('invalid email') || message.includes('email_address_invalid') || message.includes('email address') && message.includes('invalid')) {
      return {
        success: false,
        error: 'Please use a valid email address',
        statusCode: 400
      }
    }

    // Weak password
    if (message.includes('password') && (message.includes('weak') || message.includes('short'))) {
      return {
        success: false,
        error: 'Password does not meet security requirements',
        statusCode: 400
      }
    }

    // Rate limiting
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return {
        success: false,
        error: 'Too many requests. Please try again later',
        statusCode: 429
      }
    }

    // Session expired
    if (message.includes('session') && (message.includes('expired') || message.includes('invalid'))) {
      return {
        success: false,
        error: 'Your session has expired. Please sign in again',
        statusCode: 401
      }
    }

    // User not found (don't reveal this - security)
    if (message.includes('user not found')) {
      return {
        success: false,
        error: 'Invalid email or password',
        statusCode: 401
      }
    }
  }

  // Generic error - don't expose internal details
  console.error('Unhandled auth error:', error)
  return {
    success: false,
    error: 'An unexpected error occurred. Please try again',
    statusCode: 500
  }
}

export function createErrorResponse(error: string, statusCode: number = 400) {
  return Response.json(
    { success: false, error },
    { status: statusCode }
  )
}
