const STORAGE_KEY = 'sf-favorites'

type FavoriteType = 'product' | 'order'

function getAll(): Record<FavoriteType, string[]> {
  if (typeof window === 'undefined') return { product: [], order: [] }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { product: [], order: [] }
    return JSON.parse(raw)
  } catch {
    return { product: [], order: [] }
  }
}

function saveAll(data: Record<FavoriteType, string[]>): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function toggleFavorite(type: FavoriteType, id: string): boolean {
  const all = getAll()
  const list = all[type] || []
  const index = list.indexOf(id)

  if (index >= 0) {
    list.splice(index, 1)
    all[type] = list
    saveAll(all)
    return false // removed
  } else {
    list.unshift(id)
    all[type] = list
    saveAll(all)
    return true // added
  }
}

export function isFavorite(type: FavoriteType, id: string): boolean {
  const all = getAll()
  return (all[type] || []).includes(id)
}

export function getFavorites(type: FavoriteType): string[] {
  const all = getAll()
  return all[type] || []
}
