'use client'

import Link from 'next/link'
import { useStore } from '@/lib/contexts/store-context'

interface CategorySectionProps {
  categories: string[]
}

export default function CategorySection({ categories }: CategorySectionProps) {
  const { store } = useStore()
  const baseUrl = `/${store.slug}`
  
  if (categories.length === 0) return null
  
  // Limit to 6 categories
  const displayCategories = categories.slice(0, 6)
  
  return (
    <section className="py-16 md:py-20">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 
            className="text-3xl md:text-4xl font-bold mb-3"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Shop by Category
          </h2>
          <p 
            className="text-gray-600 text-lg max-w-2xl mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Browse our collection by category
          </p>
        </div>
        
        {/* Categories Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {displayCategories.map((category, index) => (
            <Link
              key={category}
              href={`${baseUrl}/products?category=${encodeURIComponent(category)}`}
              className="group relative p-6 rounded-lg text-center transition-all hover:shadow-lg"
              style={{ 
                backgroundColor: index % 2 === 0 ? 'var(--color-primary-light)' : 'rgb(243, 244, 246)'
              }}
            >
              <span 
                className="font-semibold text-gray-900 group-hover:text-[var(--color-primary)] transition-colors"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {category}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
