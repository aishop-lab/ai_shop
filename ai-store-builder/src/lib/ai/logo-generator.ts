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

  console.log('[Logo Generator] Initializing auth...', {
    hasCredentials: !!credentials,
    hasKeyFile: !!keyFile,
    projectId: projectId || 'not set'
  })

  if (!projectId && credentials) {
    try {
      const parsed = JSON.parse(credentials)
      projectId = parsed.project_id
      console.log('[Logo Generator] Extracted project_id from credentials:', projectId)
    } catch (e) {
      console.error('[Logo Generator] Failed to parse GOOGLE_CLOUD_CREDENTIALS:', e)
      throw new Error('Invalid GOOGLE_CLOUD_CREDENTIALS JSON format')
    }
  }

  if (!projectId) {
    throw new Error('GOOGLE_CLOUD_PROJECT_ID is required for logo generation')
  }

  if (credentials) {
    try {
      const parsedCredentials = JSON.parse(credentials)
      console.log('[Logo Generator] Using service account:', parsedCredentials.client_email)
      auth = new GoogleAuth({
        credentials: parsedCredentials,
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
      })
    } catch (e) {
      console.error('[Logo Generator] Failed to initialize GoogleAuth:', e)
      throw new Error('Failed to initialize Google Cloud auth with credentials')
    }
  } else if (keyFile) {
    console.log('[Logo Generator] Using key file:', keyFile)
    auth = new GoogleAuth({
      keyFilename: keyFile,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    })
  } else {
    console.log('[Logo Generator] Using default credentials (ADC)')
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

    let accessToken: { token?: string | null }
    try {
      const client = await googleAuth.getClient()
      accessToken = await client.getAccessToken()
      console.log('[Logo Generator] Access token obtained successfully')
    } catch (tokenError) {
      console.error('[Logo Generator] Failed to get access token:', tokenError)
      throw new Error('Failed to authenticate with Google Cloud. Check service account credentials.')
    }

    if (!accessToken.token) {
      throw new Error('Failed to get access token - token is empty')
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

      // Provide helpful error messages for common issues
      if (response.status === 403) {
        console.error('[Logo Generator] 403 Forbidden - Check: 1) Vertex AI API enabled? 2) Service account has aiplatform.user role? 3) Billing enabled?')
        throw new Error('Vertex AI access denied. Check API permissions and billing.')
      }
      if (response.status === 404) {
        console.error('[Logo Generator] 404 Not Found - Imagen 3.0 may not be available in this project/region')
        throw new Error('Imagen model not found. Ensure Vertex AI is enabled and Imagen is available.')
      }
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.')
      }

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
    modern: 'Contemporary logo mark with clean geometric shapes, bold confident lines, vibrant yet professional colors (deep blue, teal, coral, or electric purple). Think Apple, Airbnb, Spotify style logos.',
    classic: 'Timeless, elegant logo mark with refined details, sophisticated color palette (navy, burgundy, gold, forest green). Think luxury brands like Rolex, Hermès style logos.',
    playful: 'Friendly, approachable logo mark with soft rounded shapes, warm inviting colors (orange, yellow, pink, turquoise). Think Mailchimp, Slack style logos.',
    minimal: 'Ultra-simple iconic mark, single geometric shape or clever negative space design, monochromatic (black, white, single accent). Think Nike swoosh, Target bullseye simplicity.'
  }
  return guides[style]
}

/**
 * Get industry-specific icon concepts
 */
