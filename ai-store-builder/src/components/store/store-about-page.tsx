'use client'

import Link from 'next/link'
import { ArrowRight, Mail, Phone, Instagram, MessageCircle, Leaf, Heart, Shield, Truck, Star, Check, Gift, Clock, Sparkles, Award } from 'lucide-react'
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

export default function StoreAboutPage() {
  const { store } = useStore()
  const baseUrl = `/${store.slug}`

  // Get AI-generated content with fallbacks
  const aiContent = store.blueprint?.ai_content
  const aboutContent = aiContent?.about_us

  // AI content fields with fallbacks
  const headline = aboutContent?.headline || `About ${store.name}`
  const story = aboutContent?.story || `Welcome to ${store.name}. We are passionate about bringing you the finest quality products in ${store.blueprint?.category?.niche || 'our category'}. Our mission is to provide exceptional value while delivering an outstanding shopping experience. Every product in our collection is carefully curated to meet the highest standards of quality and craftsmanship. We believe that shopping should be a pleasure, not a chore, which is why we've designed our store to be simple, beautiful, and easy to navigate.`
  const mission = aboutContent?.mission

  // AI values or defaults
  const values = aboutContent?.values || [
    { title: 'Quality First', description: 'We never compromise on quality. Every product meets our rigorous standards.', icon: 'check' },
    { title: 'Fast Delivery', description: 'Quick and reliable shipping to get your products to you as fast as possible.', icon: 'truck' },
    { title: 'Customer Love', description: 'Your satisfaction is our priority. We\'re here to help every step of the way.', icon: 'heart' },
  ]

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
      {/* Hero */}
      <div className="text-center mb-16">
        <h1
          className="text-4xl md:text-5xl font-bold mb-6"
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
        {store.tagline && (
          <p
            className="text-xl text-gray-600 max-w-2xl mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {store.tagline}
          </p>
        )}
      </div>

      {/* Story Section - Full AI story */}
      <div className="max-w-3xl mx-auto mb-16">
        <h2
          className="text-2xl font-bold mb-6"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Our Story
        </h2>
        <div
          className="prose prose-lg max-w-none text-gray-600"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {story.split('\n\n').map((paragraph, index) => (
            <p key={index} className="leading-relaxed mb-4">
              {paragraph}
            </p>
          ))}
        </div>

        {/* Mission Statement */}
        {mission && (
          <div
            className="mt-8 p-6 rounded-lg border-l-4"
            style={{
              backgroundColor: 'var(--color-primary-light)',
              borderLeftColor: 'var(--color-primary)'
            }}
          >
            <p
              className="text-lg font-medium italic"
              style={{ color: 'var(--color-primary-dark)' }}
            >
              &ldquo;{mission}&rdquo;
            </p>
          </div>
        )}
      </div>

      {/* Values Section - AI generated */}
      {values.length > 0 && (
        <div className="mb-16">
          <h2
            className="text-2xl font-bold mb-8 text-center"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Our Values
          </h2>
          <div className={`grid grid-cols-1 gap-8 ${values.length === 4 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'}`}>
            {values.map((value, index) => {
              const IconComponent = iconMap[value.icon] || Star
              return (
                <div key={index} className="text-center p-8 rounded-lg bg-gray-50">
                  <div
                    className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'var(--color-primary-light)' }}
                  >
                    <span style={{ color: 'var(--color-primary)' }}>
                      <IconComponent className="w-8 h-8" />
                    </span>
                  </div>
                  <h3
                    className="text-xl font-bold mb-2"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {value.title}
                  </h3>
                  <p className="text-gray-600">
                    {value.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Contact Info */}
      <div className="text-center p-12 rounded-lg" style={{ backgroundColor: 'var(--color-primary-light)' }}>
        <h2
          className="text-2xl font-bold mb-6"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Get in Touch
        </h2>
        <div className="flex flex-wrap justify-center gap-6 mb-8">
          {store.contact_email && (
            <a
              href={`mailto:${store.contact_email}`}
              className="flex items-center gap-2 text-gray-700 hover:text-[var(--color-primary)]"
            >
              <Mail className="w-5 h-5" />
              <span>{store.contact_email}</span>
            </a>
          )}
          {store.contact_phone && (
            <a
              href={`tel:${store.contact_phone}`}
              className="flex items-center gap-2 text-gray-700 hover:text-[var(--color-primary)]"
            >
              <Phone className="w-5 h-5" />
              <span>+91 {store.contact_phone}</span>
            </a>
          )}
          {store.instagram_handle && (
            <a
              href={`https://instagram.com/${store.instagram_handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-700 hover:text-[var(--color-primary)]"
            >
              <Instagram className="w-5 h-5" />
              <span>@{store.instagram_handle}</span>
            </a>
          )}
          {store.whatsapp_number && (
            <a
              href={`https://wa.me/91${store.whatsapp_number}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-700 hover:text-green-600"
            >
              <MessageCircle className="w-5 h-5" />
              <span>WhatsApp Us</span>
            </a>
          )}
        </div>
        <Link
          href={`${baseUrl}/contact`}
          className="inline-flex items-center px-6 py-3 rounded-lg font-semibold"
          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-contrast)' }}
        >
          Contact Us
          <ArrowRight className="ml-2 w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}
