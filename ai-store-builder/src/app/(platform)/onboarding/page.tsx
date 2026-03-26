// src/app/(platform)/onboarding/page.tsx
'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useRequireAuth } from '@/lib/hooks/use-require-auth'
import { useAuth } from '@/lib/contexts/auth-context'
import { toast } from 'sonner'
import {
  Store,
  Palette,
  Package,
  Rocket,
  Upload,
  Sparkles,
  Check,
  ArrowLeft,
  ArrowRight,
  ImagePlus,
  ExternalLink,
  Loader2,
} from 'lucide-react'

const STEPS = [
  { label: 'Store Basics', icon: Store },
  { label: 'Brand & Theme', icon: Palette },
  { label: 'First Product', icon: Package },
  { label: 'Store Live!', icon: Rocket },
] as const

const CATEGORIES = [
  'Fashion & Apparel',
  'Electronics & Gadgets',
  'Health & Beauty',
  'Home & Living',
  'Food & Beverages',
  'Jewelry & Accessories',
  'Art & Crafts',
  'Sports & Fitness',
  'Books & Stationery',
] as const

const THEMES = [
  {
    id: 'modern',
    label: 'Modern',
    description: 'Clean lines, bold typography. Best for tech, fashion, and contemporary brands.',
  },
  {
    id: 'classic',
    label: 'Classic',
    description: 'Timeless, elegant design. Ideal for luxury, jewelry, and artisan products.',
  },
  {
    id: 'playful',
    label: 'Playful',
    description: 'Bright colors, rounded shapes. Perfect for kids, food, and lifestyle brands.',
  },
  {
    id: 'minimal',
    label: 'Minimal',
    description: 'Stripped back, content-focused. Great for art, photography, and premium goods.',
  },
] as const

const PRESET_COLORS = [
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Blue', value: '#3b82f6' },
] as const

type Theme = (typeof THEMES)[number]['id']
type Category = (typeof CATEGORIES)[number]

