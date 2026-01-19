import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { getStoreData } from '@/lib/store/get-store-data'
import StoreAboutPage from '@/components/store/store-about-page'

interface AboutPageProps {
  params: Promise<{ storeSlug: string }>
}

export const revalidate = 3600 // 1 hour

export async function generateMetadata({ params }: AboutPageProps): Promise<Metadata> {
  const { storeSlug } = await params
  const storeData = await getStoreData(storeSlug)
  
  if (!storeData) return {}
  
  return {
    title: `About - ${storeData.store.name}`,
    description: `Learn more about ${storeData.store.name}. ${storeData.store.description || ''}`
  }
}

export default async function AboutPage({ params }: AboutPageProps) {
  const { storeSlug } = await params
  const storeData = await getStoreData(storeSlug)
  
  if (!storeData) {
    notFound()
  }
  
  return <StoreAboutPage />
}
