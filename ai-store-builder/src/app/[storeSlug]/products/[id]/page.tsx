import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { getProductData, getRelatedProducts } from '@/lib/store/get-store-data'
import { generateProductMeta, generateProductStructuredData } from '@/lib/store/seo'
import StoreProductDetail from '@/components/store/store-product-detail'

interface ProductDetailPageProps {
  params: Promise<{ storeSlug: string; id: string }>
}

export const revalidate = 3600 // 1 hour

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  const { storeSlug, id } = await params
  const data = await getProductData(storeSlug, id)
  
  if (!data) return {}
  
  return generateProductMeta(data.product, data.store)
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { storeSlug, id } = await params
  
  const data = await getProductData(storeSlug, id)
  
  if (!data) {
    notFound()
  }
  
  const { store, product } = data
  
  // Get related products
  const relatedProducts = await getRelatedProducts(
    store.id,
    product.id,
    product.categories || [],
    4
  )
  
  // Generate structured data
  const structuredData = generateProductStructuredData(product, store)
  
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <StoreProductDetail product={product} relatedProducts={relatedProducts} />
    </>
  )
}
