// Theme Variant Definitions
// 16 pre-designed layout variants: 4 per brand vibe

import type { ThemeVariant, BrandVibe, ThemeVariantId } from '@/lib/types/onboarding'

// ============================================
// MODERN VARIANTS
// ============================================

const MODERN_VARIANTS: ThemeVariant[] = [
    {
        id: 'modern-spotlight',
        vibe: 'modern',
        name: 'Spotlight',
        description: 'Centered hero with bold product showcase',
        previewImage: '/templates/modern-spotlight.png',
        layoutConfig: {
            hero_style: 'centered',
            product_grid_style: 'featured',
            header_style: 'sticky',
            footer_style: 'standard',
            show_featured_categories: true,
            show_testimonials: true,
            show_newsletter: true,
            border_radius: 'small',
            shadow_style: 'subtle'
        }
    },
    {
        id: 'modern-editorial',
        vibe: 'modern',
        name: 'Editorial',
        description: 'Asymmetric layout with magazine-style presentation',
        previewImage: '/templates/modern-editorial.png',
        layoutConfig: {
            hero_style: 'asymmetric',
            product_grid_style: 'masonry',
            header_style: 'transparent',
            footer_style: 'expanded',
            show_featured_categories: true,
            show_testimonials: false,
            show_newsletter: true,
            border_radius: 'none',
            shadow_style: 'medium'
        }
    },
    {
        id: 'modern-gallery',
        vibe: 'modern',
        name: 'Gallery',
        description: 'Image-first design with immersive visuals',
        previewImage: '/templates/modern-gallery.png',
        layoutConfig: {
            hero_style: 'fullwidth',
            product_grid_style: 'masonry',
            header_style: 'transparent',
            footer_style: 'minimal',
            show_featured_categories: false,
            show_testimonials: false,
            show_newsletter: true,
            border_radius: 'small',
            shadow_style: 'dramatic'
        }
    },
    {
        id: 'modern-compact',
        vibe: 'modern',
        name: 'Compact',
        description: 'Dense grid layout maximizing product visibility',
        previewImage: '/templates/modern-compact.png',
        layoutConfig: {
            hero_style: 'minimal',
            product_grid_style: 'compact',
            header_style: 'sticky',
            footer_style: 'minimal',
            show_featured_categories: true,
            show_testimonials: false,
            show_newsletter: false,
            border_radius: 'small',
            shadow_style: 'none'
        }
    }
]

// ============================================
// CLASSIC VARIANTS
// ============================================

const CLASSIC_VARIANTS: ThemeVariant[] = [
    {
        id: 'classic-heritage',
        vibe: 'classic',
        name: 'Heritage',
        description: 'Timeless elegance with serif typography',
        previewImage: '/templates/classic-heritage.png',
        layoutConfig: {
            hero_style: 'centered',
            product_grid_style: 'standard',
            header_style: 'centered',
            footer_style: 'expanded',
            show_featured_categories: true,
            show_testimonials: true,
            show_newsletter: true,
            border_radius: 'none',
            shadow_style: 'subtle'
        }
    },
    {
        id: 'classic-boutique',
        vibe: 'classic',
        name: 'Boutique',
        description: 'Refined and sophisticated with curated feel',
        previewImage: '/templates/classic-boutique.png',
        layoutConfig: {
            hero_style: 'split',
            product_grid_style: 'featured',
            header_style: 'standard',
            footer_style: 'standard',
            show_featured_categories: true,
            show_testimonials: true,
            show_newsletter: true,
            border_radius: 'small',
            shadow_style: 'medium'
        }
    },
    {
        id: 'classic-timeless',
        vibe: 'classic',
        name: 'Timeless',
        description: 'Traditional layout with enduring appeal',
        previewImage: '/templates/classic-timeless.png',
        layoutConfig: {
            hero_style: 'centered',
            product_grid_style: 'standard',
            header_style: 'standard',
            footer_style: 'expanded',
            show_featured_categories: true,
            show_testimonials: false,
            show_newsletter: true,
            border_radius: 'none',
            shadow_style: 'subtle'
        }
    },
    {
        id: 'classic-regal',
        vibe: 'classic',
        name: 'Regal',
        description: 'Luxurious presentation with premium feel',
        previewImage: '/templates/classic-regal.png',
        layoutConfig: {
            hero_style: 'fullwidth',
            product_grid_style: 'featured',
            header_style: 'centered',
            footer_style: 'expanded',
            show_featured_categories: false,
            show_testimonials: true,
            show_newsletter: true,
            border_radius: 'none',
            shadow_style: 'dramatic'
        }
    }
]

// ============================================
// PLAYFUL VARIANTS
// ============================================

