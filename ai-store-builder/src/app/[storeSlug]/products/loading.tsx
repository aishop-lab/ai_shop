import { ProductGridSkeleton } from '@/components/store/skeletons'

export default function ProductsLoading() {
  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="h-9 bg-gray-200 rounded w-48 mb-8 animate-pulse" />
      <ProductGridSkeleton count={8} />
    </div>
  )
}
