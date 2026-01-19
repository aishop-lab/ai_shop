'use client'

import { useStore } from '@/lib/contexts/store-context'
import ModernMinimalFooter from './themes/modern-minimal/footer'
import ClassicElegantFooter from './themes/classic-elegant/footer'
import PlayfulBrightFooter from './themes/playful-bright/footer'
import MinimalZenFooter from './themes/minimal-zen/footer'

export default function StoreFooter() {
  const { store } = useStore()
  const theme = store.theme_template || 'modern-minimal'
  
  // Render theme-specific footer
  switch (theme) {
    case 'classic-elegant':
      return <ClassicElegantFooter />
    case 'playful-bright':
      return <PlayfulBrightFooter />
    case 'minimal-zen':
      return <MinimalZenFooter />
    case 'modern-minimal':
    default:
      return <ModernMinimalFooter />
  }
}