interface OnboardingFormData {
  storeName: string
  slug: string
  description: string
  category: Category | ''
  logoFile: File | null
  logoPreview: string | null
  theme: Theme
  primaryColor: string
  productImages: File[]
  skipProduct: boolean
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

const LOCALSTORAGE_KEY = 'onboarding-draft'

// Visually distinct mini theme previews — each layout, typography & shape language is unique
function ThemePreview({ theme }: { theme: typeof THEMES[number] }) {
  if (theme.id === 'modern') {
    // Modern: Dark bg, large hero image, bold sans nav, asymmetric grid
    return (
      <div className="h-32 w-full overflow-hidden rounded-lg bg-zinc-900 p-2">
        {/* Bold sans nav */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="h-2 w-10 rounded-sm bg-white/90" />
          <div className="flex gap-1.5">
            <div className="h-1 w-5 rounded-sm bg-white/25" />
            <div className="h-1 w-5 rounded-sm bg-white/25" />
            <div className="h-1 w-5 rounded-sm bg-white/25" />
          </div>
        </div>
        {/* Full-width hero banner */}
        <div className="mb-2 h-10 rounded-md bg-gradient-to-r from-blue-600 to-indigo-700 p-1.5">
          <div className="h-1.5 w-14 rounded-sm bg-white/80" />
          <div className="mt-1 h-1 w-10 rounded-sm bg-white/40" />
          <div className="mt-1.5 h-2 w-8 rounded-sm bg-white/90" />
        </div>
        {/* Asymmetric product grid: 1 large + 2 small */}
        <div className="flex gap-1">
          <div className="h-10 w-1/2 rounded-md bg-zinc-700/60" />
          <div className="flex w-1/2 flex-col gap-1">
            <div className="h-[19px] rounded-md bg-zinc-700/40" />
            <div className="h-[19px] rounded-md bg-zinc-700/40" />
          </div>
        </div>
      </div>
    )
  }

  if (theme.id === 'classic') {
    // Classic: Cream bg, serif-style nav, centered hero text, bordered product cards
    return (
      <div className="h-32 w-full overflow-hidden rounded-sm bg-stone-50 p-2">
        {/* Centered serif-style nav with decorative line */}
        <div className="flex flex-col items-center mb-1">
          <div className="h-2 w-12 rounded-sm bg-amber-800/70" />
          <div className="mt-1 h-px w-full bg-amber-800/15" />
          <div className="mt-0.5 flex gap-2">
            <div className="h-0.5 w-4 rounded-full bg-amber-800/20" />
            <div className="h-0.5 w-4 rounded-full bg-amber-800/20" />
            <div className="h-0.5 w-4 rounded-full bg-amber-800/20" />
          </div>
        </div>
        {/* Centered hero text block with decorative accents */}
        <div className="mb-2 flex flex-col items-center">
          <div className="h-0.5 w-4 rounded-full bg-amber-700/30" />
          <div className="mt-1 h-2 w-20 rounded-sm bg-stone-800/60" />
          <div className="mt-0.5 h-1 w-14 rounded-sm bg-stone-800/20" />
          <div className="mt-1 h-0.5 w-4 rounded-full bg-amber-700/30" />
        </div>
        {/* 3-column product grid with borders */}
        <div className="grid grid-cols-3 gap-1.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="h-8 w-full rounded-sm border border-stone-200 bg-stone-100" />
              <div className="mt-0.5 h-0.5 w-6 rounded-full bg-stone-400/40" />
              <div className="mt-0.5 h-0.5 w-4 rounded-full bg-amber-700/30" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (theme.id === 'playful') {
    // Playful: Warm bg, rounded nav pills, colorful hero with shapes, bubbly card grid
    return (
      <div className="h-32 w-full overflow-hidden rounded-2xl bg-orange-50 p-2">
        {/* Rounded pill nav */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="h-2.5 w-10 rounded-full bg-orange-400/80" />
          <div className="flex gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-pink-400/60" />
            <div className="h-1.5 w-1.5 rounded-full bg-yellow-400/60" />
            <div className="h-1.5 w-1.5 rounded-full bg-green-400/60" />
          </div>
        </div>
        {/* Colorful hero with floating shapes */}
        <div className="relative mb-2 h-10 overflow-hidden rounded-xl bg-gradient-to-br from-orange-300 via-pink-300 to-yellow-200">
          <div className="absolute right-1 top-1 h-4 w-4 rounded-full bg-yellow-400/50" />
          <div className="absolute right-5 bottom-0.5 h-3 w-3 rounded-full bg-pink-400/40" />
          <div className="p-1.5">
            <div className="h-1.5 w-12 rounded-full bg-white/80" />
            <div className="mt-1 h-1 w-8 rounded-full bg-white/50" />
            <div className="mt-1.5 h-2.5 w-10 rounded-full bg-white/90" />
          </div>
        </div>
        {/* Bubbly product grid with colored backgrounds */}
        <div className="grid grid-cols-3 gap-1.5">
          <div className="h-8 rounded-xl bg-pink-200/60" />
          <div className="h-8 rounded-xl bg-yellow-200/60" />
          <div className="h-8 rounded-xl bg-green-200/60" />
        </div>
      </div>
    )
  }

  // Minimal: White bg, hairline borders, lots of whitespace, thin typography
  return (
    <div className="h-32 w-full overflow-hidden border border-zinc-200 bg-white p-3">
      {/* Ultra-thin nav with spacing */}
      <div className="flex items-center justify-between mb-3">
        <div className="h-1 w-8 bg-zinc-900" />
        <div className="flex gap-3">
          <div className="h-px w-4 bg-zinc-300" />
          <div className="h-px w-4 bg-zinc-300" />
        </div>
      </div>
      {/* Minimal hero: just text, lots of space */}
      <div className="mb-3">
        <div className="h-1.5 w-20 bg-zinc-800" />
        <div className="mt-1.5 h-px w-14 bg-zinc-300" />
      </div>
      {/* Grid with thin borders only — no fills */}
      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col gap-0.5">
            <div className="aspect-square border border-zinc-200" />
            <div className="h-px w-full bg-zinc-200" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  const { isLoading: authLoading } = useRequireAuth()
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<OnboardingFormData>({
    storeName: '',
    slug: '',
    description: '',
    category: '',
    logoFile: null,
    logoPreview: null,
    theme: 'modern',
    primaryColor: '#6366f1',
    productImages: [],
    skipProduct: false,
  })

  // AI category detection state
  const [aiDetecting, setAiDetecting] = useState(false)
  const [aiSuggestedCategory, setAiSuggestedCategory] = useState<Category | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Store creation state
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Store URL returned by API (environment-aware)
  const [storeUrl, setStoreUrl] = useState<string | null>(null)

  // Logo generation state
  const [generatingLogo, setGeneratingLogo] = useState(false)

  // Track if initial load from localStorage is done
  const [hydrated, setHydrated] = useState(false)

  const updateField = useCallback(<K extends keyof OnboardingFormData>(key: K, value: OnboardingFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const name = e.target.value
      updateField('storeName', name)
      updateField('slug', generateSlug(name))
    },
    [updateField]
  )

  const handleLogoUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      updateField('logoFile', file)
      const reader = new FileReader()
      reader.onload = (ev) => {
        updateField('logoPreview', ev.target?.result as string)
      }
      reader.readAsDataURL(file)
    },
    [updateField]
  )

  const handleProductImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files) return
      // Limit to 5 images, max 10MB each
      const validFiles = Array.from(files).filter(f => f.size <= 10 * 1024 * 1024).slice(0, 5 - formData.productImages.length)
      if (validFiles.length < Array.from(files).length) {
        toast.info('Images over 10MB were skipped. Max 5 images allowed.')
      }
      updateField('productImages', [...formData.productImages, ...validFiles])
      updateField('skipProduct', false)
    },
    [formData.productImages, updateField]
  )

  // AI category auto-detection
  useEffect(() => {
    if (formData.description.trim().length < 15) {
      return
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(async () => {
      setAiDetecting(true)
      try {
        const res = await fetch('/api/onboarding/analyze-brand', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            brand_description: formData.description,
            business_name: formData.storeName || undefined,
          }),
        })

        if (!res.ok) {
          console.warn('[AI Category] API returned', res.status, res.statusText)
          return
        }

        const json = await res.json()
        console.log('[AI Category] Response:', JSON.stringify(json.data?.category))

        if (json.success && json.data) {
          const { category: detected } = json.data
          if (detected.confidence >= 0.5) {
            // Map the AI business_type to our CATEGORIES using expanded fuzzy matching.
            // The AI may return short types like "Beauty", "Health", "Fashion" which need
            // to match compound category names like "Health & Beauty", "Fashion & Apparel".
            const detectedType = detected.business_type.toLowerCase()
            // Also check business_category array for additional signals
            const detectedCategories = (detected.business_category ?? []).map((c: string) => c.toLowerCase())

            // Keyword aliases to help with common mismatches
            const categoryAliases: Record<string, string[]> = {
              'fashion & apparel': ['fashion', 'apparel', 'clothing', 'clothes', 'wear', 'textile'],
              'electronics & gadgets': ['electronics', 'gadgets', 'tech', 'technology', 'devices'],
              'health & beauty': ['health', 'beauty', 'skincare', 'cosmetics', 'wellness', 'personal care', 'organic', 'soap'],
              'home & living': ['home', 'living', 'furniture', 'decor', 'household', 'interior'],
              'food & beverages': ['food', 'beverages', 'grocery', 'drink', 'snack', 'meal'],
              'jewelry & accessories': ['jewelry', 'accessories', 'jewellery', 'ornaments', 'watches'],
              'art & crafts': ['art', 'crafts', 'handmade', 'craft', 'handcraft', 'artisan'],
              'sports & fitness': ['sports', 'fitness', 'gym', 'athletic', 'exercise', 'outdoor'],
              'books & stationery': ['books', 'stationery', 'education', 'office', 'writing', 'paper'],
            }

            const matchedCategory = CATEGORIES.find((cat) => {
              const catLower = cat.toLowerCase()
              const aliases = categoryAliases[catLower] ?? []

              // Direct match
              if (catLower === detectedType) return true
              // Category contains detected type or vice versa
              if (catLower.includes(detectedType) || detectedType.includes(catLower)) return true
              // Alias match on business_type
              if (aliases.some((alias) => detectedType.includes(alias) || alias.includes(detectedType))) return true
              // Alias match on any business_category array item
              if (detectedCategories.some((dc: string) =>
                aliases.some((alias) => dc.includes(alias) || alias.includes(dc)) ||
                catLower.includes(dc) || dc.includes(catLower)
              )) return true
              return false
            })

            console.log('[AI Category] Detected:', detected.business_type, '→ Matched:', matchedCategory ?? 'none')

            if (matchedCategory) {
              setAiSuggestedCategory(matchedCategory)
              // Only auto-set if user hasn't manually picked a different one
              setFormData((prev) => {
                if (prev.category === '' || prev.category === aiSuggestedCategory) {
                  return { ...prev, category: matchedCategory }
                }
                return prev
              })
            }
          }
        } else if (!json.success) {
          console.warn('[AI Category] Detection failed:', json.error)
        }
      } catch (err) {
        // Non-blocking — AI detection is a nice-to-have, but log for debugging
        console.warn('[AI Category] Detection error:', err)
      } finally {
        setAiDetecting(false)
      }
    }, 1500)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.description, formData.storeName])

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCALSTORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        setFormData((prev) => ({
          ...prev,
          storeName: parsed.storeName || '',
          slug: parsed.slug || '',
          description: parsed.description || '',
          category: parsed.category || '',
          theme: parsed.theme || 'modern',
          primaryColor: parsed.primaryColor || '#6366f1',
          skipProduct: parsed.skipProduct || false,
          logoPreview: parsed.logoPreview || null,
        }))
        if (typeof parsed.currentStep === 'number' && parsed.currentStep < 3) {
          setCurrentStep(parsed.currentStep)
        }
      }
    } catch {
      // Ignore parse errors
    }
    setHydrated(true)
  }, [])

  // Save to localStorage on every formData/step change (after hydration)
  useEffect(() => {
    if (!hydrated) return
    try {
      const toSave = {
        storeName: formData.storeName,
        slug: formData.slug,
        description: formData.description,
        category: formData.category,
        theme: formData.theme,
        primaryColor: formData.primaryColor,
        skipProduct: formData.skipProduct,
        logoPreview: formData.logoPreview,
        currentStep,
      }
      localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(toSave))
    } catch {
      // Ignore quota errors
    }
  }, [formData, currentStep, hydrated])

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0:
        return formData.storeName.trim().length >= 2 && formData.description.trim().length >= 10 && formData.category !== ''
      case 1:
        return true // theme and color have defaults
      case 2:
        return true // can skip product
      case 3:
        return true
      default:
        return false
    }
  }

  const handleNext = async () => {
    if (!canProceed()) return

    // Wire step 2 ("Launch Store") to API
    if (currentStep === 2) {
      setIsCreating(true)
      setCreateError(null)

      try {
        // 1. Upload logo if user selected a file
        let logoUrl: string | null = null
        if (formData.logoFile) {
          const logoFormData = new FormData()
          logoFormData.append('file', formData.logoFile)
          const logoRes = await fetch('/api/onboarding/upload-logo', {
            method: 'POST',
            credentials: 'include',
            body: logoFormData,
          })
          const logoJson = await logoRes.json()
          if (logoJson.success) {
            logoUrl = logoJson.url
          }
          // Non-critical - continue even if logo upload fails
        } else if (formData.logoPreview && formData.logoPreview.startsWith('http')) {
          // AI-generated logo already has a URL
          logoUrl = formData.logoPreview
        }

        // 2. Call generate-blueprint to create the store
        const blueprintBody = {
          business_name: formData.storeName.trim(),
          slug: formData.slug,
          description: formData.description.trim(),
          business_type: formData.category || 'General',
          business_category: formData.category ? [formData.category] : [],
          target_geography: 'india' as const,
          brand_vibe: formData.theme,
          primary_color: formData.primaryColor,
          logo_url: logoUrl,
          contact_email: user?.email || 'merchant@example.com',
          contact_phone: '9999999999', // Default placeholder - merchant updates in settings
        }

        const bpRes = await fetch('/api/onboarding/generate-blueprint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(blueprintBody),
        })
        const bpJson = await bpRes.json()

        if (!bpJson.success) {
          throw new Error(bpJson.error || 'Failed to create store')
        }

        const storeId = bpJson.store_id

        // 3. Call complete to finalize the store
        const completeRes = await fetch('/api/onboarding/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ store_id: storeId }),
        })
        const completeJson = await completeRes.json()

        if (!completeJson.success) {
          throw new Error(completeJson.error || 'Failed to activate store')
        }

        // 4. Save store URL and advance to success step
        if (completeJson.store_url) {
          setStoreUrl(completeJson.store_url)
        }
        try {
          localStorage.removeItem(LOCALSTORAGE_KEY)
        } catch {
          // Ignore
        }
        setCurrentStep(3)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Something went wrong'
        setCreateError(message)
        toast.error(message)
      } finally {
        setIsCreating(false)
      }
      return
    }

    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      {/* Store creation overlay */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-sm">
          <div className="relative">
            <Loader2 className="h-10 w-10 animate-spin text-zinc-300" />
            <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-amber-400 animate-pulse" />
          </div>
          <p className="mt-4 text-lg font-medium text-zinc-200">Creating your store...</p>
          <p className="mt-1 text-sm text-zinc-400">Setting up AI agents and generating content</p>
          <div className="mt-6 flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            const isActive = i === currentStep
            const isCompleted = i < currentStep
            return (
              <div key={step.label} className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors',
                      isCompleted
                        ? 'border-emerald-500 bg-emerald-500/20'
                        : isActive
                          ? 'border-zinc-400 bg-zinc-800'
                          : 'border-zinc-700 bg-zinc-900'
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Icon
                        className={cn(
                          'h-4 w-4',
                          isActive ? 'text-zinc-100' : 'text-zinc-400'
                        )}
                      />
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-[10px] font-medium',
                      isActive
                        ? 'text-zinc-100'
                        : isCompleted
                          ? 'text-emerald-400'
                          : 'text-zinc-400'
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'mx-2 hidden h-px w-12 sm:block',
                      i < currentStep ? 'bg-emerald-500' : 'bg-zinc-800'
                    )}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Step content — reduced padding so Continue button is visible */}
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-6">
        {/* Step 1: Store Basics */}
        {currentStep === 0 && (
          <form onSubmit={(e) => { e.preventDefault(); if (canProceed()) handleNext(); }} className="space-y-6">
            <div>
              <h1 className="font-mono text-2xl font-bold tracking-tight">
                Create your store
              </h1>
              <p className="mt-2 text-sm text-zinc-400">
                Pick a name and category. Your AI agents will handle the rest.
              </p>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="store-name" className="text-sm font-medium text-zinc-300">
                  Store name
                </label>
                <Input
                  id="store-name"
                  placeholder="My Awesome Store"
                  value={formData.storeName}
                  onChange={handleNameChange}
                  className="border-zinc-800 bg-zinc-900 text-zinc-100 placeholder:text-zinc-600 focus-visible:border-zinc-500 focus-visible:ring-zinc-500/30"
                />
                {formData.slug && (
                  <div className="space-y-1">
                    <p className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <ExternalLink className="h-3 w-3" />
                      <span className="text-zinc-400">{formData.slug}</span>
                      .storeforge.site
                    </p>
                    {formData.storeName.trim().length > 0 && formData.slug.length < formData.storeName.trim().replace(/\s+/g, '-').toLowerCase().length && (
                      <p className="flex items-center gap-1 text-xs text-zinc-500">
                        <span>ℹ️</span>
                        <span>Special characters were removed from your store URL</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium text-zinc-300">
                  Describe your business
                </label>
                <textarea
                  id="description"
                  placeholder="What do you sell? Who are your customers? What makes you unique?"
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  rows={3}
                  className="flex w-full resize-none rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:outline-none focus-visible:border-zinc-500 focus-visible:ring-1 focus-visible:ring-zinc-500/30"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="category" className="text-sm font-medium text-zinc-300">
                    Category
                  </label>
                  {aiDetecting && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400 animate-pulse">
                      <Sparkles className="h-3 w-3 animate-spin" />
                      AI detecting category...
                    </span>
                  )}
                  {!aiDetecting && aiSuggestedCategory && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                      <Sparkles className="h-3 w-3" />
                      AI suggested: {aiSuggestedCategory}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        updateField('category', cat)
                      }}
                      aria-pressed={formData.category === cat}
                      className={cn(
                        'relative rounded-lg border px-3 py-2.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400',
                        formData.category === cat
                          ? 'border-zinc-500 bg-zinc-800 text-zinc-100 shadow-sm'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
                      )}
                    >
                      {cat}
                      {aiSuggestedCategory === cat && formData.category === cat && (
                        <span className="absolute -top-2 -right-2 flex items-center gap-0.5 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                          <Sparkles className="h-2.5 w-2.5" />
                          AI
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </form>
        )}

        {/* Step 2: Brand & Theme */}
        {currentStep === 1 && (
          <form onSubmit={(e) => { e.preventDefault(); if (canProceed()) handleNext(); }} className="space-y-6">
            <div>
              <h1 className="font-mono text-2xl font-bold tracking-tight">
                Brand & theme
              </h1>
              <p className="mt-2 text-sm text-zinc-400">
                Set the look and feel. You can always change this later.
              </p>
            </div>

            {/* Logo upload */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-zinc-300">Logo</label>
              <div className="flex items-center gap-4">
                <label
                  htmlFor="logo-upload"
                  className={cn(
                    'flex h-20 w-20 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed transition-colors',
                    formData.logoPreview
                      ? 'border-zinc-700'
                      : 'border-zinc-700 hover:border-zinc-600'
                  )}
                >
                  {formData.logoPreview ? (
                    <img
                      src={formData.logoPreview}
                      alt="Logo preview"
                      className="h-full w-full rounded-xl object-cover"
                    />
                  ) : (
                    <Upload className="h-6 w-6 text-zinc-400" />
                  )}
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
                <div className="space-y-1.5">
                  <p className="text-sm text-zinc-300">
                    Drag & drop or click to upload
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={generatingLogo}
                    className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                    onClick={async () => {
                      setGeneratingLogo(true)
                      try {
                        const res = await fetch('/api/onboarding/generate-logo', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({
                            business_name: formData.storeName || 'My Store',
                            business_category: formData.category || undefined,
                            description: formData.description || undefined,
                            style_preference: formData.theme,
                            // Always include the store name in the logo
                            feedback: `Include the text "${formData.storeName || 'My Store'}" prominently in the logo design. The logo should fill the entire square canvas.`,
                          }),
                        })
                        const json = await res.json()
                        if (json.success && json.url) {
                          updateField('logoPreview', json.url)
                          updateField('logoFile', null) // URL-based, no file needed

                          // Auto-pick primary color from extracted logo colors
                          if (json.extracted_colors?.suggested_primary) {
                            updateField('primaryColor', json.extracted_colors.suggested_primary)
                            toast.success('Logo generated! Color auto-matched from your logo.')
                          } else {
                            toast.success('Logo generated successfully!')
                          }
                        } else {
                          toast.error(json.error || 'Failed to generate logo')
                        }
                      } catch {
                        toast.error('Failed to generate logo. Please try again.')
                      } finally {
                        setGeneratingLogo(false)
                      }
                    }}
                  >
                    {generatingLogo ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    {generatingLogo ? 'Generating...' : 'Generate with AI'}
                  </Button>
                  {generatingLogo && (
                    <p className="flex items-center gap-1.5 text-xs text-amber-400 animate-pulse">
                      <Sparkles className="h-3 w-3" />
                      AI is designing your logo with &quot;{formData.storeName || 'your brand'}&quot;...
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Theme picker with previews */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-zinc-300">Theme</label>
              <div className="grid grid-cols-2 gap-3">
                {THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => updateField('theme', theme.id)}
                    aria-pressed={formData.theme === theme.id}
                    className={cn(
                      'rounded-xl border overflow-hidden text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400',
                      formData.theme === theme.id
                        ? 'border-zinc-500 bg-zinc-800 ring-1 ring-zinc-500/30'
                        : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                    )}
                  >
                    <ThemePreview theme={theme} />
                    <div className="p-3">
                      <p className="text-sm font-medium text-zinc-200">{theme.label}</p>
                      <p className="mt-0.5 text-xs text-zinc-400">{theme.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Color picker */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-zinc-300">Primary color</label>
              <div className="flex flex-wrap gap-2.5">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => updateField('primaryColor', color.value)}
                    aria-label={color.name}
                    aria-pressed={formData.primaryColor === color.value}
                    className={cn(
                      'h-9 w-9 rounded-full border-2 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950',
                      formData.primaryColor === color.value
                        ? 'border-white scale-110'
                        : 'border-transparent'
                    )}
                    style={{ backgroundColor: color.value }}
                  />
                ))}
              </div>
              {formData.primaryColor && !PRESET_COLORS.some(c => c.value === formData.primaryColor) && (
                <p className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <Sparkles className="h-3 w-3 text-amber-400" />
                  Custom color from AI logo:
                  <span
                    className="inline-block h-4 w-4 rounded-full border border-zinc-600"
                    style={{ backgroundColor: formData.primaryColor }}
                  />
                  <span className="font-mono">{formData.primaryColor}</span>
                </p>
              )}
            </div>
          </form>
        )}

        {/* Step 3: First Product */}
        {currentStep === 2 && (
          <form onSubmit={(e) => { e.preventDefault(); if (canProceed()) handleNext(); }} className="space-y-6">
            <div>
              <h1 className="font-mono text-2xl font-bold tracking-tight">
                Add your first product
              </h1>
              <p className="mt-2 text-sm text-zinc-400">
                Upload photos and AI will extract the details automatically.
              </p>
            </div>

            <label
              htmlFor="product-image-upload"
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900/50 px-6 py-12 transition-colors hover:border-zinc-600 hover:bg-zinc-900"
            >
              {formData.productImages.length > 0 ? (
                <div className="space-y-4 text-center">
                  <div className="flex flex-wrap justify-center gap-3">
                    {formData.productImages.map((file, i) => (
                      <div
                        key={`${file.name}-${i}`}
                        className="relative h-20 w-20 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800"
                      >
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="h-full w-full object-cover"
                        />
                        {i === 0 && (
                          <span className="absolute bottom-0 left-0 right-0 bg-emerald-500/90 px-1 py-0.5 text-center text-[9px] font-medium text-white">
                            Primary
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-zinc-400">
                    {formData.productImages.length} image{formData.productImages.length > 1 ? 's' : ''} selected
                    <span className="text-zinc-500"> (max 5)</span>
                  </p>
                  <div className="inline-flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-2 text-xs text-zinc-300">
                    <div className="relative">
                      <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                      <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                    </div>
                    AI will extract title, description, price, category & more
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800">
                    <ImagePlus className="h-7 w-7 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-300">
                      Drop product images here
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      PNG, JPG, or WEBP up to 10MB each (max 5 images)
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-lg bg-zinc-800/50 px-3 py-2 text-xs text-zinc-400">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    AI will extract title, description, price & more
                  </div>
                </div>
              )}
              <input
                id="product-image-upload"
                type="file"
                accept="image/*"
                multiple
                onChange={handleProductImageUpload}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={() => {
                updateField('skipProduct', true)
                updateField('productImages', [])
                handleNext()
              }}
              className="text-sm text-zinc-400 underline underline-offset-4 transition-colors hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 rounded"
            >
              Skip — Add products later
            </button>
          </form>
        )}

        {/* Step 4: Store Live! */}
        {currentStep === 3 && (
          <div className="flex flex-1 flex-col items-center justify-center space-y-8 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10">
              <Rocket className="h-10 w-10 text-emerald-400" />
            </div>

            <div className="space-y-2">
              <h1 className="font-mono text-2xl font-bold tracking-tight">
                Your store is live!
              </h1>
              <p className="text-sm text-zinc-400">
                {formData.storeName || 'Your store'} is ready at
              </p>
              <p className="font-mono text-lg text-zinc-200">
                {formData.slug || 'yourstore'}.storeforge.site
              </p>
            </div>

            <div className="flex flex-col items-center gap-3">
              {/* Visit Store is now the primary action */}
              <a
                href={storeUrl || `https://${formData.slug || 'yourstore'}.storeforge.site`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  size="lg"
                  className="bg-white text-zinc-900 hover:bg-zinc-200"
                >
                  <ExternalLink className="h-4 w-4" />
                  Visit Your Store
                </Button>
              </a>

              <Link
                href="/platform"
                className="inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-300"
              >
                Set Up Your AI Agents
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}

      </div>

      {/* Navigation buttons - sticky bottom */}
      {currentStep < 3 && (
        <div className="sticky bottom-0 z-10 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-sm">
          <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
            <Button
              type="button"
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 0}
              className="text-zinc-400 hover:text-zinc-200 disabled:invisible"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            {createError && (
              <p className="text-sm text-red-400">{createError}</p>
            )}

            <Button
              type="button"
              onClick={handleNext}
              disabled={!canProceed() || isCreating}
              className="bg-white text-zinc-900 hover:bg-zinc-200 disabled:opacity-40"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  {currentStep === 2 ? 'Launch Store' : 'Continue'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
