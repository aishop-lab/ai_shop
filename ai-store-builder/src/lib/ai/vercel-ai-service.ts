// Vercel AI SDK Service
// Modern AI service using Vercel AI SDK with structured output and streaming
// Supports both Anthropic Claude and Google Gemini providers

import { generateObject, streamText } from 'ai'
import { getTextModel, getVisionModel, getFastModel, CONFIDENCE_THRESHOLDS, AI_PROVIDER } from './provider'
import { aiCache, sessionCache } from './ai-cache'
import {
  onboardingAnalysisSchema,
  productAnalysisSchema,
  logoColorSchema,
  enhancedDescriptionSchema,
  generatedTitleSchema,
  aboutUsSchema,
  policiesSchema,
  homepageSectionsSchema,
  faqSchema,
  storeContentSchema,
  enhancedProductAnalysisSchema,
  collectionDescriptionSchema,
  metaDescriptionSchema,
  type OnboardingAnalysis,
  type ProductAnalysis,
  type LogoColor,
  type EnhancedDescription,
  type GeneratedTitle,
  type AboutUsContent,
  type PoliciesContent,
  type HomepageSections,
  type FAQContent,
  type StoreContent,
  type EnhancedProductAnalysis,
  type CollectionDescription,
  type MetaDescription,
} from './schemas'

// Re-export confidence thresholds
export const AUTO_APPLY_THRESHOLD = CONFIDENCE_THRESHOLDS.AUTO_CONFIRM

// ============================================
// SYSTEM PROMPTS
// ============================================

const ONBOARDING_SYSTEM_PROMPT = `You are an expert e-commerce business analyst and brand strategist.
Analyze business descriptions and provide comprehensive brand analysis including category, store name suggestions, brand colors, and taglines.
Focus on the Indian market context. Generate creative, memorable names that work well as domains.
For colors, consider industry standards and color psychology.
Be decisive - provide clear recommendations with high confidence when the description is clear.`

const PRODUCT_ANALYSIS_SYSTEM_PROMPT = `You are an expert e-commerce product analyst with OCR capabilities.
Analyze product images comprehensively, extracting title, description, categories, tags, attributes, and visible text.
Generate SEO-friendly titles (3-7 words) and compelling descriptions (2-3 sentences).
Assess image quality and recommend improvements when needed.
For price suggestions, consider the Indian market and factor in quality, materials, and craftsmanship visible in the image.`

const STORE_CONTENT_SYSTEM_PROMPT = `You are an expert e-commerce copywriter specializing in Indian brands.
Create compelling, authentic content that resonates with Indian customers.
Use warm, professional language that builds trust and highlights craftsmanship.
Ensure all content is SEO-optimized and culturally appropriate.`

const DESCRIPTION_GENERATION_PROMPT = `You are a professional e-commerce copywriter.
Write compelling, SEO-optimized product descriptions that:
- Highlight key benefits and features
- Use persuasive language without being pushy
- Include relevant keywords naturally
- Appeal to the target audience
- Are 2-4 sentences long`

/**
 * Vercel AI SDK Service Class
 * Uses generateObject for structured output and streamText for streaming
 */
class VercelAIService {
  private logProvider(method: string) {
    console.log(`[VercelAI] ${method} using ${AI_PROVIDER}`)
  }

  // ============================================
  // ONBOARDING & BRAND ANALYSIS
  // ============================================

  /**
   * Analyze business for onboarding - returns category, store names, colors, tagline
   * Uses generateObject for type-safe structured output
   */
  async analyzeBusinessForOnboarding(
    description: string,
    businessName?: string,
    sessionId?: string
  ): Promise<OnboardingAnalysis> {
    const cacheKey = `onboarding:${description.substring(0, 100)}`
    this.logProvider('analyzeBusinessForOnboarding')

    // Check session cache first
    if (sessionId) {
      const cached = sessionCache.get<OnboardingAnalysis>(sessionId, 'onboarding_analysis')
      if (cached) {
        console.log('[VercelAI] Using session-cached onboarding analysis')
        return cached
      }
    }

    // Use content-based cache
    return aiCache.getOrFetch(
      cacheKey,
      async () => {
        const { object } = await generateObject({
          model: getTextModel(),
          schema: onboardingAnalysisSchema,
          system: ONBOARDING_SYSTEM_PROMPT,
          prompt: `Analyze this business and provide a complete brand strategy:

Business Description: ${description}
${businessName ? `Business Name (if provided): ${businessName}` : ''}

Provide:
1. Category analysis with business type, categories, niche, and keywords
2. Three creative store name suggestions with slugs and reasoning
3. Brand colors (primary and secondary hex codes) with reasoning
4. A catchy tagline (max 60 characters)

Focus on the Indian market context. Be confident in your analysis.
If the description clearly indicates a category, set confidence above 0.85.`,
        })

        // Cache in session if provided
        if (sessionId) {
          sessionCache.set(sessionId, 'onboarding_analysis', object)
        }

        console.log(`[VercelAI] Onboarding analysis complete. Confidence: ${object.overall_confidence}`)
        return object
      },
      aiCache.generateContentHash(description)
    )
  }

