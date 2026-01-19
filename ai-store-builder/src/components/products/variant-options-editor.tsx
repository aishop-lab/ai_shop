'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Plus,
  X,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Palette,
} from 'lucide-react'
import type {
  VariantOptionInput,
  VariantOptionValueInput,
} from '@/lib/types/variant'
import {
  DEFAULT_VARIANT_OPTIONS,
  COMMON_SIZE_VALUES,
  COMMON_COLORS,
  COMMON_MATERIALS,
} from '@/lib/types/variant'

interface VariantOptionsEditorProps {
  options: VariantOptionInput[]
  onChange: (options: VariantOptionInput[]) => void
  onGenerateVariants: () => void
  disabled?: boolean
}

export function VariantOptionsEditor({
  options,
  onChange,
  onGenerateVariants,
  disabled = false,
}: VariantOptionsEditorProps) {
  const [expandedOptions, setExpandedOptions] = useState<Set<number>>(
    new Set([0])
  )

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedOptions)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedOptions(newExpanded)
  }

  const addOption = () => {
    // Find a name that isn't used yet
    const usedNames = new Set(options.map((o) => o.name))
    const availableName =
      DEFAULT_VARIANT_OPTIONS.find((n) => !usedNames.has(n)) || 'Custom'

    onChange([
      ...options,
      {
        name: availableName,
        values: [],
        position: options.length,
      },
    ])
    setExpandedOptions(new Set([...expandedOptions, options.length]))
  }

  const removeOption = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index)
    onChange(newOptions)
    const newExpanded = new Set(
      [...expandedOptions].filter((i) => i !== index).map((i) => (i > index ? i - 1 : i))
    )
    setExpandedOptions(newExpanded)
  }

  const updateOptionName = (index: number, name: string) => {
    const newOptions = [...options]
    newOptions[index] = { ...newOptions[index], name }
    onChange(newOptions)
  }

  const addValue = (optionIndex: number, value: VariantOptionValueInput) => {
    const newOptions = [...options]
    const existing = newOptions[optionIndex].values.find(
      (v) => v.value.toLowerCase() === value.value.toLowerCase()
    )
    if (!existing) {
      newOptions[optionIndex] = {
        ...newOptions[optionIndex],
        values: [
          ...newOptions[optionIndex].values,
          { ...value, position: newOptions[optionIndex].values.length },
        ],
      }
      onChange(newOptions)
    }
  }

  const removeValue = (optionIndex: number, valueIndex: number) => {
    const newOptions = [...options]
    newOptions[optionIndex] = {
      ...newOptions[optionIndex],
      values: newOptions[optionIndex].values.filter((_, i) => i !== valueIndex),
    }
    onChange(newOptions)
  }

  const updateValueColor = (
    optionIndex: number,
    valueIndex: number,
    colorCode: string
  ) => {
    const newOptions = [...options]
    const values = [...newOptions[optionIndex].values]
    values[valueIndex] = { ...values[valueIndex], color_code: colorCode }
    newOptions[optionIndex] = { ...newOptions[optionIndex], values }
    onChange(newOptions)
  }

  // Get quick-add suggestions based on option name
  const getSuggestions = (optionName: string): string[] => {
    const name = optionName.toLowerCase()
    if (name.includes('size')) return COMMON_SIZE_VALUES
    if (name.includes('material')) return COMMON_MATERIALS
    return []
  }

  const getColorSuggestions = (optionName: string) => {
    const name = optionName.toLowerCase()
    if (name.includes('color') || name.includes('colour')) {
      return COMMON_COLORS
    }
    return []
  }

  const totalCombinations = options.length > 0
    ? options.reduce((acc, opt) => acc * Math.max(1, opt.values.length), 1)
    : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Variant Options</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addOption}
          disabled={disabled || options.length >= 3}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Option
        </Button>
      </div>

      {options.length === 0 ? (
        <div className="border border-dashed rounded-lg p-6 text-center text-muted-foreground">
          <p className="text-sm">No variant options defined.</p>
          <p className="text-xs mt-1">
            Click &quot;Add Option&quot; to add Size, Color, or other options.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {options.map((option, optionIndex) => (
            <div
              key={optionIndex}
              className="border rounded-lg overflow-hidden"
            >
              {/* Option Header */}
              <div
                className="flex items-center gap-2 p-3 bg-muted/50 cursor-pointer"
                onClick={() => toggleExpanded(optionIndex)}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={option.name}
                  onChange={(e) => {
                    e.stopPropagation()
                    updateOptionName(optionIndex, e.target.value)
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="h-8 w-40 bg-background"
                  placeholder="Option name"
                  disabled={disabled}
                />
                <span className="text-sm text-muted-foreground flex-1">
                  {option.values.length} value
                  {option.values.length !== 1 ? 's' : ''}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeOption(optionIndex)
                  }}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
                {expandedOptions.has(optionIndex) ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>

              {/* Option Values */}
              {expandedOptions.has(optionIndex) && (
                <div className="p-3 space-y-3">
                  {/* Current Values */}
                  <div className="flex flex-wrap gap-2">
                    {option.values.map((value, valueIndex) => {
                      const isColor =
                        option.name.toLowerCase().includes('color') ||
                        option.name.toLowerCase().includes('colour')
                      return (
                        <div
                          key={valueIndex}
                          className="flex items-center gap-1 bg-muted rounded-full px-3 py-1"
                        >
                          {isColor && value.color_code && (
                            <div
                              className="w-4 h-4 rounded-full border"
                              style={{ backgroundColor: value.color_code }}
                            />
                          )}
                          <span className="text-sm">{value.value}</span>
                          {isColor && (
                            <input
                              type="color"
                              value={value.color_code || '#000000'}
                              onChange={(e) =>
                                updateValueColor(
                                  optionIndex,
                                  valueIndex,
                                  e.target.value
                                )
                              }
                              className="w-4 h-4 cursor-pointer opacity-0 hover:opacity-100 transition-opacity"
                              title="Set color"
                              disabled={disabled}
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => removeValue(optionIndex, valueIndex)}
                            className="text-muted-foreground hover:text-foreground"
                            disabled={disabled}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )
                    })}
                  </div>

                  {/* Add Value Input */}
                  <div className="flex gap-2">
                    <Input
                      placeholder={`Add ${option.name.toLowerCase()} value`}
                      className="h-8"
                      disabled={disabled}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const input = e.target as HTMLInputElement
                          if (input.value.trim()) {
                            addValue(optionIndex, { value: input.value.trim() })
                            input.value = ''
                          }
                        }
                      }}
                    />
                  </div>

                  {/* Quick Add Suggestions */}
                  {(() => {
                    const suggestions = getSuggestions(option.name)
                    const colorSuggestions = getColorSuggestions(option.name)
                    const existingValues = new Set(
                      option.values.map((v) => v.value.toLowerCase())
                    )

                    if (suggestions.length > 0) {
                      const availableSuggestions = suggestions.filter(
                        (s) => !existingValues.has(s.toLowerCase())
                      )
                      if (availableSuggestions.length > 0) {
                        return (
                          <div className="flex flex-wrap gap-1">
                            <span className="text-xs text-muted-foreground mr-1">
                              Quick add:
                            </span>
                            {availableSuggestions.slice(0, 8).map((s) => (
                              <button
                                key={s}
                                type="button"
                                className="text-xs px-2 py-0.5 bg-muted hover:bg-muted/80 rounded"
                                onClick={() =>
                                  addValue(optionIndex, { value: s })
                                }
                                disabled={disabled}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        )
                      }
                    }

                    if (colorSuggestions.length > 0) {
                      const availableColors = colorSuggestions.filter(
                        (c) => !existingValues.has(c.name.toLowerCase())
                      )
                      if (availableColors.length > 0) {
                        return (
                          <div className="flex flex-wrap gap-1 items-center">
                            <span className="text-xs text-muted-foreground mr-1">
                              <Palette className="h-3 w-3 inline mr-1" />
                              Quick add:
                            </span>
                            {availableColors.slice(0, 10).map((c) => (
                              <button
                                key={c.name}
                                type="button"
                                className="w-6 h-6 rounded-full border-2 border-transparent hover:border-primary transition-colors"
                                style={{ backgroundColor: c.code }}
                                title={c.name}
                                onClick={() =>
                                  addValue(optionIndex, {
                                    value: c.name,
                                    color_code: c.code,
                                  })
                                }
                                disabled={disabled}
                              />
                            ))}
                          </div>
                        )
                      }
                    }

                    return null
                  })()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Generate Variants Button */}
      {options.length > 0 && options.every((o) => o.values.length > 0) && (
        <div className="flex items-center justify-between pt-2 border-t">
          <p className="text-sm text-muted-foreground">
            This will generate <strong>{totalCombinations}</strong> variant
            {totalCombinations !== 1 ? 's' : ''}
          </p>
          <Button
            type="button"
            onClick={onGenerateVariants}
            disabled={disabled || totalCombinations === 0 || totalCombinations > 100}
          >
            Generate Variants
          </Button>
        </div>
      )}

      {totalCombinations > 100 && (
        <p className="text-sm text-destructive">
          Too many combinations. Maximum is 100 variants.
        </p>
      )}
    </div>
  )
}
