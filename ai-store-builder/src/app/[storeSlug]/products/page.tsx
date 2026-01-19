import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { getStoreData, getStoreProductsPaginated } from '@/lib/store/get-store-data'
import StoreProductsPage from '@/components/store/store-products-page'

interface ProductsPageProps {
  params: Promise<{ storeSlug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export const revalidate = 300 // 5 minutes

export async function generateMetadata({ params }: ProductsPageProps): Promise<Metadata> {
  const { storeSlug } = await params
  const storeData = await getStoreData(storeSlug)
  
  if (!storeData) return {}
  
  return {
    title: `Products - ${storeData.store.name}`,
    description: `Browse all products from ${storeData.store.name}. ${storeData.store.description || ''}`
  }
}

export default async function ProductsPage({ params, searchParams }: ProductsPageProps) {
  const { storeSlug } = await params
  const resolvedSearchParams = await searchParams
  
  const storeData = await getStoreData(storeSlug)
  
  if (!storeData) {
    notFound()
  }
  
  // Get pagination and filter params
  const page = typeof resolvedSearchParams.page === 'string' ? parseInt(resolvedSearchParams.page) : 1
  const category = typeof resolvedSearchParams.category === 'string' ? resolvedSearchParams.category : undefined
  const sort = typeof resolvedSearchParams.sort === 'string' ? resolvedSearchParams.sort as 'created_at' | 'price' | 'title' : 'created_at'
  const order = typeof resolvedSearchParams.order === 'string' ? resolvedSearchParams.order as 'asc' | 'desc' : 'desc'
  
  // Get paginated products
  const productsResult = await getStoreProductsPaginated(storeSlug, {
    page,
    limit: 24,
    category,
    sortBy: sort,
    sortOrder: order
  })
  
  return (
    <StoreProductsPage 
      products={productsResult?.products || []}
      pagination={{
        page: productsResult?.page || 1,
        totalPages: productsResult?.totalPages || 1,
        total: productsResult?.total || 0
      }}
      categories={storeData.categories}
      currentCategory={category}
      currentSort={sort}
      currentOrder={order}
    />
  )
}
