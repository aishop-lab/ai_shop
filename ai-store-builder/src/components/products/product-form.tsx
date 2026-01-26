'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { Loader2, Save, Send, Sparkles, Wand2, Image as ImageIcon, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import ImageUploader from './image-uploader'
import AISuggestions, { type AISuggestionsData } from './ai-suggestions'
import { ProcessingStatus, ProcessingStatusInline } from './processing-status'
import DescriptionGenerator from './description-generator'
import { VariantOptionsEditor } from './variant-options-editor'
import { VariantsTable } from './variants-table'
import { useToast } from '@/lib/hooks/use-toast'
import type { VariantOptionInput, VariantInput, ProductVariantOption } from '@/lib/types/variant'
import type { ProductImage } from '@/lib/types/store'

// Auto-apply threshold (matches backend)
const AUTO_APPLY_THRESHOLD = 0.80

const productSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  price: z.number().min(0, 'Price cannot be negative').default(0),
  compare_at_price: z.number().positive().optional().nullable(),
  cost_per_item: z.number().positive().optional().nullable(),
  quantity: z.number().int().min(0).default(0).optional(),
  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  weight: z.number().positive().optional().nullable(),
  categories: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  track_quantity: z.boolean().default(true),
  requires_shipping: z.boolean().default(true)
})

type ProductFormData = z.infer<typeof productSchema>

interface ProductFormProps {
  storeId: string
  initialData?: Partial<ProductFormData>
  productId?: string
  mode?: 'create' | 'edit'
}