  // ============================================
  // PRODUCT ANALYSIS
  // ============================================

  /**
   * Analyze product image - returns title, description, categories, tags, attributes, OCR, quality
   * Uses generateObject with vision model for structured output
   */
  async analyzeProductImage(
    imageData: { buffer: Buffer; mimeType: string } | { url: string }
  ): Promise<ProductAnalysis> {
    this.logProvider('analyzeProductImage')
    
    try {
      // Prepare image for the API
      let imageContent: { type: 'image'; image: URL } | { type: 'image'; image: string; mimeType: string }

      if ('url' in imageData) {
        imageContent = { type: 'image', image: new URL(imageData.url) }
      } else {
        const base64 = imageData.buffer.toString('base64')
        imageContent = {
          type: 'image',
          image: base64,
          mimeType: imageData.mimeType
        }
      }

      const { object } = await generateObject({
        model: getVisionModel(),
        schema: productAnalysisSchema,
        system: PRODUCT_ANALYSIS_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              imageContent,
              {
                type: 'text',
                text: `Analyze this product image and extract:
1. Product title (SEO-friendly, 3-7 words)
2. Description (2-3 compelling sentences)
3. Categories and tags
4. Visible attributes (color, material, style, pattern, etc.)
5. Any text visible in the image (OCR)
6. Image quality assessment

Focus on what you can clearly see. If uncertain, omit rather than guess.`,
              },
            ],
          },
        ],
      })

      console.log(`[VercelAI] Product analysis complete. Confidence: ${object.confidence}`)
      return object
    } catch (error) {
      console.error('[VercelAI] Product analysis failed:', error)

      // Return default values on failure
      return {
        title: 'Untitled Product',
        description: 'Product description pending',
        categories: ['General'],
        tags: [],
        attributes: {},
        ocr_text: [],
        image_quality: {
          score: 5,
          is_blurry: false,
          brightness: 'normal',
          has_complex_background: false,
          recommended_actions: ['none'],
        },
        confidence: 0,
      }
    }
  }

  /**
   * Enhanced product analysis with price suggestion and SEO
   */
  async analyzeProductImageEnhanced(
    imageData: { buffer: Buffer; mimeType: string } | { url: string },
    storeContext?: { store_name: string; category: string; brand_description?: string }
  ): Promise<EnhancedProductAnalysis> {
    this.logProvider('analyzeProductImageEnhanced')
    
    try {
      let imageContent: { type: 'image'; image: URL } | { type: 'image'; image: string; mimeType: string }

      if ('url' in imageData) {
        imageContent = { type: 'image', image: new URL(imageData.url) }
      } else {
        const base64 = imageData.buffer.toString('base64')
        imageContent = {
          type: 'image',
          image: base64,
          mimeType: imageData.mimeType
        }
      }

      const contextPrompt = storeContext
        ? `\n\nStore Context:
- Store Name: ${storeContext.store_name}
- Category: ${storeContext.category}
${storeContext.brand_description ? `- Brand: ${storeContext.brand_description}` : ''}`
        : ''

      const { object } = await generateObject({
        model: getVisionModel(),
        schema: enhancedProductAnalysisSchema,
        system: PRODUCT_ANALYSIS_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              imageContent,
              {
                type: 'text',
                text: `Analyze this product image for an e-commerce store.${contextPrompt}

Extract:
1. Product title (SEO-friendly, 3-7 words)
2. Detailed description (150-200 words, highlight features)
3. Category and subcategory
4. Color (primary color)
5. Material (if visible, otherwise null)
6. Occasion/use case (array)
7. Price suggestion in INR (based on visible quality, materials, craftsmanship)
8. Tags for search (5-10 relevant tags)
9. SEO metadata (meta title, meta description, alt text, slug)
10. Confidence score (0.0-1.0)

For price suggestions, consider:
- Indian market pricing
- Visible quality and craftsmanship
- Material and embellishments
- Similar products in the category

Be specific and detailed.`,
              },
            ],
          },
        ],
      })

      console.log(`[VercelAI] Enhanced product analysis complete. Confidence: ${object.confidence}`)
      return object
    } catch (error) {
      console.error('[VercelAI] Enhanced product analysis failed:', error)

      return {
        title: 'Untitled Product',
        description: 'Product description pending',
        categories: ['General'],
        tags: [],
        attributes: {},
        ocr_text: [],
        image_quality: {
          score: 5,
          is_blurry: false,
          brightness: 'normal',
          has_complex_background: false,
          recommended_actions: ['none'],
        },
        price_suggestion: {
          min: 0,
          max: 0,
          recommended: 0,
          reasoning: 'Unable to analyze price',
        },
        seo: {
          meta_title: 'Product',
          meta_description: 'Product description',
          alt_text: 'Product image',
          slug_suggestion: 'product',
        },
        confidence: 0,
      }
    }
  }

  // ============================================
  // LOGO & COLOR EXTRACTION
  // ============================================

  /**
   * Extract colors from logo image
   */
  async extractLogoColors(
    imageData: { buffer: Buffer; mimeType: string } | { url: string }
  ): Promise<LogoColor> {
    this.logProvider('extractLogoColors')
    
    try {
      let imageContent: { type: 'image'; image: URL } | { type: 'image'; image: string; mimeType: string }

      if ('url' in imageData) {
        imageContent = { type: 'image', image: new URL(imageData.url) }
      } else {
        const base64 = imageData.buffer.toString('base64')
        imageContent = {
          type: 'image',
          image: base64,
          mimeType: imageData.mimeType
        }
      }

      const { object } = await generateObject({
        model: getVisionModel(),
        schema: logoColorSchema,
        messages: [
          {
            role: 'user',
            content: [
              imageContent,
              {
                type: 'text',
                text: `Analyze this logo image and extract:
1. The dominant colors with their hex codes and percentages
2. A suggested primary brand color
3. A suggested secondary brand color
4. The color harmony type (complementary, analogous, triadic, or monochromatic)`,
              },
            ],
          },
        ],
      })

      return object
    } catch (error) {
      console.error('[VercelAI] Logo color extraction failed:', error)

      return {
        colors: [
          { hex: '#6366F1', name: 'Indigo', percentage: 50 },
          { hex: '#8B5CF6', name: 'Purple', percentage: 30 },
          { hex: '#FFFFFF', name: 'White', percentage: 20 },
        ],
        suggested_primary: '#6366F1',
        suggested_secondary: '#8B5CF6',
        color_harmony: 'analogous',
      }
    }
  }

  // ============================================
  // STORE CONTENT GENERATION
  // ============================================

  /**
   * Generate About Us page content
   */
  async generateAboutUs(
    storeName: string,
    brandDescription: string,
    category: string,
    brandVoice: 'warm' | 'professional' | 'playful' = 'warm'
  ): Promise<AboutUsContent> {
    this.logProvider('generateAboutUs')
    
    try {
      const { object } = await generateObject({
        model: getTextModel(),
        schema: aboutUsSchema,
        system: STORE_CONTENT_SYSTEM_PROMPT,
        prompt: `Write a compelling "About Us" page for ${storeName}.

Brand Description: ${brandDescription}
Category: ${category}
Tone: ${brandVoice}, authentic, professional

Requirements:
- Headline: Catchy, memorable (max 10 words)
- Story: 150-200 words about the brand journey, craftsmanship, and values
- Mission: 1-2 sentences about what the brand stands for
- Values: 3-5 brand values with brief descriptions
- CTA: Encourage visitors to explore or shop

Make it personal, authentic, and relatable to Indian customers.`,
      })

      return object
    } catch (error) {
      console.error('[VercelAI] About Us generation failed:', error)

      return {
        headline: `Welcome to ${storeName}`,
        story: `At ${storeName}, we are passionate about bringing you the finest ${category.toLowerCase()} products. Our journey began with a simple vision - to create something special that combines quality craftsmanship with modern design. Every product in our collection is carefully selected to ensure it meets our high standards.`,
        mission: `Our mission is to provide high-quality products that bring joy to our customers while supporting traditional craftsmanship.`,
        values: [
          { title: 'Quality', description: 'We never compromise on quality' },
          { title: 'Authenticity', description: 'Every product tells a story' },
          { title: 'Customer First', description: 'Your satisfaction is our priority' },
        ],
        cta: { text: 'Explore Our Collection', action: '/products' },
      }
    }
  }

  /**
   * Generate store policies
   */
  async generatePolicies(
    storeName: string,
    category: string,
    geography: 'india' | 'local' | 'international' = 'india'
  ): Promise<PoliciesContent> {
    this.logProvider('generatePolicies')
    
    try {
      const shippingContext = geography === 'international'
        ? 'International shipping, worldwide delivery'
        : 'Domestic shipping within India'

      const { object } = await generateObject({
        model: getFastModel(), // Use faster model for simpler content
        schema: policiesSchema,
        system: STORE_CONTENT_SYSTEM_PROMPT,
        prompt: `Generate standard e-commerce policies for ${storeName} (${category}).

Context:
- Market: ${geography === 'international' ? 'Global' : 'India'}
- Shipping: ${shippingContext}

Generate:
1. Return Policy (7 days, conditions for returns)
2. Shipping Policy (delivery times, free shipping threshold, tracking)
3. Privacy Policy (brief, data collection and protection)
4. Terms of Service (brief, key terms)

Keep each policy concise (150-200 words) and customer-friendly.
Use clear, simple language.`,
      })

      return object
    } catch (error) {
      console.error('[VercelAI] Policies generation failed:', error)

      return {
        return_policy: 'We accept returns within 7 days of delivery. Items must be unused with original tags attached. Refunds are processed within 5-7 business days.',
        shipping_policy: 'Free shipping on orders above ₹999. Standard delivery takes 3-5 business days. Tracking information will be shared via email/SMS.',
        privacy_policy: 'We collect only essential information to process your orders. Your data is secure and never shared with third parties without consent.',
        terms_of_service: 'By using our website, you agree to our policies. Prices and availability are subject to change. All sales are subject to our return policy.',
      }
    }
  }

  /**
   * Generate homepage sections
   */
  async generateHomepageSections(
    storeName: string,
    brandDescription: string,
    category: string
  ): Promise<HomepageSections> {
    this.logProvider('generateHomepageSections')
    
    try {
      const { object } = await generateObject({
        model: getTextModel(),
        schema: homepageSectionsSchema,
        system: STORE_CONTENT_SYSTEM_PROMPT,
        prompt: `Create homepage content for ${storeName}.

Brand: ${brandDescription}
Category: ${category}

Generate:
1. Hero section with compelling headline and subheadline
2. 3-4 featured category names that make sense for this brand
3. 3-4 value propositions (use icons: truck, shield, clock, heart, gift, star)
4. 2-3 placeholder testimonials that sound authentic

Make the content compelling and action-oriented.
Headlines should be punchy and memorable.`,
      })

      return object
    } catch (error) {
      console.error('[VercelAI] Homepage sections generation failed:', error)

      return {
        hero: {
          headline: `Discover ${storeName}`,
          subheadline: `Premium ${category.toLowerCase()} crafted with care`,
          cta_text: 'Shop Now',
        },
        featured_categories: ['New Arrivals', 'Best Sellers', 'Collections'],
        value_propositions: [
          { icon: 'truck', title: 'Free Shipping', description: 'On orders above ₹999' },
          { icon: 'shield', title: 'Secure Payments', description: '100% secure checkout' },
          { icon: 'clock', title: 'Fast Delivery', description: '3-5 business days' },
        ],
        social_proof: {
          testimonials: [
            { quote: 'Amazing quality and fast delivery!', author: 'Priya S.', location: 'Mumbai' },
            { quote: 'Love the craftsmanship. Will order again!', author: 'Rahul M.', location: 'Delhi' },
          ],
        },
      }
    }
  }

  /**
   * Generate FAQs
   */
  async generateFAQs(
    storeName: string,
    category: string,
    productTypes?: string[]
  ): Promise<FAQContent> {
    this.logProvider('generateFAQs')
    
    try {
      const { object } = await generateObject({
        model: getTextModel(),
        schema: faqSchema,
        system: STORE_CONTENT_SYSTEM_PROMPT,
        prompt: `Generate 10-15 common FAQs for ${storeName} (${category}).

${productTypes ? `Product Types: ${productTypes.join(', ')}` : ''}

Include FAQs about:
- Ordering process
- Shipping and delivery
- Returns and exchanges
- Payment methods
- Product care (if applicable)
- Size/fit guides (if applicable)
- Custom orders (if applicable)
- Contact and support

Make answers concise but helpful. Use a friendly tone.`,
      })

      return object
    } catch (error) {
      console.error('[VercelAI] FAQs generation failed:', error)

      return {
        faqs: [
          { question: 'How do I place an order?', answer: 'Simply browse our products, add items to cart, and proceed to checkout.', category: 'Orders' },
          { question: 'What payment methods do you accept?', answer: 'We accept UPI, credit/debit cards, net banking, and COD.', category: 'Payments' },
          { question: 'How long does delivery take?', answer: 'Standard delivery takes 3-5 business days within India.', category: 'Shipping' },
          { question: 'What is your return policy?', answer: 'We accept returns within 7 days of delivery for unused items.', category: 'Returns' },
          { question: 'How can I track my order?', answer: 'Once shipped, you will receive a tracking link via email and SMS.', category: 'Shipping' },
        ],
      }
    }
  }

  /**
   * Generate all store content in a single call (more efficient)
   */
  async generateAllStoreContent(
    storeName: string,
    brandDescription: string,
    category: string,
    geography: 'india' | 'local' | 'international' = 'india'
  ): Promise<StoreContent> {
    this.logProvider('generateAllStoreContent')
    
    try {
      const { object } = await generateObject({
        model: getTextModel(),
        schema: storeContentSchema,
        system: STORE_CONTENT_SYSTEM_PROMPT,
        prompt: `Generate complete store content for ${storeName}.

Brand Description: ${brandDescription}
Category: ${category}
Market: ${geography === 'international' ? 'Global' : 'India'}

Generate all of the following in one response:
1. About Us page (headline, story, mission, values, CTA)
2. Store Policies (return, shipping, privacy, terms)
3. Homepage Sections (hero, categories, value props, testimonials)
4. FAQs (10-15 common questions)

Make all content cohesive, authentic, and optimized for the Indian market.
Use a warm, professional tone throughout.`,
      })

      return object
    } catch (error) {
      console.error('[VercelAI] Complete store content generation failed:', error)

      // Generate fallback content in parallel
      const [aboutUs, policies, homepage, faqs] = await Promise.all([
        this.generateAboutUs(storeName, brandDescription, category),
        this.generatePolicies(storeName, category, geography),
        this.generateHomepageSections(storeName, brandDescription, category),
        this.generateFAQs(storeName, category),
      ])

      return { about_us: aboutUs, policies, homepage, faqs }
    }
  }

  // ============================================
  // DESCRIPTION & TITLE GENERATION
  // ============================================

  /**
   * Enhance product description
   */
  async enhanceDescription(
    description: string,
    title: string,
    category: string
  ): Promise<EnhancedDescription> {
    this.logProvider('enhanceDescription')
    
    try {
      const { object } = await generateObject({
        model: getFastModel(),
        schema: enhancedDescriptionSchema,
        prompt: `Enhance this product description for e-commerce:

Original Description: "${description}"
Product Title: "${title}"
Category: "${category}"

Requirements:
- Keep the core message intact
- Improve clarity, flow, and persuasiveness
- Add compelling, benefit-focused language
- Ensure SEO-friendly keywords are naturally integrated
- Maintain a professional but warm tone
- 2-4 sentences maximum`,
      })

      return object
    } catch (error) {
      console.error('[VercelAI] Description enhancement failed:', error)

      return {
        enhanced_description: description,
        seo_keywords: [],
        improvement_notes: 'Enhancement failed, original returned',
      }
    }
  }

  /**
   * Generate SEO-optimized product title
   */
  async generateProductTitle(
    productInfo: string,
    category: string,
    attributes: Record<string, string>
  ): Promise<GeneratedTitle> {
    this.logProvider('generateProductTitle')
    
    try {
      const { object } = await generateObject({
        model: getFastModel(),
        schema: generatedTitleSchema,
        prompt: `Generate an SEO-optimized product title:

Product Info: ${productInfo}
Category: ${category}
Extracted Attributes: ${JSON.stringify(attributes)}

Requirements:
- 3-7 words maximum
- Include key identifying features (color, material, type)
- SEO-optimized with searchable terms
- Professional and appealing
- Avoid generic words like "Beautiful", "Amazing", "Best"`,
      })

      return object
    } catch (error) {
      console.error('[VercelAI] Title generation failed:', error)

      return {
        title: productInfo.slice(0, 100),
        alternative_titles: [],
        target_keywords: [],
      }
    }
  }

  /**
   * Generate collection description
   */
  async generateCollectionDescription(
    collectionName: string,
    storeName: string,
    productTitles: string[],
    brandVoice: string = 'warm'
  ): Promise<CollectionDescription> {
    this.logProvider('generateCollectionDescription')
    
    try {
      const { object } = await generateObject({
        model: getFastModel(),
        schema: collectionDescriptionSchema,
        system: STORE_CONTENT_SYSTEM_PROMPT,
        prompt: `Write a collection description for "${collectionName}" at ${storeName}.

Products in collection: ${productTitles.join(', ')}
Tone: ${brandVoice}

Requirements:
- 100-150 words
- Highlight what makes this collection special
- Include SEO metadata`,
      })

      return object
    } catch (error) {
      console.error('[VercelAI] Collection description failed:', error)

      return {
        title: collectionName,
        description: `Explore our ${collectionName} collection, featuring carefully curated products.`,
        seo: {
          meta_title: `${collectionName} - ${storeName}`,
          meta_description: `Shop ${collectionName} at ${storeName}. Discover our curated collection.`,
        },
      }
    }
  }

  /**
   * Generate meta description for any page
   */
  async generateMetaDescription(
    pageTitle: string,
    pageContent: string,
    keywords: string[]
  ): Promise<MetaDescription> {
    this.logProvider('generateMetaDescription')
    
    try {
      const { object } = await generateObject({
        model: getFastModel(),
        schema: metaDescriptionSchema,
        prompt: `Create SEO meta tags for a page.

Page Title: "${pageTitle}"
Content Preview: ${pageContent.substring(0, 500)}
Target Keywords: ${keywords.join(', ')}

Requirements:
- Meta title: max 60 characters, include primary keyword
- Meta description: max 155 characters, compelling and action-oriented
- Extract relevant keywords`,
      })

      return object
    } catch (error) {
      console.error('[VercelAI] Meta description failed:', error)

      return {
        meta_title: pageTitle.substring(0, 60),
        meta_description: pageContent.substring(0, 155),
        keywords: keywords,
      }
    }
  }

  // ============================================
  // STREAMING
  // ============================================

  /**
   * Stream product description generation
   * Returns a streamable response for real-time text generation
   */
  async streamProductDescription(
    title: string,
    category: string,
    attributes?: Record<string, string>
  ) {
    this.logProvider('streamProductDescription')
    
    const result = await streamText({
      model: getTextModel(),
      system: DESCRIPTION_GENERATION_PROMPT,
      prompt: `Write a compelling product description for:

Product Title: ${title}
Category: ${category}
${attributes ? `Attributes: ${JSON.stringify(attributes)}` : ''}

Requirements:
- Highlight key benefits and features
- Use persuasive but not pushy language
- Include relevant SEO keywords naturally
- Appeal to the target audience
- 2-4 sentences, no more than 150 words
- Do not use markdown formatting
- Write in a warm, engaging tone`,
    })

    return result
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Check if result should be auto-applied based on confidence
   */
  shouldAutoApply(confidence: number): boolean {
    return confidence >= CONFIDENCE_THRESHOLDS.AUTO_CONFIRM
  }

  /**
   * Check if result should be auto-applied but flagged for review
   */
  shouldAutoApplyWithReview(confidence: number): boolean {
    return confidence >= CONFIDENCE_THRESHOLDS.AUTO_CONFIRM_REVIEW && confidence < CONFIDENCE_THRESHOLDS.AUTO_CONFIRM
  }

  /**
   * Check if result requires user confirmation
   */
  requiresConfirmation(confidence: number): boolean {
    return confidence < CONFIDENCE_THRESHOLDS.AUTO_CONFIRM_REVIEW
  }

  /**
   * Get cached onboarding analysis from session
   */
  getCachedOnboardingAnalysis(sessionId: string): OnboardingAnalysis | undefined {
    return sessionCache.get<OnboardingAnalysis>(sessionId, 'onboarding_analysis')
  }

  /**
   * Clear session cache
   */
  clearSession(sessionId: string): void {
    sessionCache.deleteSession(sessionId)
  }
}

// Export singleton instance
export const vercelAI = new VercelAIService()

// Export class for testing
export { VercelAIService }

// Re-export types
export type {
  OnboardingAnalysis,
  ProductAnalysis,
  LogoColor,
  EnhancedDescription,
  GeneratedTitle,
  AboutUsContent,
  PoliciesContent,
  HomepageSections,
  FAQContent,
  StoreContent,
  EnhancedProductAnalysis,
  CollectionDescription,
  MetaDescription,
}
