// Onboarding Question Flow Definition

import type { OnboardingStep, StoreData } from '@/lib/types/onboarding'

// Business categories for manual selection
export const BUSINESS_CATEGORIES = [
  { value: 'fashion', label: 'Fashion & Apparel', type: 'Fashion' },
  { value: 'food', label: 'Food & Beverages', type: 'Food & Beverages' },
  { value: 'electronics', label: 'Electronics & Gadgets', type: 'Electronics' },
  { value: 'home', label: 'Home & Living', type: 'Home & Living' },
  { value: 'beauty', label: 'Beauty & Personal Care', type: 'Beauty & Personal Care' },
  { value: 'health', label: 'Health & Wellness', type: 'Health & Wellness' },
  { value: 'arts', label: 'Arts & Crafts', type: 'Arts & Crafts' },
  { value: 'jewelry', label: 'Jewelry & Accessories', type: 'Jewelry & Accessories' },
  { value: 'books', label: 'Books & Stationery', type: 'Books & Stationery' },
  { value: 'toys', label: 'Toys & Games', type: 'Toys & Games' },
  { value: 'sports', label: 'Sports & Fitness', type: 'Sports & Fitness' },
  { value: 'services', label: 'Services', type: 'Services' },
  { value: 'other', label: 'Other', type: 'Other' }
]

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 1,
    key: 'business_name',
    question: "Let's start with your business name. What would you like to call your store?",
    type: 'text',
    required: true,
    validation: {
      minLength: 2,
      maxLength: 50
    }
  },
  {
    id: 2,
    key: 'description',
    question: "Tell me about your business. What do you sell and what makes it special?",
    type: 'text',
    required: true,
    validation: {
      minLength: 20,
      maxLength: 500
    },
    aiExtraction: true
  },
  {
    id: 3,
    key: 'category_confirmation',
    question: "Based on what you told me, I think your business falls under {business_type} - specifically {niche}. Does this sound right?",
    type: 'select',
    required: true,
    options: [
      { value: 'yes', label: 'Yes, that sounds right!' },
      { value: 'no', label: "No, let me specify" }
    ],
    // Skip this step if AI extraction failed (go straight to manual selection)
    skipIf: (data: Partial<StoreData>) => !data.business_type || data.business_type === ''
  },
  {
    id: 31, // 3.1 - Manual category selection (only shown if AI fails or user says no)
    key: 'manual_category',
    question: "What category best describes your business?",
    type: 'select',
    required: true,
    options: BUSINESS_CATEGORIES,
    // Only show if business_type is not set (AI failed) or user rejected AI suggestion
    skipIf: (data: Partial<StoreData>) => !!data.business_type && data.business_type !== ''
  },
  {
    id: 4,
    key: 'target_geography',
    question: "Where do you want to sell? This helps us set up shipping and payments.",
    type: 'select',
    required: true,
    options: [
      { value: 'local', label: 'Local (my city/region)' },
      { value: 'india', label: 'All over India' },
      { value: 'international', label: 'International (including India)' }
    ]
  },
  {
    id: 5,
    key: 'logo_url',
    question: "Do you have a logo? Upload one, or let AI generate a professional icon for your brand.",
    type: 'file',
    required: false
  },
  {
    id: 6,
    key: 'brand_vibe',
    question: "What vibe best describes your brand?",
    type: 'select',
    required: true,
    options: [
      { value: 'modern', label: 'Modern & Clean' },
      { value: 'classic', label: 'Classic & Elegant' },
      { value: 'playful', label: 'Playful & Fun' },
      { value: 'minimal', label: 'Minimal & Simple' }
    ]
  },
  {
    id: 7,
    key: 'primary_color',
    question: "Pick a primary color for your brand, or I can suggest one based on your vibe.",
    type: 'color',
    required: true
  },
  {
    id: 8,
    key: 'contact_info',
    question: "How can your customers reach you? Add your contact details.",
    type: 'multi-input',
    required: true,
    // Note: Phone validation is handled in the API after normalization
    // Pattern accepts: 10 digits, or +91/91 prefix + 10 digits
    validation: {
      pattern: '^(\\+91|91)?[6-9]\\d{9}$',
      patternMessage: 'Please enter a valid Indian mobile number'
    }
  },
  {
    id: 9,
    key: 'gstin',
    question: "Do you have a GSTIN? This is optional but helps with invoicing.",
    type: 'text',
    required: false,
    skipIf: (data: Partial<StoreData>) => data.target_geography === 'international',
    validation: {
      pattern: '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$',
      patternMessage: 'Please enter a valid GSTIN'
    }
  },
  {
    id: 10,
    key: 'template_selection',
    question: "Choose a layout style that matches your vision. Here are 4 options that fit your {brand_vibe} vibe:",
    type: 'template-select',
    required: true
  },
  {
    id: 11,
    key: 'build_store',
    question: "Perfect! I have everything I need to create your store. Ready to build it?",
    type: 'action',
    required: true,
    options: [
      { value: 'build', label: "🚀 Build My Store" }
    ]
  }
]

