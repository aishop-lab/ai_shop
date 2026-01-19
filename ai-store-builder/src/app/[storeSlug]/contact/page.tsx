import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { getStoreData } from '@/lib/store/get-store-data'
import StoreContactPage from '@/components/store/store-contact-page'

interface ContactPageProps {
  params: Promise<{ storeSlug: string }>
}

export const revalidate = 3600 // 1 hour

export async function generateMetadata({ params }: ContactPageProps): Promise<Metadata> {
  const { storeSlug } = await params
  const storeData = await getStoreData(storeSlug)
  
  if (!storeData) return {}
  
  return {
    title: `Contact - ${storeData.store.name}`,
    description: `Get in touch with ${storeData.store.name}. We'd love to hear from you.`
  }
}

export default async function ContactPage({ params }: ContactPageProps) {
  const { storeSlug } = await params
  const storeData = await getStoreData(storeSlug)
  
  if (!storeData) {
    notFound()
  }
  
  return <StoreContactPage />
}
