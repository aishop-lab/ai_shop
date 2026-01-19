'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Lightbulb, Plus, X, Sparkles } from 'lucide-react'

interface AISuggestionsWidgetProps {
  storeCategory: string[]
  productCount: number
  orderCount?: number
}

// Category-based product suggestions
const CATEGORY_SUGGESTIONS: Record<string, string[]> = {
  'Fashion & Apparel': ['Dresses', 'Tops', 'Accessories', 'Footwear', 'Bags'],
  'Electronics': ['Phone Cases', 'Chargers', 'Earphones', 'Smartwatch Bands', 'Cables'],
  'Home & Living': ['Cushion Covers', 'Wall Art', 'Candles', 'Planters', 'Organizers'],
  'Beauty & Personal Care': ['Skincare Sets', 'Lip Care', 'Hair Accessories', 'Makeup Brushes', 'Fragrances'],
  'Food & Beverages': ['Gift Boxes', 'Snack Packs', 'Specialty Items', 'Beverages', 'Condiments'],
  'Health & Wellness': ['Supplements', 'Fitness Accessories', 'Yoga Mats', 'Wellness Kits', 'Essential Oils'],
  'Art & Crafts': ['Art Prints', 'Craft Kits', 'Stationery', 'Custom Portraits', 'Handmade Items'],
  'Jewelry': ['Necklaces', 'Earrings', 'Bracelets', 'Rings', 'Sets'],
  'Books & Education': ['E-books', 'Courses', 'Study Materials', 'Planners', 'Journals'],
  'Sports & Outdoors': ['Fitness Gear', 'Sports Accessories', 'Outdoor Equipment', 'Water Bottles', 'Bags'],
}

// Default suggestions for unknown categories
const DEFAULT_SUGGESTIONS = ['Best Sellers', 'New Arrivals', 'Gift Sets', 'Bundles', 'Essentials']

// Tips based on store state
function getTip(productCount: number, orderCount: number = 0): { title: string; description: string } | null {
  if (productCount === 0) {
    return {
      title: 'Add your first product',
      description: 'Upload product images and let AI help with titles and descriptions.'
    }
  }
  if (productCount < 5) {
    return {
      title: 'Expand your catalog',
      description: 'Stores with 5+ products typically see higher engagement.'
    }
  }
  if (orderCount === 0 && productCount >= 5) {
    return {
      title: 'Share your store',
      description: 'Your catalog is ready! Share your store link on social media to attract customers.'
    }
  }
  return null
}

export function AISuggestionsWidget({ storeCategory, productCount, orderCount = 0 }: AISuggestionsWidgetProps) {
  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([])
  const [isVisible, setIsVisible] = useState(true)

  // Load dismissed suggestions from localStorage
  useEffect(() => {
    const dismissed = localStorage.getItem('ai-suggestions-dismissed')
    if (dismissed) {
      setDismissedSuggestions(JSON.parse(dismissed))
    }
  }, [])

  // Get relevant suggestions based on category
  const getSuggestions = (): string[] => {
    // Find matching category suggestions
    for (const category of storeCategory) {
      const normalizedCategory = category.toLowerCase()
      for (const [key, suggestions] of Object.entries(CATEGORY_SUGGESTIONS)) {
        if (key.toLowerCase().includes(normalizedCategory) || normalizedCategory.includes(key.toLowerCase())) {
          return suggestions.filter(s => !dismissedSuggestions.includes(s))
        }
      }
    }
    return DEFAULT_SUGGESTIONS.filter(s => !dismissedSuggestions.includes(s))
  }

  const suggestions = getSuggestions()
  const tip = getTip(productCount, orderCount)

  const handleDismissSuggestion = (suggestion: string) => {
    const newDismissed = [...dismissedSuggestions, suggestion]
    setDismissedSuggestions(newDismissed)
    localStorage.setItem('ai-suggestions-dismissed', JSON.stringify(newDismissed))
  }

  const handleDismissWidget = () => {
    setIsVisible(false)
    localStorage.setItem('ai-suggestions-widget-hidden', 'true')
  }

  // Check if widget was permanently hidden
  useEffect(() => {
    const hidden = localStorage.getItem('ai-suggestions-widget-hidden')
    if (hidden === 'true') {
      setIsVisible(false)
    }
  }, [])

  if (!isVisible || (suggestions.length === 0 && !tip)) return null

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Suggestions
          </CardTitle>
          <button
            onClick={handleDismissWidget}
            className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Hide suggestions"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tip */}
        {tip && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <Lightbulb className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">{tip.title}</p>
              <p className="text-sm text-muted-foreground">{tip.description}</p>
            </div>
          </div>
        )}

        {/* Product suggestions */}
        {suggestions.length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Based on your <span className="font-medium text-foreground">{storeCategory[0] || 'store'}</span> category, consider adding:
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.slice(0, 5).map((suggestion) => (
                <span
                  key={suggestion}
                  className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-muted hover:bg-muted/80 transition-colors"
                >
                  {suggestion}
                  <button
                    onClick={() => handleDismissSuggestion(suggestion)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 -mr-1 rounded-full hover:bg-muted-foreground/20"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <Link href="/dashboard/products/new">
          <Button className="w-full gap-2" size="sm">
            <Plus className="h-4 w-4" />
            Add Product with AI
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
