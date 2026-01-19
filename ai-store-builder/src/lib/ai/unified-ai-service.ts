// Unified AI Service - Batches AI requests to minimize API calls

import { GoogleGenerativeAI } from '@google/generative-ai'
import { z } from 'zod'
import { aiCache, sessionCache } from './ai-cache'
import {
  UNIFIED_ONBOARDING_PROMPT,
  UNIFIED_PRODUCT_PROMPT,
  LOGO_COLOR_EXTRACTION_PROMPT,
  ENHANCE_DESCRIPTION_PROMPT,
  GENERATE_TITLE_PROMPT,
  fillUnifiedPrompt,
  type UnifiedOnboardingResult,
  type UnifiedProductResult,
  type LogoColorResult,
  type EnhancedDescriptionResult,
  type GeneratedTitleResult
} from './prompts/unified-prompts'

// Zod schemas for validation
const unifiedOnboardingSchema = z.object({
  category: z.object({
    business_type: z.string(),
    business_category: z.array(z.string()),
    niche: z.string(),
    keywords: z.array(z.string()),
    confidence: z.number()
  }),
  store_names: z.array(z.object({
    name: z.string(),
    slug: z.string(),
    reasoning: z.string()
  })),
  brand_colors: z.object({
    primary: z.string(),
    secondary: z.string(),
    reasoning: z.string()
  }),
  tagline: z.string(),
  overall_confidence: z.number()
})

const unifiedProductSchema = z.object({
  title: z.string(),
  description: z.string(),
  categories: z.array(z.string()),
  tags: z.array(z.string()),
  attributes: z.record(z.string()).default({}),
  ocr_text: z.array(z.string()).default([]),
  image_quality: z.object({
    score: z.number(),
    is_blurry: z.boolean(),
    brightness: z.enum(['dark', 'normal', 'bright']),
    has_complex_background: z.boolean(),
    recommended_actions: z.array(z.enum(['enhance', 'remove_background', 'crop', 'none']))
  }),
  confidence: z.number()
})

const logoColorSchema = z.object({
  colors: z.array(z.object({
    hex: z.string(),
    name: z.string(),
    percentage: z.number()
  })),
  suggested_primary: z.string(),
  suggested_secondary: z.string(),
  color_harmony: z.enum(['complementary', 'analogous', 'triadic', 'monochromatic'])
})

const enhancedDescriptionSchema = z.object({
  enhanced_description: z.string(),
  seo_keywords: z.array(z.string()),
  improvement_notes: z.string()
})

const generatedTitleSchema = z.object({
  title: z.string(),
  alternative_titles: z.array(z.string()),
  target_keywords: z.array(z.string())
})

// Confidence threshold for auto-apply
const AUTO_APPLY_THRESHOLD = 0.80

class UnifiedAIService {
  private client: GoogleGenerativeAI
  private textModel: ReturnType<GoogleGenerativeAI['getGenerativeModel']>
  private visionModel: ReturnType<GoogleGenerativeAI['getGenerativeModel']>

  constructor() {
    this.client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
    this.textModel = this.client.getGenerativeModel({ model: 'gemini-2.0-flash' })
    this.visionModel = this.client.getGenerativeModel({ model: 'gemini-2.0-flash' })
  }

  /**
   * Call AI with retry logic
   */
  private async callAI(prompt: string, maxRetries = 3): Promise<string> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await this.textModel.generateContent(prompt)
        const response = result.response
        const text = response.text()

