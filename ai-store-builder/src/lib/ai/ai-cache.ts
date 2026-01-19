// AI Cache Service - Prevents duplicate API calls by caching results

import crypto from 'crypto'

interface CacheEntry<T> {
  data: T
  timestamp: number
  hash: string
}

interface CacheOptions {
  ttlMs?: number // Time-to-live in milliseconds
  maxEntries?: number // Maximum cache entries
}

const DEFAULT_TTL = 60 * 60 * 1000 // 1 hour
const DEFAULT_MAX_ENTRIES = 100

class AICache {
  private cache: Map<string, CacheEntry<unknown>>
  private ttlMs: number
  private maxEntries: number

  constructor(options: CacheOptions = {}) {
    this.cache = new Map()
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL
    this.maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES
  }

  /**
   * Generate a hash from content (string or buffer)
   */
  generateContentHash(content: string | Buffer): string {
    const data = typeof content === 'string' ? content : content.toString('base64')
    return crypto.createHash('md5').update(data).digest('hex')
  }

  /**
   * Get cached value or fetch and cache new value
   */
  async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    contentHash?: string
  ): Promise<T> {
    const cacheKey = contentHash ? `${key}:${contentHash}` : key
    const cached = this.get<T>(cacheKey)

    if (cached !== null) {
      console.log(`[AICache] Hit for ${key}`)
      return cached
    }

    console.log(`[AICache] Miss for ${key}, fetching...`)
    const result = await fetchFn()
    this.set(cacheKey, result, contentHash)
    return result
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, data: T, hash?: string): void {
    // Enforce max entries by removing oldest
    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      hash: hash || ''
    })
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== null
  }

  /**
   * Delete specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Delete all keys matching prefix
   */
  deleteByPrefix(prefix: string): number {
    let count = 0
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key)
        count++
      }
    }
    return count
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; ttlMs: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxEntries,
      ttlMs: this.ttlMs
    }
  }

  /**
   * Clean expired entries
   */
  cleanup(): number {
    let cleaned = 0
    const now = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttlMs) {
        this.cache.delete(key)
        cleaned++
      }
    }

    return cleaned
  }
}

// Session-based cache for onboarding (lasts for the session)
class SessionCache {
  private sessions: Map<string, Map<string, unknown>>

  constructor() {
    this.sessions = new Map()
  }

  /**
   * Get or create session
   */
  getSession(sessionId: string): Map<string, unknown> {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, new Map())
    }
    return this.sessions.get(sessionId)!
  }

  /**
   * Set value in session
   */
  set(sessionId: string, key: string, value: unknown): void {
    const session = this.getSession(sessionId)
    session.set(key, value)
  }

  /**
   * Get value from session
   */
  get<T>(sessionId: string, key: string): T | undefined {
    const session = this.sessions.get(sessionId)
    return session?.get(key) as T | undefined
  }

  /**
   * Check if session has key
   */
  has(sessionId: string, key: string): boolean {
    const session = this.sessions.get(sessionId)
    return session?.has(key) ?? false
  }

  /**
   * Delete session
   */
  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId)
  }

  /**
   * Clear all sessions
   */
  clear(): void {
    this.sessions.clear()
  }
}

// Export singleton instances
export const aiCache = new AICache()
export const sessionCache = new SessionCache()

// Export class for custom instances
export { AICache, SessionCache }
export type { CacheOptions, CacheEntry }