const PLAYFUL_VARIANTS: ThemeVariant[] = [
    {
        id: 'playful-vibrant',
        vibe: 'playful',
        name: 'Vibrant',
        description: 'Bold colors and energetic layout',
        previewImage: '/templates/playful-vibrant.png',
        layoutConfig: {
            hero_style: 'asymmetric',
            product_grid_style: 'masonry',
            header_style: 'sticky',
            footer_style: 'standard',
            show_featured_categories: true,
            show_testimonials: true,
            show_newsletter: true,
            border_radius: 'large',
            shadow_style: 'medium'
        }
    },
    {
        id: 'playful-bubbly',
        vibe: 'playful',
        name: 'Bubbly',
        description: 'Rounded corners and friendly feel',
        previewImage: '/templates/playful-bubbly.png',
        layoutConfig: {
            hero_style: 'centered',
            product_grid_style: 'standard',
            header_style: 'sticky',
            footer_style: 'centered',
            show_featured_categories: true,
            show_testimonials: true,
            show_newsletter: true,
            border_radius: 'large',
            shadow_style: 'subtle'
        }
    },
    {
        id: 'playful-popart',
        vibe: 'playful',
        name: 'Pop Art',
        description: 'Dynamic and attention-grabbing design',
        previewImage: '/templates/playful-popart.png',
        layoutConfig: {
            hero_style: 'split',
            product_grid_style: 'featured',
            header_style: 'standard',
            footer_style: 'standard',
            show_featured_categories: true,
            show_testimonials: false,
            show_newsletter: true,
            border_radius: 'medium',
            shadow_style: 'dramatic'
        }
    },
    {
        id: 'playful-candy',
        vibe: 'playful',
        name: 'Candy',
        description: 'Sweet gradients and delightful animations',
        previewImage: '/templates/playful-candy.png',
        layoutConfig: {
            hero_style: 'fullwidth',
            product_grid_style: 'standard',
            header_style: 'transparent',
            footer_style: 'centered',
            show_featured_categories: true,
            show_testimonials: true,
            show_newsletter: true,
            border_radius: 'large',
            shadow_style: 'medium'
        }
    }
]

// ============================================
// MINIMAL VARIANTS
// ============================================

const MINIMAL_VARIANTS: ThemeVariant[] = [
    {
        id: 'minimal-zen',
        vibe: 'minimal',
        name: 'Zen',
        description: 'Maximum whitespace for peaceful browsing',
        previewImage: '/templates/minimal-zen.png',
        layoutConfig: {
            hero_style: 'minimal',
            product_grid_style: 'standard',
            header_style: 'minimal',
            footer_style: 'minimal',
            show_featured_categories: false,
            show_testimonials: false,
            show_newsletter: false,
            border_radius: 'none',
            shadow_style: 'none'
        }
    },
    {
        id: 'minimal-essential',
        vibe: 'minimal',
        name: 'Essential',
        description: 'Typography-focused with clean lines',
        previewImage: '/templates/minimal-essential.png',
        layoutConfig: {
            hero_style: 'centered',
            product_grid_style: 'list',
            header_style: 'minimal',
            footer_style: 'minimal',
            show_featured_categories: false,
            show_testimonials: false,
            show_newsletter: true,
            border_radius: 'none',
            shadow_style: 'none'
        }
    },
    {
        id: 'minimal-clean',
        vibe: 'minimal',
        name: 'Clean',
        description: 'Subtle borders and organized layout',
        previewImage: '/templates/minimal-clean.png',
        layoutConfig: {
            hero_style: 'split',
            product_grid_style: 'standard',
            header_style: 'standard',
            footer_style: 'minimal',
            show_featured_categories: true,
            show_testimonials: false,
            show_newsletter: true,
            border_radius: 'small',
            shadow_style: 'subtle'
        }
    },
    {
        id: 'minimal-pure',
        vibe: 'minimal',
        name: 'Pure',
        description: 'Zero decoration, content speaks for itself',
        previewImage: '/templates/minimal-pure.png',
        layoutConfig: {
            hero_style: 'minimal',
            product_grid_style: 'compact',
            header_style: 'minimal',
            footer_style: 'minimal',
            show_featured_categories: false,
            show_testimonials: false,
            show_newsletter: false,
            border_radius: 'none',
            shadow_style: 'none'
        }
    }
]

// ============================================
// EXPORTS
// ============================================

export const ALL_THEME_VARIANTS: ThemeVariant[] = [
    ...MODERN_VARIANTS,
    ...CLASSIC_VARIANTS,
    ...PLAYFUL_VARIANTS,
    ...MINIMAL_VARIANTS
]

/**
 * Get variants for a specific brand vibe
 */
export function getVariantsForVibe(vibe: BrandVibe): ThemeVariant[] {
    switch (vibe) {
        case 'modern':
            return MODERN_VARIANTS
        case 'classic':
            return CLASSIC_VARIANTS
        case 'playful':
            return PLAYFUL_VARIANTS
        case 'minimal':
            return MINIMAL_VARIANTS
        default:
            return MODERN_VARIANTS
    }
}

/**
 * Get a specific variant by ID
 */
export function getVariantById(id: ThemeVariantId | string): ThemeVariant | undefined {
    return ALL_THEME_VARIANTS.find(v => v.id === id)
}

/**
 * Validate that a variant ID belongs to the expected vibe
 */
export function isValidVariantForVibe(variantId: string, vibe: BrandVibe): boolean {
    const variant = getVariantById(variantId)
    return variant?.vibe === vibe
}

/**
 * Get default variant for a vibe (first one)
 */
export function getDefaultVariantForVibe(vibe: BrandVibe): ThemeVariant {
    const variants = getVariantsForVibe(vibe)
    return variants[0]
}
