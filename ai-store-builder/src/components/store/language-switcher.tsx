'use client'

import { useTranslation, LOCALE_LABELS } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n'

export function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation()

  const toggleLocale = () => {
    const next: Locale = locale === 'en' ? 'hi' : 'en'
    setLocale(next)
  }

  return (
    <button
      type="button"
      onClick={toggleLocale}
      className="flex items-center gap-1.5 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900"
      aria-label={`Switch language to ${locale === 'en' ? 'Hindi' : 'English'}`}
      title={`Switch to ${locale === 'en' ? 'हिन्दी' : 'English'}`}
    >
      <span className="text-sm">{locale === 'en' ? '🇮🇳' : '🇬🇧'}</span>
      <span>{LOCALE_LABELS[locale === 'en' ? 'hi' : 'en']}</span>
    </button>
  )
}
