// Modern Minimal Theme - Header Component

export default function Header() {
  return (
    <header 
      className="modern-minimal-header sticky top-0 z-50 bg-white border-b"
      style={{ height: '80px' }}
    >
      <div className="container mx-auto h-full flex items-center justify-between px-4">
        <div className="logo">
          <span className="text-xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
            Store Name
          </span>
        </div>
        
        <nav className="hidden md:flex items-center gap-8">
          <a href="/" className="hover:opacity-70 transition-opacity">Home</a>
          <a href="/products" className="hover:opacity-70 transition-opacity">Products</a>
          <a href="/about" className="hover:opacity-70 transition-opacity">About</a>
          <a href="/contact" className="hover:opacity-70 transition-opacity">Contact</a>
        </nav>
        
        <div className="flex items-center gap-4">
          <button className="p-2 hover:opacity-70 transition-opacity">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <a href="/cart" className="p-2 hover:opacity-70 transition-opacity relative">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span 
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-xs flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              0
            </span>
          </a>
        </div>
      </div>
    </header>
  )
}
