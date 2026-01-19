'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { StorePageData } from '@/lib/types/store'
import { useStore } from '@/lib/contexts/store-context'
import ProductCard from '../modern-minimal/product-card'

interface HomepageProps {
  data: StorePageData
}

export default function MinimalZenHomepage({ data }: HomepageProps) {
  const { store } = useStore()
  const { featured_products } = data
  const baseUrl = `/${store.slug}`
  
  return (
    <div>
      {/* Hero Section - Minimal Style */}
      <section className="py-24 md:py-32">
        <div className="max-w-[1100px] mx-auto px-8 text-center">
          <p 
            className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-8"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {store.blueprint?.category?.business_type || 'Thoughtfully Curated'}
          </p>
          
          <h1 
            className="text-3xl md:text-5xl font-medium mb-8 leading-tight tracking-tight"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {store.name}
          </h1>
          
          {store.tagline && (
            <p 
              className="text-lg text-gray-500 mb-12 max-w-xl mx-auto leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {store.tagline}
            </p>
          )}
          
          <Link
            href={`${baseUrl}/products`}
            className="inline-flex items-center text-sm tracking-wide hover:opacity-60 transition-opacity"
            style={{ color: 'var(--color-primary)' }}
          >
            View Collection
            <ArrowRight className="ml-2 w-4 h-4" strokeWidth={1.5} />
          </Link>
        </div>
      </section>
      
      {/* Featured Products */}
      {featured_products.length > 0 && (
        <section className="py-16 border-t border-gray-100">
          <div className="max-w-[1100px] mx-auto px-8">
            <div className="flex items-center justify-between mb-12">
              <h2 
                className="text-lg font-medium"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Featured
              </h2>
              <Link
                href={`${baseUrl}/products`}
                className="text-sm text-gray-400 hover:text-gray-900 transition-colors"
              >
                View all
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {featured_products.slice(0, 4).map((product) => (
                <ProductCard key={product.id} product={product} showQuickView={false} />
              ))}
            </div>
          </div>
        </section>
      )}
      
      {/* About Section */}
      <section className="py-24 border-t border-gray-100">
        <div className="max-w-[1100px] mx-auto px-8">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-4">About</p>
            <p className="text-lg text-gray-600 leading-relaxed mb-8">
              {store.description || `We believe in the power of simplicity. Every product we offer is carefully selected to bring peace and functionality to your everyday life.`}
            </p>
            <Link
              href={`${baseUrl}/about`}
              className="text-sm text-gray-400 hover:text-gray-900 transition-colors"
            >
              Learn more →
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