function getIndustryConcepts(category?: string): string {
  if (!category) return ''

  const cat = category.toLowerCase()

  const concepts: Record<string, string> = {
    fashion: 'Consider: stylized hanger, dress form silhouette, needle & thread, fabric fold, fashion mannequin abstract, bow/ribbon, elegant curve',
    clothing: 'Consider: stylized hanger, shirt collar shape, stitching pattern, fabric texture abstract, fashion mannequin silhouette',
    electronics: 'Consider: circuit pattern, power symbol, signal waves, chip/processor abstract, lightning bolt, connected dots',
    tech: 'Consider: abstract circuit, code brackets, pixel grid, connection nodes, infinity loop, abstract data flow',
    food: 'Consider: chef hat, spoon/fork abstract, leaf for fresh, steam rising, plate silhouette, ingredient shapes',
    restaurant: 'Consider: plate with cutlery, chef hat, dining table abstract, food dome/cloche, flame for cooking',
    beauty: 'Consider: mirror reflection, lipstick shape, flower petal, beauty mark, elegant feminine curve, sparkle',
    cosmetics: 'Consider: lipstick silhouette, compact mirror, brush stroke, flower/botanical, dewdrop, feminine curve',
    jewelry: 'Consider: diamond facets, ring circle, pendant drop, gem cut abstract, sparkle/shine, crown element',
    home: 'Consider: house roofline, door/window, key, heart + home, cozy elements, plant/leaf',
    furniture: 'Consider: chair silhouette, sofa shape abstract, lamp, geometric furniture shapes, wood grain abstract',
    health: 'Consider: heart pulse, cross symbol, leaf for natural, human figure abstract, wellness circle, lotus',
    fitness: 'Consider: dumbbell abstract, running figure, muscle flex, heartbeat, motion lines, athletic pose',
    sports: 'Consider: ball shape, trophy, motion swoosh, athletic figure, victory pose, energy burst',
    books: 'Consider: open book pages, bookmark, reading glasses, quill/pen, stack of books, knowledge lightbulb',
    education: 'Consider: graduation cap, book, lightbulb idea, pencil, brain abstract, growth arrow',
    pets: 'Consider: paw print, pet silhouette (dog/cat), bone, heart + paw, collar/tag, animal face abstract',
    kids: 'Consider: playful star, balloon, building blocks, happy face, rainbow arc, toy abstract',
    toys: 'Consider: building blocks, teddy bear silhouette, pinwheel, playful shapes, star, robot friendly',
    travel: 'Consider: airplane, globe, compass, suitcase, road/path, mountain/destination, hot air balloon',
    cafe: 'Consider: coffee cup steam, coffee bean, mug silhouette, cafe table, brewing abstract',
    bakery: 'Consider: bread loaf, croissant, wheat stalk, rolling pin, oven mitt, chef hat'
  }

  // Find matching category
  for (const [key, value] of Object.entries(concepts)) {
    if (cat.includes(key)) {
      return `\nIcon Inspiration: ${value}`
    }
  }

  return ''
}

/**
 * Extract brand personality keywords from description
 */
function extractBrandKeywords(description?: string): string {
  if (!description) return ''

  const keywords: string[] = []
  const desc = description.toLowerCase()

  // Quality indicators
  if (desc.includes('premium') || desc.includes('luxury') || desc.includes('high-end')) {
    keywords.push('premium', 'luxurious')
  }
  if (desc.includes('affordable') || desc.includes('budget')) {
    keywords.push('accessible', 'value-focused')
  }
  if (desc.includes('handmade') || desc.includes('artisan') || desc.includes('craft')) {
    keywords.push('artisanal', 'handcrafted')
  }
  if (desc.includes('organic') || desc.includes('natural') || desc.includes('eco')) {
    keywords.push('natural', 'eco-conscious')
  }
  if (desc.includes('fast') || desc.includes('quick') || desc.includes('instant')) {
    keywords.push('swift', 'efficient')
  }
  if (desc.includes('tradition') || desc.includes('heritage') || desc.includes('authentic')) {
    keywords.push('heritage', 'authentic')
  }
  if (desc.includes('innovat') || desc.includes('cutting-edge') || desc.includes('advanced')) {
    keywords.push('innovative', 'forward-thinking')
  }
  if (desc.includes('trust') || desc.includes('reliable') || desc.includes('quality')) {
    keywords.push('trustworthy', 'reliable')
  }

  if (keywords.length === 0) return ''
  return `\nBrand Personality: ${keywords.slice(0, 3).join(', ')}`
}

/**
 * Parse feedback to extract specific requests
 */
