/**
 * Structured Logger Utility for StoreForge
 *
 * Provides consistent, structured JSON logging across the application
 * with support for different log levels, request context, and error tracking.
 */

import { NextRequest } from 'next/server'

// Log levels
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

// Log level priorities (higher = more severe)
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
  [LogLevel.FATAL]: 4
}

// Minimum log level from environment (default: INFO in production, DEBUG in development)
const MIN_LOG_LEVEL = process.env.LOG_LEVEL as LogLevel ||
  (process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG)

// Log entry interface
export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  service: string
  environment: string
  // Optional fields
  requestId?: string
  userId?: string
  storeId?: string
  traceId?: string
  spanId?: string
  duration?: number
  statusCode?: number
  method?: string
  path?: string
  userAgent?: string
  ip?: string
  error?: {
    name: string
    message: string
    stack?: string
    code?: string
  }
  metadata?: Record<string, unknown>
}

// Logger context that can be passed between functions
export interface LogContext {
  requestId?: string
  userId?: string
  storeId?: string
  traceId?: string
  spanId?: string
}

// Service name for this application
const SERVICE_NAME = 'storeforge'
const ENVIRONMENT = process.env.NODE_ENV || 'development'

/**
 * Check if a log level should be output based on minimum level
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[MIN_LOG_LEVEL]
}

/**
 * Format a log entry as JSON
 */
function formatLogEntry(entry: LogEntry): string {
  return JSON.stringify(entry)
}

/**
 * Output a log entry
 */
function outputLog(entry: LogEntry): void {
  const formatted = formatLogEntry(entry)

  switch (entry.level) {
    case LogLevel.DEBUG:
      console.debug(formatted)
      break
    case LogLevel.INFO:
      console.info(formatted)
      break
    case LogLevel.WARN:
      console.warn(formatted)
      break
    case LogLevel.ERROR:
    case LogLevel.FATAL:
      console.error(formatted)
      break
    default:
      console.log(formatted)
  }
}

/**
 * Create a log entry with common fields
 */
function createLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
  metadata?: Record<string, unknown>
): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    service: SERVICE_NAME,
    environment: ENVIRONMENT,
    ...context,
    ...(metadata && Object.keys(metadata).length > 0 && { metadata })
  }
}

/**
 * Main Logger class
 */
class Logger {
  private context: LogContext

  constructor(context: LogContext = {}) {
    this.context = context
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: LogContext): Logger {
    return new Logger({
      ...this.context,
      ...additionalContext
    })
  }

  /**
   * Log a debug message
   */
  debug(message: string, metadata?: Record<string, unknown>): void {
    if (!shouldLog(LogLevel.DEBUG)) return
    const entry = createLogEntry(LogLevel.DEBUG, message, this.context, metadata)
    outputLog(entry)
  }

  /**
   * Log an info message
   */
  info(message: string, metadata?: Record<string, unknown>): void {
    if (!shouldLog(LogLevel.INFO)) return
    const entry = createLogEntry(LogLevel.INFO, message, this.context, metadata)
    outputLog(entry)
  }

  /**
   * Log a warning message
   */
  warn(message: string, metadata?: Record<string, unknown>): void {
    if (!shouldLog(LogLevel.WARN)) return
    const entry = createLogEntry(LogLevel.WARN, message, this.context, metadata)
    outputLog(entry)
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error, metadata?: Record<string, unknown>): void {
    if (!shouldLog(LogLevel.ERROR)) return
    const entry = createLogEntry(LogLevel.ERROR, message, this.context, metadata)

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...(error as { code?: string }).code && {
          code: (error as { code?: string }).code
        }
      }
    }

    outputLog(entry)
  }

  /**
   * Log a fatal error message
   */
  fatal(message: string, error?: Error, metadata?: Record<string, unknown>): void {
    if (!shouldLog(LogLevel.FATAL)) return
    const entry = createLogEntry(LogLevel.FATAL, message, this.context, metadata)

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...(error as { code?: string }).code && {
          code: (error as { code?: string }).code
        }
      }
    }

    outputLog(entry)
  }
}

// Default logger instance
export const logger = new Logger()

/**
 * Create a logger with request context
 */
export function createRequestLogger(request: NextRequest): Logger {
  const requestId = request.headers.get('x-request-id') ||
    crypto.randomUUID()

  // Try to get user ID from auth header if available
  const authHeader = request.headers.get('authorization')
  let userId: string | undefined

  // Get store ID from URL if in store context
  const url = new URL(request.url)
  const pathParts = url.pathname.split('/')
  const storeId = pathParts[1] && !['api', 'dashboard', '_next'].includes(pathParts[1])
    ? pathParts[1]
    : undefined

  return new Logger({
    requestId,
    userId,
    storeId
  })
}

/**
 * Log an API request/response
 */
export function logApiRequest(
  request: NextRequest,
  response: { status: number },
  duration: number,
  error?: Error
): void {
  const requestLogger = createRequestLogger(request)
  const url = new URL(request.url)

  const metadata: Record<string, unknown> = {
    method: request.method,
    path: url.pathname,
    statusCode: response.status,
    duration,
    userAgent: request.headers.get('user-agent'),
    ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        'unknown'
  }

  if (error) {
    requestLogger.error(
      `${request.method} ${url.pathname} - ${response.status}`,
      error,
      metadata
    )
  } else if (response.status >= 500) {
    requestLogger.error(
      `${request.method} ${url.pathname} - ${response.status}`,
      undefined,
      metadata
    )
  } else if (response.status >= 400) {
    requestLogger.warn(
      `${request.method} ${url.pathname} - ${response.status}`,
      metadata
    )
  } else {
    requestLogger.info(
      `${request.method} ${url.pathname} - ${response.status}`,
      metadata
    )
  }
}

/**
 * Performance timing utility
 */
export function startTimer(): () => number {
  const start = process.hrtime.bigint()
  return () => {
    const end = process.hrtime.bigint()
    return Number(end - start) / 1_000_000 // Convert to milliseconds
  }
}

/**
 * Log a timed operation
 */
export async function logTimedOperation<T>(
  operationName: string,
  operation: () => Promise<T>,
  context?: LogContext
): Promise<T> {
  const operationLogger = new Logger(context)
  const timer = startTimer()

  try {
    operationLogger.debug(`Starting: ${operationName}`)
    const result = await operation()
    const duration = timer()
    operationLogger.info(`Completed: ${operationName}`, { duration })
    return result
  } catch (error) {
    const duration = timer()
    operationLogger.error(
      `Failed: ${operationName}`,
      error instanceof Error ? error : new Error(String(error)),
      { duration }
    )
    throw error
  }
}

// Specialized loggers for different contexts

/**
 * Create a logger for database operations
 */
export function createDbLogger(operation: string): Logger {
  return logger.child({
    traceId: `db:${operation}:${Date.now()}`
  })
}

/**
 * Create a logger for AI operations
 */
export function createAiLogger(model: string): Logger {
  return logger.child({
    traceId: `ai:${model}:${Date.now()}`
  })
}

/**
 * Create a logger for payment operations
 */
export function createPaymentLogger(orderId: string): Logger {
  return logger.child({
    traceId: `payment:${orderId}`
  })
}

/**
 * Create a logger for shipping operations
 */
export function createShippingLogger(orderId: string): Logger {
  return logger.child({
    traceId: `shipping:${orderId}`
  })
}

// Logger class is already exported inline
// LogContext is already exported as interface above
