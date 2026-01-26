'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { StorePageData, Product } from '@/lib/types/store'
import { useStore } from '@/lib/contexts/store-context'
import ProductCard from '../modern-minimal/product-card'

interface HomepageProps {
  data: StorePageData
}

export default function ClassicElegantHomepage({ data }: HomepageProps) {
  const { store, formatPrice } = useStore()
  const { featured_products, categories } = data
  const baseUrl = `/${store.slug}`
  
  return (
    <div>
      {/* Hero Section - Elegant Style */}
      <section className="relative py-24 md:py-32 bg-gray-50">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8 text-center">
          <p 
            className="text-sm uppercase tracking-[0.3em] text-gray-500 mb-6"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {store.blueprint?.category?.business_type || 'Curated Collection'}
          </p>
          
          <h1 
            className="text-4xl md:text-6xl font-serif mb-6 leading-tight"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {store.name}
          </h1>
          
          {store.tagline && (
            <p 
              className="text-xl md:text-2xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {store.tagline}
            </p>
          )}
          
          <Link
            href={`${baseUrl}/products`}
            className="inline-flex items-center px-10 py-4 text-lg tracking-wider uppercase border-2 transition-all hover:bg-[var(--color-primary)] hover:text-white hover:border-[var(--color-primary)]"
            style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
          >
            Explore Collection
            <ArrowRight className="ml-3 w-5 h-5" />
          </Link>
        </div>
      </section>
      
      {/* Featured Products */}
      {featured_products.length > 0 && (
        <section className="py-20">
          <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
            <div className="text-center mb-16">
              <p className="text-sm uppercase tracking-[0.3em] text-gray-500 mb-4">Handpicked</p>
              <h2 
                className="text-3xl md:text-4xl font-serif"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Featured Pieces
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {featured_products.slice(0, 8).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            
            <div className="text-center mt-16">
              <Link
                href={`${baseUrl}/products`}
                className="inline-flex items-center text-sm uppercase tracking-widest hover:text-[var(--color-primary)] transition-colors"
              >
                View Full Collection
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      )}
      
      {/* About Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-gray-500 mb-4">Our Story</p>
            <h2 
              className="text-3xl md:text-4xl font-serif mb-8"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              About {store.name}
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed mb-10">
              {store.blueprint?.ai_content?.about_us?.medium_description || `We believe in the beauty of simplicity and the elegance of quality craftsmanship. Each piece in our collection is carefully selected to bring timeless sophistication to your life.`}
            </p>
            <Link
              href={`${baseUrl}/about`}
              className="inline-flex items-center text-sm uppercase tracking-widest hover:text-[var(--color-primary)] transition-colors"
            >
              Learn More
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
