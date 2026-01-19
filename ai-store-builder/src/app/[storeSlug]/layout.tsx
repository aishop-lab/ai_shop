import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getStoreData } from '@/lib/store/get-store-data'
import { generateStoreMeta, generateStoreStructuredData } from '@/lib/store/seo'
import { generateStyleVars, getBrandFontsUrl } from '@/lib/store/dynamic-styles'
import { StoreProvider } from '@/lib/contexts/store-context'
import { SidebarProvider } from '@/lib/contexts/sidebar-context'
import StoreHeader from '@/components/store/store-header'
import StoreFooter from '@/components/store/store-footer'
import StoreSidebar from '@/components/store/store-sidebar'
import { StoreClientWrapper } from '@/components/store/store-client-wrapper'

interface StoreLayoutProps {
  children: React.ReactNode
  params: Promise<{ storeSlug: string }>
}

// Generate metadata for the store
export async function generateMetadata({ params }: StoreLayoutProps): Promise<Metadata> {
  const { storeSlug } = await params
  const storeData = await getStoreData(storeSlug)
  
  if (!storeData) {
    return {
      title: 'Store Not Found',
      description: 'The requested store could not be found.'
    }
  }
  
  return generateStoreMeta(storeData.store)
}

export default async function StoreLayout({ children, params }: StoreLayoutProps) {
  const { storeSlug } = await params
  const storeData = await getStoreData(storeSlug)
  
  if (!storeData) {
    notFound()
  }
  
  const { store } = storeData
  
  // Generate CSS variables from brand colors
  const styleVars = generateStyleVars({
    colors: store.brand_colors,
    typography: store.typography
  })
  
  // Get Google Fonts URL
  const fontsUrl = getBrandFontsUrl({
    colors: store.brand_colors,
    typography: store.typography
  })
  
  // Generate structured data
  const structuredData = generateStoreStructuredData(store)
  
  return (
    <>
      {/* Preload Google Fonts */}
      {fontsUrl && (
        <>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href={fontsUrl} rel="stylesheet" />
        </>
      )}

      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* Store Provider with CSS Variables */}
      <div style={styleVars as React.CSSProperties}>
        <StoreProvider initialData={storeData}>
          <SidebarProvider>
            <StoreClientWrapper storeName={store.name}>
              <StoreSidebar />
              <div className="flex flex-col min-h-screen bg-white">
                <StoreHeader />
                <main className="flex-1">
                  {children}
                </main>
                <StoreFooter />
              </div>
            </StoreClientWrapper>
          </SidebarProvider>
        </StoreProvider>
      </div>
    </>
  )
}
