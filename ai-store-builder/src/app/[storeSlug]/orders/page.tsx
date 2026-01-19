import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { getStoreData } from '@/lib/store/get-store-data'
import StoreOrdersPage from '@/components/store/store-orders-page'

interface OrdersPageProps {
  params: Promise<{ storeSlug: string }>
}

export async function generateMetadata({ params }: OrdersPageProps): Promise<Metadata> {
  const { storeSlug } = await params
  const storeData = await getStoreData(storeSlug)
  
  if (!storeData) return {}
  
  return {
    title: `My Orders - ${storeData.store.name}`,
    description: `View your order history at ${storeData.store.name}`,
    robots: { index: false, follow: false }
  }
}

export default async function OrdersPage({ params }: OrdersPageProps) {
  const { storeSlug } = await params
  const storeData = await getStoreData(storeSlug)
  
  if (!storeData) {
    notFound()
  }
  
  return <StoreOrdersPage />
}
