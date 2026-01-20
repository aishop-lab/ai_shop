// Logo Generation Service using Google Gemini 2.0 Flash
// Generates minimalist, professional logos based on business information

import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// The model that supports image generation
const IMAGE_MODEL = 'gemini-2.0-flash-exp'

export interface LogoGenerationParams {
  business_name: string
  business_category?: string
  description?: string
  style_preference?: 'modern' | 'classic' | 'playful' | 'minimal'
  feedback?: string // User feedback for regeneration
}

export interface GeneratedLogo {
  imageData: Buffer
  mimeType: string
  prompt_used: string
}

/**
 * Generate a professional logo using Gemini 2.0 Flash image generation
 */
export async function generateLogo(params: LogoGenerationParams): Promise<GeneratedLogo> {
  const { business_name, business_category, description, style_preference = 'modern', feedback } = params

  // Build a detailed prompt for logo generation
  const styleGuide = getStyleGuide(style_preference)

  const prompt = buildLogoPrompt({
    business_name,
    business_category,
    description,
    styleGuide,
    feedback
  })

  console.log('[Logo Generator] Generating logo with prompt:', prompt.substring(0, 200) + '...')

  try {
    const model = genAI.getGenerativeModel({
      model: IMAGE_MODEL,
      generationConfig: {
        // Request image generation
        responseModalities: ['IMAGE', 'TEXT'] as unknown as undefined,
      } as Record<string, unknown>
    })

    const result = await model.generateContent(prompt)
    const response = result.response

    // Extract the image from the response
    const parts = response.candidates?.[0]?.content?.parts || []

    for (const part of parts) {
      // Check if this part contains inline data (image)
      if ('inlineData' in part && part.inlineData) {
        const { data, mimeType } = part.inlineData
        const imageBuffer = Buffer.from(data, 'base64')

        console.log('[Logo Generator] Logo generated successfully, size:', imageBuffer.length)

        return {
          imageData: imageBuffer,
          mimeType: mimeType || 'image/png',
          prompt_used: prompt
        }
      }
    }

    // If no image was generated, throw an error
    throw new Error('No image generated in response')
  } catch (error) {
    console.error('[Logo Generator] Generation failed:', error)
    throw error
  }
}

/**
 * Get style-specific guidelines for logo generation
 */
function getStyleGuide(style: 'modern' | 'classic' | 'playful' | 'minimal'): string {
  const guides: Record<typeof style, string> = {
    modern: 'Clean lines, geometric shapes, bold colors, sans-serif typography if any text. Contemporary and professional.',
    classic: 'Elegant, timeless design, subtle gradients or shadows, sophisticated color palette, serif elements if any text.',
    playful: 'Rounded shapes, vibrant colors, friendly and approachable, creative and unique elements.',
    minimal: 'Ultra-clean, simple geometric shapes, monochromatic or limited color palette, maximum whitespace.'
  }
  return guides[style]
}

/**
 * Build a detailed prompt for logo generation
 */
function buildLogoPrompt(params: {
  business_name: string
  business_category?: string
  description?: string
  styleGuide: string
  feedback?: string
}): string {
  const { business_name, business_category, description, styleGuide, feedback } = params

  let context = `Business Name: ${business_name}`
  if (business_category) {
    context += `\nCategory: ${business_category}`
  }
  if (description) {
    context += `\nDescription: ${description.substring(0, 200)}`
  }

  let feedbackSection = ''
  if (feedback) {
    feedbackSection = `\n\nUser Feedback for this iteration:
${feedback}
Please incorporate this feedback while maintaining professional quality.`
  }

  return `Create a professional logo for a business.

${context}

Design Requirements:
- Style: ${styleGuide}
- Format: Square logo, suitable for use as a favicon and social media profile
- Create an ICON-ONLY logo (no text, no letters, no words)
- Simple, recognizable symbol or icon that represents the business
- Clean, solid shapes that work well at small sizes
- Professional quality, suitable for e-commerce
- Flat design with no complex gradients or 3D effects
- Maximum 2-3 colors
- White or transparent background
- The icon should be centered and well-balanced
${feedbackSection}
Important: Generate ONLY an icon/symbol logo. Do NOT include any text, letters, or typography.`
}

/**
 * Check if logo generation is available (API key configured)
 */
export function isLogoGenerationAvailable(): boolean {
  return !!process.env.GEMINI_API_KEY
}
