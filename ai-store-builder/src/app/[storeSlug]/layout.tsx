import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getStoreData } from '@/lib/store/get-store-data'
import { generateStoreMeta, generateStoreStructuredData } from '@/lib/store/seo'
import { generateStyleVars, getBrandFontsUrl, sanitizeCustomCSS } from '@/lib/store/dynamic-styles'
import { StoreProvider } from '@/lib/contexts/store-context'
import { SidebarProvider } from '@/lib/contexts/sidebar-context'
import { AnalyticsProvider, TrackingScripts } from '@/lib/analytics'
import StoreHeader from '@/components/store/store-header'
import StoreFooter from '@/components/store/store-footer'
import StoreSidebar from '@/components/store/store-sidebar'
import { StoreClientWrapper } from '@/components/store/store-client-wrapper'
import { ChatWidget } from '@/components/store/chat-widget'
import { I18nProvider } from '@/lib/i18n'
import { AnnouncementBar } from '@/components/store/announcement-bar'
import { DEFAULT_CUSTOMIZATION, BUTTON_RADIUS_MAP, FONT_SIZE_MAP } from '@/lib/types/customization'

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
  const customization = store.customization || DEFAULT_CUSTOMIZATION

  // Build BrandStyles from customization (with fallbacks to existing fields)
  const brandStyles = {
    colors: {
      primary: customization.colors.primary || store.brand_colors.primary,
      secondary: customization.colors.secondary || store.brand_colors.secondary,
      accent: customization.colors.accent,
      background: customization.colors.background,
      text: customization.colors.text,
      header_bg: customization.colors.header_bg,
      header_text: customization.colors.header_text,
      footer_bg: customization.colors.footer_bg,
      footer_text: customization.colors.footer_text,
    },
    typography: {
      heading_font: customization.typography.heading_font || store.typography.heading_font,
      body_font: customization.typography.body_font || store.typography.body_font,
      base_font_size: FONT_SIZE_MAP[customization.typography.base_font_size || 'medium'],
    },
    button_radius: BUTTON_RADIUS_MAP[customization.layout.button_style || 'rounded'],
    header_style: customization.layout.header_style,
    product_card_style: customization.layout.product_card_style,
    product_grid_columns: customization.layout.product_grid_columns,
  }

  // Generate CSS variables from brand styles
  const styleVars = generateStyleVars(brandStyles)

  // Get Google Fonts URL
  const fontsUrl = getBrandFontsUrl(brandStyles)

  // Generate structured data
  const structuredData = generateStoreStructuredData(store)

  // Get currency from blueprint
  const currency = store.blueprint?.location?.currency || 'INR'

  // Sanitize custom CSS (strip scripts, expressions, imports)
  const safeCustomCSS = sanitizeCustomCSS(customization.custom_css || '')

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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/<\//g, '<\\/') }}
      />

      {/* Marketing Tracking Scripts */}
      <TrackingScripts pixels={store.marketing_pixels || null} />

      {/* Sanitized Custom CSS */}
      {safeCustomCSS && (
        <style dangerouslySetInnerHTML={{ __html: safeCustomCSS }} />
      )}

      {/* Store Provider with CSS Variables */}
      <div style={styleVars as React.CSSProperties}>
        <I18nProvider>
        <StoreProvider initialData={storeData}>
          <SidebarProvider>
            <AnalyticsProvider pixels={store.marketing_pixels || null} currency={currency}>
              <StoreClientWrapper storeName={store.name}>
                <StoreSidebar />
                <div
                  className="flex flex-col min-h-screen"
                  style={{
                    backgroundColor: 'var(--color-background)',
                    color: 'var(--color-text)',
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--font-size-base)',
                  }}
                >
                  <AnnouncementBar config={customization.announcement_bar} />
                  <StoreHeader />
                  <main className="flex-1">
                    {children}
                  </main>
                  <StoreFooter />
                </div>
                <ChatWidget storeId={store.id} storeName={store.name} />
              </StoreClientWrapper>
            </AnalyticsProvider>
          </SidebarProvider>
        </StoreProvider>
        </I18nProvider>
      </div>
    </>
  )
}
