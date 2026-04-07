// src/lib/agents/sub-agents/tools/shared/reviews.ts
// Shared review query tools — used by review-curator, copysmith, escalation-detector, report-writer

import { tool } from 'ai'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

// ---------------------------------------------------------------------------
// get_reviews — Query reviews with filters
// ---------------------------------------------------------------------------

export const get_reviews = tool({
  description:
    'Query product reviews for a store with filters for rating, product, and response status.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    product_id: z.string().optional().describe('Filter to a specific product'),
    min_rating: z.number().min(1).max(5).optional().describe('Minimum star rating (default: 1)'),
    max_rating: z.number().min(1).max(5).optional().describe('Maximum star rating (default: 5)'),
    unanswered_only: z.boolean().optional().describe('Only reviews without merchant reply (default: false)'),
    limit: z.number().optional().describe('Max reviews to return (default: 50)'),
  }),
  execute: async ({ store_id, product_id, min_rating = 1, max_rating = 5, unanswered_only = false, limit = 50 }) => {
    const supabase = getSupabaseAdmin()

    let query = supabase
      .from('product_reviews')
      .select(
        `id, product_id, customer_name, rating, title, body, merchant_reply, merchant_reply_at,
         created_at, products(title)`
      )
      .eq('store_id', store_id)
      .gte('rating', min_rating)
      .lte('rating', max_rating)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (product_id) {
      query = query.eq('product_id', product_id)
    }
    if (unanswered_only) {
      query = query.is('merchant_reply', null)
    }

    const { data, error } = await query

    if (error) {
      return { success: false, error: error.message, reviews: [] }
    }

    return { success: true, count: data?.length ?? 0, reviews: data ?? [] }
  },
})

// ---------------------------------------------------------------------------
// get_review_stats — Aggregate review metrics
// ---------------------------------------------------------------------------

export const get_review_stats = tool({
  description:
    'Get aggregate review metrics — total reviews, average rating, rating distribution, and response rate.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    product_id: z.string().optional().describe('Filter to a specific product'),
  }),
  execute: async ({ store_id, product_id }) => {
    const supabase = getSupabaseAdmin()

    let query = supabase
      .from('product_reviews')
      .select('rating, merchant_reply')
      .eq('store_id', store_id)

    if (product_id) {
      query = query.eq('product_id', product_id)
    }

    const { data, error } = await query

    if (error) {
      return { success: false, error: error.message, stats: null }
    }

    const reviews = data ?? []
    const total = reviews.length
    if (total === 0) {
      return {
        success: true,
        stats: {
          total_reviews: 0, avg_rating: null, rating_distribution: {}, response_rate: 0,
        },
      }
    }

    const avgRating = Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / total) * 10) / 10
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    let responded = 0
    for (const r of reviews) {
      distribution[r.rating] = (distribution[r.rating] || 0) + 1
      if (r.merchant_reply) responded++
    }

    return {
      success: true,
      stats: {
        total_reviews: total,
        avg_rating: avgRating,
        rating_distribution: distribution,
        response_rate: Math.round((responded / total) * 100),
        unanswered: total - responded,
      },
    }
  },
})
