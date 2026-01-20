import { hex } from 'wcag-contrast'

export interface ContrastResult {
  ratio: number
  passAA: boolean
  passAALarge: boolean
  passAAA: boolean
  passAAALarge: boolean
  level: 'excellent' | 'good' | 'poor' | 'fail'
}

/**
 * Check WCAG contrast ratio between two colors
 * @param foreground - Foreground color in hex format
 * @param background - Background color in hex format
 * @returns ContrastResult with ratio and pass/fail status
 */
export function checkContrast(foreground: string, background: string): ContrastResult {
  try {
    const ratio = hex(foreground, background)

    return {
      ratio: Math.round(ratio * 10) / 10,
      passAA: ratio >= 4.5,        // Normal text
      passAALarge: ratio >= 3,      // Large text (18pt+ or 14pt bold)
      passAAA: ratio >= 7,          // Enhanced contrast
      passAAALarge: ratio >= 4.5,   // Enhanced for large text
      level: ratio >= 7 ? 'excellent' : ratio >= 4.5 ? 'good' : ratio >= 3 ? 'poor' : 'fail'
    }
  } catch {
    return {
      ratio: 0,
      passAA: false,
      passAALarge: false,
      passAAA: false,
      passAAALarge: false,
      level: 'fail'
    }
  }
}

/**
 * Get relative luminance of a hex color
 */
function getLuminance(hexColor: string): number {
  const rgb = hexToRgb(hexColor)
  if (!rgb) return 0

  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(v => {
    v = v / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hexColor: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexColor)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}

/**
 * Suggest a better text color for a given background
 */
export function suggestTextColor(backgroundColor: string): { color: string; contrast: number } {
  const whiteContrast = checkContrast('#FFFFFF', backgroundColor)
  const blackContrast = checkContrast('#000000', backgroundColor)

  // Return the color with better contrast
  if (whiteContrast.ratio >= blackContrast.ratio) {
    return { color: '#FFFFFF', contrast: whiteContrast.ratio }
  }
  return { color: '#000000', contrast: blackContrast.ratio }
}

/**
 * Check if a color is considered "light"
 */
export function isLightColor(hexColor: string): boolean {
  return getLuminance(hexColor) > 0.179
}

/**
 * Generate accessible color suggestions for a given primary color
 */
export function getAccessibleColorSuggestions(primaryColor: string): {
  textOnPrimary: string
  textOnPrimaryContrast: number
  suggestions: Array<{ color: string; contrast: number; label: string }>
} {
  const suggested = suggestTextColor(primaryColor)

  const suggestions: Array<{ color: string; contrast: number; label: string }> = []

  // Check white
  const whiteContrast = checkContrast('#FFFFFF', primaryColor)
  if (whiteContrast.passAA) {
    suggestions.push({ color: '#FFFFFF', contrast: whiteContrast.ratio, label: 'White' })
  }

  // Check black
  const blackContrast = checkContrast('#000000', primaryColor)
  if (blackContrast.passAA) {
    suggestions.push({ color: '#000000', contrast: blackContrast.ratio, label: 'Black' })
  }

  // Check dark gray
  const darkGrayContrast = checkContrast('#1F2937', primaryColor)
  if (darkGrayContrast.passAA && darkGrayContrast.ratio !== blackContrast.ratio) {
    suggestions.push({ color: '#1F2937', contrast: darkGrayContrast.ratio, label: 'Dark Gray' })
  }

  return {
    textOnPrimary: suggested.color,
    textOnPrimaryContrast: suggested.contrast,
    suggestions: suggestions.sort((a, b) => b.contrast - a.contrast)
  }
}
