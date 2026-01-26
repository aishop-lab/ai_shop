// Zod Schemas for Vercel AI SDK structured output
// These schemas are used with generateObject for type-safe AI responses

import { z } from 'zod'

// ============================================
// ONBOARDING SCHEMAS
// ============================================

export const categoryAnalysisSchema = z.object({
  business_type: z.string().describe('Primary business type (Fashion, Food & Beverages, Electronics, etc.)'),
  business_category: z.array(z.string()).describe('List of relevant business categories'),
  niche: z.string().describe('Specific niche within the category'),
  keywords: z.array(z.string()).describe('SEO keywords for the business'),
  confidence: z.number().min(0).max(1).describe('Confidence score from 0 to 1'),
})

export const storeNameSuggestionSchema = z.object({
  name: z.string().describe('Suggested store name'),
  slug: z.string().describe('URL-friendly slug for the store'),
  reasoning: z.string().describe('Why this name works for the business'),
})

export const brandColorsSchema = z.object({
  primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/).describe('Primary brand color in hex format'),
  secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/).describe('Secondary brand color in hex format'),
  reasoning: z.string().describe('Why these colors work for the brand'),
})

export const onboardingAnalysisSchema = z.object({
  category: categoryAnalysisSchema,
  store_names: z.array(storeNameSuggestionSchema).length(3).describe('Three store name suggestions'),
  brand_colors: brandColorsSchema,
  tagline: z.string().max(60).describe('Catchy tagline for the store (max 60 characters)'),
  overall_confidence: z.number().min(0).max(1).describe('Overall confidence score'),
})

export type OnboardingAnalysis = z.infer<typeof onboardingAnalysisSchema>
export type CategoryAnalysis = z.infer<typeof categoryAnalysisSchema>
export type StoreNameSuggestion = z.infer<typeof storeNameSuggestionSchema>
export type BrandColors = z.infer<typeof brandColorsSchema>

// ============================================
// PRODUCT SCHEMAS
// ============================================

export const imageQualitySchema = z.object({
  score: z.number().min(1).max(10).describe('Image quality score from 1 to 10'),
  is_blurry: z.boolean().describe('Whether the image is blurry'),
  brightness: z.enum(['dark', 'normal', 'bright']).describe('Brightness level of the image'),
  has_complex_background: z.boolean().describe('Whether the image has a complex/cluttered background'),
  recommended_actions: z.array(z.enum(['enhance', 'remove_background', 'crop', 'none'])).describe('Recommended image improvements'),
})

export const productAnalysisSchema = z.object({
  title: z.string().describe('SEO-friendly product title (3-7 words)'),
  description: z.string().describe('Compelling product description (2-3 sentences)'),
  categories: z.array(z.string()).describe('Product categories'),
  tags: z.array(z.string()).describe('Search tags for the product'),
  attributes: z.record(z.string()).describe('Product attributes like color, material, style'),
  ocr_text: z.array(z.string()).describe('Text extracted from the image via OCR'),
  image_quality: imageQualitySchema,
  confidence: z.number().min(0).max(1).describe('Confidence score for the analysis'),
})

export type ProductAnalysis = z.infer<typeof productAnalysisSchema>
export type ImageQuality = z.infer<typeof imageQualitySchema>

// ============================================
// LOGO COLOR EXTRACTION
// ============================================

export const colorInfoSchema = z.object({
  hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).describe('Color in hex format'),
  name: z.string().describe('Name of the color'),
  percentage: z.number().min(0).max(100).describe('Percentage of this color in the logo'),
})

export const logoColorSchema = z.object({
  colors: z.array(colorInfoSchema).describe('Dominant colors in the logo'),
  suggested_primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/).describe('Suggested primary brand color'),
  suggested_secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/).describe('Suggested secondary brand color'),
  color_harmony: z.enum(['complementary', 'analogous', 'triadic', 'monochromatic']).describe('Color harmony type'),
})

export type LogoColor = z.infer<typeof logoColorSchema>
export type ColorInfo = z.infer<typeof colorInfoSchema>

// ============================================
// DESCRIPTION ENHANCEMENT
// ============================================

export const enhancedDescriptionSchema = z.object({
  enhanced_description: z.string().describe('Improved product description'),
  seo_keywords: z.array(z.string()).describe('SEO keywords for the description'),
  improvement_notes: z.string().describe('What was improved'),
})

export type EnhancedDescription = z.infer<typeof enhancedDescriptionSchema>

// ============================================
// TITLE GENERATION
// ============================================

export const generatedTitleSchema = z.object({
  title: z.string().describe('Primary suggested title'),
  alternative_titles: z.array(z.string()).describe('Alternative title suggestions'),
  target_keywords: z.array(z.string()).describe('Target SEO keywords'),
})

export type GeneratedTitle = z.infer<typeof generatedTitleSchema>

// ============================================
// STREAMING DESCRIPTION
// ============================================

export const streamingDescriptionSchema = z.object({
  description: z.string().describe('Generated product description'),
  highlights: z.array(z.string()).optional().describe('Key product highlights'),
  seo_optimized: z.boolean().optional().describe('Whether the description is SEO optimized'),
})

export type StreamingDescription = z.infer<typeof streamingDescriptionSchema>

// ============================================
// STORE CONTENT GENERATION SCHEMAS
// ============================================

