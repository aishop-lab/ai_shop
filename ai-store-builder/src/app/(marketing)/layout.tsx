import { Metadata } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_APP_URL
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'https://storeforge.site')

export const metadata: Metadata = {
  title: 'StoreForge - Autonomous AI Agents for E-commerce',
  description: 'Five AI agents run your entire online business — marketing, sales, support, analytics, and technical operations. Store live in 30 seconds.',
  keywords: 'ecommerce, ai agents, autonomous, online store, india, shopify alternative',
  openGraph: {
    title: 'StoreForge - Autonomous AI Agents for E-commerce',
    description: 'Five AI agents run your entire online business. Store live in 30 seconds.',
    url: siteUrl,
    siteName: 'StoreForge',
    type: 'website',
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StoreForge - Autonomous AI Agents for E-commerce',
    description: 'Five AI agents run your entire online business. Store live in 30 seconds.',
  },
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-zinc-950">
      {children}
    </div>
  )
}
