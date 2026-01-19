// Dynamic Styling System for Brand-Specific Styles

import type { BrandStyles, StyleVariables, BrandClasses } from './themes/types'

/**
 * Adjust color brightness
 * @param color - Hex color string (e.g., "#3B82F6")
 * @param percent - Percentage to adjust (-100 to 100)
 * @returns Adjusted hex color
 */
export function adjustColor(color: string, percent: number): string {
  try {
    // Remove # if present
    const hex = color.replace('#', '')

    // Parse RGB values
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)

    // Adjust each channel
    const adjustChannel = (channel: number) => {
      const adjusted = Math.round(channel + (channel * percent / 100))
      return Math.min(255, Math.max(0, adjusted))
    }

    const newR = adjustChannel(r)
    const newG = adjustChannel(g)
    const newB = adjustChannel(b)

    // Convert back to hex
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
  } catch {
    return color // Return original if parsing fails
  }
}

/**
 * Create a light tint of a color by blending with white
 * Used for backgrounds that need to be light regardless of the original color
 * @param color - Hex color string
 * @param amount - Amount of white to blend (0-1, higher = lighter)
 * @returns Light tinted hex color
 */
export function createTint(color: string, amount: number = 0.9): string {
  try {
    const hex = color.replace('#', '')
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)

    // Blend with white (255, 255, 255)
    const newR = Math.round(r + (255 - r) * amount)
    const newG = Math.round(g + (255 - g) * amount)
    const newB = Math.round(b + (255 - b) * amount)

    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
  } catch {
    return '#F3F4F6' // Fallback to light gray
  }
}

/**
 * Generate CSS variables from brand styles
 * These are applied as inline styles to the root element
 */
export function generateStyleVars(brand: BrandStyles): StyleVariables {
  const primary = brand.colors.primary || '#3B82F6'
  const secondary = brand.colors.secondary || '#6B7280'
  const accent = brand.colors.accent || primary

  return {
    '--color-primary': primary,
    '--color-primary-dark': adjustColor(primary, -15),
    '--color-primary-light': createTint(primary, 0.9), // Light tint for backgrounds
    '--color-primary-lighter': createTint(primary, 0.95), // Even lighter tint
    '--color-secondary': secondary,
    '--color-secondary-dark': adjustColor(secondary, -15),
    '--color-secondary-light': createTint(secondary, 0.9),
    '--color-accent': accent,
    '--color-accent-dark': adjustColor(accent, -15),
    '--color-accent-light': createTint(accent, 0.9),
    '--font-heading': `"${brand.typography.heading_font}", system-ui, sans-serif`,
    '--font-body': `"${brand.typography.body_font}", system-ui, sans-serif`,
  }
}

/**
 * Generate utility classes from brand styles
 * Returns Tailwind-compatible class names with brand colors
 */
export function getBrandClasses(brand: BrandStyles): BrandClasses {
  const primary = brand.colors.primary || '#3B82F6'
  const secondary = brand.colors.secondary || '#6B7280'
  
  return {
    // Buttons
    buttonPrimary: `bg-[${primary}] hover:bg-[${adjustColor(primary, -15)}] text-white font-medium transition-colors`,
    buttonSecondary: `bg-[${secondary}] hover:bg-[${adjustColor(secondary, -15)}] text-white font-medium transition-colors`,
    buttonOutline: `border-2 border-[${primary}] text-[${primary}] hover:bg-[${primary}] hover:text-white font-medium transition-colors`,
    
    // Links
    linkPrimary: `text-[${primary}] hover:text-[${adjustColor(primary, -15)}] hover:underline transition-colors`,
    
    // Typography
    headingFont: `font-[var(--font-heading)]`,
    bodyFont: `font-[var(--font-body)]`,
    
    // Backgrounds
    bgPrimary: `bg-[${primary}]`,
    bgSecondary: `bg-[${secondary}]`,
    
    // Text
    textPrimary: `text-[${primary}]`,
    textSecondary: `text-[${secondary}]`
  }
}

/**
 * Generate Google Fonts URL for dynamic font loading
 * @param fonts - Array of font family names
 * @returns Google Fonts URL
 */
export function getGoogleFontsUrl(fonts: string[]): string {
  if (!fonts.length) {
    return ''
  }
  
  // Filter out system fonts
  const googleFonts = fonts.filter(font => 
    !['system-ui', 'sans-serif', 'serif', 'monospace'].includes(font.toLowerCase())
  )
  
  if (!googleFonts.length) {
    return ''
  }
  
  // Format font names for URL
  const fontsQuery = googleFonts
    .map(f => f.replace(/ /g, '+'))
    .map(f => `${f}:wght@400;500;600;700`)
    .join('&family=')
  
  return `https://fonts.googleapis.com/css2?family=${fontsQuery}&display=swap`
}

/**
 * Get fonts URL from brand styles
 */
export function getBrandFontsUrl(brand: BrandStyles): string {
  const fonts = [
    brand.typography.heading_font,
    brand.typography.body_font
  ].filter(Boolean)
  
  // Remove duplicates
  const uniqueFonts = [...new Set(fonts)]
  
  return getGoogleFontsUrl(uniqueFonts)
}

/**
 * Generate CSS string from style variables
 * Can be used in <style> tags or CSS-in-JS
 */
export function generateCSSString(vars: StyleVariables): string {
  return Object.entries(vars)
    .map(([key, value]) => `${key}: ${value};`)
    .join('\n')
}

/**
 * Generate inline style object from brand
 */
export function getInlineStyles(brand: BrandStyles): React.CSSProperties {
  const vars = generateStyleVars(brand)
  return vars as unknown as React.CSSProperties
}

/**
 * Get contrast color (black or white) for a given background
 */
export function getContrastColor(hexColor: string): string {
  try {
    const hex = hexColor.replace('#', '')
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    
    // Calculate relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    
    return luminance > 0.5 ? '#000000' : '#FFFFFF'
  } catch {
    return '#FFFFFF'
  }
}

/**
 * Convert hex to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  try {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : null
  } catch {
    return null
  }
}

/**
 * Convert hex to RGBA with alpha
 */
export function hexToRgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
}

/**
 * Generate color palette from primary color
 */
export function generateColorPalette(primary: string) {
  return {
    50: adjustColor(primary, 90),
    100: adjustColor(primary, 70),
    200: adjustColor(primary, 50),
    300: adjustColor(primary, 30),
    400: adjustColor(primary, 15),
    500: primary,
    600: adjustColor(primary, -15),
    700: adjustColor(primary, -30),
    800: adjustColor(primary, -45),
    900: adjustColor(primary, -60)
  }
}

// Font stacks for fallbacks
export const FONT_STACKS = {
  sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  serif: 'Georgia, Cambria, "Times New Roman", Times, serif',
  mono: 'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
}

// Popular Google Fonts by category
export const POPULAR_FONTS = {
  modern: ['Inter', 'Poppins', 'Roboto', 'Open Sans', 'Lato'],
  elegant: ['Playfair Display', 'Cormorant Garamond', 'Lora', 'Merriweather', 'Libre Baskerville'],
  playful: ['Quicksand', 'Nunito', 'Comfortaa', 'Varela Round', 'Baloo 2'],
  minimal: ['DM Sans', 'Work Sans', 'Source Sans Pro', 'Outfit', 'Manrope']
}
