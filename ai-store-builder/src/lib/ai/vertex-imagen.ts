// Vertex AI Imagen Service for Advanced Image Enhancement
// Uses Google's Imagen API for background removal, lighting fixes, and image editing

import { GoogleAuth } from 'google-auth-library'

const VERTEX_AI_ENDPOINT = 'https://us-central1-aiplatform.googleapis.com'

// Types
export interface ImagenEnhanceOptions {
  removeBackground?: boolean
  fixLighting?: boolean
  improveComposition?: boolean
  makeSquare?: boolean
  outputFormat?: 'png' | 'jpeg'
  backgroundColor?: string // Hex color for background, default white
}

export interface ImagenEnhanceResult {
  success: boolean
  enhancedImage?: Buffer
  mimeType?: string
  enhancementsApplied: string[]
  error?: string
}

export interface ImageQualityIssues {
  hasBackgroundIssues: boolean
  hasLightingIssues: boolean
  hasCompositionIssues: boolean
  isBlurry: boolean
  overallScore: number // 0-10
  recommendations: string[]
}

/**
 * Vertex AI Imagen Service for product image enhancement
 */
class VertexImagenService {
  private auth: GoogleAuth | null = null
  private projectId: string | null = null
  private initialized = false

  /**
   * Initialize the Vertex AI client
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      // Check for credentials
      const credentials = process.env.GOOGLE_CLOUD_CREDENTIALS
      const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS
      this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || null

      if (!this.projectId) {
        // Try to extract from credentials
        if (credentials) {
          const parsed = JSON.parse(credentials)
          this.projectId = parsed.project_id
        }
      }

      if (!this.projectId) {
        throw new Error('GOOGLE_CLOUD_PROJECT_ID is required for Vertex AI')
      }

      if (credentials) {
        // Parse JSON credentials from env var
        const parsedCredentials = JSON.parse(credentials)
        this.auth = new GoogleAuth({
          credentials: parsedCredentials,
          scopes: ['https://www.googleapis.com/auth/cloud-platform']
        })
      } else if (keyFile) {
        // Use key file path
        this.auth = new GoogleAuth({
          keyFilename: keyFile,
          scopes: ['https://www.googleapis.com/auth/cloud-platform']
        })
      } else {
        // Use Application Default Credentials
        this.auth = new GoogleAuth({
          scopes: ['https://www.googleapis.com/auth/cloud-platform']
        })
      }

      this.initialized = true
      console.log('[VertexImagen] Initialized successfully for project:', this.projectId)
    } catch (error) {
      console.error('[VertexImagen] Initialization failed:', error)
      throw error
    }
  }

  /**
   * Check if service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.initialize()
      return !!this.auth && !!this.projectId
    } catch {
      return false
    }
  }

  /**
   * Make authenticated request to Vertex AI
   */
  private async makeRequest(endpoint: string, body: Record<string, unknown>): Promise<unknown> {
    await this.initialize()

    if (!this.auth || !this.projectId) {
      throw new Error('Vertex AI not configured')
    }

    const client = await this.auth.getClient()
    const accessToken = await client.getAccessToken()

    const url = `${VERTEX_AI_ENDPOINT}/v1/projects/${this.projectId}/locations/us-central1${endpoint}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[VertexImagen] API error:', errorText)
      throw new Error(`Vertex AI error: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Edit an image using Imagen
   * Uses image generation with reference for product image editing
   */
  async editImage(
    imageBuffer: Buffer,
    editPrompt: string,
    options: {
      maskBuffer?: Buffer // Optional mask for targeted editing
    } = {}
  ): Promise<{ buffer: Buffer; mimeType: string } | null> {
    try {
      const base64Image = imageBuffer.toString('base64')

      // Use imagegeneration endpoint with the image as reference
      const requestBody: Record<string, unknown> = {
        instances: [
          {
            prompt: editPrompt,
            referenceImages: [
              {
                referenceImage: {
                  bytesBase64Encoded: base64Image
                },
                referenceType: 1 // STYLE reference type
              }
            ]
          }
        ],
        parameters: {
          sampleCount: 1,
          aspectRatio: '1:1',
          safetySetting: 'block_some',
          personGeneration: 'allow_adult'
        }
      }

      const response = await this.makeRequest(
        '/publishers/google/models/imagen-3.0-generate-001:predict',
        requestBody
      ) as { predictions?: Array<{ bytesBase64Encoded?: string; mimeType?: string }> }

      if (response.predictions && response.predictions[0]?.bytesBase64Encoded) {
        return {
          buffer: Buffer.from(response.predictions[0].bytesBase64Encoded, 'base64'),
          mimeType: response.predictions[0].mimeType || 'image/png'
        }
      }

      return null
    } catch (error) {
      console.error('[VertexImagen] Edit image failed:', error)
      return null
    }
  }

  /**
   * Remove background from product image using Imagen
   */
  async removeBackground(
    imageBuffer: Buffer,
    backgroundColor: string = '#FFFFFF'
  ): Promise<{ buffer: Buffer; mimeType: string } | null> {
    const prompt = `Professional e-commerce product photo on a clean, solid ${backgroundColor === '#FFFFFF' ? 'white' : 'colored'} background. Remove the background and place the product centered with even studio lighting. Keep the product exactly as shown in the reference image.`

    return this.editImage(imageBuffer, prompt)
  }

  /**
   * Fix lighting issues in product image
   */
  async fixLighting(imageBuffer: Buffer): Promise<{ buffer: Buffer; mimeType: string } | null> {
    const prompt = `Professional product photo with bright, even studio lighting. Remove shadows and dark areas. Keep the product and background exactly as shown but with improved professional lighting quality.`

    return this.editImage(imageBuffer, prompt)
  }

  /**
   * Comprehensive product image enhancement
   * Combines multiple enhancements based on detected issues
   */
  async enhanceProductImage(
    imageBuffer: Buffer,
    options: ImagenEnhanceOptions = {}
  ): Promise<ImagenEnhanceResult> {
    const {
      removeBackground = true,
      fixLighting = true,
      improveComposition = true,
      backgroundColor = '#FFFFFF'
    } = options

    const enhancementsApplied: string[] = []
    let currentBuffer = imageBuffer

    try {
      // Build comprehensive enhancement prompt
      const promptParts: string[] = []

      if (removeBackground) {
        promptParts.push('Remove the background and replace it with a clean, pure white background')
        enhancementsApplied.push('background_removal')
      }

      if (fixLighting) {
        promptParts.push('Ensure professional, even studio lighting with no harsh shadows')
        enhancementsApplied.push('lighting_correction')
      }

      if (improveComposition) {
        promptParts.push('Center the product nicely in frame with appropriate padding')
        enhancementsApplied.push('composition_improvement')
      }

      promptParts.push('Make this a professional e-commerce product photo')
      promptParts.push('Keep the product exactly as is - do not modify, replace, or change the product itself in any way')
      promptParts.push('Only improve the presentation: background, lighting, and positioning')

      const fullPrompt = promptParts.join('. ') + '.'

      console.log('[VertexImagen] Enhancing with prompt:', fullPrompt.substring(0, 100) + '...')

      const result = await this.editImage(currentBuffer, fullPrompt)

      if (result) {
        return {
          success: true,
          enhancedImage: result.buffer,
          mimeType: result.mimeType,
          enhancementsApplied
        }
      }

      return {
        success: false,
        enhancementsApplied: [],
        error: 'Image enhancement returned no result'
      }
    } catch (error) {
      console.error('[VertexImagen] Enhancement failed:', error)
      return {
        success: false,
        enhancementsApplied: [],
        error: error instanceof Error ? error.message : 'Enhancement failed'
      }
    }
  }

  /**
   * Analyze image quality and determine what enhancements are needed
   */
  async analyzeImageQuality(
    imageBuffer: Buffer,
    visionAnalysis?: {
      brightness?: 'dark' | 'normal' | 'bright'
      isBlurry?: boolean
      score?: number
      hasComplexBackground?: boolean
    }
  ): Promise<ImageQualityIssues> {
    // Start with provided vision analysis or defaults
    const brightness = visionAnalysis?.brightness || 'normal'
    const isBlurry = visionAnalysis?.isBlurry || false
    const existingScore = visionAnalysis?.score || 5
    const hasComplexBackground = visionAnalysis?.hasComplexBackground || true // Default assume needs cleanup

    const issues: ImageQualityIssues = {
      hasBackgroundIssues: hasComplexBackground,
      hasLightingIssues: brightness !== 'normal',
      hasCompositionIssues: false, // Would need more analysis
      isBlurry,
      overallScore: existingScore,
      recommendations: []
    }

    // Build recommendations
    if (issues.hasBackgroundIssues) {
      issues.recommendations.push('Remove busy background for cleaner presentation')
    }

    if (issues.hasLightingIssues) {
      if (brightness === 'dark') {
        issues.recommendations.push('Brighten image and improve lighting')
      } else {
        issues.recommendations.push('Reduce overexposure and balance lighting')
      }
    }

    if (issues.isBlurry) {
      issues.recommendations.push('Image appears blurry - consider retaking photo')
      issues.overallScore = Math.max(0, issues.overallScore - 2)
    }

    // Calculate if enhancement would help
    const needsEnhancement =
      issues.hasBackgroundIssues ||
      issues.hasLightingIssues ||
      issues.isBlurry

    if (!needsEnhancement) {
      issues.overallScore = Math.min(10, issues.overallScore + 1)
    }

    return issues
  }
}

// Export singleton instance
export const vertexImagen = new VertexImagenService()

// Export class for testing
export { VertexImagenService }
