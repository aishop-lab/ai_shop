'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { RatingStars } from './rating-stars'
import { RatingDistribution } from './rating-distribution'
import { ReviewCard } from './review-card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

interface Review {
    id: string
    customer_name: string
    rating: number
    title?: string
    review_text: string
    verified_purchase: boolean
    helpful_count: number
    not_helpful_count: number
    created_at: string
    images?: string[]
}

interface ReviewStats {
    total_reviews: number
    average_rating: number
    rating_distribution: Record<number, number>
}

interface ReviewsListProps {
    productId: string
    customerEmail?: string
}

export function ReviewsList({ productId, customerEmail }: ReviewsListProps) {
    const [reviews, setReviews] = useState<Review[]>([])
    const [stats, setStats] = useState<ReviewStats | null>(null)
    const [sortBy, setSortBy] = useState('recent')
    const [isLoading, setIsLoading] = useState(true)

    const fetchReviews = async () => {
        setIsLoading(true)
        try {
            const response = await fetch(
                `/api/products/${productId}/reviews?status=approved&sort=${sortBy}`
            )
            const data = await response.json()

            if (data.success) {
                setReviews(data.reviews)
                setStats(data.stats)
            }
        } catch (error) {
            console.error('Error fetching reviews:', error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchReviews()
    }, [productId, sortBy])

    if (isLoading) {
        return (
            <div className="text-center py-8">
                <p className="text-gray-500">Loading reviews...</p>
            </div>
        )
    }

    if (!stats || stats.total_reviews === 0) {
        return (
            <Card className="p-8 text-center">
                <p className="text-gray-500">No reviews yet. Be the first to review this product!</p>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            {/* Rating Summary */}
            <Card className="p-6">
                <h3 className="text-xl font-semibold mb-4">Customer Reviews</h3>
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Average Rating */}
                    <div className="text-center md:text-left">
                        <div className="text-5xl font-bold mb-2">
                            {stats.average_rating.toFixed(1)}
                        </div>
                        <RatingStars rating={stats.average_rating} size="lg" className="justify-center md:justify-start mb-2" />
                        <p className="text-gray-600">
                            Based on {stats.total_reviews} review{stats.total_reviews !== 1 ? 's' : ''}
                        </p>
                    </div>

                    {/* Rating Distribution */}
                    <div>
                        <RatingDistribution
                            distribution={stats.rating_distribution}
                            totalReviews={stats.total_reviews}
                        />
                    </div>
                </div>
            </Card>

            {/* Sort Controls */}
            <div className="flex justify-between items-center">
                <h4 className="font-semibold">
                    {stats.total_reviews} Review{stats.total_reviews !== 1 ? 's' : ''}
                </h4>
                <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="recent">Most Recent</SelectItem>
                        <SelectItem value="highest_rated">Highest Rated</SelectItem>
                        <SelectItem value="most_helpful">Most Helpful</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Reviews List */}
            <div className="space-y-4">
                {reviews.map((review) => (
                    <ReviewCard
                        key={review.id}
                        review={review}
                        customerEmail={customerEmail}
                    />
                ))}
            </div>
        </div>
    )
}
