import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Search suggestions API
 * Returns autocomplete suggestions based on:
 * 1. Popular product titles
 * 2. Product categories
 * 3. Recent searches (if implemented)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')
  const storeSlug = searchParams.get('store')
  const limit = parseInt(searchParams.get('limit') || '5')

  if (!query || query.length < 2) {
    return NextResponse.json({ suggestions: [] })
  }

  try {
    const supabase = await createClient()

    // Build query for product title suggestions
    let productsQuery = supabase
      .from('products')
      .select('title, stores!inner(slug)')
      .ilike('title', `%${query}%`)
      .eq('status', 'published')
      .limit(limit)

    // Filter by store if provided
    if (storeSlug) {
      productsQuery = productsQuery.eq('stores.slug', storeSlug)
    }

    const { data: products, error } = await productsQuery

    if (error) {
      console.error('Suggestions query error:', error)
      return NextResponse.json({ suggestions: [] })
    }

    // Extract unique titles
    const titleSuggestions = products?.map((p) => p.title) || []

    // Get category suggestions
    const { data: categoryProducts } = await supabase
      .from('products')
      .select('categories, stores!inner(slug)')
      .eq('status', 'published')
      .limit(50)

    // Extract unique categories that match the query
    const allCategories = new Set<string>()
    categoryProducts?.forEach((p) => {
      if (Array.isArray(p.categories)) {
        p.categories.forEach((cat: string) => {
          if (cat.toLowerCase().includes(query.toLowerCase())) {
            allCategories.add(cat)
          }
        })
      }
    })

    const categorySuggestions = Array.from(allCategories).slice(0, 3)

    // Combine and deduplicate suggestions
    const allSuggestions = [...new Set([...titleSuggestions, ...categorySuggestions])]
      .slice(0, limit)

    return NextResponse.json({
      suggestions: allSuggestions,
      query,
    })
  } catch (error) {
    console.error('Suggestions error:', error)
    return NextResponse.json({ suggestions: [] })
  }
}
