'use client'

import { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import { useSearchParams, useParams, useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useStore } from '@/lib/contexts/store-context'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { Button } from '@/components/ui/button'

interface ProductResult {
  id: string
  title: string
  price: number
  compare_at_price?: number | null
  slug: string
  image: string | null
  image_alt: string
}

interface SearchState {
  results: ProductResult[]
  totalResults: number
  isLoading: boolean
  error: string | null
}

function SearchContent() {
  const searchParams = useSearchParams()
  const params = useParams()
  const router = useRouter()
  const { store, formatPrice } = useStore()
  const storeSlug = params.storeSlug as string

  const initialQuery = searchParams.get('q') || ''
  const [inputValue, setInputValue] = useState(initialQuery)
  const debouncedQuery = useDebounce(inputValue, 300)
  const inputRef = useRef<HTMLInputElement>(null)

  const [state, setState] = useState<SearchState>({
    results: [],
    totalResults: 0,
    isLoading: false,
    error: null,
  })

  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setState({
        results: [],
        totalResults: 0,
        isLoading: false,
        error: null,
      })
      return
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const searchParamsObj = new URLSearchParams({ q: q.trim() })
      const response = await fetch(`/api/store/${storeSlug}/search?${searchParamsObj}`)

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Search request failed')
      }

      const data = await response.json()

      setState({
        results: data.results || [],
        totalResults: data.totalResults || 0,
        isLoading: false,
        error: null,
      })
    } catch (error) {
      console.error('Search failed:', error)
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Search failed. Please try again.',
      }))
    }
  }, [storeSlug])

  // Search when debounced query changes
  useEffect(() => {
    if (debouncedQuery) {
      performSearch(debouncedQuery)
      // Update URL without full navigation
      const newUrl = `/${storeSlug}/search?q=${encodeURIComponent(debouncedQuery)}`
      router.replace(newUrl, { scroll: false })
    } else {
      setState({
        results: [],
        totalResults: 0,
        isLoading: false,
        error: null,
      })
    }
  }, [debouncedQuery, performSearch, storeSlug, router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim()) {
      performSearch(inputValue.trim())
    }
  }

  // No query state
  if (!inputValue && state.results.length === 0) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div
          className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'var(--color-primary-light)' }}
        >
          <Search className="w-10 h-10" style={{ color: 'var(--color-primary)' }} />
        </div>
        <h1
          className="text-3xl md:text-4xl font-bold mb-3"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Search Products
        </h1>
        <p
          className="text-gray-500 mb-8 text-lg"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Find what you&apos;re looking for in {store.name}
        </p>
        <form onSubmit={handleSubmit} className="max-w-xl mx-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              autoFocus
              placeholder="Search products..."
              className="w-full pl-12 pr-4 py-4 border rounded-xl text-lg focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
            />
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Search Header */}
      <div className="mb-8">
        <form onSubmit={handleSubmit} className="max-w-2xl mb-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              placeholder="Search products..."
              className="w-full pl-12 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
            />
          </div>
        </form>
        <p className="text-gray-500" style={{ fontFamily: 'var(--font-body)' }}>
          {state.isLoading ? (
            'Searching...'
          ) : state.totalResults > 0 ? (
            <>
              {state.totalResults} result{state.totalResults !== 1 ? 's' : ''} for &quot;{debouncedQuery}&quot;
            </>
          ) : debouncedQuery ? (
            <>No results for &quot;{debouncedQuery}&quot;</>
          ) : null}
        </p>
      </div>

      {/* Error State */}
      {state.error && (
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{state.error}</p>
          <Button
            onClick={() => performSearch(inputValue)}
            style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
          >
            Try Again
          </Button>
        </div>
      )}

      {/* Loading State */}
      {state.isLoading && !state.error && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-square bg-gray-200 rounded-lg mb-3" />
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Results Grid */}
      {!state.isLoading && !state.error && state.results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {state.results.map((product) => (
            <Link
              key={product.id}
              href={`/${storeSlug}/products/${product.id}`}
              className="group block"
            >
              <div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden mb-3">
                {product.image ? (
                  <Image
                    src={product.image}
                    alt={product.image_alt}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <Search className="w-8 h-8" />
                  </div>
                )}
              </div>
              <h3
                className="font-medium text-sm sm:text-base line-clamp-2 mb-1 group-hover:underline"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {product.title}
              </h3>
              <div className="flex items-center gap-2">
                <span
                  className="font-semibold"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {formatPrice(product.price)}
                </span>
                {product.compare_at_price && product.compare_at_price > product.price && (
                  <span className="text-sm text-gray-400 line-through">
                    {formatPrice(product.compare_at_price)}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* No Results */}
      {!state.isLoading && !state.error && state.results.length === 0 && debouncedQuery && (
        <div className="text-center py-16">
          <div
            className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-primary-light)' }}
          >
            <Search className="w-10 h-10" style={{ color: 'var(--color-primary)' }} />
          </div>
          <h2
            className="text-xl font-semibold mb-2"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            No results found
          </h2>
          <p
            className="text-gray-500 mb-6"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Try different keywords or browse all products
          </p>
          <Link
            href={`/${storeSlug}/products`}
            className="inline-flex items-center px-6 py-3 rounded-lg font-medium text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            Browse All Products
          </Link>
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
          <p className="text-gray-500">Loading...</p>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  )
}
