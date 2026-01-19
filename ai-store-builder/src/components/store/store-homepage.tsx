'use client'

import type { StorePageData } from '@/lib/types/store'
import ModernMinimalHomepage from './themes/modern-minimal/homepage'
import ClassicElegantHomepage from './themes/classic-elegant/homepage'
import PlayfulBrightHomepage from './themes/playful-bright/homepage'
import MinimalZenHomepage from './themes/minimal-zen/homepage'

interface StoreHomepageProps {
  data: StorePageData
}

export default function StoreHomepage({ data }: StoreHomepageProps) {
  const theme = data.store.theme_template || 'modern-minimal'
  
  // Render theme-specific homepage
  switch (theme) {
    case 'classic-elegant':
      return <ClassicElegantHomepage data={data} />
    case 'playful-bright':
      return <PlayfulBrightHomepage data={data} />
    case 'minimal-zen':
      return <MinimalZenHomepage data={data} />
    case 'modern-minimal':
    default:
      return <ModernMinimalHomepage data={data} />
  }
}
