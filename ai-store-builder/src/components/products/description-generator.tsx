'use client'

import { useState } from 'react'
import { useCompletion } from '@ai-sdk/react'
import { Sparkles, Loader2, Check, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface DescriptionGeneratorProps {
  title: string
  category?: string
  attributes?: Record<string, string>
  onComplete: (description: string) => void
  disabled?: boolean
}

export function DescriptionGenerator({
  title,
  category,
  attributes,
  onComplete,
  disabled = false,
}: DescriptionGeneratorProps) {
  const [hasGenerated, setHasGenerated] = useState(false)

  const {
    completion,
    isLoading,
    complete,
    stop,
    error,
  } = useCompletion({
    api: '/api/ai/stream-description',
    onFinish: (_prompt, completion) => {
      setHasGenerated(true)
      onComplete(completion)
    },
  })

  const handleGenerate = () => {
    if (!title || isLoading) return

    setHasGenerated(false)
    complete(JSON.stringify({ title, category, attributes }), {
      body: { title, category, attributes },
    })
  }

  const handleApply = () => {
    if (completion) {
      onComplete(completion)
    }
  }

  const canGenerate = title && title.length >= 3 && !disabled

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-background">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <CardTitle className="text-base">AI Description Generator</CardTitle>
            <CardDescription className="text-xs">
              Generate a compelling description with AI
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Generation button */}
        {!isLoading && !completion && (
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate}
            variant="outline"
            className="w-full border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/50"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Description
          </Button>
        )}

        {/* Loading/Streaming state */}
        {isLoading && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm font-medium">Generating...</span>
            </div>
            {completion && (
              <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-purple-200 dark:border-purple-800">
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {completion}
                  <span className="inline-block w-1 h-4 bg-purple-500 animate-pulse ml-0.5" />
                </p>
              </div>
            )}
            <Button
              type="button"
              onClick={stop}
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-600"
            >
              Stop
            </Button>
          </div>
        )}

        {/* Completed state */}
        {!isLoading && completion && (
          <div className="space-y-3">
            <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {completion}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleApply}
                variant="default"
                size="sm"
                className="flex-1"
              >
                <Check className="w-4 h-4 mr-2" />
                Apply Description
              </Button>
              <Button
                type="button"
                onClick={handleGenerate}
                variant="outline"
                size="sm"
                disabled={!canGenerate}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            {hasGenerated && (
              <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Description applied to form
              </p>
            )}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">
              Failed to generate description. Please try again.
            </p>
            <Button
              type="button"
              onClick={handleGenerate}
              variant="outline"
              size="sm"
              className="mt-2"
              disabled={!canGenerate}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        )}

        {/* Helper text */}
        {!completion && !isLoading && (
          <p className="text-xs text-muted-foreground">
            {!canGenerate
              ? 'Enter a product title (at least 3 characters) to generate a description'
              : 'Click to generate an AI-powered product description based on the title and category'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default DescriptionGenerator
