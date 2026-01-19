'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getVariantsForVibe } from '@/lib/onboarding/theme-variants'
import type { BrandVibe, ThemeVariant } from '@/lib/types/onboarding'

interface TemplateSelectorProps {
    vibe: BrandVibe
    onSelect: (variantId: string) => void
    selected?: string
}

export function TemplateSelector({ vibe, onSelect, selected }: TemplateSelectorProps) {
    const variants = getVariantsForVibe(vibe)
    const [hoveredId, setHoveredId] = useState<string | null>(null)

    return (
        <div className="w-full">
            {/* Grid of 2x2 variant cards */}
            <div className="grid grid-cols-2 gap-4">
                {variants.map((variant) => (
                    <VariantCard
                        key={variant.id}
                        variant={variant}
                        isSelected={selected === variant.id}
                        isHovered={hoveredId === variant.id}
                        onSelect={() => onSelect(variant.id)}
                        onHover={() => setHoveredId(variant.id)}
                        onLeave={() => setHoveredId(null)}
                    />
                ))}
            </div>

            {/* Selected variant info */}
            {selected && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                        Selected: <span className="font-medium text-foreground">
                            {variants.find(v => v.id === selected)?.name}
                        </span>
                    </p>
                </div>
            )}
        </div>
    )
}

interface VariantCardProps {
    variant: ThemeVariant
    isSelected: boolean
    isHovered: boolean
    onSelect: () => void
    onHover: () => void
    onLeave: () => void
}

function VariantCard({
    variant,
    isSelected,
    isHovered,
    onSelect,
    onHover,
    onLeave
}: VariantCardProps) {
    return (
        <button
            type="button"
            onClick={onSelect}
            onMouseEnter={onHover}
            onMouseLeave={onLeave}
            className={cn(
                "group relative flex flex-col overflow-hidden rounded-xl border-2 transition-all duration-200",
                "bg-card hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                isSelected
                    ? "border-primary shadow-md"
                    : "border-border hover:border-primary/50"
            )}
        >
            {/* Preview Image */}
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                <Image
                    src={variant.previewImage}
                    alt={`${variant.name} layout preview`}
                    fill
                    className={cn(
                        "object-cover transition-transform duration-300",
                        isHovered && "scale-105"
                    )}
                    onError={(e) => {
                        // Fallback to placeholder if image doesn't exist
                        const target = e.target as HTMLImageElement
                        target.src = '/templates/placeholder.png'
                    }}
                />

                {/* Selection checkmark overlay */}
                {isSelected && (
                    <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg">
                            <Check className="w-6 h-6 text-primary-foreground" />
                        </div>
                    </div>
                )}

                {/* Hover overlay */}
                {!isSelected && isHovered && (
                    <div className="absolute inset-0 bg-black/5" />
                )}
            </div>

            {/* Variant Info */}
            <div className="p-3 text-left">
                <h4 className={cn(
                    "font-semibold text-sm",
                    isSelected ? "text-primary" : "text-foreground"
                )}>
                    {variant.name}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {variant.description}
                </p>
            </div>
        </button>
    )
}

// Compact version for smaller spaces
export function TemplateSelectorCompact({
    vibe,
    onSelect,
    selected
}: TemplateSelectorProps) {
    const variants = getVariantsForVibe(vibe)

    return (
        <div className="flex gap-2 overflow-x-auto pb-2">
            {variants.map((variant) => (
                <button
                    key={variant.id}
                    type="button"
                    onClick={() => onSelect(variant.id)}
                    className={cn(
                        "flex-shrink-0 flex flex-col items-center p-2 rounded-lg border transition-all",
                        "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary",
                        selected === variant.id
                            ? "border-primary bg-primary/5"
                            : "border-border"
                    )}
                >
                    <div className="relative w-16 h-12 rounded overflow-hidden bg-muted">
                        <Image
                            src={variant.previewImage}
                            alt={variant.name}
                            fill
                            className="object-cover"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.src = '/templates/placeholder.png'
                            }}
                        />
                        {selected === variant.id && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                <Check className="w-4 h-4 text-primary" />
                            </div>
                        )}
                    </div>
                    <span className="text-xs mt-1 font-medium">
                        {variant.name}
                    </span>
                </button>
            ))}
        </div>
    )
}
