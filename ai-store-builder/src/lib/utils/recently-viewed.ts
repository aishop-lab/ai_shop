const MAX_ITEMS = 10

export interface RecentlyViewedProduct {
  id: string
  title: string
  price: number
  image?: string
  slug?: string
}

function getStorageKey(storeSlug: string): string {
  return `recently-viewed-${storeSlug}`
}

export function addToRecentlyViewed(storeSlug: string, product: RecentlyViewedProduct): void {
  if (typeof window === 'undefined') return

  try {
    const key = getStorageKey(storeSlug)
    const existing = getRecentlyViewed(storeSlug)

    // Remove if already exists (will re-add at front)
    const filtered = existing.filter((p) => p.id !== product.id)

    // Add to front
    filtered.unshift({
      id: product.id,
      title: product.title,
      price: product.price,
      image: product.image,
      slug: product.slug,
    })

    // Limit to max items
    const trimmed = filtered.slice(0, MAX_ITEMS)

    localStorage.setItem(key, JSON.stringify(trimmed))
  } catch {
    // localStorage may be full or unavailable
  }
}

export function getRecentlyViewed(storeSlug: string): RecentlyViewedProduct[] {
  if (typeof window === 'undefined') return []

  try {
    const key = getStorageKey(storeSlug)
    const stored = localStorage.getItem(key)
    if (!stored) return []

    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []

    return parsed
  } catch {
    return []
  }
}
