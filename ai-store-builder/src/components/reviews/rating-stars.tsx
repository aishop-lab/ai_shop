'use client'

import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RatingStarsProps {
    rating: number
    maxRating?: number
    size?: 'sm' | 'md' | 'lg'
    interactive?: boolean
    onRatingChange?: (rating: number) => void
    className?: string
}

export function RatingStars({
    rating,
    maxRating = 5,
    size = 'md',
    interactive = false,
    onRatingChange,
    className,
}: RatingStarsProps) {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
        lg: 'w-6 h-6',
    }

    const handleClick = (value: number) => {
        if (interactive && onRatingChange) {
            onRatingChange(value)
        }
    }

    return (
        <div className={cn('flex gap-1', className)}>
            {Array.from({ length: maxRating }, (_, i) => i + 1).map((value) => {
                const isFilled = value <= rating
                const isPartiallyFilled = value === Math.ceil(rating) && rating % 1 !== 0

                return (
                    <button
                        key={value}
                        type="button"
                        onClick={() => handleClick(value)}
                        disabled={!interactive}
                        className={cn(
                            sizeClasses[size],
                            interactive && 'cursor-pointer hover:scale-110 transition-transform',
                            !interactive && 'cursor-default'
                        )}
                        aria-label={`Rate ${value} stars`}
                    >
                        <Star
                            className={cn(
                                'w-full h-full',
                                isFilled ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300',
                                interactive && 'hover:text-yellow-400'
                            )}
                            strokeWidth={1.5}
                        />
                    </button>
                )
            })}
        </div>
    )
}
