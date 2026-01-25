/**
 * Rate Limiting Utility for StoreForge API
 *
 * Provides IP-based and user-based rate limiting with configurable limits
 * for different API endpoints.
 */

import { NextRequest, NextResponse } from 'next/server'
import { RateLimitError, formatErrorResponse } from './errors'

// In-memory store for rate limiting (consider Vercel KV or Redis for production scale)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Cleanup old entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetTime < now) {
        rateLimitStore.delete(key)
      }
    }
  }, 5 * 60 * 1000)
}

export interface RateLimitConfig {
  // Maximum number of requests allowed in the window
  limit: number
  // Time window in seconds
  windowSeconds: number
  // Identifier prefix (e.g., 'api', 'ai', 'auth')
  prefix?: string
}

// Predefined rate limit configurations
export const RATE_LIMITS = {
  // General API endpoints: 100 requests per minute
  API: {
    limit: 100,
    windowSeconds: 60,
    prefix: 'api'
  },
  // AI endpoints: 10 requests per minute (expensive operations)
  AI: {
    limit: 10,
    windowSeconds: 60,
    prefix: 'ai'
  },
  // Auth endpoints: 5 requests per minute (prevent brute force)
  AUTH: {
    limit: 5,
    windowSeconds: 60,
    prefix: 'auth'
  },
  // Checkout/payment: 20 requests per minute
  CHECKOUT: {
    limit: 20,
    windowSeconds: 60,
    prefix: 'checkout'
  },
  // Search: 30 requests per minute
  SEARCH: {
    limit: 30,
    windowSeconds: 60,
    prefix: 'search'
  },
  // Uploads: 10 requests per minute
  UPLOAD: {
    limit: 10,
    windowSeconds: 60,
    prefix: 'upload'
  },
  // Webhooks: 100 requests per minute (from external services)
  WEBHOOK: {
    limit: 100,
    windowSeconds: 60,
    prefix: 'webhook'
  }
} as const

/**
 * Get client identifier from request
 * Uses IP address as primary identifier, falls back to user ID if available
 */
export function getClientIdentifier(request: NextRequest, userId?: string): string {
  // Try to get real IP from various headers (for proxied requests)
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfIp = request.headers.get('cf-connecting-ip') // Cloudflare

  const ip = cfIp || realIp || forwarded?.split(',')[0]?.trim() || 'unknown'

  // If user ID is provided, combine with IP for more precise limiting
  return userId ? `${ip}:user:${userId}` : `${ip}`
}

/**
 * Check rate limit for a given identifier
 * Returns true if request should be allowed, false if rate limited
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetIn: number } {
  const key = config.prefix ? `${config.prefix}:${identifier}` : identifier
  const now = Date.now()
  const windowMs = config.windowSeconds * 1000

  const existing = rateLimitStore.get(key)

  if (!existing || existing.resetTime < now) {
    // No existing record or expired - allow and create new record
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs
    })
    return {
      allowed: true,
      remaining: config.limit - 1,
      resetIn: config.windowSeconds
    }
  }

  if (existing.count >= config.limit) {
    // Rate limit exceeded
    const resetIn = Math.ceil((existing.resetTime - now) / 1000)
    return {
      allowed: false,
      remaining: 0,
      resetIn
    }
  }

  // Increment counter
  existing.count++
  rateLimitStore.set(key, existing)

  return {
    allowed: true,
    remaining: config.limit - existing.count,
    resetIn: Math.ceil((existing.resetTime - now) / 1000)
  }
}

/**
 * Rate limit middleware for API routes
 * Use in API route handlers to enforce rate limits
 *
 * @example
 * ```ts
 * export async function POST(request: NextRequest) {
 *   const rateLimitResult = rateLimit(request, RATE_LIMITS.AI)
 *   if (rateLimitResult) return rateLimitResult
 *
 *   // ... handle request
 * }
 * ```
 */
export function rateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  userId?: string
): NextResponse | null {
  const identifier = getClientIdentifier(request, userId)
  const result = checkRateLimit(identifier, config)

  if (!result.allowed) {
    const error = new RateLimitError(result.resetIn)
    const errorResponse = formatErrorResponse(error)

    return NextResponse.json(errorResponse, {
      status: 429,
      headers: {
        'X-RateLimit-Limit': config.limit.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': result.resetIn.toString(),
        'Retry-After': result.resetIn.toString()
      }
    })
  }

  return null // Request allowed
}

/**
 * Create a rate-limited API handler wrapper
 *
 * @example
 * ```ts
 * export const POST = withRateLimit(
 *   RATE_LIMITS.AI,
 *   async (request: NextRequest) => {
 *     // Handle request
 *     return NextResponse.json({ success: true })
 *   }
 * )
 * ```
 */
export function withRateLimit(
  config: RateLimitConfig,
  handler: (request: NextRequest) => Promise<NextResponse>
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    const rateLimitResult = rateLimit(request, config)
    if (rateLimitResult) {
      return rateLimitResult
    }

    const response = await handler(request)

    // Add rate limit headers to successful responses
    const identifier = getClientIdentifier(request)
    const result = checkRateLimit(identifier, config)

    response.headers.set('X-RateLimit-Limit', config.limit.toString())
    response.headers.set('X-RateLimit-Remaining', Math.max(0, result.remaining).toString())
    response.headers.set('X-RateLimit-Reset', result.resetIn.toString())

    return response
  }
}

/**
 * Reset rate limit for a specific identifier
 * Useful for testing or administrative purposes
 */
export function resetRateLimit(identifier: string, prefix?: string): void {
  const key = prefix ? `${prefix}:${identifier}` : identifier
  rateLimitStore.delete(key)
}

/**
 * Get current rate limit status for an identifier
 */
export function getRateLimitStatus(
  identifier: string,
  config: RateLimitConfig
): { count: number; limit: number; resetTime: number | null } {
  const key = config.prefix ? `${config.prefix}:${identifier}` : identifier
  const existing = rateLimitStore.get(key)

  if (!existing || existing.resetTime < Date.now()) {
    return {
      count: 0,
      limit: config.limit,
      resetTime: null
    }
  }

  return {
    count: existing.count,
    limit: config.limit,
    resetTime: existing.resetTime
  }
}

/**
 * Sliding window rate limiter for more accurate limiting
 * Uses a more sophisticated algorithm but with higher memory overhead
 */
export class SlidingWindowRateLimiter {
  private requests: Map<string, number[]> = new Map()
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = config
  }

  check(identifier: string): { allowed: boolean; remaining: number } {
    const key = this.config.prefix ? `${this.config.prefix}:${identifier}` : identifier
    const now = Date.now()
    const windowStart = now - this.config.windowSeconds * 1000

    // Get existing timestamps and filter to window
    let timestamps = this.requests.get(key) || []
    timestamps = timestamps.filter(t => t > windowStart)

    if (timestamps.length >= this.config.limit) {
      return { allowed: false, remaining: 0 }
    }

    // Add new timestamp
    timestamps.push(now)
    this.requests.set(key, timestamps)

    return {
      allowed: true,
      remaining: this.config.limit - timestamps.length
    }
  }

  cleanup(): void {
    const now = Date.now()
    const windowStart = now - this.config.windowSeconds * 1000

    for (const [key, timestamps] of this.requests.entries()) {
      const valid = timestamps.filter(t => t > windowStart)
      if (valid.length === 0) {
        this.requests.delete(key)
      } else {
        this.requests.set(key, valid)
      }
    }
  }
}
