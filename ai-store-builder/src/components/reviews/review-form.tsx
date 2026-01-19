'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RatingStars } from './rating-stars'
import { toast } from 'sonner'

interface ReviewFormProps {
    productId: string
    orderId?: string
    customerEmail?: string
    customerName?: string
    onSuccess?: () => void
}

export function ReviewForm({
    productId,
    orderId,
    customerEmail,
    customerName,
    onSuccess,
}: ReviewFormProps) {
    const [rating, setRating] = useState(0)
    const [title, setTitle] = useState('')
    const [reviewText, setReviewText] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Don't show form if required data is missing
    if (!orderId || !customerEmail || !customerName) {
        return null
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (rating === 0) {
            toast.error('Please select a rating')
            return
        }

        if (!reviewText.trim()) {
            toast.error('Please write a review')
            return
        }

        setIsSubmitting(true)

        try {
            const response = await fetch(`/api/products/${productId}/reviews`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order_id: orderId,
                    customer_name: customerName,
                    customer_email: customerEmail,
                    rating,
                    title: title.trim() || null,
                    review_text: reviewText.trim(),
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                toast.error(data.error || 'Failed to submit review')
                return
            }

            toast.success(data.message || 'Review submitted successfully!')

            // Reset form
            setRating(0)
            setTitle('')
            setReviewText('')

            if (onSuccess) {
                onSuccess()
            }
        } catch (error) {
            console.error('Error submitting review:', error)
            toast.error('Failed to submit review. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">Write a Review</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Star Rating */}
                <div>
                    <label className="block text-sm font-medium mb-2">
                        Rating <span className="text-red-500">*</span>
                    </label>
                    <RatingStars
                        rating={rating}
                        interactive
                        onRatingChange={setRating}
                        size="lg"
                    />
                </div>

                {/* Title (optional) */}
                <div>
                    <label className="block text-sm font-medium mb-2">
                        Review Title (optional)
                    </label>
                    <Input
                        placeholder="Sum up your experience"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        maxLength={200}
                    />
                </div>

                {/* Review Text */}
                <div>
                    <label className="block text-sm font-medium mb-2">
                        Your Review <span className="text-red-500">*</span>
                    </label>
                    <Textarea
                        placeholder="Tell us about your experience with this product..."
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        rows={5}
                        className="resize-none"
                    />
                </div>

                {/* Submit Button */}
                <Button
                    type="submit"
                    disabled={rating === 0 || !reviewText.trim() || isSubmitting}
                    className="w-full sm:w-auto"
                >
                    {isSubmitting ? 'Submitting...' : 'Submit Review'}
                </Button>
            </form>
        </Card>
    )
}
