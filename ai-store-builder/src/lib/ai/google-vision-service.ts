// Google Cloud Vision Service - OCR, Object Detection, Background Removal

import vision from '@google-cloud/vision'

// Types
export interface ObjectAnnotation {
  name: string
  score: number
  boundingPoly: {
    normalizedVertices: Array<{ x: number; y: number }>
  }
}

export interface SafeSearchResult {
  adult: string
  violence: string
  racy: string
  medical: string
  spoof: string
  isAppropriate: boolean
}

export interface ExtractedColor {
  hex: string
  rgb: { red: number; green: number; blue: number }
  score: number
  pixelFraction: number
}

export interface TextAnnotation {
  text: string
  confidence: number
  boundingBox?: {
    vertices: Array<{ x: number; y: number }>
  }
}

export interface ImagePropertiesResult {
  dominantColors: ExtractedColor[]
}

export interface VisionAnalysisResult {
  text: string[]
  objects: ObjectAnnotation[]
  colors: ExtractedColor[]
  safeSearch: SafeSearchResult
  labels: Array<{ description: string; score: number }>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ImageAnnotatorClient = any

class GoogleVisionService {
  private client: ImageAnnotatorClient | null = null
  private initialized = false

  /**
   * Lazy initialize the client to avoid build-time errors
   */
  private async getClient(): Promise<ImageAnnotatorClient> {
    if (this.client && this.initialized) {
      return this.client
    }

    try {
      // Check for credentials
      const credentials = process.env.GOOGLE_CLOUD_CREDENTIALS
      const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS

      if (credentials) {
        // Parse JSON credentials from env var
        const parsedCredentials = JSON.parse(credentials)
        this.client = new vision.ImageAnnotatorClient({
          credentials: parsedCredentials,
          projectId: parsedCredentials.project_id
        })
      } else if (keyFile) {
        // Use key file path
        this.client = new vision.ImageAnnotatorClient({
          keyFilename: keyFile
        })
      } else {
        // Use Application Default Credentials
        this.client = new vision.ImageAnnotatorClient()
      }

      this.initialized = true
      console.log('[GoogleVision] Client initialized successfully')
      return this.client
    } catch (error) {
      console.error('[GoogleVision] Failed to initialize client:', error)
      throw new Error('Google Cloud Vision client initialization failed')
    }
  }

  /**
   * Check if service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.getClient()
      return true
    } catch {
      return false
    }
  }

  /**
   * Extract text from image using OCR
   */
  async extractText(imageBuffer: Buffer): Promise<string[]> {
    try {
      const client = await this.getClient()

      const [result] = await client.textDetection({
        image: { content: imageBuffer.toString('base64') }
      })

      const detections = result.textAnnotations || []

      // First annotation is the full text, rest are individual words/blocks
      if (detections.length > 0 && detections[0].description) {
        // Return unique lines of text
        const fullText = detections[0].description as string
        const lines = fullText.split('\n').filter((line: string) => line.trim().length > 0)
        return [...new Set(lines)] as string[]
      }

      return []
    } catch (error) {
      console.error('[GoogleVision] Text extraction failed:', error)
      return []
    }
  }

  /**
   * Detect objects in image for background removal analysis
   */
  async detectObjects(imageBuffer: Buffer): Promise<ObjectAnnotation[]> {
    try {
      const client = await this.getClient()

      const [result] = await client.objectLocalization({
        image: { content: imageBuffer.toString('base64') }
      })

      const objects = result.localizedObjectAnnotations || []

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return objects.map((obj: any) => ({
        name: obj.name || 'Unknown',
        score: obj.score || 0,
        boundingPoly: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          normalizedVertices: (obj.boundingPoly?.normalizedVertices || []).map((v: any) => ({
            x: v.x || 0,
            y: v.y || 0
          }))
        }
      }))
    } catch (error) {
      console.error('[GoogleVision] Object detection failed:', error)
      return []
    }
  }

