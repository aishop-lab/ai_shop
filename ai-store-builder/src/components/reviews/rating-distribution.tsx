'use client'

import { cn } from '@/lib/utils'

interface RatingDistributionProps {
    distribution: Record<number, number>
    totalReviews: number
    className?: string
}

export function RatingDistribution({
    distribution,
    totalReviews,
    className,
}: RatingDistributionProps) {
    const ratings = [5, 4, 3, 2, 1]

    return (
        <div className={cn('space-y-2', className)}>
            {ratings.map((rating) => {
                const count = distribution[rating] || 0
                const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0

                return (
                    <div key={rating} className="flex items-center gap-2 text-sm">
                        <span className="w-8 text-gray-600">{rating}★</span>
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-yellow-400 rounded-full transition-all duration-300"
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                        <span className="w-8 text-right text-gray-600">{count}</span>
                    </div>
                )
            })}
        </div>
    )
}
