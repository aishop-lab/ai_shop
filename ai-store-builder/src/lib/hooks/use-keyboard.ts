'use client'

import { useEffect, useCallback, useRef, useState } from 'react'

export interface KeyboardShortcut {
  key: string                          // e.g. 'k', 'j', 'Enter', 'Escape'
  meta?: boolean                       // Cmd on Mac, Ctrl on Windows
  shift?: boolean
  alt?: boolean
  handler: (e: KeyboardEvent) => void
  allowInInput?: boolean               // If true, fires even in input/textarea
  description?: string                 // For future shortcut help panel
}

/**
 * Register multiple keyboard shortcuts. Handles Cmd vs Ctrl cross-platform.
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const shortcutsRef = useRef(shortcuts)
  shortcutsRef.current = shortcuts

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

    for (const shortcut of shortcutsRef.current) {
      if (isInput && !shortcut.allowInInput) continue

      const metaMatch = shortcut.meta
        ? (e.metaKey || e.ctrlKey)
        : (!e.metaKey && !e.ctrlKey)

      const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey
      const altMatch = shortcut.alt ? e.altKey : !e.altKey

      if (e.key.toLowerCase() === shortcut.key.toLowerCase() && metaMatch && shiftMatch && altMatch) {
        e.preventDefault()
        shortcut.handler(e)
        return
      }
    }
  }, [])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

/**
 * Returns true if user prefers reduced motion.
 * Reactive: updates if user changes preference. SSR-safe.
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReduced(mq.matches)
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return prefersReduced
}

/**
 * Formats a keyboard shortcut for display.
 * Returns platform-appropriate symbols (⌘ on Mac, Ctrl on others).
 */
export function formatShortcut(shortcut: Pick<KeyboardShortcut, 'key' | 'meta' | 'shift' | 'alt'>): string {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac')

  const parts: string[] = []
  if (shortcut.meta) parts.push(isMac ? '⌘' : 'Ctrl')
  if (shortcut.shift) parts.push(isMac ? '⇧' : 'Shift')
  if (shortcut.alt) parts.push(isMac ? '⌥' : 'Alt')
  parts.push(shortcut.key.toUpperCase())

  return parts.join(isMac ? '' : '+')
}