export default function ProductForm({
  storeId,
  initialData,
  productId,
  mode = 'create'
}: ProductFormProps) {
  const router = useRouter()
  const { toast } = useToast()

  const [images, setImages] = useState<File[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestionsData | null>(null)
  const [aiApplied, setAiApplied] = useState(false)
  const [tagsInput, setTagsInput] = useState('')
  const [categoriesInput, setCategoriesInput] = useState('')

  // Enhanced AI processing state
  const [processingStages, setProcessingStages] = useState<Array<{
    name: string
    status: 'pending' | 'processing' | 'completed' | 'skipped' | 'failed'
    message?: string
  }>>([])
  const [imageWasEnhanced, setImageWasEnhanced] = useState(false)
  const [backgroundWasRemoved, setBackgroundWasRemoved] = useState(false)
  const [ocrText, setOcrText] = useState<string[]>([])
  const [qualityScore, setQualityScore] = useState<number | null>(null)
  const [autoApplied, setAutoApplied] = useState(false)
  const [aiSuggestedPrice, setAiSuggestedPrice] = useState<{ price: number; compare_at?: number; reasoning?: string } | null>(null)

  // Variant state
  const [hasVariants, setHasVariants] = useState(false)
  const [variantOptions, setVariantOptions] = useState<VariantOptionInput[]>([])
  const [variants, setVariants] = useState<VariantInput[]>([])
  const [isGeneratingVariants, setIsGeneratingVariants] = useState(false)
  const [existingImages, setExistingImages] = useState<ProductImage[]>([])
  const [lastAnalyzedCount, setLastAnalyzedCount] = useState(0) // Track when we last analyzed

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      price: initialData?.price || 0,
      compare_at_price: initialData?.compare_at_price || null,
      cost_per_item: initialData?.cost_per_item || null,
      quantity: initialData?.quantity || 0,
      sku: initialData?.sku || '',
      barcode: initialData?.barcode || '',
      weight: initialData?.weight || null,
      categories: initialData?.categories || [],
      tags: initialData?.tags || [],
      track_quantity: initialData?.track_quantity ?? true,
      requires_shipping: initialData?.requires_shipping ?? true
    }
  })

  // Auto-extract when images are added (re-analyze ALL images together)
  useEffect(() => {
    // Only trigger in create mode and when new images are added
    if (mode === 'create' && images.length > 0 && images.length > lastAnalyzedCount && images.length <= 10) {
      extractProductInfo()
      setLastAnalyzedCount(images.length)
    }
  }, [images.length, mode]) // eslint-disable-line react-hooks/exhaustive-deps

  const extractProductInfo = async () => {
    if (images.length === 0) return

    setIsExtracting(true)
    setAutoApplied(false)
    setAiApplied(false)

    try {
      // Convert ALL images to base64 for multi-image analysis
      const imageDataPromises = images.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer()
        const base64 = Buffer.from(arrayBuffer).toString('base64')
        return {
          base64: `data:${file.type};base64,${base64}`,
          mimeType: file.type
        }
      })
      const imageDataArray = await Promise.all(imageDataPromises)

      // Use multi-image extraction API if multiple images, otherwise enhanced single
      const response = images.length > 1
        ? await fetch('/api/products/extract-multi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              images: imageDataArray,
              enhanceImage: true,
              removeBackground: true,
              runAIAnalysis: true,
              includeOCR: true
            })
          })
        : await fetch('/api/products/extract-enhanced', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64: imageDataArray[0].base64,
              mimeType: imageDataArray[0].mimeType,
              enhanceImage: true,
              removeBackground: true,
              runAIAnalysis: true,
              includeOCR: true
            })
          })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Extraction failed')
      }

      const data = await response.json()

      if (data.success) {
        // Update processing info
        setProcessingStages(data.stages || [])
        setImageWasEnhanced(data.wasEnhanced || false)
        setBackgroundWasRemoved(data.backgroundRemoved || false)
        setQualityScore(data.qualityAssessment?.score || null)

        // Handle AI-suggested primary image reordering
        if (data.suggestedPrimaryIndex !== undefined && data.suggestedPrimaryIndex > 0 && images.length > 1) {
          const suggestedIndex = data.suggestedPrimaryIndex
          if (suggestedIndex < images.length) {
            // Reorder images to put suggested primary first
            const reorderedImages = [...images]
            const [primaryImage] = reorderedImages.splice(suggestedIndex, 1)
            reorderedImages.unshift(primaryImage)
            setImages(reorderedImages)

            toast({
              title: 'Primary Image Updated',
              description: `AI selected image ${suggestedIndex + 1} as the best front-facing product shot`
            })
          }
        }

        if (data.aiSuggestions) {
          // Store OCR text
          setOcrText(data.aiSuggestions.ocrText || [])

          // Build AI suggestions object
          const suggestions: AISuggestionsData = {
            ai_suggested_title: data.aiSuggestions.title,
            ai_suggested_description: data.aiSuggestions.description,
            ai_suggested_category: data.aiSuggestions.categories || [],
            ai_suggested_tags: data.aiSuggestions.tags || [],
            ai_suggested_attributes: data.aiSuggestions.attributes || {},
            confidence: data.aiSuggestions.confidence
          }

          setAiSuggestions(suggestions)

          // Auto-apply if confidence is high enough
          if (data.shouldAutoApply && data.aiSuggestions.confidence >= AUTO_APPLY_THRESHOLD) {
            // Auto-apply the suggestions with proper options to trigger re-render
            form.setValue('title', suggestions.ai_suggested_title, { shouldDirty: true, shouldValidate: true })
            form.setValue('description', suggestions.ai_suggested_description, { shouldDirty: true, shouldValidate: true })
            form.setValue('categories', suggestions.ai_suggested_category, { shouldDirty: true })
            form.setValue('tags', suggestions.ai_suggested_tags, { shouldDirty: true })
            setCategoriesInput(suggestions.ai_suggested_category.join(', '))
            setTagsInput(suggestions.ai_suggested_tags.join(', '))

            setAutoApplied(true)
            setAiApplied(true)

            toast({
              title: images.length > 1 ? 'AI Updated from All Images!' : 'AI Auto-Applied!',
              description: images.length > 1
                ? `Analyzed ${images.length} images with ${Math.round(suggestions.confidence * 100)}% confidence. Review and adjust as needed.`
                : `High confidence (${Math.round(suggestions.confidence * 100)}%) - suggestions have been applied. Review and adjust as needed.`
            })
          } else {
            toast({
              title: images.length > 1 ? 'AI Analyzed All Images' : 'AI Suggestions Ready',
              description: images.length > 1
                ? `Combined info from ${images.length} images. Review and apply the suggestions.`
                : 'Review the suggestions and apply them to your product'
            })
          }
        }
      }
    } catch (error) {
      console.error('Enhanced extraction failed:', error)

      // Fallback to basic extraction
      try {
        const formData = new FormData()
        formData.append('image', images[0])

        const response = await fetch('/api/products/extract', {
          method: 'POST',
          body: formData
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setAiSuggestions(data.suggestions)
            toast({
              title: 'AI Suggestions Ready',
              description: 'Review the suggestions and apply them to your product'
            })
          }
        }
      } catch {
        toast({
          title: 'AI Extraction Failed',
          description: 'Please fill in the details manually',
          variant: 'destructive'
        })
      }
    } finally {
      setIsExtracting(false)
    }
  }

  const applyAISuggestions = () => {
    if (!aiSuggestions) return

    form.setValue('title', aiSuggestions.ai_suggested_title, { shouldDirty: true, shouldValidate: true })
    form.setValue('description', aiSuggestions.ai_suggested_description, { shouldDirty: true, shouldValidate: true })
    form.setValue('categories', aiSuggestions.ai_suggested_category, { shouldDirty: true })
    form.setValue('tags', aiSuggestions.ai_suggested_tags, { shouldDirty: true })

    setCategoriesInput(aiSuggestions.ai_suggested_category.join(', '))
    setTagsInput(aiSuggestions.ai_suggested_tags.join(', '))

    setAiApplied(true)
    toast({
      title: 'AI Suggestions Applied',
      description: 'Review and adjust the details as needed'
    })
  }

  const applyAIPrice = () => {
    if (!aiSuggestedPrice) return

    form.setValue('price', aiSuggestedPrice.price, { shouldDirty: true, shouldValidate: true })
    if (aiSuggestedPrice.compare_at) {
      form.setValue('compare_at_price', aiSuggestedPrice.compare_at, { shouldDirty: true })
    }
    toast({
      title: 'AI Price Applied',
      description: aiSuggestedPrice.reasoning || 'Suggested price has been applied'
    })
  }

  // Generate variant combinations from options
  const generateVariants = async () => {
    if (variantOptions.length === 0 || variantOptions.some(o => o.values.length === 0)) {
      toast({
        title: 'Cannot Generate',
        description: 'Please add at least one option with values',
        variant: 'destructive'
      })
      return
    }

    setIsGeneratingVariants(true)

    // Generate combinations locally
    const generateCombinations = (options: VariantOptionInput[]): Record<string, string>[] => {
      if (options.length === 0) return []

      const combinations: Record<string, string>[] = []

      function generate(index: number, current: Record<string, string>) {
        if (index >= options.length) {
          combinations.push({ ...current })
          return
        }

        const option = options[index]
        for (const value of option.values) {
          current[option.name] = value.value
          generate(index + 1, current)
        }
      }

      generate(0, {})
      return combinations
    }

    const combinations = generateCombinations(variantOptions)

    // Create variant objects, preserving existing data if available
    const existingMap = new Map(
      variants.map(v => [JSON.stringify(v.attributes), v])
    )

    const newVariants: VariantInput[] = combinations.map((attrs, index) => {
      const existing = existingMap.get(JSON.stringify(attrs))

      if (existing) {
        return existing
      }

      return {
        attributes: attrs,
        price: null, // Use base price
        quantity: 0,
        track_quantity: true,
        is_default: index === 0,
        status: 'active' as const,
      }
    })

    setVariants(newVariants)
    setIsGeneratingVariants(false)

    toast({
      title: 'Variants Generated',
      description: `${newVariants.length} variants created. Set prices and inventory for each.`
    })
  }

  const onSubmit = async (data: ProductFormData, status: 'draft' | 'published') => {
    if (images.length === 0 && mode === 'create') {
      toast({
        title: 'No Images',
        description: 'Please upload at least one product image',
        variant: 'destructive'
      })
      return
    }

    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append('store_id', storeId)
      formData.append('title', data.title)
      formData.append('description', data.description)
      formData.append('price', data.price.toString())
      formData.append('quantity', data.quantity.toString())
      formData.append('status', status)
      formData.append('track_quantity', data.track_quantity.toString())
      formData.append('requires_shipping', data.requires_shipping.toString())

      if (data.compare_at_price) {
        formData.append('compare_at_price', data.compare_at_price.toString())
      }
      if (data.cost_per_item) {
        formData.append('cost_per_item', data.cost_per_item.toString())
      }
      if (data.sku) {
        formData.append('sku', data.sku)
      }
      if (data.barcode) {
        formData.append('barcode', data.barcode)
      }
      if (data.weight) {
        formData.append('weight', data.weight.toString())
      }
      if (data.categories && data.categories.length > 0) {
        formData.append('categories', JSON.stringify(data.categories))
      }
      if (data.tags && data.tags.length > 0) {
        formData.append('tags', JSON.stringify(data.tags))
      }

      // Add variant data
      if (hasVariants && variantOptions.length > 0 && variants.length > 0) {
        formData.append('has_variants', 'true')
        formData.append('variant_options', JSON.stringify(variantOptions))
        formData.append('variants', JSON.stringify(variants))
      }

      // Add images
      images.forEach(image => {
        formData.append('images', image)
      })

      const url = mode === 'edit' && productId
        ? `/api/products/${productId}`
        : '/api/products/upload'

      const response = await fetch(url, {
        method: mode === 'edit' ? 'PATCH' : 'POST',
        body: mode === 'edit' ? JSON.stringify(data) : formData,
        ...(mode === 'edit' && {
          headers: { 'Content-Type': 'application/json' }
        })
      })

      if (!response.ok) {
        // Handle non-JSON responses (like 413 Request Entity Too Large)
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Upload failed')
        } else {
          // Handle plain text error responses
          if (response.status === 413) {
            throw new Error('Images are too large. Please use smaller images (max 5MB each).')
          }
          throw new Error(`Upload failed: ${response.statusText || 'Unknown error'}`)
        }
      }

      toast({
        title: status === 'published' ? 'Product Published!' : 'Draft Saved!',
        description: mode === 'edit' ? 'Product updated successfully' : 'Product created successfully'
      })

      router.push('/dashboard/products')
      router.refresh()

    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle tags input
  const handleTagsChange = (value: string) => {
    setTagsInput(value)
    const tags = value.split(',').map(t => t.trim()).filter(Boolean)
    form.setValue('tags', tags)
  }

  // Handle categories input
  const handleCategoriesChange = (value: string) => {
    setCategoriesInput(value)
    const categories = value.split(',').map(c => c.trim()).filter(Boolean)
    form.setValue('categories', categories)
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Images */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Images</CardTitle>
              <CardDescription>
                Upload up to 10 images. AI will analyze all images together to extract product details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImageUploader
                images={images}
                onImagesChange={setImages}
                maxImages={10}
                disabled={isLoading || isExtracting}
              />
              {images.length > 0 && !isExtracting && (
                <p className="text-xs text-muted-foreground mt-2">
                  {images.length} image{images.length > 1 ? 's' : ''} uploaded. Add more images to improve AI analysis.
                </p>
              )}
            </CardContent>
          </Card>

          {/* AI Processing Status */}
          {isExtracting && (
            <Card className="border-purple-200 bg-purple-50 dark:bg-purple-950/20">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                    <Wand2 className="w-5 h-5 text-white animate-pulse" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-purple-900 dark:text-purple-100">
                      AI Analyzing {images.length} Image{images.length > 1 ? 's' : ''}
                    </CardTitle>
                    <CardDescription className="text-purple-700 dark:text-purple-400">
                      {images.length > 1
                        ? 'Combining information from all images to generate product details'
                        : 'Enhancing, analyzing, and extracting product info'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              {processingStages.length > 0 && (
                <CardContent>
                  <ProcessingStatus stages={processingStages} />
                </CardContent>
              )}
            </Card>
          )}

          {/* Processing Results Summary */}
          {!isExtracting && (imageWasEnhanced || backgroundWasRemoved || qualityScore !== null) && (
            <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-medium">Image Processing Complete</span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm">
                    {imageWasEnhanced && (
                      <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900 rounded-full text-green-700 dark:text-green-300">
                        <ImageIcon className="w-3 h-3 inline mr-1" />
                        Auto-enhanced
                      </span>
                    )}
                    {backgroundWasRemoved && (
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 rounded-full text-blue-700 dark:text-blue-300">
                        Background removed
                      </span>
                    )}
                    {qualityScore !== null && (
                      <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900 rounded-full text-purple-700 dark:text-purple-300">
                        Quality: {qualityScore}/10
                      </span>
                    )}
                    {autoApplied && (
                      <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900 rounded-full text-amber-700 dark:text-amber-300">
                        <Sparkles className="w-3 h-3 inline mr-1" />
                        AI Auto-applied
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Suggestions */}
          {aiSuggestions && !isExtracting && (
            <AISuggestions
              suggestions={aiSuggestions}
              onApply={applyAISuggestions}
              isApplied={aiApplied}
              enhanced={{
                ocrText: ocrText,
                wasAutoApplied: autoApplied
              }}
            />
          )}
        </div>

        {/* Right Column - Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Details</CardTitle>
              <CardDescription>
                Enter the product information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-6">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Product Title *</Label>
                  <Input
                    id="title"
                    {...form.register('title')}
                    placeholder="e.g., Blue Cotton Saree"
                    disabled={isLoading}
                  />
                  {form.formState.errors.title && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.title.message}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    {...form.register('description')}
                    rows={4}
                    placeholder="Describe your product in detail..."
                    disabled={isLoading}
                  />
                  {form.formState.errors.description && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.description.message}
                    </p>
                  )}
                </div>

                {/* AI Description Generator */}
                <DescriptionGenerator
                  title={form.watch('title')}
                  category={categoriesInput}
                  attributes={aiSuggestions?.ai_suggested_attributes}
                  onComplete={(description) => {
                    form.setValue('description', description)
                    toast({
                      title: 'Description Applied',
                      description: 'AI-generated description has been applied'
                    })
                  }}
                  disabled={isLoading || isExtracting}
                />

                <Separator />

                {/* Pricing */}
                <div>
                  <h3 className="font-medium mb-4">Pricing</h3>

                  {/* AI Price Suggestion */}
                  {aiSuggestedPrice && (
                    <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-green-900 dark:text-green-100">AI Price Suggestion</p>
                            <p className="text-sm text-green-700 dark:text-green-300">
                              ₹{aiSuggestedPrice.price.toLocaleString()}
                              {aiSuggestedPrice.compare_at && (
                                <span className="ml-2 line-through text-muted-foreground">
                                  ₹{aiSuggestedPrice.compare_at.toLocaleString()}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-green-500 text-green-700 hover:bg-green-100 dark:hover:bg-green-900"
                          onClick={applyAIPrice}
                        >
                          <Sparkles className="w-3 h-3 mr-1" />
                          Apply Price
                        </Button>
                      </div>
                      {aiSuggestedPrice.reasoning && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                          {aiSuggestedPrice.reasoning}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Generate Price Button - show when we have category but no price suggestion */}
                  {!aiSuggestedPrice && categoriesInput && form.watch('price') === 0 && (
                    <div className="mb-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full border-dashed border-green-300 text-green-700 hover:bg-green-50"
                        onClick={async () => {
                          try {
                            const response = await fetch('/api/products/suggest-price', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                title: form.watch('title'),
                                category: categoriesInput,
                                description: form.watch('description')
                              })
                            })
                            if (response.ok) {
                              const data = await response.json()
                              if (data.success && data.price) {
                                setAiSuggestedPrice({
                                  price: data.price,
                                  compare_at: data.compare_at,
                                  reasoning: data.reasoning
                                })
                              }
                            }
                          } catch (error) {
                            console.error('Price suggestion failed:', error)
                          }
                        }}
                        disabled={isLoading || !form.watch('title')}
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Suggest Price with AI
                      </Button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price">Price (₹) *</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        {...form.register('price', { valueAsNumber: true })}
                        placeholder="2500"
                        disabled={isLoading}
                      />
                      {form.formState.errors.price && (
                        <p className="text-sm text-red-600">
                          {form.formState.errors.price.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="compare_at_price">Compare at Price (₹)</Label>
                      <Input
                        id="compare_at_price"
                        type="number"
                        step="0.01"
                        {...form.register('compare_at_price', { valueAsNumber: true })}
                        placeholder="3000"
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cost_per_item">Cost per Item (₹)</Label>
                      <Input
                        id="cost_per_item"
                        type="number"
                        step="0.01"
                        {...form.register('cost_per_item', { valueAsNumber: true })}
                        placeholder="1500"
                        disabled={isLoading}
                      />
                      <p className="text-xs text-muted-foreground">
                        For profit calculation (not shown to customers)
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Inventory */}
                <div>
                  <h3 className="font-medium mb-4">Inventory</h3>

                  {/* Show notice when variants are enabled */}
                  {hasVariants && variants.length > 0 && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg mb-4 text-sm text-blue-700 dark:text-blue-300">
                      SKU and quantity are managed per variant below.
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {/* Only show SKU when no variants */}
                    {!hasVariants && (
                      <div className="space-y-2">
                        <Label htmlFor="sku">SKU</Label>
                        <Input
                          id="sku"
                          {...form.register('sku')}
                          placeholder="SKU001"
                          disabled={isLoading}
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="barcode">Barcode</Label>
                      <Input
                        id="barcode"
                        {...form.register('barcode')}
                        placeholder="123456789"
                        disabled={isLoading}
                      />
                    </div>
                    {/* Only show quantity when no variants */}
                    {!hasVariants && (
                      <div className="space-y-2">
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input
                          id="quantity"
                          type="number"
                          {...form.register('quantity', { valueAsNumber: true })}
                          placeholder="10"
                          disabled={isLoading || !form.watch('track_quantity')}
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="weight">Weight (kg)</Label>
                      <Input
                        id="weight"
                        type="number"
                        step="0.01"
                        {...form.register('weight', { valueAsNumber: true })}
                        placeholder="0.5"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 mt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="track_quantity">Track inventory</Label>
                        <p className="text-xs text-muted-foreground">
                          Enable to track stock levels
                        </p>
                      </div>
                      <Switch
                        id="track_quantity"
                        checked={form.watch('track_quantity')}
                        onCheckedChange={(checked) => form.setValue('track_quantity', checked)}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="requires_shipping">Requires shipping</Label>
                        <p className="text-xs text-muted-foreground">
                          Physical product that needs delivery
                        </p>
                      </div>
                      <Switch
                        id="requires_shipping"
                        checked={form.watch('requires_shipping')}
                        onCheckedChange={(checked) => form.setValue('requires_shipping', checked)}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Organization */}
                <div>
                  <h3 className="font-medium mb-4">Organization</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="categories">Categories</Label>
                      <Input
                        id="categories"
                        value={categoriesInput}
                        onChange={(e) => handleCategoriesChange(e.target.value)}
                        placeholder="Fashion, Women's Clothing"
                        disabled={isLoading}
                      />
                      <p className="text-xs text-muted-foreground">
                        Separate multiple categories with commas
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tags">Tags</Label>
                      <Input
                        id="tags"
                        value={tagsInput}
                        onChange={(e) => handleTagsChange(e.target.value)}
                        placeholder="saree, cotton, blue, traditional"
                        disabled={isLoading}
                      />
                      <p className="text-xs text-muted-foreground">
                        Separate tags with commas
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Variants */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-medium">Variants</h3>
                      <p className="text-xs text-muted-foreground">
                        Add options like Size, Color to create variants
                      </p>
                    </div>
                    <Switch
                      checked={hasVariants}
                      onCheckedChange={(checked) => {
                        setHasVariants(checked)
                        if (!checked) {
                          setVariantOptions([])
                          setVariants([])
                        }
                      }}
                      disabled={isLoading}
                    />
                  </div>

                  {hasVariants && (
                    <div className="space-y-6">
                      <VariantOptionsEditor
                        options={variantOptions}
                        onChange={setVariantOptions}
                        onGenerateVariants={generateVariants}
                        disabled={isLoading || isGeneratingVariants}
                      />

                      {variants.length > 0 && (
                        <VariantsTable
                          variants={variants}
                          options={variantOptions.map((o, i) => ({
                            id: `opt-${i}`,
                            product_id: '',
                            name: o.name,
                            position: i,
                            values: o.values.map((v, j) => ({
                              id: `val-${i}-${j}`,
                              option_id: `opt-${i}`,
                              value: v.value,
                              color_code: v.color_code,
                              position: j,
                            })),
                          }))}
                          basePrice={form.watch('price') || 0}
                          images={existingImages}
                          onChange={setVariants}
                          disabled={isLoading}
                        />
                      )}

                      {/* Variant summary */}
                      {variants.length > 0 && (
                        <div className="p-3 bg-muted rounded-lg text-sm">
                          <p className="font-medium">
                            Total Inventory: {variants.reduce((sum, v) => sum + (v.quantity || 0), 0)} units
                          </p>
                          <p className="text-muted-foreground text-xs mt-1">
                            Across {variants.filter(v => v.status === 'active').length} active variants
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={form.handleSubmit((data) => onSubmit(data, 'draft'))}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save as Draft
            </Button>
            <Button
              type="button"
              onClick={form.handleSubmit((data) => onSubmit(data, 'published'))}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Publish Product
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