        if (text) {
          return text
        }
        throw new Error('Empty response from AI')
      } catch (error) {
        lastError = error as Error
        console.error(`[UnifiedAI] Text call attempt ${attempt + 1} failed:`, error)

        const waitTime = (error as Error).message?.includes('429')
          ? Math.pow(2, attempt) * 5000
          : Math.pow(2, attempt) * 1000
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }

    throw lastError || new Error('AI call failed after retries')
  }

  /**
   * Call AI with image
   */
  private async callAIWithImage(
    prompt: string,
    imageData: { buffer: Buffer; mimeType: string } | { url: string },
    maxRetries = 3
  ): Promise<string> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        let base64Image: string
        let mimeType: string

        if ('buffer' in imageData) {
          base64Image = imageData.buffer.toString('base64')
          mimeType = imageData.mimeType
        } else {
          const response = await fetch(imageData.url)
          const arrayBuffer = await response.arrayBuffer()
          base64Image = Buffer.from(arrayBuffer).toString('base64')
          mimeType = response.headers.get('content-type') || 'image/jpeg'
        }

        const result = await this.visionModel.generateContent([
          prompt,
          {
            inlineData: {
              mimeType,
              data: base64Image
            }
          }
        ])

        const response = result.response
        const text = response.text()

        if (text) {
          return text
        }
        throw new Error('Empty response from AI')
      } catch (error) {
        lastError = error as Error
        console.error(`[UnifiedAI] Vision call attempt ${attempt + 1} failed:`, error)

        const waitTime = (error as Error).message?.includes('429')
          ? Math.pow(2, attempt) * 5000
          : Math.pow(2, attempt) * 1000
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }

    throw lastError || new Error('AI vision call failed after retries')
  }

  /**
   * Parse JSON from AI response with validation
   */
  private parseJSON<T>(text: string, schema: z.ZodSchema<T>): T {
    try {
      let jsonStr = text.trim()

      // Extract from markdown code blocks
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim()
      }

      // Find JSON object
      const objectMatch = jsonStr.match(/\{[\s\S]*\}/)
      if (objectMatch) {
        jsonStr = objectMatch[0]
      }

      const parsed = JSON.parse(jsonStr)
      return schema.parse(parsed)
    } catch (error) {
      console.error('[UnifiedAI] JSON parsing failed:', error, 'Raw:', text.substring(0, 500))
      throw new Error('Failed to parse AI response')
    }
  }

  /**
   * SINGLE CALL for ALL onboarding AI needs
   * Replaces: extractCategory, suggestStoreNames, generateTagline, suggestBrandColors
   */
  async analyzeBusinessForOnboarding(
    description: string,
    businessName?: string,
    sessionId?: string
  ): Promise<UnifiedOnboardingResult> {
    const cacheKey = `onboarding:${description.substring(0, 100)}`

    // Check session cache first
    if (sessionId) {
      const cached = sessionCache.get<UnifiedOnboardingResult>(sessionId, 'onboarding_analysis')
      if (cached) {
        console.log('[UnifiedAI] Using session-cached onboarding analysis')
        return cached
      }
    }

    // Use content-based cache
    return aiCache.getOrFetch(
      cacheKey,
      async () => {
        const prompt = fillUnifiedPrompt(UNIFIED_ONBOARDING_PROMPT, {
          description,
          business_name: businessName || ''
        })

        const response = await this.callAI(prompt)
        const result = this.parseJSON(response, unifiedOnboardingSchema)

        // Cache in session if provided
        if (sessionId) {
          sessionCache.set(sessionId, 'onboarding_analysis', result)
        }

        return result
      },
      aiCache.generateContentHash(description)
    )
  }

  /**
   * SINGLE CALL for ALL product extraction needs
   * Replaces: extractFromImage, generateDescription, extractAttributes + adds OCR + quality
   */
  async analyzeProductImage(
    imageData: { buffer: Buffer; mimeType: string } | { url: string }
  ): Promise<UnifiedProductResult> {
    try {
      const response = await this.callAIWithImage(UNIFIED_PRODUCT_PROMPT, imageData)
      const parsed = this.parseJSON(response, unifiedProductSchema)
      // Ensure defaults are applied
      return {
        ...parsed,
        attributes: parsed.attributes || {},
        ocr_text: parsed.ocr_text || [],
      }
    } catch (error) {
      console.error('[UnifiedAI] Product analysis failed:', error)

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
          recommended_actions: ['none']
        },
        confidence: 0
      }
    }
  }

  /**
   * Extract colors from logo image
   */
  async extractLogoColors(
    imageData: { buffer: Buffer; mimeType: string } | { url: string }
  ): Promise<LogoColorResult> {
    try {
      const response = await this.callAIWithImage(LOGO_COLOR_EXTRACTION_PROMPT, imageData)
      return this.parseJSON(response, logoColorSchema)
    } catch (error) {
      console.error('[UnifiedAI] Logo color extraction failed:', error)

      return {
        colors: [
          { hex: '#6366F1', name: 'Indigo', percentage: 50 },
          { hex: '#8B5CF6', name: 'Purple', percentage: 30 },
          { hex: '#FFFFFF', name: 'White', percentage: 20 }
        ],
        suggested_primary: '#6366F1',
        suggested_secondary: '#8B5CF6',
        color_harmony: 'analogous'
      }
    }
  }

  /**
   * Enhance product description
   */
  async enhanceDescription(
    description: string,
    title: string,
    category: string
  ): Promise<EnhancedDescriptionResult> {
    try {
      const prompt = fillUnifiedPrompt(ENHANCE_DESCRIPTION_PROMPT, {
        description,
        title,
        category
      })
      const response = await this.callAI(prompt)
      return this.parseJSON(response, enhancedDescriptionSchema)
    } catch (error) {
      console.error('[UnifiedAI] Description enhancement failed:', error)

      return {
        enhanced_description: description,
        seo_keywords: [],
        improvement_notes: 'Enhancement failed, original returned'
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
  ): Promise<GeneratedTitleResult> {
    try {
      const prompt = fillUnifiedPrompt(GENERATE_TITLE_PROMPT, {
        product_info: productInfo,
        category,
        attributes: JSON.stringify(attributes)
      })
      const response = await this.callAI(prompt)
      return this.parseJSON(response, generatedTitleSchema)
    } catch (error) {
      console.error('[UnifiedAI] Title generation failed:', error)

      return {
        title: productInfo.slice(0, 100),
        alternative_titles: [],
        target_keywords: []
      }
    }
  }

  /**
   * Check if result should be auto-applied based on confidence
   */
  shouldAutoApply(confidence: number): boolean {
    return confidence >= AUTO_APPLY_THRESHOLD
  }

  /**
   * Get cached onboarding analysis from session
   */
  getCachedOnboardingAnalysis(sessionId: string): UnifiedOnboardingResult | undefined {
    return sessionCache.get<UnifiedOnboardingResult>(sessionId, 'onboarding_analysis')
  }

  /**
   * Clear session cache
   */
  clearSession(sessionId: string): void {
    sessionCache.deleteSession(sessionId)
  }
}

// Export singleton instance
export const unifiedAI = new UnifiedAIService()

// Export class for testing
export { UnifiedAIService }

// Export threshold for external use
export { AUTO_APPLY_THRESHOLD }

// Re-export types
export type {
  UnifiedOnboardingResult,
  UnifiedProductResult,
  LogoColorResult,
  EnhancedDescriptionResult,
  GeneratedTitleResult
}
