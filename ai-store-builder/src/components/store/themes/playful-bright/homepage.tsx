'use client'

import Link from 'next/link'
import { ArrowRight, Sparkles, Star, Zap } from 'lucide-react'
import type { StorePageData } from '@/lib/types/store'
import { useStore } from '@/lib/contexts/store-context'
import ProductCard from '../modern-minimal/product-card'

interface HomepageProps {
  data: StorePageData
}

export default function PlayfulBrightHomepage({ data }: HomepageProps) {
  const { store } = useStore()
  const { featured_products, categories } = data
  const baseUrl = `/${store.slug}`
  
  return (
    <div>
      {/* Hero Section - Playful Style */}
      <section className="relative overflow-hidden py-16 md:py-24" style={{ backgroundColor: 'var(--color-primary-light)' }}>
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-10 left-10 text-6xl">✨</div>
          <div className="absolute top-20 right-20 text-4xl">🌟</div>
          <div className="absolute bottom-20 left-1/4 text-5xl">⭐</div>
          <div className="absolute bottom-10 right-10 text-4xl">💫</div>
        </div>
        
        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white rounded-full mb-6 shadow-md">
            <Sparkles className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
            <span className="font-medium">{store.blueprint?.category?.business_type || 'Amazing Products'}</span>
          </div>
          
          <h1 
            className="text-4xl md:text-6xl font-bold mb-6"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Welcome to{' '}
            <span style={{ color: 'var(--color-primary)' }}>{store.name}</span>! 🎉
          </h1>
          
          {store.tagline && (
            <p 
              className="text-xl md:text-2xl text-gray-700 mb-8 max-w-2xl mx-auto"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {store.tagline}
            </p>
          )}
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={`${baseUrl}/products`}
              className="inline-flex items-center px-8 py-4 text-lg font-bold text-white rounded-2xl shadow-lg transition-all hover:scale-105 hover:shadow-xl"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              Start Shopping
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
      
      {/* Featured Products */}
      {featured_products.length > 0 && (
        <section className="py-16">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 mb-4">
                <Star className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
                <span className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>
                  Hot Picks
                </span>
                <Star className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
              </div>
              <h2 
                className="text-3xl md:text-4xl font-bold"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Featured Products ⚡
              </h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featured_products.slice(0, 8).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            
            <div className="text-center mt-12">
              <Link
                href={`${baseUrl}/products`}
                className="inline-flex items-center px-6 py-3 rounded-xl font-bold transition-all hover:scale-105"
                style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
              >
                See All Products
                <Zap className="ml-2 w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>
      )}
      
      {/* Fun CTA Section */}
      <section className="py-16" style={{ backgroundColor: 'var(--color-secondary)' }}>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
            Ready to find something awesome? 🚀
          </h2>
          <p className="text-lg mb-8 text-white/80">
            Join thousands of happy customers!
          </p>
          <Link
            href={`${baseUrl}/products`}
            className="inline-flex items-center px-8 py-4 bg-white text-gray-900 rounded-2xl font-bold shadow-lg transition-all hover:scale-105"
          >
            Let&apos;s Go Shopping!
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  )
}
