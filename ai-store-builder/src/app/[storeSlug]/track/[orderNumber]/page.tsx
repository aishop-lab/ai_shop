import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { getStoreData } from '@/lib/store/get-store-data'
import OrderTrackingPage from '@/components/store/order-tracking-page'

interface TrackingPageProps {
  params: Promise<{ storeSlug: string; orderNumber: string }>
}

export async function generateMetadata({ params }: TrackingPageProps): Promise<Metadata> {
  const { storeSlug, orderNumber } = await params
  const storeData = await getStoreData(storeSlug)

  if (!storeData) return {}

  return {
    title: `Track Order ${orderNumber} - ${storeData.store.name}`,
    description: `Track your order ${orderNumber} at ${storeData.store.name}`,
    robots: { index: false, follow: false },
  }
}

export default async function TrackingPage({ params }: TrackingPageProps) {
  const { storeSlug, orderNumber } = await params
  const storeData = await getStoreData(storeSlug)

  if (!storeData) {
    notFound()
  }

  return <OrderTrackingPage orderNumber={orderNumber} />
}
