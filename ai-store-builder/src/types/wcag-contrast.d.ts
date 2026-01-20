declare module 'wcag-contrast' {
  /**
   * Calculate the contrast ratio between two hex colors
   * @param foreground - Foreground color in hex format (e.g., '#FFFFFF')
   * @param background - Background color in hex format (e.g., '#000000')
   * @returns The contrast ratio as a number
   */
  export function hex(foreground: string, background: string): number

  /**
   * Calculate the contrast ratio between two RGB colors
   * @param rgb1 - First color as [r, g, b] array
   * @param rgb2 - Second color as [r, g, b] array
   * @returns The contrast ratio as a number
   */
  export function rgb(rgb1: [number, number, number], rgb2: [number, number, number]): number

  /**
   * Get the relative luminance of an RGB color
   * @param rgb - Color as [r, g, b] array
   * @returns The relative luminance as a number
   */
  export function luminance(rgb: [number, number, number]): number

  /**
   * Calculate the contrast ratio from two luminance values
   * @param L1 - First luminance value
   * @param L2 - Second luminance value
   * @returns The contrast ratio as a number
   */
  export function ratio(L1: number, L2: number): number

  /**
   * Check if a contrast ratio meets a given WCAG level
   * @param ratio - The contrast ratio to check
   * @param level - The WCAG level ('AA' or 'AAA')
   * @param size - The text size ('large' or 'small')
   * @returns True if the ratio meets the level requirements
   */
  export function score(ratio: number, level?: 'AA' | 'AAA', size?: 'large' | 'small'): boolean
}
