import { z } from 'zod'

// Process message request validation
// Step IDs: 1-10 for main steps, 31 for manual category selection
export const processMessageSchema = z.object({
  session_id: z.string().uuid('Invalid session ID'),
  message: z.string().min(1, 'Message is required'),
  current_step: z.number().int().min(1).max(31),
  extracted_data: z.record(z.unknown()).optional()
})

// Category extraction request validation
export const extractCategorySchema = z.object({
  description: z.string().min(10, 'Description must be at least 10 characters')
})

// Name suggestion request validation
export const suggestNamesSchema = z.object({
  description: z.string().min(10, 'Description must be at least 10 characters')
})

// Complete onboarding request validation
export const completeOnboardingSchema = z.object({
  store_id: z.string().uuid('Invalid store ID')
})

// Store data validation for blueprint generation
export const storeDataSchema = z.object({
  business_name: z.string().min(2, 'Business name must be at least 2 characters').max(50),
  slug: z.string().min(2).max(30).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(500),
  tagline: z.string().max(60).optional(),

  // Category - make business_type optional with default
  business_type: z.string().optional().default('General'),
  business_category: z.array(z.string()).optional().default([]),
  niche: z.string().optional().default(''),
  keywords: z.array(z.string()).optional().default([]),

  // Location
  target_geography: z.enum(['local', 'india', 'international']),
  country: z.string().optional().default('India'),
  currency: z.string().optional().default('INR'),
  timezone: z.string().optional().default('Asia/Kolkata'),

  // Branding
  logo_url: z.string().url().nullable().optional(),
  brand_vibe: z.enum(['modern', 'classic', 'playful', 'minimal']),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  secondary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional(),

  // Contact - more flexible phone validation
  contact_email: z.string().email('Invalid email address'),
  contact_phone: z.string().min(10, 'Phone number must be at least 10 digits').regex(/^\d{10,15}$/, 'Phone must be 10-15 digits'),
  whatsapp: z.string().regex(/^\d{10,15}$/, 'WhatsApp must be 10-15 digits').nullable().optional().or(z.literal('')),
  instagram: z.string().regex(/^@?[\w.]+$/, 'Invalid Instagram handle').nullable().optional().or(z.literal('')),

  // Business
  gstin: z.string().regex(
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    'Invalid GSTIN format'
  ).nullable().optional().or(z.literal('')),

  // Status
  product_readiness: z.enum(['ready', 'soon', 'exploring']).optional()
})

// Contact info multi-input validation
export const contactInfoSchema = z.object({
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').regex(/^\d{10,15}$/, 'Phone must be 10-15 digits'),
  whatsapp: z.string().regex(/^\d{10,15}$/, 'WhatsApp must be 10-15 digits').optional().or(z.literal('')),
  instagram: z.string().regex(/^@?[\w.]+$/, 'Invalid Instagram handle').optional().or(z.literal(''))
})

// AI response validation schemas
export const categoryExtractionResponseSchema = z.object({
  business_type: z.string(),
  business_category: z.array(z.string()),
  niche: z.string(),
  keywords: z.array(z.string()),
  confidence: z.number().min(0).max(1)
})

export const nameSuggestionResponseSchema = z.object({
  suggestions: z.array(z.object({
    name: z.string(),
    reasoning: z.string()
  }))
})

export const taglineResponseSchema = z.object({
  tagline: z.string().max(60)
})

export const colorSuggestionResponseSchema = z.object({
  primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  reasoning: z.string()
})

// Type exports
export type ProcessMessageInput = z.infer<typeof processMessageSchema>
export type ExtractCategoryInput = z.infer<typeof extractCategorySchema>
export type SuggestNamesInput = z.infer<typeof suggestNamesSchema>
export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>
export type StoreDataInput = z.infer<typeof storeDataSchema>
export type ContactInfoInput = z.infer<typeof contactInfoSchema>
export type CategoryExtractionResponse = z.infer<typeof categoryExtractionResponseSchema>
export type NameSuggestionResponse = z.infer<typeof nameSuggestionResponseSchema>
export type TaglineResponse = z.infer<typeof taglineResponseSchema>
export type ColorSuggestionResponse = z.infer<typeof colorSuggestionResponseSchema>
