import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getStep,
  getNextStep,
  formatQuestion,
  validateStepResponse,
  BUSINESS_CATEGORIES
} from '@/lib/onboarding/flow'
import { unifiedAI, AUTO_APPLY_THRESHOLD as LEGACY_AUTO_APPLY_THRESHOLD, type UnifiedOnboardingResult } from '@/lib/ai/unified-ai-service'
import { vercelAI, AUTO_APPLY_THRESHOLD, type OnboardingAnalysis } from '@/lib/ai/vercel-ai-service'
import { USE_VERCEL_AI } from '@/lib/ai/provider'
import { processMessageSchema } from '@/lib/validations/onboarding'
import type { StoreData, ProcessMessageResponse } from '@/lib/types/onboarding'

// Extended response type with AI suggestions
interface EnhancedProcessMessageResponse extends ProcessMessageResponse {
  ai_suggestions?: {
    store_names?: Array<{ name: string; slug: string; reasoning: string }>
    brand_colors?: { primary: string; secondary: string; reasoning: string }
    tagline?: string
    should_auto_apply?: boolean
  }
  ai_confidence?: {
    score: number
    level: 'high' | 'medium' | 'low'
    reasoning?: string
  }
}

// Helper function to get confidence level from score
function getConfidenceLevel(score: number): 'high' | 'medium' | 'low' {
  if (score >= 0.8) return 'high'
  if (score >= 0.6) return 'medium'
  return 'low'
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validationResult = processMessageSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data' },
        { status: 400 }
      )
    }

    const { message, current_step, extracted_data = {} } = validationResult.data
    const currentStepDef = getStep(current_step)

    if (!currentStepDef) {
      return NextResponse.json(
        { success: false, error: 'Invalid step' },
        { status: 400 }
      )
    }

    // Validate the response for current step
    const validation = validateStepResponse(currentStepDef, message)
    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        error: validation.error,
        current_step,
        retry: true
      })
    }

    // Build updated data
    const updatedData: Partial<StoreData> = { ...extracted_data as Partial<StoreData> }

    // Process based on step
    let aiSuggestions: EnhancedProcessMessageResponse['ai_suggestions'] | undefined
    let aiConfidence: EnhancedProcessMessageResponse['ai_confidence'] | undefined
    let aiExtractedData: Partial<StoreData> = {}
    let cachedAnalysis: UnifiedOnboardingResult | undefined

    switch (currentStepDef.key) {
      case 'business_name':
        updatedData.business_name = message
        updatedData.slug = generateSlug(message)
        // Check if we have cached AI analysis to show name suggestions
        cachedAnalysis = unifiedAI.getCachedOnboardingAnalysis(user.id)
        if (cachedAnalysis?.store_names && cachedAnalysis.store_names.length > 0) {
          aiSuggestions = {
            store_names: cachedAnalysis.store_names,
            should_auto_apply: false
          }
        }
        break

      case 'description':
        updatedData.description = message
        // Trigger AI analysis - ONE call returns category, names, colors, tagline
        try {
          if (USE_VERCEL_AI) {
            // Use new Vercel AI SDK service
            const aiResult = await vercelAI.analyzeBusinessForOnboarding(
              message,
              updatedData.business_name,
              user.id // Session ID for caching
            )

            if (aiResult && aiResult.category.business_type) {
              // Extract category data
              aiExtractedData = {
                business_type: aiResult.category.business_type,
                business_category: aiResult.category.business_category || [],
                niche: aiResult.category.niche || '',
                keywords: aiResult.category.keywords || []
              }
              Object.assign(updatedData, aiExtractedData)
              updatedData._ai_extraction_success = true

              // Store all AI suggestions for later steps
              updatedData._ai_brand_colors = aiResult.brand_colors
              updatedData._ai_tagline = aiResult.tagline
              updatedData._ai_confidence = aiResult.overall_confidence

              // Set AI suggestions for response
              aiSuggestions = {
                store_names: aiResult.store_names,
                brand_colors: aiResult.brand_colors,
                tagline: aiResult.tagline,
                should_auto_apply: aiResult.overall_confidence >= AUTO_APPLY_THRESHOLD
              }

              // Set AI confidence for display
              aiConfidence = {
                score: aiResult.overall_confidence,
                level: getConfidenceLevel(aiResult.overall_confidence),
                reasoning: aiResult.category.niche ? `Detected ${aiResult.category.niche} business` : undefined
              }

              console.log(`[Onboarding] Vercel AI analysis complete. Confidence: ${aiResult.overall_confidence}`)
            } else {
              console.warn('Vercel AI analysis returned empty data')
              updatedData._ai_extraction_success = false
            }
          } else {
            // Use legacy unified AI service
            const aiResult = await unifiedAI.analyzeBusinessForOnboarding(
              message,
              updatedData.business_name,
              user.id // Session ID for caching
            )

            if (aiResult && aiResult.category.business_type) {
              // Extract category data
              aiExtractedData = {
                business_type: aiResult.category.business_type,
                business_category: aiResult.category.business_category || [],
                niche: aiResult.category.niche || '',
                keywords: aiResult.category.keywords || []
              }
              Object.assign(updatedData, aiExtractedData)
              updatedData._ai_extraction_success = true

              // Store all AI suggestions for later steps
              updatedData._ai_brand_colors = aiResult.brand_colors
              updatedData._ai_tagline = aiResult.tagline
              updatedData._ai_confidence = aiResult.overall_confidence

              // Set AI suggestions for response
              aiSuggestions = {
                store_names: aiResult.store_names,
                brand_colors: aiResult.brand_colors,
                tagline: aiResult.tagline,
                should_auto_apply: aiResult.overall_confidence >= LEGACY_AUTO_APPLY_THRESHOLD
              }

              // Set AI confidence for display
              aiConfidence = {
                score: aiResult.overall_confidence,
                level: getConfidenceLevel(aiResult.overall_confidence),
                reasoning: aiResult.category.niche ? `Detected ${aiResult.category.niche} business` : undefined
              }

              console.log(`[Onboarding] Legacy AI analysis complete. Confidence: ${aiResult.overall_confidence}`)
            } else {
              console.warn('AI analysis returned empty data')
              updatedData._ai_extraction_success = false
            }
          }
        } catch (error) {
          console.error('AI analysis failed:', error)
          updatedData._ai_extraction_success = false
        }
        break

      case 'category_confirmation':
        if (message === 'no') {
          // User rejected AI suggestion - clear category data so manual selection shows
          updatedData.business_type = ''
          updatedData.business_category = []
          updatedData.niche = ''
        }
        // Clean up internal flag
        delete (updatedData as Record<string, unknown>)._ai_extraction_success
        break

      case 'manual_category':
        // User selected manual category
        const selectedCategory = BUSINESS_CATEGORIES.find(c => c.value === message)
        if (selectedCategory) {
          updatedData.business_type = selectedCategory.type
          updatedData.business_category = [selectedCategory.label]
          updatedData.niche = selectedCategory.label
        } else {
          // Fallback if not found
          updatedData.business_type = message
          updatedData.business_category = [message]
          updatedData.niche = message
        }
        break

      case 'target_geography':
        updatedData.target_geography = message as StoreData['target_geography']
        // Set defaults based on geography
        if (message === 'india' || message === 'local') {
          updatedData.country = 'India'
          updatedData.currency = 'INR'
          updatedData.timezone = 'Asia/Kolkata'
        } else {
          // International - currency will be set in next step, default to USD
          updatedData.country = 'India'
          updatedData.currency = 'USD' // Default, will be overridden in currency_selection
          updatedData.timezone = 'UTC'
        }
        break

      case 'currency_selection':
        // User selected currency for international store
        updatedData.currency = message
        console.log(`[Onboarding] Currency selected: ${message}`)
        break

      case 'logo_url':
        // Logo URL would be set via upload endpoint
        // Message can be:
        // 1. Simple URL string (legacy)
        // 2. JSON with { url, extracted_colors } from enhanced upload
        // 3. 'skip' to skip logo
        if (message && message !== 'skip') {
          try {
            // Try to parse as JSON (new format with colors)
            const logoData = JSON.parse(message)
            updatedData.logo_url = logoData.url
            if (logoData.extracted_colors) {
              updatedData._logo_colors = logoData.extracted_colors
              console.log('[Onboarding] Logo colors stored:', logoData.extracted_colors.suggested_primary)
            }
          } catch {
            // Fallback: simple URL string (legacy format)
            updatedData.logo_url = message
          }
        }
        break

      case 'brand_vibe':
        updatedData.brand_vibe = message as StoreData['brand_vibe']
        // Include color suggestions for the next step
        // Priority: Logo colors > AI description-based colors
        if (updatedData._logo_colors) {
          // Logo colors take priority
          aiSuggestions = {
            brand_colors: {
              primary: updatedData._logo_colors.suggested_primary,
              secondary: updatedData._logo_colors.suggested_secondary,
              reasoning: 'Extracted from your uploaded logo'
            },
            should_auto_apply: true // Logo colors are definitive
          }
          console.log('[Onboarding] Using logo-extracted colors for suggestions')
        } else if (updatedData._ai_brand_colors) {
          // Fall back to AI description-based colors
          aiSuggestions = {
            brand_colors: updatedData._ai_brand_colors as { primary: string; secondary: string; reasoning: string },
            should_auto_apply: (updatedData._ai_confidence as number) >= AUTO_APPLY_THRESHOLD
          }
        }
        break

      case 'primary_color':
        updatedData.primary_color = message
        // Use suggested secondary color: Logo colors > AI colors > Generated
        if (updatedData._logo_colors?.suggested_secondary) {
          updatedData.secondary_color = updatedData._logo_colors.suggested_secondary
        } else if (updatedData._ai_brand_colors && (updatedData._ai_brand_colors as { primary: string; secondary: string }).secondary) {
          updatedData.secondary_color = (updatedData._ai_brand_colors as { primary: string; secondary: string }).secondary
        } else {
          updatedData.secondary_color = generateSecondaryColor(message)
        }
        break

      case 'contact_info':
        // Parse multi-input contact info
        try {
          const contactData = JSON.parse(message)
          updatedData.contact_email = contactData.email
          // Phone should already be normalized by frontend, but normalize again just in case
          updatedData.contact_phone = normalizePhoneNumber(contactData.phone)
          updatedData.whatsapp = contactData.whatsapp ? normalizePhoneNumber(contactData.whatsapp) : null
          updatedData.instagram = contactData.instagram || null
        } catch {
          // If not JSON, assume it's just phone number
          updatedData.contact_phone = normalizePhoneNumber(message)
          updatedData.contact_email = user.email || ''
        }
        break

      case 'gstin':
        const skipValues = ['skip', 'no', '']
        if (message && !skipValues.includes(message.toLowerCase().trim())) {
          updatedData.gstin = message.toUpperCase() // GSTIN should be uppercase
        }
        break

      case 'template_selection':
        // User selected a theme variant (e.g., 'modern-spotlight')
        updatedData.theme_variant = message
        console.log(`[Onboarding] Selected template variant: ${message}`)
        break

      case 'build_store':
        // User has confirmed they want to build the store
        // No data to store, this triggers the completion
        break
    }

    // Merge AI extracted data
    const finalData = { ...updatedData, ...aiExtractedData }

    // Get next step based on current step ID (not sequential number)
    const nextStepDef = getNextStep(current_step, finalData)

    if (!nextStepDef) {
      // Onboarding complete
      return NextResponse.json<ProcessMessageResponse>({
        next_question: "You're all set! Let me create your store...",
        extracted_data: finalData,
        current_step: 11, // Beyond last step
        is_complete: true
      })
    }

    // Format next question with current data
    const nextQuestion = formatQuestion(nextStepDef, finalData)

    const response: EnhancedProcessMessageResponse = {
      next_question: nextQuestion,
      extracted_data: finalData,
      current_step: nextStepDef.id, // Use the actual step ID
      is_complete: false,
      options: nextStepDef.options
    }

    // Include AI suggestions if available
    if (aiSuggestions) {
      response.ai_suggestions = aiSuggestions
    }

    // Include AI confidence if available
    if (aiConfidence) {
      response.ai_confidence = aiConfidence
    }

    console.log(`[Onboarding] Step ${current_step} -> ${nextStepDef.id} (${nextStepDef.key})`)

    return NextResponse.json(response)
  } catch (error) {
    console.error('Onboarding process error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process message' },
      { status: 500 }
    )
  }
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 30)
}

function normalizePhoneNumber(phone: string): string {
  let normalized = phone.trim()
  // Remove +91 or 91 prefix
  if (normalized.startsWith('+91')) {
    normalized = normalized.slice(3)
  } else if (normalized.startsWith('91') && normalized.length > 10) {
    normalized = normalized.slice(2)
  }
  // Remove any spaces or dashes
  normalized = normalized.replace(/[\s-]/g, '')
  return normalized
}

function generateSecondaryColor(primary: string): string {
  // Simple complementary color generation
  // In production, use a proper color library
  try {
    const hex = primary.replace('#', '')
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)

    // Create a lighter/darker variant
    const factor = (r + g + b) / 3 > 128 ? 0.7 : 1.3
    const newR = Math.min(255, Math.round(r * factor))
    const newG = Math.min(255, Math.round(g * factor))
    const newB = Math.min(255, Math.round(b * factor))

    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
  } catch {
    return '#6B7280' // Default gray
  }
}
