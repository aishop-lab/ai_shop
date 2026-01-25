/**
 * Custom Error Classes for StoreForge
 * Provides structured error handling across the application
 */

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly code: string

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true
  ) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.isOperational = isOperational

    // Maintains proper stack trace for where our error was thrown (only in V8)
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Store not found error
 */
export class StoreNotFoundError extends AppError {
  constructor(slug?: string) {
    super(
      slug ? `Store "${slug}" not found` : 'Store not found',
      404,
      'STORE_NOT_FOUND'
    )
  }
}

/**
 * Product not found error
 */
export class ProductNotFoundError extends AppError {
  constructor(productId?: string) {
    super(
      productId ? `Product "${productId}" not found` : 'Product not found',
      404,
      'PRODUCT_NOT_FOUND'
    )
  }
}

/**
 * Order not found error
 */
export class OrderNotFoundError extends AppError {
  constructor(orderId?: string) {
    super(
      orderId ? `Order "${orderId}" not found` : 'Order not found',
      404,
      'ORDER_NOT_FOUND'
    )
  }
}

/**
 * Authentication required error
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_REQUIRED')
  }
}

/**
 * Authorization/permission error
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'You do not have permission to perform this action') {
    super(message, 403, 'FORBIDDEN')
  }
}

/**
 * Validation error for invalid input
 */
export class ValidationError extends AppError {
  public readonly errors: Record<string, string[]>

  constructor(message: string, errors: Record<string, string[]> = {}) {
    super(message, 400, 'VALIDATION_ERROR')
    this.errors = errors
  }
}

/**
 * Rate limit exceeded error
 */
export class RateLimitError extends AppError {
  public readonly retryAfter: number

  constructor(retryAfter: number = 60) {
    super(
      `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
      429,
      'RATE_LIMIT_EXCEEDED'
    )
    this.retryAfter = retryAfter
  }
}

/**
 * Payment error
 */
export class PaymentError extends AppError {
  public readonly paymentId?: string

  constructor(message: string, paymentId?: string) {
    super(message, 400, 'PAYMENT_ERROR')
    this.paymentId = paymentId
  }
}

/**
 * Shipping error
 */
export class ShippingError extends AppError {
  constructor(message: string) {
    super(message, 400, 'SHIPPING_ERROR')
  }
}

/**
 * Inventory error (out of stock, insufficient quantity)
 */
export class InventoryError extends AppError {
  public readonly productId?: string
  public readonly available?: number
  public readonly requested?: number

  constructor(
    message: string,
    details?: { productId?: string; available?: number; requested?: number }
  ) {
    super(message, 400, 'INVENTORY_ERROR')
    this.productId = details?.productId
    this.available = details?.available
    this.requested = details?.requested
  }
}

/**
 * External service error (Razorpay, Shiprocket, etc.)
 */
export class ExternalServiceError extends AppError {
  public readonly service: string

  constructor(service: string, message: string) {
    super(`${service} error: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR')
    this.service = service
  }
}

/**
 * AI service error
 */
export class AIServiceError extends AppError {
  constructor(message: string = 'AI service temporarily unavailable') {
    super(message, 503, 'AI_SERVICE_ERROR')
  }
}

/**
 * Database error
 */
export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed') {
    super(message, 500, 'DATABASE_ERROR', false)
  }
}

/**
 * Check if an error is operational (expected) vs programming error
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational
  }
  return false
}

/**
 * Format error for API response
 */
export function formatErrorResponse(error: Error): {
  error: string
  code: string
  statusCode: number
  details?: Record<string, unknown>
} {
  if (error instanceof AppError) {
    const response: {
      error: string
      code: string
      statusCode: number
      details?: Record<string, unknown>
    } = {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode
    }

    if (error instanceof ValidationError && Object.keys(error.errors).length > 0) {
      response.details = { errors: error.errors }
    }

    if (error instanceof InventoryError) {
      response.details = {
        productId: error.productId,
        available: error.available,
        requested: error.requested
      }
    }

    if (error instanceof RateLimitError) {
      response.details = { retryAfter: error.retryAfter }
    }

    return response
  }

  // Unknown error - don't expose details in production
  return {
    error: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : error.message,
    code: 'INTERNAL_ERROR',
    statusCode: 500
  }
}

/**
 * Log error with context
 */
export function logError(error: Error, context?: Record<string, unknown>): void {
  const logData = {
    message: error.message,
    stack: error.stack,
    ...(error instanceof AppError && {
      code: error.code,
      statusCode: error.statusCode,
      isOperational: error.isOperational
    }),
    ...context,
    timestamp: new Date().toISOString()
  }

  if (error instanceof AppError && error.isOperational) {
    console.warn('Operational error:', logData)
  } else {
    console.error('Unexpected error:', logData)
  }
}
