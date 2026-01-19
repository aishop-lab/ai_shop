import { Store } from 'lucide-react'
import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8">
      {/* Logo/Brand */}
      <Link href="/" className="mb-8 flex items-center gap-2 hover:opacity-80 transition-opacity">
        <Store className="h-8 w-8 text-primary" />
        <span className="text-2xl font-bold">AI Store</span>
      </Link>

      {/* Auth Card Container */}
      <div className="w-full max-w-[450px]">
        {children}
      </div>

      {/* Footer */}
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Build your AI-powered store in minutes
      </p>
    </div>
  )
}
