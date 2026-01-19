// Modern Minimal Theme - Product Listing Component

export default function ProductListing() {
  return (
    <div className="modern-minimal-product-listing">
      <div className="py-8">
        <h1 className="text-3xl font-bold mb-8" style={{ fontFamily: 'var(--font-heading)' }}>
          All Products
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {/* Products grid will be rendered here */}
        </div>
      </div>
    </div>
  )
}
