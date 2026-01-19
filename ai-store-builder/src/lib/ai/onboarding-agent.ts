// AI Onboarding Agent Service - Using Google Gemini

import { GoogleGenerativeAI } from '@google/generative-ai'
import { z } from 'zod'
import {
  CATEGORY_EXTRACTION_PROMPT,
  NAME_SUGGESTION_PROMPT,
  TAGLINE_PROMPT,
  NEXT_QUESTION_PROMPT,
  BRAND_COLOR_SUGGESTION_PROMPT,
  fillPrompt
} from './prompts/onboarding'
import {
  categoryExtractionResponseSchema,
  nameSuggestionResponseSchema,
  taglineResponseSchema,
  colorSuggestionResponseSchema
} from '@/lib/validations/onboarding'
import type { CategoryExtractionResult, NameSuggestion, StoreData } from '@/lib/types/onboarding'

// Additional schema for next question response
const nextQuestionSchema = z.object({
  question: z.string(),
  acknowledgment: z.string().optional()
})

class OnboardingAgent {
  private client: GoogleGenerativeAI
  private model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>

  constructor() {
    this.client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
    // Use gemini-2.0-flash which is the current available model
    this.model = this.client.getGenerativeModel({ model: 'gemini-2.0-flash' })
  }

  private async callAI(prompt: string, maxRetries = 3): Promise<string> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await this.model.generateContent(prompt)
        const response = result.response
        const text = response.text()

        if (text) {
          return text
        }
        throw new Error('Empty response from Gemini')
      } catch (error) {
        lastError = error as Error
        console.error(`AI call attempt ${attempt + 1} failed:`, error)
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
      }
    }

    throw lastError || new Error('AI call failed after retries')
  }

  private parseJSON<T>(text: string, schema: z.ZodSchema<T>): T {
    // Try to extract JSON from the response
    let jsonText = text.trim()

    // Remove markdown code blocks if present
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim()
    }

    // Find JSON object in the text
    const objectMatch = jsonText.match(/\{[\s\S]*\}/)
    if (objectMatch) {
      jsonText = objectMatch[0]
    }

    try {
      const parsed = JSON.parse(jsonText)
      return schema.parse(parsed)
    } catch (error) {
      console.error('Failed to parse AI response:', text)
      throw new Error('Failed to parse AI response as valid JSON')
    }
  }

  async extractCategory(description: string): Promise<CategoryExtractionResult> {
    const prompt = fillPrompt(CATEGORY_EXTRACTION_PROMPT, { description })
    const response = await this.callAI(prompt)
    return this.parseJSON(response, categoryExtractionResponseSchema)
  }

  async suggestStoreNames(description: string): Promise<NameSuggestion[]> {
    const prompt = fillPrompt(NAME_SUGGESTION_PROMPT, { description })
    const response = await this.callAI(prompt)
    const parsed = this.parseJSON(response, nameSuggestionResponseSchema)

    return parsed.suggestions.map(s => ({
      name: s.name,
      slug: this.generateSlug(s.name),
      available: true // Will be checked against database separately
    }))
  }

  async generateTagline(name: string, description: string): Promise<string> {
    const prompt = fillPrompt(TAGLINE_PROMPT, { name, description })
    const response = await this.callAI(prompt)
    const parsed = this.parseJSON(response, taglineResponseSchema)
    return parsed.tagline
  }

  async generateNextQuestion(
    step: number,
    stepName: string,
    collectedData: Partial<StoreData>,
    previousResponse?: string
  ): Promise<{ question: string; acknowledgment?: string }> {
    const prompt = fillPrompt(NEXT_QUESTION_PROMPT, {
      step: step.toString(),
      step_name: stepName,
      collected_data: JSON.stringify(collectedData),
      previous_response: previousResponse || 'N/A'
    })

    const response = await this.callAI(prompt)
    return this.parseJSON(response, nextQuestionSchema)
  }

  async suggestBrandColors(
    businessType: string,
    brandVibe: string,
    description: string
  ): Promise<{ primary: string; secondary: string }> {
    const prompt = fillPrompt(BRAND_COLOR_SUGGESTION_PROMPT, {
      business_type: businessType,
      brand_vibe: brandVibe,
      description
    })

    const response = await this.callAI(prompt)
    const parsed = this.parseJSON(response, colorSuggestionResponseSchema)
    return {
      primary: parsed.primary,
      secondary: parsed.secondary
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 30)
  }
}

// Export singleton instance
export const onboardingAgent = new OnboardingAgent()

// Export class for testing
export { OnboardingAgent }
