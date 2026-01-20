// Collection Types

export interface Collection {
  id: string
  store_id: string
  title: string
  slug: string
  description: string | null
  cover_image_url: string | null
  meta_title: string | null
  meta_description: string | null
  featured: boolean
  position: number
  visible: boolean
  created_at: string
  updated_at: string
}

export interface CollectionProduct {
  id: string
  collection_id: string
  product_id: string
  position: number
  created_at: string
}

export interface CollectionWithProducts extends Collection {
  products: Array<{
    id: string
    title: string
    slug: string
    price: number
    compare_at_price: number | null
    images: Array<{ url: string; alt?: string }>
    status: string
  }>
  product_count: number
}

export interface CreateCollectionInput {
  title: string
  description?: string
  cover_image_url?: string
  meta_title?: string
  meta_description?: string
  featured?: boolean
  visible?: boolean
  product_ids?: string[]
}

export interface UpdateCollectionInput {
  title?: string
  slug?: string
  description?: string
  cover_image_url?: string
  meta_title?: string
  meta_description?: string
  featured?: boolean
  position?: number
  visible?: boolean
}
