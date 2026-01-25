import { NextRequest, NextResponse } from 'next/server'
import { getStore, getStoreProducts } from '@/lib/store/queries'

// Production domain configuration
const PRODUCTION_DOMAIN = process.env.NEXT_PUBLIC_PRODUCTION_DOMAIN || 'storeforge.site'
const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

function getStoreUrl(slug: string): string {
  if (IS_PRODUCTION) {
    return `https://${slug}.${PRODUCTION_DOMAIN}`
  }
  return `${BASE_URL}/${slug}`
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeSlug: string }> }
) {
  try {
    const { storeSlug } = await params

    // Get store data
    const store = await getStore(storeSlug)

    if (!store) {
      return new NextResponse('Store not found', { status: 404 })
    }

    // Get all published products (limit to 1000 for sitemap performance)
    const { products } = await getStoreProducts(store.id, {
      limit: 1000,
      sortBy: 'created_at',
      sortOrder: 'desc'
    })

    const baseUrl = getStoreUrl(storeSlug)
    const now = new Date().toISOString()

    // Build sitemap XML
    const urls: Array<{
      loc: string
      lastmod: string
      changefreq: string
      priority: string
    }> = [
      // Homepage
      {
        loc: baseUrl,
        lastmod: store.updated_at || now,
        changefreq: 'daily',
        priority: '1.0'
      },
      // Products listing page
      {
        loc: `${baseUrl}/products`,
        lastmod: now,
        changefreq: 'daily',
        priority: '0.9'
      },
      // About page
      {
        loc: `${baseUrl}/about`,
        lastmod: store.updated_at || now,
        changefreq: 'monthly',
        priority: '0.5'
      },
      // Contact page
      {
        loc: `${baseUrl}/contact`,
        lastmod: store.updated_at || now,
        changefreq: 'monthly',
        priority: '0.5'
      }
    ]

    // Add product pages
    for (const product of products) {
      urls.push({
        loc: `${baseUrl}/products/${product.id}`,
        lastmod: product.updated_at || now,
        changefreq: 'weekly',
        priority: product.featured ? '0.9' : '0.8'
      })
    }

    // Generate XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urls
  .map(
    (url) => `  <url>
    <loc>${escapeXml(url.loc)}</loc>
    <lastmod>${url.lastmod.split('T')[0]}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400'
      }
    })
  } catch (error) {
    console.error('Sitemap generation error:', error)
    return new NextResponse('Error generating sitemap', { status: 500 })
  }
}

/**
 * Escape special XML characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
