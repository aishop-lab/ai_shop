// SEO & Meta Tags Generation for Stores

import type { Metadata } from 'next'
import type { Store, Product } from '@/lib/types/store'

// Base URL for the application
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://mystore.in'

/**
 * Generate store meta tags for Next.js Metadata API
 */
export function generateStoreMeta(store: Store): Metadata {
  const title = store.tagline 
    ? `${store.name} - ${store.tagline}`
    : `${store.name} - Online Store`
  
  const description = store.description || 
    `Shop at ${store.name}. ${store.blueprint?.category?.business_type || 'Quality products'} delivered to your doorstep.`
  
  const keywords = [
    store.name,
    ...(store.blueprint?.category?.keywords || []),
    ...(store.blueprint?.category?.business_category || []),
    'online store',
    'shop',
    'buy online'
  ].filter(Boolean)
  
  const url = `${BASE_URL}/${store.slug}`
  
  return {
    title,
    description,
    keywords: keywords.join(', '),
    authors: [{ name: store.name }],
    creator: store.name,
    publisher: store.name,
    
    // Open Graph
    openGraph: {
      title: store.name,
      description,
      url,
      siteName: store.name,
      images: store.logo_url ? [
        {
          url: store.logo_url,
          width: 200,
          height: 200,
          alt: `${store.name} logo`
        }
      ] : [],
      locale: 'en_IN',
      type: 'website'
    },
    
    // Twitter
    twitter: {
      card: 'summary_large_image',
      title: store.name,
      description,
      images: store.logo_url ? [store.logo_url] : [],
      creator: store.instagram_handle ? `@${store.instagram_handle}` : undefined
    },
    
    // Robots
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1
      }
    },
    
    // Canonical URL
    alternates: {
      canonical: url
    },
    
    // Other
    category: store.blueprint?.category?.business_type || 'Shopping'
  }
}

/**
 * Generate product meta tags
 */
export function generateProductMeta(product: Product, store: Store): Metadata {
  const title = `${product.title} - ${store.name}`
  const description = product.description || 
    `Buy ${product.title} from ${store.name}. ${product.compare_at_price ? 'Special price!' : ''}`
  
  const productImage = product.images?.[0]?.url
  const url = `${BASE_URL}/${store.slug}/products/${product.id}`
  
  const keywords = [
    product.title,
    ...(product.categories || []),
    ...(product.tags || []),
    store.name,
    'buy online'
  ].filter(Boolean)
  
  return {
    title,
    description,
    keywords: keywords.join(', '),
    
    // Open Graph
    openGraph: {
      title: product.title,
      description,
      url,
      siteName: store.name,
      images: productImage ? [
        {
          url: productImage,
          width: 800,
          height: 800,
          alt: product.title
        }
      ] : [],
      locale: 'en_IN',
      type: 'website' // Use 'website' as 'product' is not in the standard types
    },
    
    // Twitter
    twitter: {
      card: 'summary_large_image',
      title: product.title,
      description,
      images: productImage ? [productImage] : []
    },
    
    // Canonical URL
    alternates: {
      canonical: url
    }
  }
}

/**
 * Generate store structured data (JSON-LD)
 */
export function generateStoreStructuredData(store: Store): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: store.name,
    description: store.description,
    url: `${BASE_URL}/${store.slug}`,
    logo: store.logo_url,
    image: store.logo_url,
    telephone: store.contact_phone,
    email: store.contact_email,
    address: {
      '@type': 'PostalAddress',
      addressCountry: store.blueprint?.location?.country || 'India'
    },
    priceRange: '₹₹',
    currenciesAccepted: store.blueprint?.location?.currency || 'INR',
    paymentAccepted: getPaymentMethods(store),
    sameAs: getSocialLinks(store)
  }
}

/**
 * Generate product structured data (JSON-LD)
 */
