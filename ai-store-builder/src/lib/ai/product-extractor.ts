// AI Product Data Extraction Service - Using Google Gemini

import { GoogleGenerativeAI } from '@google/generative-ai'
import { z } from 'zod'

// Response schemas for validation
const extractionResultSchema = z.object({
  title: z.string(),
  category: z.array(z.string()),
  description: z.string(),
  attributes: z.record(z.string()).optional().default({}),
  tags: z.array(z.string()),
  confidence: z.number().min(0).max(1)
})

const descriptionResultSchema = z.object({
  description: z.string()
})

const titleResultSchema = z.object({
  title: z.string()
})

const attributesResultSchema = z.object({
  attributes: z.record(z.string())
})

// Types
export interface ProductExtractionResult {
  title: string
  description: string
  category: string[]
  tags: string[]
  attributes: Record<string, string>
  suggested_price_range?: { min: number; max: number }
  confidence: number
}

export interface AIProductSuggestions {
  ai_suggested_title: string
  ai_suggested_description: string
  ai_suggested_category: string[]
  ai_suggested_tags: string[]
  ai_suggested_attributes: Record<string, string>
  ocr_text?: string[]
  confidence: number
}

// Prompts
const EXTRACT_FROM_IMAGE_PROMPT = `
Analyze this product image and extract information for an e-commerce listing.

Extract:
1. Product title (concise, 3-7 words, SEO-friendly)
2. Product categories (main category and subcategory)
3. Detailed description (2-3 sentences highlighting features, quality, and appeal)
4. Key attributes (color, material, style, size category if visible)
5. Suggested tags (5-10 relevant search tags)
6. Confidence score (0-1, how confident you are in the extraction)

Return ONLY valid JSON in this exact format:
{
  "title": "Product name here",
  "category": ["Main Category", "Sub Category"],
  "description": "Detailed product description...",
  "attributes": {
    "color": "Blue",
    "material": "Cotton",
    "style": "Traditional"
  },
  "tags": ["tag1", "tag2", "tag3"],
  "confidence": 0.85
}

Focus on what you can clearly see. If uncertain about something, omit it rather than guess.
`

const GENERATE_DESCRIPTION_PROMPT = (title: string, category: string) => `
Generate a compelling e-commerce product description.

Product: ${title}
Category: ${category}

Requirements:
- Write 2-3 engaging sentences
- Highlight key features and benefits
- Mention quality/craftsmanship where appropriate
- Include relevant keywords naturally for SEO
- Sound professional but warm
- Focus on what makes this product desirable

Return ONLY valid JSON:
{
  "description": "Your description here"
}
`

const ENHANCE_DESCRIPTION_PROMPT = (userDescription: string) => `
Enhance this product description for e-commerce:

Original: "${userDescription}"

Requirements:
- Keep the core message intact
- Improve clarity and flow
- Add compelling language
- Ensure SEO-friendly keywords
- Maintain a professional tone
- Keep it to 2-4 sentences

Return ONLY valid JSON:
{
  "description": "Enhanced description here"
}
`

const SUGGEST_TITLE_PROMPT = (productInfo: string, category: string) => `
Suggest an SEO-friendly product title for e-commerce.

Product Info: ${productInfo}
Category: ${category}

Requirements:
- 3-7 words maximum
- Include key identifying features
- SEO-optimized (include searchable terms)
- Professional and appealing
- Avoid generic words like "Beautiful" or "Amazing"

Return ONLY valid JSON:
{
  "title": "Suggested product title"
}
`

const EXTRACT_ATTRIBUTES_PROMPT = (title: string) => `
Extract product attributes from this product image.

Product: ${title}

Extract visible attributes such as:
- Color (exact shade if visible)
- Material (fabric, metal, plastic, etc.)
- Style (modern, traditional, casual, formal, etc.)
- Pattern (solid, striped, printed, etc.)
- Size category (small, medium, large, one-size)
- Condition (new, used, if apparent)
- Any other visible features

Only include attributes you can clearly identify.

Return ONLY valid JSON:
{
  "attributes": {
    "color": "value",
    "material": "value",
    "style": "value"
  }
}
`

class ProductExtractor {
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
        console.error(`AI call attempt ${attempt + 1} failed:`, error)
        
