// Vercel AI SDK Provider Configuration
// This file sets up the AI provider for easy switching between providers

import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createAnthropic } from '@ai-sdk/anthropic'

// ============================================
// PROVIDER SELECTION
// ============================================

// AI Provider: 'anthropic' | 'google'
export const AI_PROVIDER = (process.env.AI_PROVIDER || 'google') as 'anthropic' | 'google'

// Feature flag for gradual migration to Vercel AI SDK
export const USE_VERCEL_AI = process.env.USE_VERCEL_AI === 'true'

// ============================================
// GOOGLE GEMINI PROVIDER
// ============================================

export const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
})

// Gemini models - using stable versions
export const geminiFlash = google('gemini-2.0-flash')
export const geminiFlashVision = google('gemini-2.0-flash')

// ============================================
// ANTHROPIC CLAUDE PROVIDER
// ============================================

export const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Claude models - Sonnet for complex tasks, Haiku for fast/simple tasks
export const claudeSonnet = anthropic('claude-sonnet-4-20250514')
export const claudeHaiku = anthropic('claude-haiku-4-20250514')

// ============================================
// MODEL SELECTION HELPERS
// ============================================

// Get the appropriate text model based on provider
export function getTextModel() {
  return AI_PROVIDER === 'anthropic' ? claudeSonnet : geminiFlash
}

// Get the appropriate vision model based on provider
export function getVisionModel() {
  // Anthropic Claude supports vision
  return AI_PROVIDER === 'anthropic' ? claudeSonnet : geminiFlashVision
}

// Get the fast model for simple tasks (lower cost)
export function getFastModel() {
  return AI_PROVIDER === 'anthropic' ? claudeHaiku : geminiFlash
}

// ============================================
// CONFIDENCE THRESHOLDS
// ============================================

export const CONFIDENCE_THRESHOLDS = {
  // High confidence - auto-confirm without user input
  AUTO_CONFIRM: 0.80,
  // Medium confidence - auto-confirm but highlight for review
  AUTO_CONFIRM_REVIEW: 0.70,
  // Low confidence - require user confirmation
  REQUIRE_CONFIRMATION: 0.60,
}

// ============================================
// MODEL CONFIGURATION
// ============================================

export const modelConfig = {
  text: {
    temperature: 0.7,
    maxTokens: 2048,
  },
  vision: {
    temperature: 0.7,
    maxTokens: 4096,
  },
  streaming: {
    temperature: 0.8,
    maxTokens: 1024,
  },
  // Lower temperature for more consistent categorization
  categorization: {
    temperature: 0.3,
    maxTokens: 1024,
  },
  // Higher temperature for creative content
  creative: {
    temperature: 0.9,
    maxTokens: 2048,
  },
}