function parseFeedback(feedback: string): {
  wantsText: boolean
  textContent: string | null
  colorRequest: string | null
  otherFeedback: string
} {
  const lower = feedback.toLowerCase()

  // Check for text requests
  const wantsText = lower.includes('text') || lower.includes('letter') || lower.includes('word') ||
                    lower.includes('name') || lower.includes('initial') || lower.includes('write')

  // Try to extract specific text content (e.g., "add text 'ABC'" or "use text: ABC")
  let textContent: string | null = null
  const textMatch = feedback.match(/["']([^"']+)["']|text[:\s]+(\w+)|name[:\s]+(\w+)/i)
  if (textMatch) {
    textContent = textMatch[1] || textMatch[2] || textMatch[3]
  }

  // Check for color requests
  let colorRequest: string | null = null
  const colorKeywords = ['pink', 'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'violet',
                         'black', 'white', 'gold', 'silver', 'teal', 'coral', 'navy', 'maroon',
                         '#[0-9a-fA-F]{3,6}']
  for (const color of colorKeywords) {
    const colorMatch = feedback.match(new RegExp(color, 'i'))
    if (colorMatch) {
      colorRequest = colorMatch[0]
      break
    }
  }

  return {
    wantsText,
    textContent,
    colorRequest,
    otherFeedback: feedback
  }
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

  // Get industry-specific concepts
  const industryConcepts = getIndustryConcepts(business_category)

  // Extract brand personality from description
  const brandKeywords = extractBrandKeywords(description)

  // Parse feedback for specific requests
  const feedbackParsed = feedback ? parseFeedback(feedback) : null

  // Build context
  let brandContext = `Brand: "${business_name}"`
  if (business_category) {
    brandContext += ` | Industry: ${business_category}`
  }
  if (description && description.length > 10) {
    brandContext += `\nBrand Story: ${description.substring(0, 150)}`
  }

  // Determine if we should include text in the logo
  const includeText = feedbackParsed?.wantsText || false
  const textToInclude = feedbackParsed?.textContent || business_name

  // Build color directive
  let colorDirective = 'Maximum 2-3 colors, harmonious palette'
  if (feedbackParsed?.colorRequest) {
    colorDirective = `PRIMARY COLOR MUST BE ${feedbackParsed.colorRequest.toUpperCase()}. Use ${feedbackParsed.colorRequest} as the dominant color with 1-2 complementary colors.`
  }

  // Build logo type specification
  let logoTypeSpec: string
  if (includeText) {
    logoTypeSpec = `Type: Logo mark WITH text "${textToInclude}" - incorporate the text elegantly into the design`
  } else {
    logoTypeSpec = 'Type: Symbol/Icon mark only (NO text, NO letters, NO initials, NO words)'
  }

  // Build feedback section - put it prominently at the top
  let feedbackSection = ''
  if (feedback) {
    feedbackSection = `
*** USER FEEDBACK - HIGHEST PRIORITY ***
The user specifically requested: "${feedback}"
You MUST incorporate this feedback into the design. This is the most important instruction.
***

`
  }

  return `Professional Logo Design Brief
${feedbackSection}
${brandContext}${brandKeywords}

DESIGN DIRECTION:
${styleGuide}
${industryConcepts}

LOGO SPECIFICATIONS:
${logoTypeSpec}
Format: Square, centered, balanced composition
Colors: ${colorDirective}
Style: Vector-style flat design, clean edges, no gradients or shadows
Scale: Must be recognizable at 32x32px (favicon) and look great at 512x512px
Background: Pure white (#FFFFFF)

DESIGN PRINCIPLES:
- Create a MEANINGFUL design that captures the brand's essence
- Use NEGATIVE SPACE cleverly if possible
- Ensure INSTANT RECOGNITION - the logo should tell a story at a glance
- Design for MEMORABILITY - simple enough to sketch from memory
- Professional quality suitable for a real e-commerce brand
- Think like a top design agency (Pentagram, Landor, Wolff Olins)

Generate a single, polished, professional logo.`
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
