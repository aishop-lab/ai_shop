import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'StoreForge - AI-Powered E-commerce for Indian Merchants',
  description: 'Create your online store in minutes with AI assistance. Accept UPI, cards, COD. Built for Indian businesses.',
  keywords: 'ecommerce, online store, india, ai, shopify alternative, razorpay, upi',
  openGraph: {
    title: 'StoreForge - AI-Powered E-commerce',
    description: 'Create your online store in minutes with AI assistance.',
    url: 'https://storeforge.site',
    siteName: 'StoreForge',
    type: 'website',
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StoreForge - AI-Powered E-commerce',
    description: 'Create your online store in minutes with AI assistance.',
  },
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {children}
    </div>
  )
}