// About Us page content
export const aboutUsSchema = z.object({
  headline: z.string().describe('Compelling headline for the about page (max 10 words)'),
  story: z.string().describe('Full brand story for About page ONLY (150-250 words)'),
  mission: z.string().describe('Mission statement (1-2 sentences, max 30 words)'),
  short_description: z.string().describe('Brief brand summary for footer/meta (max 30 words)'),
  medium_description: z.string().describe('Preview description for homepage about section (max 80 words)'),
  values: z.array(z.object({
    title: z.string().describe('Value name (2-3 words)'),
    description: z.string().describe('Value description (max 15 words)'),
    icon: z.enum(['leaf', 'heart', 'shield', 'truck', 'star', 'check', 'gift', 'clock', 'sparkles', 'award']).describe('Icon name'),
  })).min(3).max(5).describe('3-5 brand values with icons'),
  cta: z.object({
    text: z.string(),
    action: z.string(),
  }).describe('Call to action'),
})

export type AboutUsContent = z.infer<typeof aboutUsSchema>

// Store policies
export const policiesSchema = z.object({
  return_policy: z.string().describe('Return/exchange policy'),
  shipping_policy: z.string().describe('Shipping information'),
  privacy_policy: z.string().describe('Privacy policy summary'),
  terms_of_service: z.string().describe('Terms of service summary'),
})

export type PoliciesContent = z.infer<typeof policiesSchema>

// Homepage sections
export const homepageSectionsSchema = z.object({
  hero: z.object({
    headline: z.string().describe('Hero headline (max 8 words) - Welcome message or brand statement'),
    subheadline: z.string().describe('Hero subheadline (max 15 words) - Expands on headline'),
    cta_text: z.string().describe('CTA button text'),
  }),
  featured_categories: z.array(z.string()).min(3).max(5).describe('3-5 featured category names'),
  trust_badges: z.array(z.object({
    icon: z.enum(['check', 'truck', 'shield', 'clock', 'heart', 'star', 'gift', 'award']).describe('Icon name'),
    title: z.string().describe('Badge title (2-4 words)'),
  })).min(3).max(4).describe('3-4 trust badges for hero section'),
  value_propositions: z.array(z.object({
    icon: z.enum(['truck', 'shield', 'clock', 'heart', 'star', 'gift', 'award', 'leaf', 'check', 'sparkles']).describe('Icon name'),
    title: z.string().describe('Title (2-4 words)'),
    description: z.string().describe('Description (max 10 words)'),
  })).min(3).max(4).describe('3-4 value propositions'),
  social_proof: z.object({
    testimonials: z.array(z.object({
      quote: z.string(),
      author: z.string(),
      location: z.string().optional(),
    })).describe('2-3 placeholder testimonials'),
  }),
})

export type HomepageSections = z.infer<typeof homepageSectionsSchema>

// FAQ generation
export const faqSchema = z.object({
  faqs: z.array(z.object({
    question: z.string(),
    answer: z.string(),
    category: z.string().optional(),
  })).describe('10-15 common FAQs'),
})

export type FAQContent = z.infer<typeof faqSchema>

// Complete store content bundle
export const storeContentSchema = z.object({
  about_us: aboutUsSchema,
  policies: policiesSchema,
  homepage: homepageSectionsSchema,
  faqs: faqSchema,
})

export type StoreContent = z.infer<typeof storeContentSchema>

// ============================================
// ENHANCED PRODUCT ANALYSIS (WITH PRICE)
// ============================================

export const enhancedProductAnalysisSchema = z.object({
  title: z.string().describe('SEO-friendly product title (3-7 words)'),
  description: z.string().describe('Compelling product description (2-3 sentences)'),
  categories: z.array(z.string()).describe('Product categories'),
  tags: z.array(z.string()).describe('Search tags for the product'),
  attributes: z.record(z.string()).describe('Product attributes like color, material, style'),
  ocr_text: z.array(z.string()).describe('Text extracted from the image via OCR'),
  image_quality: imageQualitySchema,
  price_suggestion: z.object({
    min: z.number().describe('Minimum suggested price in INR'),
    max: z.number().describe('Maximum suggested price in INR'),
    recommended: z.number().describe('Recommended price in INR'),
    reasoning: z.string().describe('Why this price range'),
  }).describe('AI-suggested price range'),
  seo: z.object({
    meta_title: z.string().describe('SEO meta title (max 60 chars)'),
    meta_description: z.string().describe('SEO meta description (max 155 chars)'),
    alt_text: z.string().describe('Image alt text'),
    slug_suggestion: z.string().describe('URL-friendly slug'),
  }).describe('SEO optimization'),
  confidence: z.number().min(0).max(1).describe('Confidence score for the analysis'),
})

export type EnhancedProductAnalysis = z.infer<typeof enhancedProductAnalysisSchema>

// ============================================
// COLLECTION DESCRIPTION
// ============================================

export const collectionDescriptionSchema = z.object({
  title: z.string().describe('Collection title'),
  description: z.string().describe('Collection description (100-150 words)'),
  seo: z.object({
    meta_title: z.string(),
    meta_description: z.string(),
  }),
})

export type CollectionDescription = z.infer<typeof collectionDescriptionSchema>

// ============================================
// META DESCRIPTION GENERATION
// ============================================

export const metaDescriptionSchema = z.object({
  meta_title: z.string().max(60).describe('SEO meta title'),
  meta_description: z.string().max(155).describe('SEO meta description'),
  keywords: z.array(z.string()).describe('Target keywords'),
})

export type MetaDescription = z.infer<typeof metaDescriptionSchema>