export function getStep(stepId: number): OnboardingStep | undefined {
  return ONBOARDING_STEPS.find(s => s.id === stepId)
}

export function getStepByKey(key: string): OnboardingStep | undefined {
  return ONBOARDING_STEPS.find(s => s.key === key)
}

export function getStepIndex(stepId: number): number {
  return ONBOARDING_STEPS.findIndex(s => s.id === stepId)
}

export function getNextStep(currentStepId: number, data: Partial<StoreData>): OnboardingStep | null {
  // Find current step index in array
  const currentIndex = ONBOARDING_STEPS.findIndex(s => s.id === currentStepId)
  if (currentIndex === -1) return null

  // Look for next valid step starting from the step after current
  for (let i = currentIndex + 1; i < ONBOARDING_STEPS.length; i++) {
    const step = ONBOARDING_STEPS[i]
    if (step.skipIf && step.skipIf(data)) {
      continue
    }
    return step
  }
  return null
}

// Get the next step to show, starting from after the current step
export function getNextStepAfterCurrent(currentStepId: number, data: Partial<StoreData>): OnboardingStep | null {
  return getNextStep(currentStepId, data)
}

export function getPreviousStep(currentStepId: number, stepHistory: number[]): OnboardingStep | null {
  // Find the previous step from history (the one before current)
  const currentIndex = stepHistory.indexOf(currentStepId)
  if (currentIndex <= 0) return null

  const previousStepId = stepHistory[currentIndex - 1]
  return ONBOARDING_STEPS.find(s => s.id === previousStepId) || null
}

export function canGoBack(currentStepId: number, stepHistory: number[]): boolean {
  // Can go back if we're not on the first step and have history
  return stepHistory.length > 1 && stepHistory.indexOf(currentStepId) > 0
}

export function formatQuestion(step: OnboardingStep, data: Partial<StoreData>): string {
  let question = step.question

  // Replace placeholders with actual data or fallbacks
  question = question.replace('{business_type}', data.business_type || 'your category')
  question = question.replace('{niche}', data.niche || 'your niche')
  question = question.replace('{business_name}', data.business_name || 'your store')

  return question
}

// Normalize phone number - strip +91 or 91 prefix if present
function normalizePhone(phone: string): string {
  let normalized = phone.trim()
  if (normalized.startsWith('+91')) {
    normalized = normalized.slice(3)
  } else if (normalized.startsWith('91') && normalized.length > 10) {
    normalized = normalized.slice(2)
  }
  return normalized.replace(/[\s-]/g, '')
}

export function validateStepResponse(
  step: OnboardingStep,
  value: string
): { valid: boolean; error?: string } {
  if (step.required && (!value || value.trim() === '')) {
    return { valid: false, error: 'This field is required' }
  }

  if (!value && !step.required) {
    return { valid: true }
  }

  // Special handling for multi-input (contact info)
  if (step.type === 'multi-input') {
    try {
      const contactData = JSON.parse(value)
      // Validate email
      if (!contactData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactData.email)) {
        return { valid: false, error: 'Please enter a valid email address' }
      }
      // Validate phone (normalize first, then check 10 digits starting with 6-9)
      const normalizedPhone = normalizePhone(contactData.phone || '')
      if (!normalizedPhone || !/^[6-9]\d{9}$/.test(normalizedPhone)) {
        return { valid: false, error: 'Please enter a valid Indian mobile number (10 digits starting with 6-9)' }
      }
      // Validate WhatsApp if provided (optional)
      if (contactData.whatsapp) {
        const normalizedWhatsapp = normalizePhone(contactData.whatsapp)
        if (!/^[6-9]\d{9}$/.test(normalizedWhatsapp)) {
          return { valid: false, error: 'Please enter a valid WhatsApp number' }
        }
      }
      return { valid: true }
    } catch {
      return { valid: false, error: 'Invalid contact information format' }
    }
  }

  // Skip validation for "skip", "no", or empty values on optional fields
  const skipValues = ['skip', 'no', '']
  if (!step.required && skipValues.includes(value.toLowerCase().trim())) {
    return { valid: true }
  }

  const validation = step.validation
  if (validation) {
    if (validation.minLength && value.length < validation.minLength) {
      return { valid: false, error: `Must be at least ${validation.minLength} characters` }
    }
    if (validation.maxLength && value.length > validation.maxLength) {
      return { valid: false, error: `Must be no more than ${validation.maxLength} characters` }
    }
    if (validation.pattern) {
      const regex = new RegExp(validation.pattern)
      if (!regex.test(value)) {
        return { valid: false, error: validation.patternMessage || 'Invalid format' }
      }
    }
  }

  return { valid: true }
}

export const TOTAL_STEPS = ONBOARDING_STEPS.length
