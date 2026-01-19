// Modern Minimal Theme - Footer Component

export default function Footer() {
  return (
    <footer 
      className="modern-minimal-footer bg-gray-900 text-white"
      style={{ minHeight: '300px' }}
    >
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-xl font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              Store Name
            </h3>
            <p className="text-gray-400 mb-4" style={{ fontFamily: 'var(--font-body)' }}>
              Your one-stop shop for quality products.
            </p>
            <div className="flex gap-4">
              {/* Social media icons */}
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="/" className="hover:text-white transition-colors">Home</a></li>
              <li><a href="/products" className="hover:text-white transition-colors">Products</a></li>
              <li><a href="/about" className="hover:text-white transition-colors">About</a></li>
              <li><a href="/contact" className="hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-gray-400">
              <li>Email: contact@store.com</li>
              <li>Phone: +91 00000 00000</li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} Store Name. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
