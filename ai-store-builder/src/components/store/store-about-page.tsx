'use client'

import Link from 'next/link'
import { ArrowRight, Mail, Phone, Instagram, MessageCircle } from 'lucide-react'
import { useStore } from '@/lib/contexts/store-context'

export default function StoreAboutPage() {
  const { store } = useStore()
  const baseUrl = `/${store.slug}`
  
  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
      {/* Hero */}
      <div className="text-center mb-16">
        <h1 
          className="text-4xl md:text-5xl font-bold mb-6"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          About{' '}
          <span style={{ color: 'var(--color-primary)' }}>{store.name}</span>
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
      
      {/* Story */}
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
          <p className="leading-relaxed">
            {store.description || `Welcome to ${store.name}. We are passionate about bringing you the finest quality products in ${store.blueprint?.category?.niche || 'our category'}. Our mission is to provide exceptional value while delivering an outstanding shopping experience.`}
          </p>
          <p className="leading-relaxed mt-4">
            Every product in our collection is carefully curated to meet the highest standards of quality and craftsmanship. We believe that shopping should be a pleasure, not a chore, which is why we&apos;ve designed our store to be simple, beautiful, and easy to navigate.
          </p>
        </div>
      </div>
      
      {/* Values */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        <div className="text-center p-8 rounded-lg bg-gray-50">
          <div 
            className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-primary-light)' }}
          >
            <svg className="w-8 h-8" style={{ color: 'var(--color-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 
            className="text-xl font-bold mb-2"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Quality First
          </h3>
          <p className="text-gray-600">
            We never compromise on quality. Every product meets our rigorous standards.
          </p>
        </div>
        
        <div className="text-center p-8 rounded-lg bg-gray-50">
          <div 
            className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-primary-light)' }}
          >
            <svg className="w-8 h-8" style={{ color: 'var(--color-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 
            className="text-xl font-bold mb-2"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Fast Delivery
          </h3>
          <p className="text-gray-600">
            Quick and reliable shipping to get your products to you as fast as possible.
          </p>
        </div>
        
        <div className="text-center p-8 rounded-lg bg-gray-50">
          <div 
            className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-primary-light)' }}
          >
            <svg className="w-8 h-8" style={{ color: 'var(--color-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h3 
            className="text-xl font-bold mb-2"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Customer Love
          </h3>
          <p className="text-gray-600">
            Your satisfaction is our priority. We&apos;re here to help every step of the way.
          </p>
        </div>
      </div>
      
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
        </div>
        <Link
          href={`${baseUrl}/contact`}
          className="inline-flex items-center px-6 py-3 rounded-lg font-semibold text-white"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          Contact Us
          <ArrowRight className="ml-2 w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}
