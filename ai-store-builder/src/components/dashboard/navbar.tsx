'use client'

import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface NavbarProps {
  onMenuClick: () => void
}

export function Navbar({ onMenuClick }: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle menu</span>
      </Button>

      <div className="flex-1">
        {/* Breadcrumbs or page title can go here */}
      </div>

      {/* Future: Search, notifications, etc. */}
    </header>
  )
}
