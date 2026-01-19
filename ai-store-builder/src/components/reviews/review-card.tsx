'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RatingStars } from './rating-stars'
import { ThumbsUp, ShieldCheck } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

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

interface ReviewCardProps {
    review: Review
    customerEmail?: string
}

export function ReviewCard({ review, customerEmail }: ReviewCardProps) {
    const [helpfulCount, setHelpfulCount] = useState(review.helpful_count)
    const [hasVoted, setHasVoted] = useState(false)

    const handleVote = async (voteType: 'helpful' | 'not_helpful') => {
        if (hasVoted) {
            toast.info('You have already voted on this review')
            return
        }

        if (!customerEmail) {
            toast.error('Please provide your email to vote')
            return
        }

        try {
            const response = await fetch(`/api/reviews/${review.id}/vote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer_email: customerEmail,
                    vote_type: voteType,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                toast.error(data.error || 'Failed to record vote')
                return
            }

            setHelpfulCount(data.helpful_count)
            setHasVoted(true)
            toast.success('Thank you for your feedback!')
        } catch (error) {
            console.error('Error voting:', error)
            toast.error('Failed to record vote')
        }
    }

    return (
        <Card className="p-6">
            {/* Header */}
            <div className="flex justify-between items-start mb-3">
                <div>
                    <div className="font-semibold text-lg">{review.customer_name}</div>
                    <div className="flex items-center gap-2 mt-1">
                        <RatingStars rating={review.rating} size="sm" />
                        {review.verified_purchase && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" />
                                Verified Purchase
                            </Badge>
                        )}
                    </div>
                </div>
                <span className="text-sm text-gray-500">
                    {format(new Date(review.created_at), 'MMM dd, yyyy')}
                </span>
            </div>

            {/* Title */}
            {review.title && (
                <h4 className="font-semibold text-base mb-2">{review.title}</h4>
            )}

            {/* Review Text */}
            <p className="text-gray-700 mb-4 leading-relaxed">{review.review_text}</p>

            {/* Images */}
            {review.images && review.images.length > 0 && (
                <div className="flex gap-2 mb-4 flex-wrap">
                    {review.images.map((img, idx) => (
                        <img
                            key={idx}
                            src={img}
                            alt={`Review image ${idx + 1}`}
                            className="w-20 h-20 object-cover rounded border"
                        />
                    ))}
                </div>
            )}

            {/* Helpful Votes */}
            <div className="flex items-center gap-4 text-sm text-gray-600 pt-4 border-t">
                <span className="font-medium">Was this review helpful?</span>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleVote('helpful')}
                    disabled={hasVoted}
                    className="flex items-center gap-1"
                >
                    <ThumbsUp className="w-4 h-4" />
                    Helpful ({helpfulCount})
                </Button>
            </div>
        </Card>
    )
}
