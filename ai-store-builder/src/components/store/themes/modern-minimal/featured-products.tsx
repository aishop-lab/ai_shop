'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { Product } from '@/lib/types/store'
import { useStore } from '@/lib/contexts/store-context'
import ProductCard from './product-card'

interface FeaturedProductsProps {
  products: Product[]
}

export default function FeaturedProducts({ products }: FeaturedProductsProps) {
  const { store } = useStore()
  const baseUrl = `/${store.slug}`
  
  if (products.length === 0) return null
  
  return (
    <section className="py-16 md:py-20 bg-gray-50">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12">
          <div>
            <h2 
              className="text-3xl md:text-4xl font-bold mb-3"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Featured Products
            </h2>
            <p 
              className="text-gray-600 text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Handpicked favorites from our collection
            </p>
          </div>
          
          <Link
            href={`${baseUrl}/products`}
            className="inline-flex items-center mt-4 md:mt-0 text-base font-semibold transition-colors hover:opacity-80"
            style={{ color: 'var(--color-primary)' }}
          >
            View All Products
            <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </div>
        
        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {products.slice(0, 8).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        
        {/* CTA Button (mobile) */}
        <div className="mt-12 text-center md:hidden">
          <Link
            href={`${baseUrl}/products`}
            className="inline-flex items-center px-6 py-3 border-2 rounded-lg font-semibold transition-colors hover:bg-[var(--color-primary)] hover:text-white"
            style={{ 
              borderColor: 'var(--color-primary)', 
              color: 'var(--color-primary)' 
            }}
          >
            View All Products
            <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
