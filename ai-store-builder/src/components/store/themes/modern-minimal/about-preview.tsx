'use client'

import Link from 'next/link'
import { ArrowRight, Leaf, Heart, Shield, Truck, Star, Check, Gift, Clock, Sparkles, Award } from 'lucide-react'
import { useStore } from '@/lib/contexts/store-context'

// Icon mapping for values
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  leaf: Leaf,
  heart: Heart,
  shield: Shield,
  truck: Truck,
  star: Star,
  check: Check,
  gift: Gift,
  clock: Clock,
  sparkles: Sparkles,
  award: Award,
}

export default function AboutPreview() {
  const { store } = useStore()
  const baseUrl = `/${store.slug}`

  // Get AI-generated content with fallbacks
  const aiContent = store.blueprint?.ai_content
  const aboutContent = aiContent?.about_us

  // Use medium_description (80 words) instead of full story
  const previewText = aboutContent?.medium_description ||
    `We are passionate about bringing you the finest ${store.blueprint?.category?.niche || 'products'}. Every item in our collection is carefully curated to ensure quality and satisfaction.`

  // Use AI-generated values or defaults
  const values = aboutContent?.values || [
    { title: 'Quality First', description: 'Premium products', icon: 'star' },
    { title: 'Fast Delivery', description: 'Quick shipping', icon: 'truck' },
    { title: 'Secure', description: 'Safe payments', icon: 'shield' },
    { title: 'Support', description: '24/7 help', icon: 'heart' },
  ]

  return (
    <section className="py-16 md:py-20 bg-gray-50/50">
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

            {/* Medium description - NOT the full story */}
            <p
              className="text-lg text-gray-600 mb-6 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {previewText}
            </p>

            {/* Keywords as tags */}
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
              Read Our Full Story
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </div>

          {/* Values Grid - from AI content */}
          <div className="grid grid-cols-2 gap-4">
            {values.slice(0, 4).map((value, index) => {
              const IconComponent = iconMap[value.icon] || Star
              return (
                <div
                  key={index}
                  className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                >
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                    style={{ backgroundColor: 'var(--color-primary-light)' }}
                  >
                    <IconComponent
                      className="w-6 h-6"
                      style={{ color: 'var(--color-primary)' }}
                    />
                  </div>
                  <h3
                    className="font-semibold text-gray-900 mb-1"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {value.title}
                  </h3>
                  <p className="text-sm text-gray-500">{value.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
