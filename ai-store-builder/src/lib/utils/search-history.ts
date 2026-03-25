const STORAGE_KEY = 'search-history'
const MAX_ITEMS = 10

export function addToSearchHistory(query: string): void {
  if (typeof window === 'undefined') return
  const trimmed = query.trim()
  if (!trimmed) return

  try {
    const existing = getSearchHistory()

    // Remove duplicate (case-insensitive)
    const filtered = existing.filter(
      (q) => q.toLowerCase() !== trimmed.toLowerCase()
    )

    // Add to front
    filtered.unshift(trimmed)

    // Limit
    const limited = filtered.slice(0, MAX_ITEMS)

    localStorage.setItem(STORAGE_KEY, JSON.stringify(limited))
  } catch {
    // localStorage may be full or unavailable
  }
}

export function getSearchHistory(): string[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []

    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []

    return parsed.filter((item): item is string => typeof item === 'string')
  } catch {
    return []
  }
}

export function clearSearchHistory(): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
