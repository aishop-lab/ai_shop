import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { getStoreData } from '@/lib/store/get-store-data'
import StoreThankYouPage from '@/components/store/store-thank-you-page'

interface ThankYouPageProps {
  params: Promise<{ storeSlug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({ params }: ThankYouPageProps): Promise<Metadata> {
  const { storeSlug } = await params
  const storeData = await getStoreData(storeSlug)
  
  if (!storeData) return {}
  
  return {
    title: `Order Confirmed - ${storeData.store.name}`,
    description: `Thank you for your order at ${storeData.store.name}`,
    robots: { index: false, follow: false }
  }
}

export default async function ThankYouPage({ params, searchParams }: ThankYouPageProps) {
  const { storeSlug } = await params
  const resolvedSearchParams = await searchParams
  
  const storeData = await getStoreData(storeSlug)
  
  if (!storeData) {
    notFound()
  }
  
  return <StoreThankYouPage />
}
