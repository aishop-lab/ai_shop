// Theme Registry - Defines all available store themes

import type { ThemeRegistry, ThemeDefinition } from './types'

/**
 * Theme Registry
 * Each theme provides components for different store pages
 * Components are lazy-loaded for performance
 */
export const THEME_REGISTRY: ThemeRegistry = {
  'modern-minimal': {
    name: 'Modern Minimal',
    description: 'Clean lines, bold typography, contemporary design',
    components: {
      homepage: () => import('./modern-minimal/homepage'),
      productListing: () => import('./modern-minimal/product-listing'),
      productDetail: () => import('./modern-minimal/product-detail'),
      about: () => import('./modern-minimal/about'),
      contact: () => import('./modern-minimal/contact'),
      cart: () => import('./modern-minimal/cart'),
      checkout: () => import('./modern-minimal/checkout'),
      header: () => import('./modern-minimal/header'),
      footer: () => import('./modern-minimal/footer')
    },
    layout: {
      maxWidth: '1280px',
      headerHeight: '80px',
      footerMinHeight: '300px',
      containerPadding: '1rem',
      gridGap: '1.5rem'
    },
    features: [
      'Responsive grid layout',
      'Bold product cards',
      'Sticky header',
      'Minimal animations'
    ]
  },

  'classic-elegant': {
    name: 'Classic Elegant',
    description: 'Timeless, sophisticated design with serif fonts',
    components: {
      homepage: () => import('./classic-elegant/homepage'),
      productListing: () => import('./classic-elegant/product-listing'),
      productDetail: () => import('./classic-elegant/product-detail'),
      about: () => import('./classic-elegant/about'),
      contact: () => import('./classic-elegant/contact'),
      cart: () => import('./classic-elegant/cart'),
      checkout: () => import('./classic-elegant/checkout'),
      header: () => import('./classic-elegant/header'),
      footer: () => import('./classic-elegant/footer')
    },
    layout: {
      maxWidth: '1200px',
      headerHeight: '100px',
      footerMinHeight: '350px',
      containerPadding: '1.5rem',
      gridGap: '2rem'
    },
    features: [
      'Elegant typography',
      'Subtle animations',
      'Image-focused design',
      'Refined details'
    ]
  },

  'playful-bright': {
    name: 'Playful Bright',
    description: 'Vibrant colors, rounded corners, fun design',
    components: {
      homepage: () => import('./playful-bright/homepage'),
      productListing: () => import('./playful-bright/product-listing'),
      productDetail: () => import('./playful-bright/product-detail'),
      about: () => import('./playful-bright/about'),
      contact: () => import('./playful-bright/contact'),
      cart: () => import('./playful-bright/cart'),
      checkout: () => import('./playful-bright/checkout'),
      header: () => import('./playful-bright/header'),
      footer: () => import('./playful-bright/footer')
    },
    layout: {
      maxWidth: '1400px',
      headerHeight: '70px',
      footerMinHeight: '280px',
      containerPadding: '1rem',
      gridGap: '1.25rem'
    },
    features: [
      'Rounded corners',
      'Playful animations',
      'Bold color accents',
      'Fun hover effects'
    ]
  },

  'minimal-zen': {
    name: 'Minimal Zen',
    description: 'White space, subtle design, understated elegance',
    components: {
      homepage: () => import('./minimal-zen/homepage'),
      productListing: () => import('./minimal-zen/product-listing'),
      productDetail: () => import('./minimal-zen/product-detail'),
      about: () => import('./minimal-zen/about'),
      contact: () => import('./minimal-zen/contact'),
      cart: () => import('./minimal-zen/cart'),
      checkout: () => import('./minimal-zen/checkout'),
      header: () => import('./minimal-zen/header'),
      footer: () => import('./minimal-zen/footer')
    },
    layout: {
      maxWidth: '1100px',
      headerHeight: '60px',
      footerMinHeight: '250px',
      containerPadding: '2rem',
      gridGap: '2.5rem'
    },
    features: [
      'Generous white space',
      'Subtle typography',
      'Clean lines',
      'Focus on content'
    ]
  }
}

/**
 * Get theme by template name
 * Falls back to 'modern-minimal' if not found
 */
export function getTheme(templateName: string): ThemeDefinition {
  return THEME_REGISTRY[templateName] || THEME_REGISTRY['modern-minimal']
}

/**
 * Get all available theme names
 */
export function getAvailableThemes(): string[] {
  return Object.keys(THEME_REGISTRY)
}

/**
 * Check if a theme exists
 */
export function themeExists(templateName: string): boolean {
  return templateName in THEME_REGISTRY
}

/**
 * Get theme preview information (for theme selector)
 */
export function getThemePreview(templateName: string) {
  const theme = THEME_REGISTRY[templateName]
  if (!theme) return null
  
  return {
    name: theme.name,
    description: theme.description,
    features: theme.features,
    previewImage: theme.previewImage
  }
}

/**
 * Get all theme previews
 */
export function getAllThemePreviews() {
  return Object.entries(THEME_REGISTRY).map(([key, theme]) => ({
    id: key,
    name: theme.name,
    description: theme.description,
    features: theme.features,
    previewImage: theme.previewImage
  }))
}
