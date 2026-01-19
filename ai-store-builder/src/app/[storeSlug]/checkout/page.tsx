import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { getStoreData } from '@/lib/store/get-store-data'
import StoreCheckoutPage from '@/components/store/store-checkout-page'

interface CheckoutPageProps {
  params: Promise<{ storeSlug: string }>
}

export async function generateMetadata({ params }: CheckoutPageProps): Promise<Metadata> {
  const { storeSlug } = await params
  const storeData = await getStoreData(storeSlug)
  
  if (!storeData) return {}
  
  return {
    title: `Checkout - ${storeData.store.name}`,
    description: `Complete your purchase at ${storeData.store.name}`,
    robots: { index: false, follow: false } // Don't index checkout pages
  }
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { storeSlug } = await params
  const storeData = await getStoreData(storeSlug)
  
  if (!storeData) {
    notFound()
  }
  
  return <StoreCheckoutPage />
}
