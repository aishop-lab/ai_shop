'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { RatingStars } from '@/components/reviews/rating-stars'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { CheckCircle, XCircle, Clock } from 'lucide-react'

interface Review {
    id: string
    product_id: string
    product_title: string
    customer_name: string
    customer_email: string
    rating: number
    title?: string
    review_text: string
    status: 'pending' | 'approved' | 'rejected'
    verified_purchase: boolean
    created_at: string
}

export default function ReviewsModerationPage() {
    const [reviews, setReviews] = useState<Review[]>([])
    const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending')
    const [isLoading, setIsLoading] = useState(true)
    const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 })

    const fetchReviews = async (status: string) => {
        setIsLoading(true)
        try {
            const response = await fetch(`/api/dashboard/reviews?status=${status}`)
            const data = await response.json()

            if (data.success) {
                setReviews(data.reviews)
            } else {
                toast.error(data.error || 'Failed to fetch reviews')
            }
        } catch (error) {
            console.error('Error fetching reviews:', error)
            toast.error('Failed to fetch reviews')
        } finally {
            setIsLoading(false)
        }
    }

    const fetchCounts = async () => {
        try {
            const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
                fetch('/api/dashboard/reviews?status=pending'),
                fetch('/api/dashboard/reviews?status=approved'),
                fetch('/api/dashboard/reviews?status=rejected'),
            ])

            const [pendingData, approvedData, rejectedData] = await Promise.all([
                pendingRes.json(),
                approvedRes.json(),
                rejectedRes.json(),
            ])

            setCounts({
                pending: pendingData.reviews?.length || 0,
                approved: approvedData.reviews?.length || 0,
                rejected: rejectedData.reviews?.length || 0,
            })
        } catch (error) {
            console.error('Error fetching counts:', error)
        }
    }

    useEffect(() => {
        fetchReviews(filter)
    }, [filter])

    useEffect(() => {
        fetchCounts()
    }, [reviews]) // Refetch counts when reviews change

    const handleModeration = async (reviewId: string, newStatus: 'approved' | 'rejected') => {
        try {
            const response = await fetch(`/api/dashboard/reviews/${reviewId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            })

            const data = await response.json()

            if (!response.ok) {
                toast.error(data.error || 'Failed to update review')
                return
            }

            toast.success(`Review ${newStatus}`)

            // Remove from current list
            setReviews((prev) => prev.filter((r) => r.id !== reviewId))
        } catch (error) {
            console.error('Error moderating review:', error)
            toast.error('Failed to update review')
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Reviews</h1>
                <p className="text-gray-600 mt-1">Manage customer reviews for your products</p>
            </div>

            <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
                <TabsList>
                    <TabsTrigger value="pending" className="relative">
                        <Clock className="w-4 h-4 mr-2" />
                        Pending
                        {counts.pending > 0 && (
                            <Badge variant="destructive" className="ml-2">
                                {counts.pending}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="approved">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approved ({counts.approved})
                    </TabsTrigger>
                    <TabsTrigger value="rejected">
                        <XCircle className="w-4 h-4 mr-2" />
                        Rejected ({counts.rejected})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value={filter} className="mt-6">
                    {isLoading ? (
                        <Card className="p-8 text-center">
                            <p className="text-gray-500">Loading reviews...</p>
                        </Card>
                    ) : reviews.length === 0 ? (
                        <Card className="p-8 text-center">
                            <p className="text-gray-500">
                                No {filter} reviews found.
                            </p>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {reviews.map((review) => (
                                <Card key={review.id} className="p-6">
                                    <div className="flex justify-between items-start gap-4">
                                        {/* Review Content */}
                                        <div className="flex-1 space-y-3">
                                            {/* Header */}
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <RatingStars rating={review.rating} size="sm" />
                                                        {review.verified_purchase && (
                                                            <Badge variant="secondary" className="text-xs">
                                                                Verified Purchase
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="font-semibold">{review.customer_name}</p>
                                                    <p className="text-sm text-gray-500">{review.customer_email}</p>
                                                </div>
                                                <span className="text-sm text-gray-500">
                                                    {format(new Date(review.created_at), 'MMM dd, yyyy')}
                                                </span>
                                            </div>

                                            {/* Title */}
                                            {review.title && (
                                                <h4 className="font-semibold">{review.title}</h4>
                                            )}

                                            {/* Review Text */}
                                            <p className="text-gray-700">{review.review_text}</p>

                                            {/* Product Info */}
                                            <p className="text-sm text-gray-500">
                                                Product: <span className="font-medium">{review.product_title}</span>
                                            </p>
                                        </div>

                                        {/* Actions (only for pending) */}
                                        {filter === 'pending' && (
                                            <div className="flex flex-col gap-2">
                                                <Button
                                                    onClick={() => handleModeration(review.id, 'approved')}
                                                    size="sm"
                                                    className="whitespace-nowrap"
                                                >
                                                    <CheckCircle className="w-4 h-4 mr-1" />
                                                    Approve
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => handleModeration(review.id, 'rejected')}
                                                    size="sm"
                                                    className="whitespace-nowrap"
                                                >
                                                    <XCircle className="w-4 h-4 mr-1" />
                                                    Reject
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
