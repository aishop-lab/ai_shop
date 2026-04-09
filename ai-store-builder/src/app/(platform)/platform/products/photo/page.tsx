'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Camera,
  Upload,
  ImagePlus,
  ArrowLeft,
  Loader2,
  Sparkles,
  Check,
  RotateCcw,
  Tag,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PlatformBreadcrumb } from '@/components/ui/breadcrumb'
import { useToast } from '@/lib/hooks/use-toast'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AISuggestions {
  title: string
  description: string
  categories: string[]
  tags: string[]
  attributes: Record<string, string>
  confidence: number
  ocrText: string[]
}

interface ExtractedData {
  title: string
  description: string
  category: string
  price: string
  tags: string
}

type Step = 'upload' | 'extracting' | 'review' | 'creating' | 'success'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PhotoToProductPage() {
  const router = useRouter()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('upload')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [extractedData, setExtractedData] = useState<ExtractedData>({
    title: '',
    description: '',
    category: '',
    price: '',
    tags: '',
  })
  const [confidence, setConfidence] = useState(0)
  const [storeId, setStoreId] = useState<string | null>(null)
  const [createdProductId, setCreatedProductId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch store ID on mount
  useEffect(() => {
    async function fetchStore() {
      try {
        const response = await fetch('/api/auth/user')
        const data = await response.json()
        if (!data.user) {
          router.push('/sign-in')
          return
        }
        if (data.store?.id) {
          setStoreId(data.store.id)
        } else {
          setError('Please complete store setup first')
        }
      } catch {
        setError('Failed to load store information')
      }
    }
    fetchStore()
  }, [router])

  // -----------------------------------------------------------------------
  // Image handling
  // -----------------------------------------------------------------------

  const processFile = useCallback((file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type) && !file.name.toLowerCase().endsWith('.heic')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a JPG, PNG, WebP, or HEIC image.',
        variant: 'destructive',
      })
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'File too large',
        description: 'Please upload an image under 10MB.',
        variant: 'destructive',
      })
      return
    }

    setImageFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }, [toast])

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) processFile(file)
    },
    [processFile]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files?.[0]
      if (file) processFile(file)
    },
    [processFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  // -----------------------------------------------------------------------
  // AI Extraction
  // -----------------------------------------------------------------------

  const runExtraction = useCallback(async () => {
    if (!imagePreview) return

    setStep('extracting')
    setError(null)

    try {
      const res = await fetch('/api/products/extract-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imagePreview,
          runAIAnalysis: true,
          includeOCR: true,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'AI extraction failed')
      }

      const suggestions: AISuggestions = data.aiSuggestions

      setExtractedData({
        title: suggestions.title || '',
        description: suggestions.description || '',
        category: suggestions.categories?.[0] || '',
        price: '',
        tags: (suggestions.tags || []).join(', '),
      })
      setConfidence(suggestions.confidence || 0)
      setStep('review')
    } catch (err) {
      console.error('Extraction failed:', err)
      setError(err instanceof Error ? err.message : 'AI extraction failed. Please try again.')
      setStep('upload')
      toast({
        title: 'Extraction failed',
        description: 'Could not analyze the image. Please try again.',
        variant: 'destructive',
      })
    }
  }, [imagePreview, toast])

  // Auto-trigger extraction when image is selected
  useEffect(() => {
    if (imagePreview && step === 'upload') {
      runExtraction()
    }
    // Only trigger when imagePreview changes, not on step changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imagePreview])

  // -----------------------------------------------------------------------
  // Product creation
  // -----------------------------------------------------------------------

  const handleCreateProduct = useCallback(async () => {
    if (!storeId || !imageFile) return

    if (!extractedData.title.trim()) {
      toast({
        title: 'Title required',
        description: 'Please enter a product title.',
        variant: 'destructive',
      })
      return
    }

    setStep('creating')
    setError(null)

    try {
      const formData = new FormData()
      formData.append('store_id', storeId)
      formData.append('image', imageFile)
      formData.append('title', extractedData.title.trim())
      formData.append('description', extractedData.description.trim())

      const price = parseFloat(extractedData.price)
      formData.append('price', isNaN(price) ? '0' : String(price))

      if (extractedData.category.trim()) {
        formData.append('categories', JSON.stringify([extractedData.category.trim()]))
      }

      if (extractedData.tags.trim()) {
        const tagsArray = extractedData.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
        if (tagsArray.length > 0) {
          formData.append('tags', JSON.stringify(tagsArray))
        }
      }

      formData.append('status', 'draft')

      const res = await fetch('/api/products/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create product')
      }

      setCreatedProductId(data.product.id)
      setStep('success')
      toast({ title: 'Product created', description: 'Your product has been saved as a draft.' })
    } catch (err) {
      console.error('Product creation failed:', err)
      setStep('review')
      toast({
        title: 'Creation failed',
        description: err instanceof Error ? err.message : 'Failed to create product.',
        variant: 'destructive',
      })
    }
  }, [storeId, imageFile, extractedData, toast])

  // -----------------------------------------------------------------------
  // Reset
  // -----------------------------------------------------------------------

  const handleReset = useCallback(() => {
    setStep('upload')
    setImageFile(null)
    setImagePreview(null)
    setExtractedData({ title: '', description: '', category: '', price: '', tags: '' })
    setConfidence(0)
    setCreatedProductId(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }, [])

  // -----------------------------------------------------------------------
  // Error state
  // -----------------------------------------------------------------------

  if (error && !imagePreview) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <PlatformBreadcrumb
          items={[
            { label: 'Command Center', href: '/platform' },
            { label: 'Products', href: '/platform/products' },
            { label: 'Photo to Product' },
          ]}
        />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h2 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
            Unable to Continue
          </h2>
          <p className="mt-2 text-sm text-[var(--platform-text-muted)]">{error}</p>
          <Link
            href="/onboarding"
            className="mt-4 rounded-lg bg-[var(--platform-accent)] px-4 py-2 text-xs font-medium text-white hover:opacity-90 transition-opacity"
          >
            Complete Store Setup
          </Link>
        </div>
      </div>
    )
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PlatformBreadcrumb
        items={[
          { label: 'Command Center', href: '/platform' },
          { label: 'Products', href: '/platform/products' },
          { label: 'Photo to Product' },
        ]}
      />

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/platform/products"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--platform-border)] text-[var(--platform-text-muted)] transition-colors hover:border-[var(--platform-border-hover)] hover:text-[var(--platform-text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
            Photo to Product
          </h1>
          <p className="mt-0.5 text-sm text-[var(--platform-text-secondary)]">
            Snap a photo and let AI create your product listing
          </p>
        </div>
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div
          className={cn(
            'rounded-xl border-2 border-dashed p-12 text-center transition-colors',
            isDragging
              ? 'border-[var(--platform-accent)] bg-[var(--platform-accent)]/5'
              : 'border-[var(--platform-border)]'
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--platform-surface)]">
            <Camera className="h-8 w-8 text-[var(--platform-text-muted)]" />
          </div>

          <h2 className="mt-5 font-mono text-sm font-semibold text-[var(--platform-text-primary)]">
            Take or upload a product photo
          </h2>
          <p className="mt-1.5 text-xs text-[var(--platform-text-muted)]">
            AI will analyze the image and generate title, description, category, and tags
          </p>

          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            {/* Camera button (mobile) */}
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center gap-2 rounded-lg bg-[var(--platform-accent)] px-4 py-2 text-xs font-medium text-white hover:opacity-90 transition-opacity"
            >
              <Camera className="h-3.5 w-3.5" />
              Take Photo
            </button>

            {/* File picker button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] px-4 py-2 text-xs font-medium text-[var(--platform-text-primary)] hover:border-[var(--platform-border-hover)] transition-colors"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload Image
            </button>
          </div>

          <p className="mt-4 text-[10px] text-[var(--platform-text-muted)]">
            JPG, PNG, WebP, or HEIC up to 10MB
          </p>

          {/* Hidden file inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.heic"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {/* Step 2: Extracting */}
      {step === 'extracting' && (
        <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-8">
          <div className="flex flex-col items-center text-center">
            {/* Image preview */}
            {imagePreview && (
              <div className="mb-6 overflow-hidden rounded-lg border border-[var(--platform-border)]">
                <Image
                  src={imagePreview}
                  alt="Uploaded product"
                  width={240}
                  height={240}
                  className="h-48 w-48 object-cover"
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 animate-pulse text-[var(--platform-accent)]" />
              <h2 className="font-mono text-sm font-semibold text-[var(--platform-text-primary)]">
                Analyzing your product...
              </h2>
            </div>

            {/* Pulsing dots */}
            <div className="mt-4 flex items-center gap-1.5">
              <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--platform-accent)]" style={{ animationDelay: '0ms' }} />
              <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--platform-accent)]" style={{ animationDelay: '150ms' }} />
              <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--platform-accent)]" style={{ animationDelay: '300ms' }} />
            </div>

            <p className="mt-3 text-xs text-[var(--platform-text-muted)]">
              Identifying product details, generating descriptions, and suggesting categories...
            </p>
          </div>
        </div>
      )}

      {/* Step 3: Review & Edit */}
      {step === 'review' && (
        <div className="space-y-5">
          {/* Confidence badge */}
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium',
                confidence >= 0.8
                  ? 'border-green-500/20 bg-green-500/10 text-green-400'
                  : confidence >= 0.5
                    ? 'border-amber-500/20 bg-amber-500/10 text-amber-400'
                    : 'border-red-500/20 bg-red-500/10 text-red-400'
              )}
            >
              <Sparkles className="h-3 w-3" />
              AI Confidence: {(confidence * 100).toFixed(0)}%
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-[240px_1fr]">
            {/* Image preview */}
            <div className="flex flex-col gap-3">
              {imagePreview && (
                <div className="overflow-hidden rounded-lg border border-[var(--platform-border)]">
                  <Image
                    src={imagePreview}
                    alt="Product photo"
                    width={480}
                    height={480}
                    className="aspect-square w-full object-cover"
                  />
                </div>
              )}
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] px-3 py-1.5 text-xs text-[var(--platform-text-secondary)] hover:border-[var(--platform-border-hover)] transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                Try Another Photo
              </button>
            </div>

            {/* Editable fields */}
            <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-5 space-y-4">
              {/* Title */}
              <div>
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
                  Title
                </label>
                <input
                  type="text"
                  value={extractedData.title}
                  onChange={(e) => setExtractedData((d) => ({ ...d, title: e.target.value }))}
                  placeholder="Product title"
                  className={cn(
                    'w-full rounded-lg border border-[var(--platform-border)]',
                    'bg-[var(--platform-bg)] px-3 py-2',
                    'font-mono text-xs text-[var(--platform-text-primary)]',
                    'placeholder:text-[var(--platform-text-muted)]',
                    'outline-none transition-colors',
                    'hover:border-[var(--platform-border-hover)] focus:border-[var(--platform-accent)]'
                  )}
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
                  Description
                </label>
                <textarea
                  value={extractedData.description}
                  onChange={(e) => setExtractedData((d) => ({ ...d, description: e.target.value }))}
                  placeholder="Product description"
                  rows={4}
                  className={cn(
                    'w-full rounded-lg border border-[var(--platform-border)]',
                    'bg-[var(--platform-bg)] px-3 py-2',
                    'font-mono text-xs text-[var(--platform-text-primary)]',
                    'placeholder:text-[var(--platform-text-muted)]',
                    'outline-none transition-colors resize-none',
                    'hover:border-[var(--platform-border-hover)] focus:border-[var(--platform-accent)]'
                  )}
                />
              </div>

              {/* Category & Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
                    Category
                  </label>
                  <input
                    type="text"
                    value={extractedData.category}
                    onChange={(e) => setExtractedData((d) => ({ ...d, category: e.target.value }))}
                    placeholder="e.g. Electronics"
                    className={cn(
                      'w-full rounded-lg border border-[var(--platform-border)]',
                      'bg-[var(--platform-bg)] px-3 py-2',
                      'font-mono text-xs text-[var(--platform-text-primary)]',
                      'placeholder:text-[var(--platform-text-muted)]',
                      'outline-none transition-colors',
                      'hover:border-[var(--platform-border-hover)] focus:border-[var(--platform-accent)]'
                    )}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
                    Price
                  </label>
                  <input
                    type="number"
                    value={extractedData.price}
                    onChange={(e) => setExtractedData((d) => ({ ...d, price: e.target.value }))}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className={cn(
                      'w-full rounded-lg border border-[var(--platform-border)]',
                      'bg-[var(--platform-bg)] px-3 py-2',
                      'font-mono text-xs text-[var(--platform-text-primary)]',
                      'placeholder:text-[var(--platform-text-muted)]',
                      'outline-none transition-colors',
                      'hover:border-[var(--platform-border-hover)] focus:border-[var(--platform-accent)]'
                    )}
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="mb-1 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
                  <Tag className="h-2.5 w-2.5" />
                  Tags
                </label>
                <input
                  type="text"
                  value={extractedData.tags}
                  onChange={(e) => setExtractedData((d) => ({ ...d, tags: e.target.value }))}
                  placeholder="tag1, tag2, tag3"
                  className={cn(
                    'w-full rounded-lg border border-[var(--platform-border)]',
                    'bg-[var(--platform-bg)] px-3 py-2',
                    'font-mono text-xs text-[var(--platform-text-primary)]',
                    'placeholder:text-[var(--platform-text-muted)]',
                    'outline-none transition-colors',
                    'hover:border-[var(--platform-border-hover)] focus:border-[var(--platform-accent)]'
                  )}
                />
                <p className="mt-1 text-[10px] text-[var(--platform-text-muted)]">
                  Separate tags with commas
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCreateProduct}
                  className="flex items-center gap-1.5 rounded-lg bg-[var(--platform-accent)] px-4 py-2 text-xs font-medium text-white hover:opacity-90 transition-opacity"
                >
                  <Check className="h-3.5 w-3.5" />
                  Create Product
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] px-4 py-2 text-xs text-[var(--platform-text-secondary)] hover:border-[var(--platform-border-hover)] transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Try Another Photo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3.5: Creating product (loading) */}
      {step === 'creating' && (
        <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-8">
          <div className="flex flex-col items-center text-center">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--platform-accent)]" />
            <h2 className="mt-4 font-mono text-sm font-semibold text-[var(--platform-text-primary)]">
              Creating your product...
            </h2>
            <p className="mt-1.5 text-xs text-[var(--platform-text-muted)]">
              Uploading image and saving product details
            </p>
          </div>
        </div>
      )}

      {/* Step 4: Success */}
      {step === 'success' && (
        <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-8">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
              <Check className="h-7 w-7 text-green-400" />
            </div>

            <h2 className="mt-4 font-mono text-sm font-semibold text-[var(--platform-text-primary)]">
              Product Created!
            </h2>
            <p className="mt-1.5 text-xs text-[var(--platform-text-muted)]">
              Your product has been saved as a draft. You can edit it further or publish it.
            </p>

            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row">
              {createdProductId && (
                <Link
                  href={`/platform/products/${createdProductId}`}
                  className="flex items-center gap-1.5 rounded-lg bg-[var(--platform-accent)] px-4 py-2 text-xs font-medium text-white hover:opacity-90 transition-opacity"
                >
                  View Product
                </Link>
              )}
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] px-4 py-2 text-xs font-medium text-[var(--platform-text-primary)] hover:border-[var(--platform-border-hover)] transition-colors"
              >
                <ImagePlus className="h-3.5 w-3.5" />
                Add Another Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
