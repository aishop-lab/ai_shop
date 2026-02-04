// Logo Generation Service using Google Vertex AI Imagen 3.0
// Generates minimalist, professional logos based on business information

import { GoogleAuth } from 'google-auth-library'

const VERTEX_AI_ENDPOINT = 'https://us-central1-aiplatform.googleapis.com'

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

// Singleton auth instance
let auth: GoogleAuth | null = null
let projectId: string | null = null

/**
 * Initialize Google Cloud auth
 */
async function initializeAuth(): Promise<{ auth: GoogleAuth; projectId: string }> {
  if (auth && projectId) {
    return { auth, projectId }
  }

  const credentials = process.env.GOOGLE_CLOUD_CREDENTIALS
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS
  projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || null

  if (!projectId && credentials) {
    try {
      const parsed = JSON.parse(credentials)
      projectId = parsed.project_id
    } catch (e) {
      // Ignore parse errors
    }
  }

  if (!projectId) {
    throw new Error('GOOGLE_CLOUD_PROJECT_ID is required for logo generation')
  }

  if (credentials) {
    const parsedCredentials = JSON.parse(credentials)
    auth = new GoogleAuth({
      credentials: parsedCredentials,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    })
  } else if (keyFile) {
    auth = new GoogleAuth({
      keyFilename: keyFile,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    })
  } else {
    auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    })
  }

  return { auth, projectId }
}

/**
 * Generate a professional logo using Vertex AI Imagen 3.0
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

  console.log('[Logo Generator] Generating logo with Imagen 3.0, prompt:', prompt.substring(0, 200) + '...')

  try {
    const { auth: googleAuth, projectId: project } = await initializeAuth()

    const client = await googleAuth.getClient()
    const accessToken = await client.getAccessToken()

    if (!accessToken.token) {
      throw new Error('Failed to get access token')
    }

    const url = `${VERTEX_AI_ENDPOINT}/v1/projects/${project}/locations/us-central1/publishers/google/models/imagen-3.0-generate-001:predict`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: '1:1',
          safetySetting: 'block_some'
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Logo Generator] Imagen API error:', response.status, errorText)
      throw new Error(`Imagen API error: ${response.status}`)
    }

    const data = await response.json() as {
      predictions?: Array<{ bytesBase64Encoded?: string; mimeType?: string }>
    }

    if (data.predictions && data.predictions[0]?.bytesBase64Encoded) {
      const imageBuffer = Buffer.from(data.predictions[0].bytesBase64Encoded, 'base64')
      console.log('[Logo Generator] Logo generated successfully, size:', imageBuffer.length)

      return {
        imageData: imageBuffer,
        mimeType: data.predictions[0].mimeType || 'image/png',
        prompt_used: prompt
      }
    }

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
 * Check if logo generation is available (credentials configured)
 */
export function isLogoGenerationAvailable(): boolean {
  return !!(
    process.env.GOOGLE_CLOUD_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_CREDENTIALS ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS
  )
}
