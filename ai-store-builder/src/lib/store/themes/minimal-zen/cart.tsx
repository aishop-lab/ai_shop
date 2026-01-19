// Modern Minimal Theme - Cart Component

export default function Cart() {
  return (
    <div className="modern-minimal-cart py-12">
      <h1 className="text-3xl font-bold mb-8" style={{ fontFamily: 'var(--font-heading)' }}>
        Shopping Cart
      </h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* Cart items will be rendered here */}
          <p className="text-gray-500">Your cart is empty</p>
        </div>
        <div className="cart-summary p-6 bg-gray-50 rounded-lg h-fit">
          <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>₹0.00</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>₹0.00</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>Total</span>
              <span>₹0.00</span>
            </div>
          </div>
          <button 
            className="w-full py-3 px-6 rounded-lg text-white font-medium"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  )
}
