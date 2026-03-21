/**
 * Typed API client for Phase III API tests.
 * Wraps fetch with base URL, auth headers, and JSON parsing.
 */

import { getAuthToken, TEST_MERCHANT, TEST_ADMIN } from './auth'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

interface ApiResponse<T = unknown> {
  status: number
  ok: boolean
  data: T
  headers: Headers
}

export class ApiClient {
  private token: string | null = null
  private baseUrl: string

  constructor(baseUrl = BASE_URL) {
    this.baseUrl = baseUrl
  }

  async authenticateAsMerchant() {
    this.token = await getAuthToken(TEST_MERCHANT.email, TEST_MERCHANT.password)
    return !!this.token
  }

  async authenticateAsAdmin() {
    this.token = await getAuthToken(TEST_ADMIN.email, TEST_ADMIN.password)
    return !!this.token
  }

  setToken(token: string | null) {
    this.token = token
  }

  clearAuth() {
    this.token = null
  }

  private buildHeaders(extra: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...extra,
    }
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }
    return headers
  }

  async get<T = unknown>(path: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
    let url = `${this.baseUrl}${path}`
    if (params) {
      const qs = new URLSearchParams(params).toString()
      url += `?${qs}`
    }
    const res = await fetch(url, { headers: this.buildHeaders() })
    const data = await res.json().catch(() => null)
    return { status: res.status, ok: res.ok, data: data as T, headers: res.headers }
  }

  async post<T = unknown>(
    path: string,
    body?: unknown,
    extra?: { headers?: Record<string, string> }
  ): Promise<ApiResponse<T>> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.buildHeaders(extra?.headers),
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await res.json().catch(() => null)
    return { status: res.status, ok: res.ok, data: data as T, headers: res.headers }
  }

  async patch<T = unknown>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.buildHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await res.json().catch(() => null)
    return { status: res.status, ok: res.ok, data: data as T, headers: res.headers }
  }

  async delete<T = unknown>(path: string): Promise<ApiResponse<T>> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.buildHeaders(),
    })
    const data = await res.json().catch(() => null)
    return { status: res.status, ok: res.ok, data: data as T, headers: res.headers }
  }

  async postFormData<T = unknown>(path: string, formData: FormData): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {}
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    })
    const data = await res.json().catch(() => null)
    return { status: res.status, ok: res.ok, data: data as T, headers: res.headers }
  }
}

/** Singleton for quick use */
export const apiClient = new ApiClient()