  /**
   * Check image for inappropriate content
   */
  async moderateImage(imageBuffer: Buffer): Promise<SafeSearchResult> {
    try {
      const client = await this.getClient()

      const [result] = await client.safeSearchDetection({
        image: { content: imageBuffer.toString('base64') }
      })

      const safe = result.safeSearchAnnotation || {}

      // Map likelihood to risk levels
      const likelihoods = ['UNKNOWN', 'VERY_UNLIKELY', 'UNLIKELY', 'POSSIBLE', 'LIKELY', 'VERY_LIKELY']
      const isHighRisk = (likelihood: string | undefined | null) => {
        const index = likelihoods.indexOf(likelihood || 'UNKNOWN')
        return index >= 4 // LIKELY or VERY_LIKELY
      }

      const adult = safe.adult || 'UNKNOWN'
      const violence = safe.violence || 'UNKNOWN'
      const racy = safe.racy || 'UNKNOWN'
      const medical = safe.medical || 'UNKNOWN'
      const spoof = safe.spoof || 'UNKNOWN'

      return {
        adult,
        violence,
        racy,
        medical,
        spoof,
        isAppropriate: !isHighRisk(adult) && !isHighRisk(violence) && !isHighRisk(racy)
      }
    } catch (error) {
      console.error('[GoogleVision] Safe search detection failed:', error)
      return {
        adult: 'UNKNOWN',
        violence: 'UNKNOWN',
        racy: 'UNKNOWN',
        medical: 'UNKNOWN',
        spoof: 'UNKNOWN',
        isAppropriate: true // Default to appropriate on error
      }
    }
  }

  /**
   * Extract dominant colors from image
   */
  async extractColors(imageBuffer: Buffer): Promise<ExtractedColor[]> {
    try {
      const client = await this.getClient()

      const [result] = await client.imageProperties({
        image: { content: imageBuffer.toString('base64') }
      })

      const colors = result.imagePropertiesAnnotation?.dominantColors?.colors || []

      return colors
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((color: any) => {
          const rgb = color.color || {}
          const red = rgb.red || 0
          const green = rgb.green || 0
          const blue = rgb.blue || 0

          return {
            hex: `#${Math.round(red).toString(16).padStart(2, '0')}${Math.round(green).toString(16).padStart(2, '0')}${Math.round(blue).toString(16).padStart(2, '0')}`,
            rgb: { red, green, blue },
            score: color.score || 0,
            pixelFraction: color.pixelFraction || 0
          }
        })
        .sort((a: ExtractedColor, b: ExtractedColor) => b.pixelFraction - a.pixelFraction)
        .slice(0, 5) // Top 5 colors
    } catch (error) {
      console.error('[GoogleVision] Color extraction failed:', error)
      return []
    }
  }

  /**
   * Get image labels/categories
   */
  async getLabels(imageBuffer: Buffer): Promise<Array<{ description: string; score: number }>> {
    try {
      const client = await this.getClient()

      const [result] = await client.labelDetection({
        image: { content: imageBuffer.toString('base64') }
      })

      const labels = result.labelAnnotations || []

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return labels.map((label: any) => ({
        description: label.description || '',
        score: label.score || 0
      }))
    } catch (error) {
      console.error('[GoogleVision] Label detection failed:', error)
      return []
    }
  }

