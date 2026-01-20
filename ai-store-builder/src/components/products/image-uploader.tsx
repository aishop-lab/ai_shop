'use client'

import { useCallback, useState, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import Image from 'next/image'
import { X, Upload, GripVertical, ImageIcon, Sparkles, Loader2, AlertTriangle, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'

interface ImageUploaderProps {
  images: File[]
  onImagesChange: (files: File[]) => void
  maxImages?: number
  disabled?: boolean
  enableEnhancement?: boolean
}

interface PreviewImage {
  file: File
  preview: string
}

interface ImageQuality {
  score: number
  needs_enhancement: boolean
  issues: {
    background: boolean
    lighting: boolean
    composition: boolean
    blurry: boolean
  }
  recommendations: string[]
}

interface ImageAnalysis {
  loading: boolean
  quality?: ImageQuality
  error?: string
}

export default function ImageUploader({
  images,
  onImagesChange,
  maxImages = 10,
  disabled = false,
  enableEnhancement = true
}: ImageUploaderProps) {
  const [previews, setPreviews] = useState<PreviewImage[]>([])
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [analysisMap, setAnalysisMap] = useState<Map<string, ImageAnalysis>>(new Map())
  const [enhancingIndex, setEnhancingIndex] = useState<number | null>(null)

  // Generate previews when images change
  useEffect(() => {
    const newPreviews = images.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }))
    setPreviews(newPreviews)

    // Cleanup old previews
    return () => {
      newPreviews.forEach(p => URL.revokeObjectURL(p.preview))
    }
  }, [images])

  // Analyze images for quality when they're added
  useEffect(() => {
    if (!enableEnhancement) return

    previews.forEach((preview, index) => {
      const key = preview.file.name + preview.file.size
      if (!analysisMap.has(key)) {
        analyzeImage(preview, key)
      }
    })
  }, [previews, enableEnhancement])

  const analyzeImage = async (preview: PreviewImage, key: string) => {
    setAnalysisMap(prev => new Map(prev).set(key, { loading: true }))

    try {
      // Upload to get a URL first, then analyze
      const formData = new FormData()
      formData.append('image', preview.file)

      // For analysis, we need to upload temporarily or use base64
      // For now, we'll do a simple heuristic based on file size and name
      // The actual analysis happens when the user clicks enhance

      // Quick client-side heuristics
      const img = new window.Image()
      img.src = preview.preview

      await new Promise((resolve) => {
        img.onload = resolve
        img.onerror = resolve
      })

      // Basic quality assessment
      const quality: ImageQuality = {
        score: 7,
        needs_enhancement: false,
        issues: {
          background: false,
          lighting: false,
          composition: false,
          blurry: false
        },
        recommendations: []
      }

      // Check image dimensions
      if (img.width < 500 || img.height < 500) {
        quality.score -= 2
        quality.issues.composition = true
        quality.recommendations.push('Image resolution is low')
      }

      // If aspect ratio is unusual, might need composition fix
      const aspectRatio = img.width / img.height
      if (aspectRatio < 0.5 || aspectRatio > 2) {
        quality.issues.composition = true
        quality.recommendations.push('Consider cropping to standard aspect ratio')
      }

      // File size heuristic - very small files might be low quality
      if (preview.file.size < 50000) {
        quality.score -= 1
        quality.recommendations.push('Image quality may be low')
      }

      // By default, suggest enhancement for product photos
      // Most uploaded images benefit from background cleanup
      quality.needs_enhancement = true
      quality.issues.background = true
      quality.recommendations.push('Enhance for professional e-commerce look')

      quality.needs_enhancement = quality.score < 8 ||
        quality.issues.background ||
        quality.issues.lighting ||
        quality.issues.composition

      setAnalysisMap(prev => new Map(prev).set(key, {
        loading: false,
        quality
      }))
    } catch (error) {
      setAnalysisMap(prev => new Map(prev).set(key, {
        loading: false,
        error: 'Failed to analyze image'
      }))
    }
  }

  const enhanceImage = async (index: number) => {
    const preview = previews[index]
    if (!preview) return

    setEnhancingIndex(index)

    try {
      const formData = new FormData()
      formData.append('image', preview.file)
      formData.append('options', JSON.stringify({
        removeBackground: true,
        fixLighting: true,
        improveComposition: true
      }))

      const response = await fetch('/api/products/enhance-image', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Enhancement failed')
      }

      // Fetch the enhanced image and create a new File
      const enhancedResponse = await fetch(data.enhanced_url)
      const enhancedBlob = await enhancedResponse.blob()
      const enhancedFile = new File(
        [enhancedBlob],
        `enhanced_${preview.file.name}`,
        { type: 'image/png' }
      )

      // Replace the original with enhanced version
      const newImages = [...images]
      newImages[index] = enhancedFile
      onImagesChange(newImages)

      // Update analysis to show it's been enhanced
      const key = preview.file.name + preview.file.size
      setAnalysisMap(prev => {
        const newMap = new Map(prev)
        newMap.delete(key)
        // Mark new image as enhanced (no need for further enhancement)
        const newKey = enhancedFile.name + enhancedFile.size
        newMap.set(newKey, {
          loading: false,
          quality: {
            score: 9,
            needs_enhancement: false,
            issues: { background: false, lighting: false, composition: false, blurry: false },
            recommendations: ['Image has been enhanced']
          }
        })
        return newMap
      })
    } catch (error) {
      console.error('Enhancement failed:', error)
      alert(error instanceof Error ? error.message : 'Failed to enhance image')
    } finally {
      setEnhancingIndex(null)
    }
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (images.length + acceptedFiles.length > maxImages) {
      alert(`Maximum ${maxImages} images allowed`)
      const allowedCount = maxImages - images.length
      acceptedFiles = acceptedFiles.slice(0, allowedCount)
    }

    if (acceptedFiles.length > 0) {
      onImagesChange([...images, ...acceptedFiles])
    }
  }, [images, maxImages, onImagesChange])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp']
    },
    maxFiles: maxImages - images.length,
    disabled: disabled || images.length >= maxImages,
    onDrop
  })

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    onImagesChange(newImages)
  }

  // Drag and drop reordering
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newImages = [...images]
    const draggedItem = newImages[draggedIndex]
    newImages.splice(draggedIndex, 1)
    newImages.splice(index, 0, draggedItem)

    onImagesChange(newImages)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const getAnalysisForImage = (preview: PreviewImage): ImageAnalysis | undefined => {
    const key = preview.file.name + preview.file.size
    return analysisMap.get(key)
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Image Preview Grid */}
        {previews.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {previews.map((preview, index) => {
              const analysis = getAnalysisForImage(preview)
              const isEnhancing = enhancingIndex === index
              const isEnhanced = preview.file.name.startsWith('enhanced_')

              return (
                <div
                  key={preview.preview}
                  draggable={!isEnhancing}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "relative aspect-square rounded-lg overflow-hidden border-2 group",
                    !isEnhancing && "cursor-move",
                    draggedIndex === index ? "border-primary opacity-50" : "border-transparent",
                    "hover:border-primary/50 transition-all"
                  )}
                >
                  <Image
                    src={preview.preview}
                    alt={`Preview ${index + 1}`}
                    fill
                    className={cn(
                      "object-cover transition-all",
                      isEnhancing && "blur-sm"
                    )}
                  />

                  {/* Enhancing overlay */}
                  {isEnhancing && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white gap-2">
                      <Loader2 className="w-8 h-8 animate-spin" />
                      <span className="text-sm font-medium">Enhancing...</span>
                    </div>
                  )}

                  {/* Drag handle */}
                  {!isEnhancing && (
                    <div className="absolute top-2 left-2 bg-black/50 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <GripVertical className="w-4 h-4" />
                    </div>
                  )}

                  {/* Remove button */}
                  {!isEnhancing && (
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}

                  {/* Enhanced badge */}
                  {isEnhanced && (
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-medium px-2 py-1 rounded flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Enhanced
                    </div>
                  )}

                  {/* Enhance button - show when image needs enhancement */}
                  {enableEnhancement && !isEnhancing && !isEnhanced && analysis?.quality?.needs_enhancement && (
                    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="shadow-lg"
                            onClick={(e) => {
                              e.stopPropagation()
                              enhanceImage(index)
                            }}
                          >
                            <Sparkles className="w-4 h-4 mr-1" />
                            Enhance
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="font-medium mb-1">AI Image Enhancement</p>
                          <ul className="text-xs space-y-0.5">
                            {analysis.quality.recommendations.map((rec, i) => (
                              <li key={i}>• {rec}</li>
                            ))}
                          </ul>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  )}

                  {/* Quality indicator */}
                  {enableEnhancement && !isEnhancing && analysis && !analysis.loading && (
                    <div className="absolute top-10 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {analysis.quality?.needs_enhancement && !isEnhanced ? (
                        <Tooltip>
                          <TooltipTrigger>
                            <div className="bg-amber-500 text-white rounded-full p-1">
                              <AlertTriangle className="w-3 h-3" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p>Image can be improved</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger>
                            <div className="bg-green-500 text-white rounded-full p-1">
                              <CheckCircle className="w-3 h-3" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p>Good quality image</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  )}

                  {/* Primary badge */}
                  {index === 0 && (
                    <div className="absolute bottom-2 left-2 bg-primary text-primary-foreground text-xs font-medium px-2 py-1 rounded">
                      Primary
                    </div>
                  )}

                  {/* Image number */}
                  <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                    {index + 1}/{previews.length}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Dropzone */}
        {images.length < maxImages && (
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all",
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <input {...getInputProps()} />

            <div className="flex flex-col items-center gap-3">
              {isDragActive ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Upload className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-lg font-medium text-primary">Drop images here...</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-lg font-medium mb-1">
                      Drag & drop product images
                    </p>
                    <p className="text-sm text-muted-foreground">
                      or click to browse
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG or WebP (max 10MB each) • {images.length}/{maxImages} uploaded
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Tips */}
        {images.length === 0 && (
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium text-sm mb-2">Tips for great product photos:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Use good lighting and a clean background</li>
              <li>• Show the product from multiple angles</li>
              <li>• First image will be used as the primary image</li>
              <li>• Drag images to reorder them</li>
              {enableEnhancement && (
                <li className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-primary" />
                  AI enhancement available to improve your photos
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
