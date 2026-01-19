'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useStore } from '@/lib/contexts/store-context'

export default function AboutPreview() {
  const { store } = useStore()
  const baseUrl = `/${store.slug}`
  
  return (
    <section className="py-16 md:py-20">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div>
            <h2 
              className="text-3xl md:text-4xl font-bold mb-6"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              About{' '}
              <span style={{ color: 'var(--color-primary)' }}>{store.name}</span>
            </h2>
            
            <p 
              className="text-lg text-gray-600 mb-6"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {store.description || `We are passionate about bringing you the finest ${store.blueprint?.category?.niche || 'products'}. Every item in our collection is carefully curated to ensure quality and satisfaction.`}
            </p>
            
            {store.blueprint?.category?.keywords && store.blueprint.category.keywords.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {store.blueprint.category.keywords.slice(0, 5).map((keyword, index) => (
                  <span 
                    key={index}
                    className="px-3 py-1 text-sm rounded-full"
                    style={{ 
                      backgroundColor: 'var(--color-primary-light)',
                      color: 'var(--color-primary-dark)'
                    }}
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            )}
            
            <Link
              href={`${baseUrl}/about`}
              className="inline-flex items-center font-semibold transition-colors hover:opacity-80"
              style={{ color: 'var(--color-primary)' }}
            >
              Read Our Story
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </div>
          
          {/* Stats/Features */}
          <div className="grid grid-cols-2 gap-6">
            <div className="p-6 bg-gray-50 rounded-lg text-center">
              <div 
                className="text-4xl font-bold mb-2"
                style={{ color: 'var(--color-primary)' }}
              >
                100%
              </div>
              <p className="text-gray-600">Quality Products</p>
            </div>
            <div className="p-6 bg-gray-50 rounded-lg text-center">
              <div 
                className="text-4xl font-bold mb-2"
                style={{ color: 'var(--color-primary)' }}
              >
                24/7
              </div>
              <p className="text-gray-600">Customer Support</p>
            </div>
            <div className="p-6 bg-gray-50 rounded-lg text-center">
              <div 
                className="text-4xl font-bold mb-2"
                style={{ color: 'var(--color-primary)' }}
              >
                Fast
              </div>
              <p className="text-gray-600">Delivery</p>
            </div>
            <div className="p-6 bg-gray-50 rounded-lg text-center">
              <div 
                className="text-4xl font-bold mb-2"
                style={{ color: 'var(--color-primary)' }}
              >
                Easy
              </div>
              <p className="text-gray-600">Returns</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
