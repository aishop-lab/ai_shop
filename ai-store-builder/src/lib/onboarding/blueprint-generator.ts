// Store Blueprint Generator
// Enhanced with AI-generated content support

import type { StoreData, StoreBlueprint } from '@/lib/types/onboarding'
import { vercelAI } from '@/lib/ai/vercel-ai-service'
import type { StoreContent } from '@/lib/ai/schemas'
import { getVariantById, getDefaultVariantForVibe } from '@/lib/onboarding/theme-variants'

// Typography mapping based on brand vibe
const TYPOGRAPHY_MAP: Record<string, { heading: string; body: string }> = {
  modern: { heading: 'Inter', body: 'Poppins' },
  classic: { heading: 'Playfair Display', body: 'Lora' },
  playful: { heading: 'Fredoka', body: 'Nunito' },
  minimal: { heading: 'Space Grotesk', body: 'Inter' }
}

// Default settings by region
const REGION_DEFAULTS = {
  india: {
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    country: 'India',
    shipping: {
      free_shipping_threshold: 999,
      flat_rate_national: 60,
      cod_enabled: true
    },
    payments: {
      razorpay_enabled: true,
      upi_enabled: true,
      stripe_enabled: false
    }
  },
  local: {
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    country: 'India',
    shipping: {
      free_shipping_threshold: 499,
      flat_rate_national: 40,
      cod_enabled: true
    },
    payments: {
      razorpay_enabled: true,
      upi_enabled: true,
      stripe_enabled: false
    }
  },
  international: {
    currency: 'USD',
    timezone: 'UTC',
    country: 'India',
    shipping: {
      free_shipping_threshold: 50,
      flat_rate_national: 10,
      cod_enabled: false
    },
    payments: {
      razorpay_enabled: true,
      upi_enabled: false,
      stripe_enabled: true
    }
  }
}

// Default colors based on vibe
const DEFAULT_COLORS: Record<string, { primary: string; secondary: string }> = {
  modern: { primary: '#0F172A', secondary: '#3B82F6' },
  classic: { primary: '#1E3A5F', secondary: '#D4AF37' },
  playful: { primary: '#EC4899', secondary: '#8B5CF6' },
  minimal: { primary: '#18181B', secondary: '#71717A' }
}

export class BlueprintGenerator {
  generateBlueprint(data: StoreData): StoreBlueprint {
    const geography = data.target_geography || 'india'
    const regionDefaults = REGION_DEFAULTS[geography]
    const vibe = data.brand_vibe || 'modern'
    const typography = TYPOGRAPHY_MAP[vibe]
    const defaultColors = DEFAULT_COLORS[vibe]

    return {
      version: '1.0',
      identity: {
        business_name: data.business_name,
        slug: data.slug,
        tagline: data.tagline || '',
        description: data.description
      },
      category: {
        business_type: data.business_type || 'General',
        business_category: data.business_category || [],
        niche: data.niche || '',
        keywords: data.keywords || []
      },
      branding: {
        logo_url: data.logo_url || null,
        colors: {
          primary: data.primary_color || defaultColors.primary,
          secondary: data.secondary_color || defaultColors.secondary
        },
        typography: {
          heading_font: typography.heading,
          body_font: typography.body
        }
      },
      theme: {
        template: this.selectTemplate(vibe, data.theme_variant || undefined),
        vibe: vibe,
        variant_id: data.theme_variant || undefined,
        layout: this.getLayoutConfig(vibe, data.theme_variant || undefined)
      },
      location: {
        target_geography: geography,
        country: regionDefaults.country,
        // Use user-selected currency if provided, otherwise use regional default
        currency: data.currency || regionDefaults.currency,
        timezone: regionDefaults.timezone
      },
      contact: {
        email: data.contact_email,
        phone: data.contact_phone,
        whatsapp: data.whatsapp || null,
        instagram: data.instagram || null
      },
      business: {
        gstin: data.gstin || null
      },
      settings: {
        checkout: {
          guest_checkout_enabled: true,
          phone_required: true
        },
        shipping: regionDefaults.shipping,
        payments: regionDefaults.payments
      }
    }
  }

  private selectTemplate(vibe: string, variantId?: string): string {
    // If a specific variant is selected, use it as the template
    if (variantId) {
      const variant = getVariantById(variantId)
      if (variant) {
        return variantId
      }
    }
    // Fallback to default templates based on vibe
    const templates: Record<string, string> = {
      modern: 'modern-minimal',
      classic: 'classic-elegant',
      playful: 'vibrant-fun',
      minimal: 'ultra-minimal'
    }
    return templates[vibe] || 'modern-minimal'
  }

  private getLayoutConfig(vibe: string, variantId?: string): StoreBlueprint['theme']['layout'] {
    // Try to get layout from selected variant
    if (variantId) {
      const variant = getVariantById(variantId)
      if (variant) {
        return variant.layoutConfig
      }
    }
    // Fallback to default variant for the vibe
    const defaultVariant = getDefaultVariantForVibe(vibe as 'modern' | 'classic' | 'playful' | 'minimal')
    return defaultVariant.layoutConfig
  }

  validateBlueprint(blueprint: StoreBlueprint): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!blueprint.identity.business_name) {
      errors.push('Business name is required')
    }
    if (!blueprint.identity.slug) {
      errors.push('Store slug is required')
    }
    if (!blueprint.contact.email) {
      errors.push('Contact email is required')
    }
    if (!blueprint.contact.phone) {
      errors.push('Contact phone is required')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Generate AI-powered store content
   * Called during store creation to populate About Us, policies, homepage, FAQs
   */
  async generateStoreContent(data: StoreData): Promise<StoreContent | null> {
    try {
      const storeName = data.business_name
      const brandDescription = data.description
      const category = data.business_type || data.business_category?.[0] || 'General'
      const geography = data.target_geography || 'india'

      console.log(`[BlueprintGenerator] Generating AI content for ${storeName}`)

      const content = await vercelAI.generateAllStoreContent(
        storeName,
        brandDescription,
        category,
        geography
      )

      console.log(`[BlueprintGenerator] AI content generated successfully`)
      return content
    } catch (error) {
      console.error('[BlueprintGenerator] Failed to generate AI content:', error)
      return null
    }
  }

  /**
   * Generate blueprint with AI content
   * Returns both the blueprint and AI-generated content
   */
  async generateBlueprintWithContent(data: StoreData): Promise<{
    blueprint: StoreBlueprint
    content: StoreContent | null
  }> {
    const blueprint = this.generateBlueprint(data)
    const content = await this.generateStoreContent(data)

    return { blueprint, content }
  }
}

export const blueprintGenerator = new BlueprintGenerator()
