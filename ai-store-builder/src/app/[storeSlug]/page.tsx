import { notFound } from 'next/navigation'
import { getStoreData } from '@/lib/store/get-store-data'
import StoreHomepage from '@/components/store/store-homepage'

interface StorePageProps {
  params: Promise<{ storeSlug: string }>
}

// Revalidate every 60 seconds
export const revalidate = 60

export default async function StorePage({ params }: StorePageProps) {
  const { storeSlug } = await params
  const storeData = await getStoreData(storeSlug)
  
  if (!storeData) {
    notFound()
  }
  
  return <StoreHomepage data={storeData} />
}
