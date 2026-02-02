'use client'

import Link from 'next/link'
import { ArrowRight, Sparkles, Check, Truck, Shield, Clock, Heart, Star, Gift, Award } from 'lucide-react'
import { useStore } from '@/lib/contexts/store-context'

// Icon mapping for trust badges
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  check: Check,
  truck: Truck,
  shield: Shield,
  clock: Clock,
  heart: Heart,
  star: Star,
  gift: Gift,
  award: Award,
}

export default function HeroSection() {
  const { store } = useStore()
  const baseUrl = `/${store.slug}`

  // Get AI-generated content with fallbacks
  const aiContent = store.blueprint?.ai_content
  const heroContent = aiContent?.homepage?.hero
  const trustBadges = aiContent?.homepage?.trust_badges || [
    { icon: 'check', title: 'Quality Products' },
    { icon: 'truck', title: 'Fast Delivery' },
    { icon: 'shield', title: 'Secure Payments' },
  ]

  // Use AI headline or fallback
  const headline = heroContent?.headline || `Welcome to ${store.name}`
  const subheadline = heroContent?.subheadline || store.tagline || `Premium ${store.blueprint?.category?.niche || 'products'} crafted with care`
  const ctaText = heroContent?.cta_text || 'Shop Now'

  return (
    <section className="relative overflow-hidden">
      {/* Background with brand color gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, var(--color-primary-light) 0%, white 50%, var(--color-primary-light) 100%)`,
          opacity: 0.5
        }}
      />

      {/* Background Pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 25px 25px, var(--color-primary) 2px, transparent 0)`,
          backgroundSize: '50px 50px'
        }}
      />

      <div className="relative max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full mb-6 shadow-sm">
            <Sparkles className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
            <span
              className="text-sm font-medium text-gray-700"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {store.blueprint?.category?.business_type || 'Quality Products'}
            </span>
          </div>

          {/* Main Heading - SHORT, from AI content */}
          <h1
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight text-gray-900"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {headline.includes(store.name) ? (
              headline.split(store.name).map((part, i, arr) => (
                <span key={i}>
                  {part}
                  {i < arr.length - 1 && (
                    <span style={{ color: 'var(--color-primary)' }}>{store.name}</span>
                  )}
                </span>
              ))
            ) : (
              <>
                {headline}
              </>
            )}
          </h1>

          {/* Subheadline - SHORT, from AI content */}
          <p
            className="text-xl md:text-2xl text-gray-600 mb-10 max-w-2xl mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {subheadline}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={`${baseUrl}/products`}
              className="inline-flex items-center px-8 py-4 text-lg font-semibold rounded-lg transition-all hover:scale-105 hover:shadow-lg"
              style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-contrast)' }}
            >
              {ctaText}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>

            <Link
              href={`${baseUrl}/about`}
              className="inline-flex items-center px-8 py-4 text-lg font-semibold rounded-lg border-2 transition-colors hover:bg-white/50"
              style={{
                borderColor: 'var(--color-primary)',
                color: 'var(--color-primary)'
              }}
            >
              Learn More
            </Link>
          </div>

          {/* Trust Badges - from AI content */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 md:gap-8">
            {trustBadges.map((badge, index) => {
              const IconComponent = iconMap[badge.icon] || Check
              return (
                <div
                  key={index}
                  className="flex items-center space-x-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full"
                >
                  <span style={{ color: 'var(--color-primary)' }}><IconComponent className="w-5 h-5" /></span>
                  <span className="text-sm font-medium text-gray-700">{badge.title}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
