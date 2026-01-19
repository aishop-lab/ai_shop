'use client'

import type { StorePageData } from '@/lib/types/store'
import HeroSection from './hero-section'
import FeaturedProducts from './featured-products'
import AboutPreview from './about-preview'
import CategorySection from './category-section'

interface HomepageProps {
  data: StorePageData
}

export default function ModernMinimalHomepage({ data }: HomepageProps) {
  const { store, featured_products, categories } = data
  
  return (
    <div>
      {/* Hero Section */}
      <HeroSection />
      
      {/* Featured Products */}
      {featured_products.length > 0 && (
        <FeaturedProducts products={featured_products} />
      )}
      
      {/* Categories (if available) */}
      {categories.length > 0 && (
        <CategorySection categories={categories} />
      )}
      
      {/* About Preview */}
      <AboutPreview />
    </div>
  )
}
