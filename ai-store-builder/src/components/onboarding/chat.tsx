'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ColorAccessibilityChecker } from '@/components/ui/color-accessibility-checker'
import { ConfidenceBadge } from '@/components/ui/confidence-badge'
import { Loader2, Send, Upload, Check, Sparkles, Palette, Wand2, Image } from 'lucide-react'
import { StoreBuildingPreview } from './store-building-preview'
import { TemplateSelector } from './template-selector'
import type { StoreData, ProcessMessageResponse, BrandVibe } from '@/lib/types/onboarding'

type StepType = 'text' | 'select' | 'file' | 'color' | 'multi-input' | 'action' | 'template-select'

interface Message {
  id: string
  role: 'assistant' | 'user'
  content: string
  options?: Array<{ value: string; label: string }>
  type?: StepType
}

// AI suggestions from unified service
interface AISuggestions {
  store_names?: Array<{ name: string; slug: string; reasoning: string }>
  brand_colors?: { primary: string; secondary: string; reasoning: string }
  tagline?: string
  should_auto_apply?: boolean
}

interface OnboardingChatProps {
  onComplete: (slug: string) => void
  onStepChange?: (step: number) => void
}

export function OnboardingChat({ onComplete, onStepChange }: OnboardingChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [extractedData, setExtractedData] = useState<Partial<StoreData>>({})
  const [stepType, setStepType] = useState<StepType>('text')
  const [stepOptions, setStepOptions] = useState<Array<{ value: string; label: string }>>([])
  const [isComplete, setIsComplete] = useState(false)
  const [isBuildingStore, setIsBuildingStore] = useState(false)
  const [selectedColor, setSelectedColor] = useState('#3B82F6')
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestions | null>(null)
  const [aiConfidence, setAiConfidence] = useState<{
    score: number
    level: 'high' | 'medium' | 'low'
    reasoning?: string
  } | null>(null)
  const [logoColors, setLogoColors] = useState<{
    colors: Array<{ hex: string; name: string; percentage: number }>
    suggested_primary: string
    suggested_secondary: string
  } | null>(null)
  const [isGeneratingLogo, setIsGeneratingLogo] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Contact info state for multi-input
  const [contactInfo, setContactInfo] = useState({
    email: '',
    phone: '',
    whatsapp: '',
    instagram: ''
  })
  const [whatsappSameAsPhone, setWhatsappSameAsPhone] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Notify parent of step changes
  useEffect(() => {
    onStepChange?.(currentStep)
  }, [currentStep, onStepChange])

  // Start onboarding session
  useEffect(() => {
    const startSession = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/onboarding/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })

        const data = await response.json()

        if (data.success) {
          setSessionId(data.session_id)
          setCurrentStep(data.current_step)
          setStepType(data.step_type)
          setStepOptions(data.options || [])
          setMessages([
            {
              id: '1',
              role: 'assistant',
              content: data.question,
              options: data.options,
              type: data.step_type
            }
          ])
        } else {
          setMessages([
            {
              id: '1',
              role: 'assistant',
              content: 'Welcome! Please sign in to start setting up your store.',
              type: 'text'
            }
          ])
        }
      } catch (error) {
        console.error('Failed to start session:', error)
        setMessages([
          {
            id: '1',
            role: 'assistant',
            content: 'Something went wrong. Please refresh and try again.',
            type: 'text'
          }
        ])
      } finally {
        setIsLoading(false)
      }
    }

    startSession()
  }, [])

  const sendMessage = async (messageContent: string, displayContent?: string) => {
    if (!sessionId || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: displayContent || messageContent  // Show friendly display message if provided
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/onboarding/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          message: messageContent,
          current_step: currentStep,
          extracted_data: extractedData
        })
      })

      const data = await response.json()

      // Check for API errors (validation failures, etc.)
      if (!response.ok || data.success === false) {
        const errorMessage = data.error || 'Something went wrong. Please try again.'
        if (data.retry) {
          // Validation error - show error but stay on current step
          setMessages(prev => [
            ...prev,
            {
              id: Date.now().toString(),
              role: 'assistant',
              content: errorMessage,
              type: stepType
            }
          ])
        } else {
          throw new Error(errorMessage)
        }
        return
      }

      // Type cast after validation - extended type with AI suggestions
      const processedData = data as ProcessMessageResponse & { ai_suggestions?: AISuggestions }

      if (processedData.is_complete) {
        setIsComplete(true)
        setExtractedData(processedData.extracted_data)
        setIsBuildingStore(true)
        // The StoreBuildingPreview component will handle the actual store creation
      } else {
        // Determine step type based on next step ID BEFORE updating state
        const stepTypes: Record<number, StepType> = {
          1: 'text',      // business_name
          2: 'text',      // description
          3: 'select',    // category_confirmation
          31: 'select',   // manual_category (fallback)
          4: 'select',    // target_geography
          5: 'file',      // logo_url
          6: 'select',    // brand_vibe
          7: 'color',     // primary_color
          8: 'multi-input', // contact_info
          9: 'text',      // gstin
          10: 'template-select',  // template_selection
          11: 'action'    // build_store
        }

        const nextStep = processedData.current_step
        const newStepType: StepType = stepTypes[nextStep] || 'text'

        // Update all state together
        setCurrentStep(nextStep)
        setExtractedData(processedData.extracted_data)
        setStepOptions(processedData.options || [])
        setStepType(newStepType)

        // Capture AI suggestions if present
        if (processedData.ai_suggestions) {
          setAiSuggestions(processedData.ai_suggestions)

          // Auto-apply AI suggested color if confidence is high and we're on color step
          if (nextStep === 7 && processedData.ai_suggestions.brand_colors?.primary) {
            setSelectedColor(processedData.ai_suggestions.brand_colors.primary)
          }
        } else {
          // Clear suggestions when moving to new step without them
          setAiSuggestions(null)
        }

        // Capture AI confidence if present
        if (processedData.ai_confidence) {
          setAiConfidence(processedData.ai_confidence)
        } else {
          setAiConfidence(null)
        }

        // Reset contact info when entering step 8
        if (nextStep === 8) {
          setContactInfo({
            email: '',
            phone: '',
            whatsapp: '',
            instagram: ''
          })
        }

        setMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant' as const,
            content: processedData.next_question,
            options: processedData.options,
            type: newStepType
          }
        ])
      }
    } catch (error) {
      console.error('Failed to process message:', error)
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
          type: 'text'
        }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) {
      sendMessage(input.trim())
    }
  }

  const handleOptionSelect = (value: string) => {
    sendMessage(value)
  }

  const handleColorSubmit = () => {
    sendMessage(selectedColor)
  }

  // Normalize phone number - strip +91 or 91 prefix if present
  const normalizePhone = (phone: string): string => {
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

  const handleContactSubmit = () => {
    const normalizedPhone = normalizePhone(contactInfo.phone)
    const normalizedWhatsapp = whatsappSameAsPhone
      ? normalizedPhone
      : (contactInfo.whatsapp ? normalizePhone(contactInfo.whatsapp) : '')

    const submissionData = {
      ...contactInfo,
      phone: normalizedPhone,
      whatsapp: normalizedWhatsapp
    }

    // Create a friendly display message
    const displayParts = [
      `Email: ${contactInfo.email}`,
      `Phone: ${normalizedPhone}`,
      ...(normalizedWhatsapp ? [`WhatsApp: ${normalizedWhatsapp}`] : []),
      ...(contactInfo.instagram ? [`Instagram: ${contactInfo.instagram}`] : [])
    ]
    const displayMessage = displayParts.join(' | ')

    sendMessage(JSON.stringify(submissionData), displayMessage)
  }

  const handleSkip = () => {
    sendMessage('skip')
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/onboarding/upload-logo', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        // Store logo colors if extracted
        if (data.extracted_colors) {
          setLogoColors(data.extracted_colors)
        }

        // Send both URL and extracted colors as JSON
        const logoPayload = data.extracted_colors
          ? JSON.stringify({ url: data.url, extracted_colors: data.extracted_colors })
          : data.url

        sendMessage(logoPayload, 'Logo uploaded')
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Upload failed:', error)
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'Failed to upload logo. You can skip this step and add it later.',
          type: 'text'
        }
      ])
      setIsLoading(false)
    }
  }

  const handleGenerateLogo = async () => {
    if (!sessionId) return

    setIsGeneratingLogo(true)
    try {
      const response = await fetch('/api/onboarding/generate-logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: extractedData.business_name,
          business_category: extractedData.business_category?.[0] || extractedData.business_type,
          description: extractedData.description,
          style_preference: extractedData.brand_vibe || 'modern'
        })
      })

      const data = await response.json()

      if (data.success) {
        // Store logo colors if extracted
        if (data.extracted_colors) {
          setLogoColors(data.extracted_colors)
        }

        // Send both URL and extracted colors as JSON
        const logoPayload = data.extracted_colors
          ? JSON.stringify({ url: data.url, extracted_colors: data.extracted_colors })
          : data.url

        sendMessage(logoPayload, 'AI-generated logo')
      } else {
        throw new Error(data.error)
      }
    } catch (error: unknown) {
      console.error('Logo generation failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate logo'
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: `${errorMessage}. You can try again or upload your own logo.`,
          type: 'text'
        }
      ])
    } finally {
      setIsGeneratingLogo(false)
    }
  }

  // Handle build completion
  const handleBuildComplete = (slug: string) => {
    onComplete(slug)
  }

  // Handle build error
  const handleBuildError = (error: string) => {
    setIsBuildingStore(false)
    setMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Something went wrong: ${error}. Please try again.`,
        type: 'text'
      }
    ])
  }

  // Show building preview when store is being built
  if (isBuildingStore) {
    return (
      <div className="rounded-lg border bg-background p-6">
        <StoreBuildingPreview
          storeData={extractedData}
          onBuildComplete={handleBuildComplete}
          onError={handleBuildError}
        />
      </div>
    )
  }

  return (
    <div className="flex h-[600px] flex-col rounded-lg border bg-background">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${message.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted'
                }`}
            >
              <p>{message.content}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-4 py-2">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t p-4">
        {stepType === 'select' && stepOptions.length > 0 && !isLoading && (
          <div className="flex flex-wrap gap-2 mb-3">
            {stepOptions.map((option) => (
              <Button
                key={option.value}
                variant="outline"
                size="sm"
                onClick={() => handleOptionSelect(option.value)}
              >
                {option.label}
              </Button>
            ))}
            {/* Show AI confidence badge for confirmation steps */}
            {aiConfidence && currentStep === 3 && (
              <ConfidenceBadge
                score={aiConfidence.score}
                level={aiConfidence.level}
                reasoning={aiConfidence.reasoning}
              />
            )}
          </div>
        )}

        {stepType === 'action' && stepOptions.length > 0 && !isLoading && (
          <div className="flex flex-col items-center gap-3 mb-3 py-4">
            <p className="text-sm text-muted-foreground text-center">
              Your store will be created with all the details you provided.
            </p>
            {stepOptions.map((option) => (
              <Button
                key={option.value}
                size="lg"
                className="w-full max-w-xs text-lg font-semibold py-6"
                onClick={() => handleOptionSelect(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        )}

        {stepType === 'template-select' && !isLoading && (
          <div className="mb-3">
            <TemplateSelector
              vibe={(extractedData.brand_vibe as BrandVibe) || 'modern'}
              selected={selectedTemplate || undefined}
              onSelect={(variantId) => {
                setSelectedTemplate(variantId)
              }}
            />
            <Button
              className="w-full mt-4"
              disabled={!selectedTemplate}
              onClick={() => {
                if (selectedTemplate) {
                  sendMessage(selectedTemplate)
                }
              }}
            >
              Continue with {selectedTemplate ? 'selected layout' : 'a layout'}
            </Button>
          </div>
        )}

        {stepType === 'color' && !isLoading && (
          <div className="space-y-3 mb-3">
            {/* Logo-extracted colors (priority) */}
            {logoColors && (
              <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-2 mb-2">
                  <Image className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    Colors from your logo:
                  </span>
                  <span className="text-xs bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full ml-auto">
                    Extracted
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Main suggested colors */}
                  <button
                    onClick={() => setSelectedColor(logoColors.suggested_primary)}
                    className={`w-10 h-10 rounded-md border-2 shadow-md hover:scale-110 transition-transform ${selectedColor === logoColors.suggested_primary ? 'ring-2 ring-emerald-500 ring-offset-2' : 'border-white'}`}
                    style={{ backgroundColor: logoColors.suggested_primary }}
                    title={`Primary: ${logoColors.suggested_primary}`}
                  />
                  <button
                    onClick={() => setSelectedColor(logoColors.suggested_secondary)}
                    className={`w-8 h-8 rounded-md border shadow-md hover:scale-105 transition-transform ${selectedColor === logoColors.suggested_secondary ? 'ring-2 ring-emerald-500 ring-offset-2' : 'border-white/50'}`}
                    style={{ backgroundColor: logoColors.suggested_secondary }}
                    title={`Secondary: ${logoColors.suggested_secondary}`}
                  />
                  {/* Divider */}
                  <div className="w-px h-6 bg-emerald-200 dark:bg-emerald-700 mx-1" />
                  {/* All extracted colors */}
                  {logoColors.colors.slice(0, 5).map((color, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedColor(color.hex)}
                      className={`w-6 h-6 rounded-full border hover:scale-110 transition-transform ${selectedColor === color.hex ? 'ring-2 ring-emerald-500 ring-offset-1' : 'border-white/30'}`}
                      style={{ backgroundColor: color.hex }}
                      title={`${color.name}: ${color.hex} (${color.percentage}%)`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* AI Color Suggestion (shown if no logo colors) */}
            {!logoColors && aiSuggestions?.brand_colors && (
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <Palette className="h-4 w-4 text-purple-500 flex-shrink-0" />
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-sm text-purple-700 dark:text-purple-300">AI suggestion:</span>
                  <button
                    onClick={() => setSelectedColor(aiSuggestions.brand_colors!.primary)}
                    className="w-8 h-8 rounded-md border-2 border-white shadow-md hover:scale-110 transition-transform"
                    style={{ backgroundColor: aiSuggestions.brand_colors.primary }}
                    title={`Primary: ${aiSuggestions.brand_colors.primary}`}
                  />
                  <button
                    onClick={() => setSelectedColor(aiSuggestions.brand_colors!.secondary)}
                    className="w-6 h-6 rounded-md border border-white/50 opacity-75 hover:opacity-100 transition-opacity"
                    style={{ backgroundColor: aiSuggestions.brand_colors.secondary }}
                    title={`Secondary: ${aiSuggestions.brand_colors.secondary}`}
                  />
                </div>
                {aiSuggestions.should_auto_apply && (
                  <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">
                    Recommended
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center gap-3">
              <input
                type="color"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="h-10 w-20 cursor-pointer rounded border"
              />
              <span className="text-sm text-muted-foreground">{selectedColor}</span>
              <ColorAccessibilityChecker primaryColor={selectedColor} compact />
              <Button size="sm" onClick={handleColorSubmit}>
                <Check className="h-4 w-4 mr-1" />
                Use This Color
              </Button>
            </div>
          </div>
        )}

        {stepType === 'file' && !isLoading && !isGeneratingLogo && (
          <div className="space-y-3 mb-3">
            <div className="flex flex-wrap items-center gap-3">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button variant="outline" size="sm" asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-1" />
                    Upload Logo
                  </span>
                </Button>
              </label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateLogo}
                className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200 dark:border-purple-800 hover:border-purple-400"
              >
                <Wand2 className="h-4 w-4 mr-1 text-purple-500" />
                Generate with AI
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSkip}>
                Skip for now
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Upload your logo or let AI create a professional icon for your brand.
            </p>
          </div>
        )}

        {stepType === 'file' && isGeneratingLogo && (
          <div className="flex items-center gap-3 mb-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
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

        {stepType === 'multi-input' && !isLoading && (
          <div className="space-y-3 mb-3">
            <Input
              placeholder="Email"
              type="email"
              value={contactInfo.email}
              onChange={(e) => setContactInfo(prev => ({ ...prev, email: e.target.value }))}
            />
            <Input
              placeholder="Phone (e.g., 8459953597 or +918459953597)"
              value={contactInfo.phone}
              onChange={(e) => setContactInfo(prev => ({ ...prev, phone: e.target.value }))}
            />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="whatsapp-same"
                  checked={whatsappSameAsPhone}
                  onChange={(e) => {
                    setWhatsappSameAsPhone(e.target.checked)
                    if (e.target.checked) {
                      setContactInfo(prev => ({ ...prev, whatsapp: '' }))
                    }
                  }}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="whatsapp-same" className="text-sm text-muted-foreground">
                  WhatsApp same as phone number
                </label>
              </div>
              {!whatsappSameAsPhone && (
                <Input
                  placeholder="WhatsApp number (optional)"
                  value={contactInfo.whatsapp}
                  onChange={(e) => setContactInfo(prev => ({ ...prev, whatsapp: e.target.value }))}
                />
              )}
            </div>
            <Input
              placeholder="Instagram handle (optional)"
              value={contactInfo.instagram}
              onChange={(e) => setContactInfo(prev => ({ ...prev, instagram: e.target.value }))}
            />
            <Button size="sm" onClick={handleContactSubmit} disabled={!contactInfo.email || !contactInfo.phone}>
              Continue
            </Button>
          </div>
        )}

        {(stepType === 'text' || !stepType) && !isComplete && (
          <div className="space-y-3">
            {/* AI Store Name Suggestions - Show on business name step */}
            {currentStep === 1 && aiSuggestions?.store_names && aiSuggestions.store_names.length > 0 && (
              <div className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                    AI-suggested names:
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {aiSuggestions.store_names.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInput(suggestion.name)}
                      className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 rounded-full border border-purple-200 dark:border-purple-700 hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/50 transition-colors"
                      title={suggestion.reasoning}
                    >
                      {suggestion.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your answer..."
                disabled={isLoading}
              />
              <Button type="submit" disabled={isLoading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        )}

        {currentStep === 9 && stepType === 'text' && !isLoading && (
          <div className="flex gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={handleSkip}>
              I don&apos;t have GSTIN
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              Skip for now
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