export function generateProductStructuredData(product: Product, store: Store): object {
  const currency = store.blueprint?.location?.currency || 'INR'
  const productImage = product.images?.[0]?.url
  
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    image: productImage,
    url: `${BASE_URL}/${store.slug}/products/${product.id}`,
    sku: product.sku,
    brand: {
      '@type': 'Brand',
      name: store.name
    },
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: currency,
      availability: product.quantity > 0 
        ? 'https://schema.org/InStock' 
        : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: store.name
      },
      priceValidUntil: getNextYearDate(),
      url: `${BASE_URL}/${store.slug}/products/${product.id}`,
      ...(product.compare_at_price && {
        discount: calculateDiscount(product.compare_at_price, product.price)
      })
    },
    category: product.categories?.[0],
    ...(product.weight && {
      weight: {
        '@type': 'QuantitativeValue',
        value: product.weight,
        unitCode: 'GRM'
      }
    })
  }
}

/**
 * Generate breadcrumb structured data
 */
export function generateBreadcrumbStructuredData(
  items: Array<{ name: string; url: string }>
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  }
}

/**
 * Generate organization structured data
 */
export function generateOrganizationStructuredData(store: Store): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: store.name,
    url: `${BASE_URL}/${store.slug}`,
    logo: store.logo_url,
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: store.contact_phone,
      email: store.contact_email,
      contactType: 'customer service'
    },
    sameAs: getSocialLinks(store)
  }
}

/**
 * Get payment methods string
 */
function getPaymentMethods(store: Store): string {
  const methods: string[] = []
  
  if (store.settings?.payments?.razorpay_enabled) {
    methods.push('Credit Card', 'Debit Card', 'Net Banking')
  }
  if (store.settings?.payments?.upi_enabled) {
    methods.push('UPI')
  }
  if (store.settings?.shipping?.cod_enabled) {
    methods.push('Cash on Delivery')
  }
  
  return methods.join(', ') || 'Credit Card, UPI, Cash on Delivery'
}

/**
 * Get social media links
 */
function getSocialLinks(store: Store): string[] {
  const links: string[] = []
  
  if (store.instagram_handle) {
    links.push(`https://instagram.com/${store.instagram_handle}`)
  }
  if (store.facebook_url) {
    links.push(store.facebook_url)
  }
  if (store.whatsapp_number) {
    links.push(`https://wa.me/91${store.whatsapp_number}`)
  }
  
  return links
}

/**
 * Get date one year from now (for priceValidUntil)
 */
function getNextYearDate(): string {
  const date = new Date()
  date.setFullYear(date.getFullYear() + 1)
  return date.toISOString().split('T')[0]
}

/**
 * Calculate discount percentage
 */
function calculateDiscount(originalPrice: number, salePrice: number): string {
  const discount = Math.round(((originalPrice - salePrice) / originalPrice) * 100)
  return `${discount}%`
}

/**
 * Generate robots.txt content for store
 */
export function generateRobotsTxt(storeSlug: string): string {
  return `
User-agent: *
Allow: /${storeSlug}/
Allow: /${storeSlug}/products/
Disallow: /${storeSlug}/cart
Disallow: /${storeSlug}/checkout

Sitemap: ${BASE_URL}/${storeSlug}/sitemap.xml
`.trim()
}

/**
 * Generate basic sitemap URLs for store
 */
type SitemapUrl = {
  url: string
  lastModified: Date
  changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority: number
}

export function generateSitemapUrls(store: Store, products: Product[]): SitemapUrl[] {
  const baseUrl = `${BASE_URL}/${store.slug}`

  const urls: SitemapUrl[] = [
    // Homepage
    {
      url: baseUrl,
      lastModified: new Date(store.updated_at),
      changeFrequency: 'daily',
      priority: 1.0
    },
    // Products listing
    {
      url: `${baseUrl}/products`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9
    },
    // About page
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(store.updated_at),
      changeFrequency: 'monthly',
      priority: 0.5
    },
    // Contact page
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(store.updated_at),
      changeFrequency: 'monthly',
      priority: 0.5
    }
  ]

  // Add product pages
  products.forEach(product => {
    urls.push({
      url: `${baseUrl}/products/${product.id}`,
      lastModified: new Date(product.updated_at),
      changeFrequency: 'weekly',
      priority: 0.8
    })
  })

  return urls
}