        // Check if it's a rate limit error
        if ((error as Error).message?.includes('429')) {
          // Wait longer for rate limit errors
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 5000))
        } else {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
        }
      }
    }

    throw lastError || new Error('AI call failed after retries')
  }

  /**
   * Call AI with image
   */
  private async callAIWithImage(prompt: string, imageUrl: string, maxRetries = 3): Promise<string> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Fetch the image and convert to base64
        const imageResponse = await fetch(imageUrl)
        const imageBuffer = await imageResponse.arrayBuffer()
        const base64Image = Buffer.from(imageBuffer).toString('base64')
        const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg'

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
        console.error(`AI vision call attempt ${attempt + 1} failed:`, error)
        
        if ((error as Error).message?.includes('429')) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 5000))
        } else {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
        }
      }
    }

    throw lastError || new Error('AI vision call failed after retries')
  }

  /**
   * Parse JSON from AI response
   */
  private parseJSON<T>(text: string, schema: z.ZodSchema<T>): T {
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = text
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        jsonStr = jsonMatch[1]
      }
      
      // Try to find JSON object in the text
      const objectMatch = jsonStr.match(/\{[\s\S]*\}/)
      if (objectMatch) {
        jsonStr = objectMatch[0]
      }

      const parsed = JSON.parse(jsonStr)
      return schema.parse(parsed)
    } catch (error) {
      console.error('JSON parsing failed:', error, 'Raw text:', text)
      throw new Error('Failed to parse AI response')
    }
  }

  /**
   * Extract product info from image using vision
   */
  async extractFromImage(imageUrl: string): Promise<ProductExtractionResult> {
    try {
      const response = await this.callAIWithImage(EXTRACT_FROM_IMAGE_PROMPT, imageUrl)
      const parsed = this.parseJSON(response, extractionResultSchema)

      return {
        title: parsed.title,
        description: parsed.description,
        category: parsed.category,
        tags: parsed.tags,
        attributes: parsed.attributes || {},
        confidence: parsed.confidence
      }
    } catch (error) {
      console.error('Image extraction failed:', error)
      
      // Return default values on failure
      return {
        title: 'Untitled Product',
        description: 'Product description pending',
        category: ['General'],
        tags: [],
        attributes: {},
        confidence: 0
      }
    }
  }

  /**
   * Generate product description from title and category
   */
  async generateDescription(title: string, category: string): Promise<string> {
    try {
      const response = await this.callAI(GENERATE_DESCRIPTION_PROMPT(title, category))
      const parsed = this.parseJSON(response, descriptionResultSchema)
      return parsed.description
    } catch (error) {
      console.error('Description generation failed:', error)
      return `Introducing ${title}. A quality product in the ${category} category. Perfect for those who appreciate great value and style.`
    }
  }

  /**
   * Enhance user-provided description
   */
  async enhanceDescription(userDescription: string, imageUrl?: string): Promise<string> {
    try {
      const prompt = ENHANCE_DESCRIPTION_PROMPT(userDescription)
      
      let response: string
      if (imageUrl) {
        response = await this.callAIWithImage(prompt, imageUrl)
      } else {
        response = await this.callAI(prompt)
      }
      
      const parsed = this.parseJSON(response, descriptionResultSchema)
      return parsed.description
    } catch (error) {
      console.error('Description enhancement failed:', error)
      return userDescription // Return original on failure
    }
  }

  /**
   * Suggest SEO-friendly title
   */
  async suggestTitle(productInfo: string, category: string): Promise<string> {
    try {
      const response = await this.callAI(SUGGEST_TITLE_PROMPT(productInfo, category))
      const parsed = this.parseJSON(response, titleResultSchema)
      return parsed.title
    } catch (error) {
      console.error('Title suggestion failed:', error)
      return productInfo.slice(0, 100) // Use first 100 chars as fallback
    }
  }

  /**
   * Extract attributes from image and title
   */
  async extractAttributes(imageUrl: string, title: string): Promise<Record<string, string>> {
    try {
      const response = await this.callAIWithImage(EXTRACT_ATTRIBUTES_PROMPT(title), imageUrl)
      const parsed = this.parseJSON(response, attributesResultSchema)
      return parsed.attributes
    } catch (error) {
      console.error('Attribute extraction failed:', error)
      return {}
    }
  }

  /**
   * Get complete AI suggestions for a product
   */
  async getProductSuggestions(
    imageUrl?: string,
    userTitle?: string,
    userDescription?: string
  ): Promise<AIProductSuggestions> {
    let suggestions: AIProductSuggestions = {
      ai_suggested_title: userTitle || 'Untitled Product',
      ai_suggested_description: userDescription || 'Product description pending',
      ai_suggested_category: ['General'],
      ai_suggested_tags: [],
      ai_suggested_attributes: {},
      confidence: 0
    }

    try {
      // If we have an image, extract from it
      if (imageUrl) {
        const extraction = await this.extractFromImage(imageUrl)
        suggestions = {
          ai_suggested_title: userTitle || extraction.title,
          ai_suggested_description: userDescription || extraction.description,
          ai_suggested_category: extraction.category,
          ai_suggested_tags: extraction.tags,
          ai_suggested_attributes: extraction.attributes,
          confidence: extraction.confidence
        }

        // If user provided description but we have image, try to enhance
        if (userDescription && !userTitle) {
          const enhanced = await this.enhanceDescription(userDescription, imageUrl)
          suggestions.ai_suggested_description = enhanced
        }
      } else if (userTitle) {
        // No image but have title, generate description
        const description = await this.generateDescription(
          userTitle,
          suggestions.ai_suggested_category[0] || 'General'
        )
        suggestions.ai_suggested_description = userDescription || description
        suggestions.confidence = 0.5 // Lower confidence without image
      }
    } catch (error) {
      console.error('AI suggestions failed:', error)
      // Return whatever we have
    }

    return suggestions
  }
}

// Export singleton instance
export const productExtractor = new ProductExtractor()
