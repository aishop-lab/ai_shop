'use client'

export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-square bg-gray-200 rounded-lg" />
      <div className="mt-3 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="h-5 bg-gray-200 rounded w-1/4 mt-1" />
      </div>
    </div>
  )
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function ProductDetailSkeleton() {
  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 animate-pulse">
        {/* Image */}
        <div className="aspect-square bg-gray-200 rounded-lg" />

        {/* Details */}
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 rounded w-3/4" />
          <div className="h-7 bg-gray-200 rounded w-1/4" />
          <div className="space-y-2 pt-4">
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-5/6" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>
          <div className="pt-6">
            <div className="h-12 bg-gray-200 rounded-lg w-full" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function CartItemSkeleton() {
  return (
    <div className="flex gap-4 p-4 border rounded-lg animate-pulse">
      <div className="flex-shrink-0 w-24 h-24 md:w-32 md:h-32 bg-gray-200 rounded-lg" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-5 bg-gray-200 rounded w-2/3" />
        <div className="h-5 bg-gray-200 rounded w-1/4" />
        <div className="h-8 bg-gray-200 rounded w-28 mt-2" />
      </div>
      <div className="hidden sm:block">
        <div className="h-5 bg-gray-200 rounded w-16" />
      </div>
    </div>
  )
}

export function CartPageSkeleton() {
  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="h-9 bg-gray-200 rounded w-48 mb-8 animate-pulse" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-4">
          <CartItemSkeleton />
          <CartItemSkeleton />
          <CartItemSkeleton />
        </div>

        {/* Order summary */}
        <div className="lg:col-span-1">
          <div className="p-6 border rounded-lg bg-gray-50 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-36 mb-6" />
            <div className="space-y-4 mb-6">
              <div className="flex justify-between">
                <div className="h-4 bg-gray-200 rounded w-16" />
                <div className="h-4 bg-gray-200 rounded w-20" />
              </div>
              <div className="flex justify-between">
                <div className="h-4 bg-gray-200 rounded w-16" />
                <div className="h-4 bg-gray-200 rounded w-16" />
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between">
                  <div className="h-5 bg-gray-200 rounded w-12" />
                  <div className="h-5 bg-gray-200 rounded w-24" />
                </div>
              </div>
            </div>
            <div className="h-12 bg-gray-200 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function CheckoutSkeleton() {
  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* Back link */}
      <div className="h-5 bg-gray-200 rounded w-28 mb-6 animate-pulse" />

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-4 mb-10 animate-pulse">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-200 rounded-full" />
            <div className="h-4 bg-gray-200 rounded w-16 hidden sm:block" />
            {step < 3 && <div className="w-8 h-px bg-gray-200 mx-2" />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-pulse">
        {/* Form fields */}
        <div className="lg:col-span-2 space-y-6">
          <div className="h-6 bg-gray-200 rounded w-40 mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-20" />
              <div className="h-10 bg-gray-200 rounded" />
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-20" />
              <div className="h-10 bg-gray-200 rounded" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-24" />
            <div className="h-10 bg-gray-200 rounded" />
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-28" />
            <div className="h-10 bg-gray-200 rounded" />
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-16" />
            <div className="h-10 bg-gray-200 rounded" />
          </div>
        </div>

        {/* Order summary sidebar */}
        <div className="lg:col-span-1">
          <div className="p-6 border rounded-lg bg-gray-50">
            <div className="h-6 bg-gray-200 rounded w-36 mb-4" />
            <div className="space-y-3 mb-4">
              {[1, 2].map((i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-16 h-16 bg-gray-200 rounded" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t pt-4 space-y-3">
              <div className="flex justify-between">
                <div className="h-4 bg-gray-200 rounded w-16" />
                <div className="h-4 bg-gray-200 rounded w-20" />
              </div>
              <div className="flex justify-between">
                <div className="h-4 bg-gray-200 rounded w-16" />
                <div className="h-4 bg-gray-200 rounded w-16" />
              </div>
              <div className="border-t pt-3 flex justify-between">
                <div className="h-5 bg-gray-200 rounded w-12" />
                <div className="h-5 bg-gray-200 rounded w-24" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
