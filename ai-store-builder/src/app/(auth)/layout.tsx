import { Bot } from 'lucide-react'
import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:24px_24px]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(120,119,198,0.1),transparent_50%)]" />

      <Link href="/" className="relative mb-8 flex items-center gap-2 hover:opacity-80 transition-opacity">
        <Bot className="h-8 w-8 text-primary" />
        <span className="text-2xl font-bold font-mono text-zinc-100">AI Store</span>
      </Link>

      <div className="relative w-full max-w-[450px]">
        {children}
      </div>

      <p className="relative mt-8 text-center text-sm text-muted-foreground">
        Your AI-powered commerce platform
      </p>
    </div>
  )
}