  /**
   * Comprehensive image analysis - combines multiple Vision features
   */
  async analyzeImage(imageBuffer: Buffer): Promise<VisionAnalysisResult> {
    try {
      const client = await this.getClient()

      // Request multiple features in one call
      const [result] = await client.annotateImage({
        image: { content: imageBuffer.toString('base64') },
        features: [
          { type: 'TEXT_DETECTION' },
          { type: 'OBJECT_LOCALIZATION' },
          { type: 'IMAGE_PROPERTIES' },
          { type: 'SAFE_SEARCH_DETECTION' },
          { type: 'LABEL_DETECTION' }
        ]
      })

      // Extract text
      const textAnnotations = result.textAnnotations || []
      const text = textAnnotations.length > 0 && textAnnotations[0].description
        ? (textAnnotations[0].description as string).split('\n').filter((line: string) => line.trim().length > 0)
        : []

      // Extract objects
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const objects = (result.localizedObjectAnnotations || []).map((obj: any) => ({
        name: obj.name || 'Unknown',
        score: obj.score || 0,
        boundingPoly: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          normalizedVertices: (obj.boundingPoly?.normalizedVertices || []).map((v: any) => ({
            x: v.x || 0,
            y: v.y || 0
          }))
        }
      }))

      // Extract colors
      const colorAnnotations = result.imagePropertiesAnnotation?.dominantColors?.colors || []
      const colors = colorAnnotations
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((color: any) => {
          const rgb = color.color || {}
          const red = rgb.red || 0
          const green = rgb.green || 0
          const blue = rgb.blue || 0

          return {
            hex: `#${Math.round(red).toString(16).padStart(2, '0')}${Math.round(green).toString(16).padStart(2, '0')}${Math.round(blue).toString(16).padStart(2, '0')}`,
            rgb: { red, green, blue },
            score: color.score || 0,
            pixelFraction: color.pixelFraction || 0
          }
        })
        .sort((a: ExtractedColor, b: ExtractedColor) => b.pixelFraction - a.pixelFraction)
        .slice(0, 5)

      // Safe search
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const safe: any = result.safeSearchAnnotation || {}
      const likelihoods = ['UNKNOWN', 'VERY_UNLIKELY', 'UNLIKELY', 'POSSIBLE', 'LIKELY', 'VERY_LIKELY']
      const isHighRisk = (likelihood: string | undefined | null) => {
        const index = likelihoods.indexOf(likelihood || 'UNKNOWN')
        return index >= 4
      }

      const safeSearch: SafeSearchResult = {
        adult: safe.adult || 'UNKNOWN',
        violence: safe.violence || 'UNKNOWN',
        racy: safe.racy || 'UNKNOWN',
        medical: safe.medical || 'UNKNOWN',
        spoof: safe.spoof || 'UNKNOWN',
        isAppropriate: !isHighRisk(safe.adult) && !isHighRisk(safe.violence) && !isHighRisk(safe.racy)
      }

      // Labels
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const labels = (result.labelAnnotations || []).map((label: any) => ({
        description: label.description || '',
        score: label.score || 0
      }))

      return {
        text: [...new Set(text)],
        objects,
        colors,
        safeSearch,
        labels
      }
    } catch (error) {
      console.error('[GoogleVision] Comprehensive analysis failed:', error)
      return {
        text: [],
        objects: [],
        colors: [],
        safeSearch: {
          adult: 'UNKNOWN',
          violence: 'UNKNOWN',
          racy: 'UNKNOWN',
          medical: 'UNKNOWN',
          spoof: 'UNKNOWN',
          isAppropriate: true
        },
        labels: []
      }
    }
  }

  /**
   * Analyze if image needs background removal based on object detection
   */
  async shouldRemoveBackground(imageBuffer: Buffer): Promise<{
    shouldRemove: boolean
    mainObject: ObjectAnnotation | null
    confidence: number
  }> {
    const objects = await this.detectObjects(imageBuffer)

    if (objects.length === 0) {
      return { shouldRemove: false, mainObject: null, confidence: 0 }
    }

    // Find the main (largest/highest confidence) object
    const mainObject = objects.reduce((prev, curr) =>
      curr.score > prev.score ? curr : prev
    )

    // Calculate object coverage
    if (mainObject.boundingPoly.normalizedVertices.length >= 4) {
      const vertices = mainObject.boundingPoly.normalizedVertices
      const width = Math.abs(vertices[1].x - vertices[0].x)
      const height = Math.abs(vertices[2].y - vertices[1].y)
      const coverage = width * height

      // If object covers less than 80% of image, might benefit from bg removal
      const shouldRemove = coverage < 0.8 && mainObject.score > 0.7

      return {
        shouldRemove,
        mainObject,
        confidence: mainObject.score
      }
    }

    return { shouldRemove: false, mainObject, confidence: mainObject.score }
  }
}

// Export singleton instance
export const googleVision = new GoogleVisionService()

// Export class for testing/custom instances
export { GoogleVisionService }
