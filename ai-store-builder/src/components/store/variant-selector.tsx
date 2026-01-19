'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type {
  ProductVariantOption,
  ProductVariant,
  VariantSelection,
} from '@/lib/types/variant'

interface VariantSelectorProps {
  options: ProductVariantOption[]
  variants: ProductVariant[]
  selection: VariantSelection
  onChange: (selection: VariantSelection) => void
  className?: string
}

export function VariantSelector({
  options,
  variants,
  selection,
  onChange,
  className,
}: VariantSelectorProps) {
  // Calculate which values are available based on current selection
  const availableValues = useMemo(() => {
    const available: Record<string, Set<string>> = {}

    for (const option of options) {
      available[option.name] = new Set()

      // For each value, check if there's an active variant with this value
      // that matches all other selected options
      for (const value of option.values) {
        const testSelection = { ...selection, [option.name]: value.value }

        // Check if any active variant matches this test selection
        const matchingVariant = variants.find((v) => {
          if (v.status !== 'active') return false

          // Check if variant matches all selected options
          for (const [optName, optValue] of Object.entries(testSelection)) {
            if (v.attributes[optName] !== optValue) return false
          }
          return true
        })

        if (matchingVariant) {
          available[option.name].add(value.value)
        }
      }
    }

    return available
  }, [options, variants, selection])

  // Check if a value is in stock
  const isValueInStock = (optionName: string, value: string): boolean => {
    const testSelection = { ...selection, [optionName]: value }

    // Find matching variant
    const variant = variants.find((v) => {
      if (v.status !== 'active') return false
      for (const [optName, optValue] of Object.entries(testSelection)) {
        if (v.attributes[optName] !== optValue) return false
      }
      return true
    })

    if (!variant) return false
    if (!variant.track_quantity) return true
    return variant.quantity > 0
  }

  const handleSelect = (optionName: string, value: string) => {
    onChange({ ...selection, [optionName]: value })
  }

  return (
    <div className={cn('space-y-4', className)}>
      {options.map((option) => (
        <div key={option.id} className="space-y-2">
          <label className="text-sm font-medium">
            {option.name}
            {selection[option.name] && (
              <span className="font-normal text-muted-foreground ml-2">
                : {selection[option.name]}
              </span>
            )}
          </label>

          {/* Color swatches */}
          {(option.name.toLowerCase().includes('color') ||
            option.name.toLowerCase().includes('colour')) &&
          option.values.some((v) => v.color_code) ? (
            <div className="flex flex-wrap gap-2">
              {option.values.map((value) => {
                const isSelected = selection[option.name] === value.value
                const isAvailable = availableValues[option.name]?.has(
                  value.value
                )
                const inStock = isValueInStock(option.name, value.value)

                return (
                  <button
                    key={value.id}
                    type="button"
                    onClick={() => handleSelect(option.name, value.value)}
                    disabled={!isAvailable}
                    className={cn(
                      'w-10 h-10 rounded-full border-2 transition-all relative',
                      isSelected
                        ? 'border-primary ring-2 ring-primary/30'
                        : 'border-border hover:border-primary/50',
                      !isAvailable && 'opacity-30 cursor-not-allowed',
                      !inStock && isAvailable && 'opacity-60'
                    )}
                    style={{ backgroundColor: value.color_code || '#ccc' }}
                    title={`${value.value}${!inStock ? ' (Out of stock)' : ''}`}
                  >
                    {!inStock && isAvailable && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="w-full h-0.5 bg-foreground/50 rotate-45 absolute" />
                      </span>
                    )}
                    {isSelected && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <svg
                          className={cn(
                            'w-5 h-5',
                            isLightColor(value.color_code)
                              ? 'text-gray-800'
                              : 'text-white'
                          )}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ) : (
            /* Button group for Size, Material, etc. */
            <div className="flex flex-wrap gap-2">
              {option.values.map((value) => {
                const isSelected = selection[option.name] === value.value
                const isAvailable = availableValues[option.name]?.has(
                  value.value
                )
                const inStock = isValueInStock(option.name, value.value)

                return (
                  <button
                    key={value.id}
                    type="button"
                    onClick={() => handleSelect(option.name, value.value)}
                    disabled={!isAvailable}
                    className={cn(
                      'px-4 py-2 border rounded-md text-sm font-medium transition-all',
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border hover:border-primary',
                      !isAvailable && 'opacity-30 cursor-not-allowed',
                      !inStock &&
                        isAvailable &&
                        'line-through opacity-60 decoration-muted-foreground'
                    )}
                  >
                    {value.value}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// Helper to determine if a color is light (for choosing check mark color)
function isLightColor(hex?: string): boolean {
  if (!hex) return false
  const c = hex.replace('#', '')
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  return brightness > 155
}

// Helper hook for managing variant selection
export function useVariantSelection(
  options: ProductVariantOption[],
  variants: ProductVariant[]
) {
  const getDefaultSelection = (): VariantSelection => {
    // Try to find the default variant
    const defaultVariant = variants.find((v) => v.is_default && v.status === 'active')
    if (defaultVariant) {
      return { ...defaultVariant.attributes }
    }

    // Otherwise, select first available value for each option
    const selection: VariantSelection = {}
    for (const option of options) {
      const firstAvailable = option.values.find((v) => {
        // Find any active variant with this value
        return variants.some(
          (variant) =>
            variant.status === 'active' &&
            variant.attributes[option.name] === v.value
        )
      })
      if (firstAvailable) {
        selection[option.name] = firstAvailable.value
      }
    }
    return selection
  }

  const findVariant = (
    selection: VariantSelection
  ): ProductVariant | undefined => {
    // Check if all options are selected
    if (Object.keys(selection).length !== options.length) {
      return undefined
    }

    return variants.find((v) => {
      if (v.status !== 'active') return false
      for (const [optName, optValue] of Object.entries(selection)) {
        if (v.attributes[optName] !== optValue) return false
      }
      return true
    })
  }

  const isComplete = (selection: VariantSelection): boolean => {
    return (
      Object.keys(selection).length === options.length &&
      options.every((opt) => selection[opt.name])
    )
  }

  return {
    getDefaultSelection,
    findVariant,
    isComplete,
  }
}
