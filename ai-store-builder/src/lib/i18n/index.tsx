'use client'

import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { translations, DEFAULT_LOCALE } from './translations'
import type { Locale, Translations } from './translations'

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: Translations
}

const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: translations[DEFAULT_LOCALE],
})

// ---------------------------------------------------------------------------
// Provider — wrap the storefront layout
// ---------------------------------------------------------------------------

export function I18nProvider({
  children,
  initialLocale,
}: {
  children: React.ReactNode
  initialLocale?: Locale
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale ?? DEFAULT_LOCALE)

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    // Persist to cookie for SSR
    if (typeof document !== 'undefined') {
      document.cookie = `store_locale=${newLocale};path=/;max-age=${365 * 24 * 60 * 60}`
    }
  }, [])

  const t = useMemo(() => translations[locale], [locale])

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t])

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTranslation() {
  return useContext(I18nContext)
}

// ---------------------------------------------------------------------------
// Re-exports
// ---------------------------------------------------------------------------

export { translations, DEFAULT_LOCALE, LOCALE_LABELS } from './translations'
export type { Locale, Translations } from './translations'
