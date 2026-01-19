// Modern Minimal Theme - Product Detail Component

export default function ProductDetail() {
  return (
    <div className="modern-minimal-product-detail">
      <div className="py-8 grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="product-images">
          {/* Product image gallery */}
        </div>
        <div className="product-info">
          <h1 className="text-3xl font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
            Product Name
          </h1>
          <p className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-primary)' }}>
            ₹0.00
          </p>
          <p className="text-gray-600 mb-6" style={{ fontFamily: 'var(--font-body)' }}>
            Product description goes here
          </p>
          <button 
            className="w-full py-3 px-6 rounded-lg text-white font-medium"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  )
}
