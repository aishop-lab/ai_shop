'use client'

import { useStore } from '@/lib/contexts/store-context'
import { useSidebar } from '@/lib/contexts/sidebar-context'
import ModernMinimalHeader from './themes/modern-minimal/header'
import ClassicElegantHeader from './themes/classic-elegant/header'
import PlayfulBrightHeader from './themes/playful-bright/header'
import MinimalZenHeader from './themes/minimal-zen/header'

export default function StoreHeader() {
  const { store } = useStore()
  const { toggle: onMenuClick } = useSidebar()
  const theme = store.theme_template || 'modern-minimal'

  // Render theme-specific header with sidebar toggle
  switch (theme) {
    case 'classic-elegant':
      return <ClassicElegantHeader onMenuClick={onMenuClick} />
    case 'playful-bright':
      return <PlayfulBrightHeader onMenuClick={onMenuClick} />
    case 'minimal-zen':
      return <MinimalZenHeader onMenuClick={onMenuClick} />
    case 'modern-minimal':
    default:
      return <ModernMinimalHeader onMenuClick={onMenuClick} />
  }
}
