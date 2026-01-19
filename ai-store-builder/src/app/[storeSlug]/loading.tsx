export default function StoreLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-gray-800" />
        <p className="mt-4 text-gray-600">Loading store...</p>
      </div>
    </div>
  )
}
