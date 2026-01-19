'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useParams, useRouter } from 'next/navigation'
import { Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { SearchBar } from '@/components/search/search-bar'
import { SearchResultCard } from '@/components/search/search-result-card'
import { Button } from '@/components/ui/button'
import type { SearchResult } from '@/lib/search/google-search'

interface SearchState {
  results: SearchResult[]
  totalResults: number
  page: number
  totalPages: number
  isLoading: boolean
  error: string | null
}

function SearchContent() {
  const searchParams = useSearchParams()
  const params = useParams()
  const router = useRouter()

  const query = searchParams.get('q') || ''
  const storeSlug = params.storeSlug as string
  const currentPage = parseInt(searchParams.get('page') || '1')

  const [state, setState] = useState<SearchState>({
    results: [],
    totalResults: 0,
    page: 1,
    totalPages: 1,
    isLoading: false,
    error: null,
  })

  const performSearch = useCallback(async (q: string, p: number) => {
    if (!q.trim()) {
      setState((prev) => ({
        ...prev,
        results: [],
        totalResults: 0,
        isLoading: false,
      }))
      return
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const searchParamsObj = new URLSearchParams({
        q,
        page: String(p),
        store: storeSlug,
      })

      const response = await fetch(`/api/search?${searchParamsObj}`)

      if (!response.ok) {
        throw new Error('Search request failed')
      }

      const data = await response.json()

      setState({
        results: data.results || [],
        totalResults: data.totalResults || 0,
        page: data.page || p,
        totalPages: data.totalPages || 1,
        isLoading: false,
        error: null,
      })
    } catch (error) {
      console.error('Search failed:', error)
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Search failed. Please try again.',
      }))
    }
  }, [storeSlug])

  useEffect(() => {
    if (query) {
      performSearch(query, currentPage)
    }
  }, [query, currentPage, performSearch])

  const handlePageChange = (newPage: number) => {
    const newSearchParams = new URLSearchParams(searchParams.toString())
    newSearchParams.set('page', String(newPage))
    router.push(`/${storeSlug}/search?${newSearchParams.toString()}`)
  }

  // No query state
  if (!query) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <Search className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h1 className="text-2xl font-bold mb-2">Search Products</h1>
        <p className="text-muted-foreground mb-6">
          Enter a search query to find products
        </p>
        <div className="max-w-xl mx-auto">
          <SearchBar storeSlug={storeSlug} autoFocus />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Search Header */}
      <div className="mb-8">
        <div className="max-w-2xl mb-4">
          <SearchBar storeSlug={storeSlug} />
        </div>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <p className="text-muted-foreground">
            {state.isLoading ? (
              'Searching...'
            ) : state.totalResults > 0 ? (
              <>
                {state.totalResults.toLocaleString()} result
                {state.totalResults !== 1 ? 's' : ''} for &quot;{query}&quot;
              </>
            ) : (
              <>No results for &quot;{query}&quot;</>
            )}
          </p>
          <Button variant="outline" size="sm" disabled>
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>
      </div>

      {/* Error State */}
      {state.error && (
        <div className="text-center py-12">
          <p className="text-destructive mb-4">{state.error}</p>
          <Button onClick={() => performSearch(query, currentPage)}>
            Try Again
          </Button>
        </div>
      )}

      {/* Loading State */}
      {state.isLoading && !state.error && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Searching...</p>
        </div>
      )}

      {/* Results Grid */}
      {!state.isLoading && !state.error && state.results.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {state.results.map((result, index) => (
            <SearchResultCard key={`${result.link}-${index}`} result={result} />
          ))}
        </div>
      )}

      {/* No Results */}
      {!state.isLoading && !state.error && state.results.length === 0 && query && (
        <div className="text-center py-12">
          <Search className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">No results found</h2>
          <p className="text-muted-foreground mb-6">
            Try different keywords or browse all products
          </p>
          <Button asChild variant="outline">
            <a href={`/${storeSlug}/products`}>Browse All Products</a>
          </Button>
        </div>
      )}

      {/* Pagination */}
      {!state.isLoading && state.results.length > 0 && state.totalPages > 1 && (
        <div className="flex justify-center items-center mt-12 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(state.page - 1)}
            disabled={state.page <= 1}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          <span className="px-4 py-2 text-sm text-muted-foreground">
            Page {state.page} of {state.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(state.page + 1)}
            disabled={state.page >= state.totalPages}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  )
}
