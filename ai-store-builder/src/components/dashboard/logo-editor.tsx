'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Upload, Check, Wand2, RefreshCw, X, Sparkles, Palette } from 'lucide-react'
import Image from 'next/image'

interface ExtractedColors {
  colors: Array<{ hex: string; name: string; percentage: number }>
  suggested_primary: string
  suggested_secondary: string
}

interface GeneratedLogo {
  url: string
  extracted_colors?: ExtractedColors
}

interface LogoEditorProps {
  currentLogoUrl?: string | null
  storeId: string
  businessName: string
  businessCategory?: string
  description?: string
  brandVibe?: string
  onLogoChange: (url: string, extractedColors?: ExtractedColors) => void
  onColorSuggestion?: (colors: ExtractedColors) => void
}

const MAX_LOGO_GENERATIONS = 3

export function LogoEditor({
  currentLogoUrl,
  storeId,
  businessName,
  businessCategory,
  description,
  brandVibe,
  onLogoChange,
  onColorSuggestion
}: LogoEditorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [generatedLogos, setGeneratedLogos] = useState<GeneratedLogo[]>([])
  const [selectedLogoIndex, setSelectedLogoIndex] = useState<number | null>(null)
  const [logoFeedback, setLogoFeedback] = useState('')
  const [showFeedbackInput, setShowFeedbackInput] = useState(false)
  const [totalGenerations, setTotalGenerations] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [suggestedColors, setSuggestedColors] = useState<ExtractedColors | null>(null)

  // Fetch current generation count on mount
  useEffect(() => {
    const fetchGenerationCount = async () => {
      try {
        const response = await fetch(`/api/dashboard/logo/generation-count?storeId=${storeId}`)
        if (response.ok) {
          const data = await response.json()
          setTotalGenerations(data.count || 0)
        }
      } catch (err) {
        console.error('Failed to fetch generation count:', err)
      }
    }
    fetchGenerationCount()
  }, [storeId])

  const canGenerate = totalGenerations < MAX_LOGO_GENERATIONS

  const handleGenerateLogo = async (feedback?: string) => {
    if (!canGenerate) return

    setIsGenerating(true)
    setError(null)
    setShowFeedbackInput(false)
    setLogoFeedback('')

    try {
      const response = await fetch('/api/dashboard/logo/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: storeId,
          business_name: businessName,
          business_category: businessCategory,
          description: description,
          style_preference: brandVibe || 'modern',
          feedback: feedback || undefined
        })
      })

      const data = await response.json()

      if (data.success) {
        const newLogo: GeneratedLogo = {
          url: data.url,
          extracted_colors: data.extracted_colors
        }
        setGeneratedLogos(prev => [...prev, newLogo])
        setSelectedLogoIndex(generatedLogos.length)
        setTotalGenerations(prev => prev + 1)

        // Show color suggestions if available
        if (data.extracted_colors && onColorSuggestion) {
          setSuggestedColors(data.extracted_colors)
        }
      } else {
        setError(data.error || 'Failed to generate logo')
      }
    } catch (err) {
      console.error('Logo generation failed:', err)
      setError('Failed to generate logo. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('storeId', storeId)

      const response = await fetch('/api/dashboard/logo/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        // Directly apply uploaded logo
        onLogoChange(data.url, data.extracted_colors)

        // Show color suggestions if available
        if (data.extracted_colors) {
          setSuggestedColors(data.extracted_colors)
          onColorSuggestion?.(data.extracted_colors)
        }

        // Reset generated logos state
        setGeneratedLogos([])
        setSelectedLogoIndex(null)
      } else {
        setError(data.error || 'Failed to upload logo')
      }
    } catch (err) {
      console.error('Upload failed:', err)
      setError('Failed to upload logo. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleSelectLogo = (index: number) => {
    setSelectedLogoIndex(index)
    const logo = generatedLogos[index]
    if (logo.extracted_colors) {
      setSuggestedColors(logo.extracted_colors)
    }
  }

  const handleConfirmLogo = () => {
    if (selectedLogoIndex === null || !generatedLogos[selectedLogoIndex]) return

    const selectedLogo = generatedLogos[selectedLogoIndex]
    onLogoChange(selectedLogo.url, selectedLogo.extracted_colors)

    if (selectedLogo.extracted_colors) {
      onColorSuggestion?.(selectedLogo.extracted_colors)
    }

    // Reset state
    setGeneratedLogos([])
    setSelectedLogoIndex(null)
  }

  const handleRegenerateLogo = () => {
    if (!canGenerate) return

    if (logoFeedback.trim()) {
      handleGenerateLogo(logoFeedback.trim())
    } else {
      handleGenerateLogo()
    }
  }

  const handleApplyColors = () => {
    if (suggestedColors && onColorSuggestion) {
      onColorSuggestion(suggestedColors)
      setSuggestedColors(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Current Logo Display */}
      <div className="flex items-start gap-4">
        <div className="relative w-20 h-20 rounded-lg border bg-white overflow-hidden flex items-center justify-center">
          {currentLogoUrl ? (
            <Image
              src={currentLogoUrl}
              alt="Current logo"
              fill
              className="object-contain"
            />
          ) : (
            <div className="text-muted-foreground text-xs text-center p-2">
              No logo
            </div>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <p className="text-sm text-muted-foreground">
            {currentLogoUrl ? 'Current store logo' : 'Add a logo to your store'}
          </p>
          <div className="flex flex-wrap gap-2">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isUploading || isGenerating}
              />
              <Button variant="outline" size="sm" asChild disabled={isUploading}>
                <span>
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-1" />
                  )}
                  Upload Logo
                </span>
              </Button>
            </label>
            {canGenerate && generatedLogos.length === 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGenerateLogo()}
                disabled={isGenerating || isUploading}
                className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200 dark:border-purple-800"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4 mr-1 text-purple-500" />
                )}
                Generate with AI
              </Button>
            )}
          </div>
          {!canGenerate && generatedLogos.length === 0 && (
            <p className="text-xs text-amber-600">
              You&apos;ve used all {MAX_LOGO_GENERATIONS} AI logo generations. You can still upload your own logo.
            </p>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Generated Logos Display */}
      {generatedLogos.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                AI Generated Logos ({totalGenerations}/{MAX_LOGO_GENERATIONS} total)
              </span>
            </div>
            {canGenerate && !isGenerating && (
              <span className="text-xs text-purple-600 dark:text-purple-400">
                {MAX_LOGO_GENERATIONS - totalGenerations} generation{MAX_LOGO_GENERATIONS - totalGenerations !== 1 ? 's' : ''} left
              </span>
            )}
          </div>

          {/* Logo Grid */}
          <div className="flex gap-3 mb-4 flex-wrap">
            {generatedLogos.map((logo, index) => (
              <button
                key={index}
                onClick={() => handleSelectLogo(index)}
                className={`relative w-20 h-20 rounded-lg border-2 overflow-hidden transition-all ${
                  selectedLogoIndex === index
                    ? 'border-purple-500 ring-2 ring-purple-500 ring-offset-2'
                    : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                }`}
              >
                <Image
                  src={logo.url}
                  alt={`Generated logo ${index + 1}`}
                  fill
                  className="object-contain bg-white"
                />
                {selectedLogoIndex === index && (
                  <div className="absolute top-1 right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </button>
            ))}

            {/* Generating placeholder */}
            {isGenerating && (
              <div className="w-20 h-20 rounded-lg border-2 border-dashed border-purple-300 dark:border-purple-700 flex items-center justify-center bg-purple-50 dark:bg-purple-950/30">
                <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
              </div>
            )}
          </div>

          {/* Regeneration Controls */}
          {!isGenerating && canGenerate && (
            <div className="space-y-2">
              {showFeedbackInput ? (
                <div className="flex gap-2">
                  <Input
                    placeholder="Describe what you'd like different..."
                    value={logoFeedback}
                    onChange={(e) => setLogoFeedback(e.target.value)}
                    className="flex-1 text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={handleRegenerateLogo}
                    className="bg-purple-500 hover:bg-purple-600"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Generate
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowFeedbackInput(false)
                      setLogoFeedback('')
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleGenerateLogo()}
                    className="border-purple-200 dark:border-purple-800"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Regenerate
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowFeedbackInput(true)}
                    className="text-purple-600 dark:text-purple-400"
                  >
                    <Sparkles className="h-4 w-4 mr-1" />
                    With feedback
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Max generations message */}
          {!canGenerate && !isGenerating && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
              Maximum generations reached. Select one above or upload your own.
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4 pt-3 border-t border-purple-200 dark:border-purple-800">
            <Button
              size="sm"
              onClick={handleConfirmLogo}
              disabled={selectedLogoIndex === null || isGenerating}
              className="bg-purple-500 hover:bg-purple-600"
            >
              <Check className="h-4 w-4 mr-1" />
              Use Selected Logo
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setGeneratedLogos([])
                setSelectedLogoIndex(null)
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Color Suggestions */}
      {suggestedColors && (
        <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                Colors extracted from logo:
              </span>
              <div className="flex gap-1">
                <div
                  className="w-6 h-6 rounded border border-white shadow"
                  style={{ backgroundColor: suggestedColors.suggested_primary }}
                  title={suggestedColors.suggested_primary}
                />
                <div
                  className="w-5 h-5 rounded border border-white/50 shadow"
                  style={{ backgroundColor: suggestedColors.suggested_secondary }}
                  title={suggestedColors.suggested_secondary}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleApplyColors}
                className="border-emerald-300 text-emerald-700 hover:bg-emerald-100"
              >
                Apply to Brand
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSuggestedColors(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* First-time generation loading */}
      {isGenerating && generatedLogos.length === 0 && (
        <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
          <div>
            <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
              Generating your logo...
            </p>
            <p className="text-xs text-purple-600 dark:text-purple-400">
              This may take a few moments
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
