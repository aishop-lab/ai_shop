'use client'

import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useStore } from '@/lib/contexts/store-context'

export default function HeroSection() {
  const { store } = useStore()
  const baseUrl = `/${store.slug}`
  
  return (
    <section className="relative overflow-hidden">
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `radial-gradient(circle at 25px 25px, var(--color-primary) 2px, transparent 0)`,
          backgroundSize: '50px 50px'
        }}
      />
      
      <div className="relative max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-full mb-6">
            <Sparkles className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
            <span 
              className="text-sm font-medium text-gray-700"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {store.blueprint?.category?.business_type || 'Quality Products'}
            </span>
          </div>
          
          {/* Main Heading */}
          <h1 
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Welcome to{' '}
            <span style={{ color: 'var(--color-primary)' }}>{store.name}</span>
          </h1>
          
          {/* Tagline */}
          {store.tagline && (
            <p 
              className="text-xl md:text-2xl text-gray-600 mb-4"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {store.tagline}
            </p>
          )}
          
          {/* Description */}
          <p 
            className="text-lg text-gray-700 mb-10 max-w-2xl mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {store.description || `Discover our curated collection of ${store.blueprint?.category?.niche || 'products'}.`}
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={`${baseUrl}/products`}
              className="inline-flex items-center px-8 py-4 text-lg font-semibold text-white rounded-lg transition-all hover:scale-105 hover:shadow-lg"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              Shop Now
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            
            <Link
              href={`${baseUrl}/about`}
              className="inline-flex items-center px-8 py-4 text-lg font-semibold rounded-lg border-2 transition-colors hover:bg-gray-50"
              style={{ 
                borderColor: 'var(--color-primary)', 
                color: 'var(--color-primary)' 
              }}
            >
              Learn More
            </Link>
          </div>
          
          {/* Trust Badges */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-gray-500">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Quality Products</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Fast Delivery</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Secure Payments</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
