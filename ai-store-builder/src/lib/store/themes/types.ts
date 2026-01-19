// Theme System Types

export type ThemeComponentName = 
  | 'homepage'
  | 'productListing'
  | 'productDetail'
  | 'about'
  | 'contact'
  | 'cart'
  | 'checkout'
  | 'header'
  | 'footer'

export interface ThemeLayout {
  maxWidth: string
  headerHeight: string
  footerMinHeight: string
  containerPadding?: string
  gridGap?: string
}

export interface ThemeComponent {
  (): Promise<{ default: React.ComponentType<unknown> }>
}

export interface ThemeComponents {
  homepage: ThemeComponent
  productListing: ThemeComponent
  productDetail: ThemeComponent
  about: ThemeComponent
  contact: ThemeComponent
  cart: ThemeComponent
  checkout: ThemeComponent
  header: ThemeComponent
  footer: ThemeComponent
}

export interface ThemeDefinition {
  name: string
  description: string
  components: ThemeComponents
  layout: ThemeLayout
  previewImage?: string
  features?: string[]
}

export interface ThemeRegistry {
  [key: string]: ThemeDefinition
}

// Brand styles passed to theme components
export interface BrandStyles {
  colors: {
    primary: string
    secondary: string
    accent?: string
  }
  typography: {
    heading_font: string
    body_font: string
  }
}

// Style variables generated from brand
export interface StyleVariables {
  '--color-primary': string
  '--color-primary-dark': string
  '--color-primary-light': string
  '--color-primary-lighter': string
  '--color-secondary': string
  '--color-secondary-dark': string
  '--color-secondary-light': string
  '--color-accent': string
  '--color-accent-dark': string
  '--color-accent-light': string
  '--font-heading': string
  '--font-body': string
  [key: string]: string
}

// Brand utility classes
export interface BrandClasses {
  buttonPrimary: string
  buttonSecondary: string
  buttonOutline: string
  linkPrimary: string
  headingFont: string
  bodyFont: string
  bgPrimary: string
  bgSecondary: string
  textPrimary: string
  textSecondary: string
}

export type ThemeVibe = 'modern' | 'classic' | 'playful' | 'minimal'

export interface ThemeMapping {
  vibe: ThemeVibe
  template: string
}

// Map brand vibe to theme template
export const VIBE_TO_THEME: Record<ThemeVibe, string> = {
  modern: 'modern-minimal',
  classic: 'classic-elegant',
  playful: 'playful-bright',
  minimal: 'minimal-zen'
}
