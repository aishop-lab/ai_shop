'use client'

import { useState } from 'react'
import { Sparkles, Check, Copy, ChevronDown, ChevronUp, FileText, Tags, Palette, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface AISuggestionsData {
  ai_suggested_title: string
  ai_suggested_description: string
  ai_suggested_category: string[]
  ai_suggested_tags: string[]
  ai_suggested_attributes?: Record<string, string>
  confidence: number
}

export interface EnhancedAISuggestionsProps {
  ocrText?: string[]
  imageQuality?: {
    score: number
    is_blurry: boolean
    brightness: 'dark' | 'normal' | 'bright'
    has_complex_background: boolean
  }
  wasAutoApplied?: boolean
}

interface AISuggestionsProps {
  suggestions: AISuggestionsData
  onApply: () => void
  onApplyField?: (field: keyof AISuggestionsData, value: string | string[]) => void
  isApplied?: boolean
  enhanced?: EnhancedAISuggestionsProps
}

export default function AISuggestions({
  suggestions,
  onApply,
  onApplyField,
  isApplied = false,
  enhanced
}: AISuggestionsProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const confidenceLevel = suggestions.confidence >= 0.8 
    ? 'high' 
    : suggestions.confidence >= 0.5 
      ? 'medium' 
      : 'low'

  const confidenceColors = {
    high: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    low: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
  }

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  return (
    <div className={cn(
      "rounded-lg border overflow-hidden transition-all",
      isApplied 
        ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
        : "bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 dark:from-purple-950/20 dark:to-blue-950/20 dark:border-purple-800"
    )}>
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center",
            isApplied ? "bg-green-500" : "bg-purple-500"
          )}>
            {isApplied ? (
              <Check className="w-4 h-4 text-white" />
            ) : (
              <Sparkles className="w-4 h-4 text-white" />
            )}
          </div>
          <div>
            <h3 className={cn(
              "font-semibold",
              isApplied ? "text-green-900 dark:text-green-100" : "text-purple-900 dark:text-purple-100"
            )}>
              {isApplied ? 'AI Suggestions Applied' : 'AI Suggestions'}
            </h3>
            <p className="text-xs text-muted-foreground">
              Based on your product image
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-xs font-medium px-2 py-1 rounded-full",
            confidenceColors[confidenceLevel]
          )}>
            {Math.round(suggestions.confidence * 100)}% confident
          </span>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Title */}
          <SuggestionField
            label="Title"
            value={suggestions.ai_suggested_title}
            onCopy={() => copyToClipboard(suggestions.ai_suggested_title, 'title')}
            onApply={onApplyField ? () => onApplyField('ai_suggested_title', suggestions.ai_suggested_title) : undefined}
            isCopied={copiedField === 'title'}
          />

          {/* Description */}
          <SuggestionField
            label="Description"
            value={suggestions.ai_suggested_description}
            onCopy={() => copyToClipboard(suggestions.ai_suggested_description, 'description')}
            onApply={onApplyField ? () => onApplyField('ai_suggested_description', suggestions.ai_suggested_description) : undefined}
            isCopied={copiedField === 'description'}
            isLong
          />

          {/* Category */}
          <div>
            <span className="text-sm font-medium text-muted-foreground">Category</span>
            <p className="text-sm mt-1">
              {suggestions.ai_suggested_category.join(' > ')}
            </p>
          </div>

          {/* Tags */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Tags className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Suggested Tags</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.ai_suggested_tags.map((tag, i) => (
                <span
                  key={i}
                  className="bg-background text-foreground text-xs px-2 py-1 rounded-full border"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Attributes */}
          {suggestions.ai_suggested_attributes && Object.keys(suggestions.ai_suggested_attributes).length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Palette className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Detected Attributes</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(suggestions.ai_suggested_attributes).map(([key, value]) => (
                  <div key={key} className="bg-background/50 rounded p-2 border">
                    <span className="text-xs text-muted-foreground capitalize">{key}</span>
                    <p className="text-sm font-medium">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* OCR Text */}
          {enhanced?.ocrText && enhanced.ocrText.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Text Found in Image (OCR)</span>
              </div>
              <div className="bg-background/50 rounded p-2 border">
                <div className="flex flex-wrap gap-1.5">
                  {enhanced.ocrText.map((text, i) => (
                    <span
                      key={i}
                      className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 text-xs px-2 py-0.5 rounded"
                    >
                      {text}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Auto-applied indicator */}
          {enhanced?.wasAutoApplied && (
            <div className="flex items-center gap-2 p-2 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
              <Zap className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-sm text-green-700 dark:text-green-300">
                High confidence - suggestions were auto-applied
              </span>
            </div>
          )}

          {/* Apply All Button */}
          {!isApplied && (
            <Button onClick={onApply} className="w-full">
              <Sparkles className="w-4 h-4 mr-2" />
              Apply All Suggestions
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

interface SuggestionFieldProps {
  label: string
  value: string
  onCopy: () => void
  onApply?: () => void
  isCopied: boolean
  isLong?: boolean
}

function SuggestionField({ label, value, onCopy, onApply, isCopied, isLong }: SuggestionFieldProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onCopy}
            className="p-1 hover:bg-background rounded transition-colors"
            title="Copy to clipboard"
          >
            {isCopied ? (
              <Check className="w-3.5 h-3.5 text-green-600" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </button>
          {onApply && (
            <button
              type="button"
              onClick={onApply}
              className="text-xs text-primary hover:underline"
            >
              Use this
            </button>
          )}
        </div>
      </div>
      <p className={cn(
        "text-sm bg-background/50 rounded p-2 border",
        isLong && "line-clamp-3"
      )}>
        {value}
      </p>
    </div>
  )
}
