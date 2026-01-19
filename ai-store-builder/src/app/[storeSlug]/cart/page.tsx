import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { getStoreData } from '@/lib/store/get-store-data'
import StoreCartPage from '@/components/store/store-cart-page'

interface CartPageProps {
  params: Promise<{ storeSlug: string }>
}

export async function generateMetadata({ params }: CartPageProps): Promise<Metadata> {
  const { storeSlug } = await params
  const storeData = await getStoreData(storeSlug)
  
  if (!storeData) return {}
  
  return {
    title: `Shopping Cart - ${storeData.store.name}`,
    description: `Your shopping cart at ${storeData.store.name}`
  }
}

export default async function CartPage({ params }: CartPageProps) {
  const { storeSlug } = await params
  const storeData = await getStoreData(storeSlug)
  
  if (!storeData) {
    notFound()
  }
  
  return <StoreCartPage />
}
