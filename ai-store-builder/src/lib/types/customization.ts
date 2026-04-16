// Store UI Customization Types

export interface StoreCustomization {
  // Colors
  colors: CustomizationColors
  // Typography
  typography: CustomizationTypography
  // Layout
  layout: CustomizationLayout
  // Announcement bar
  announcement_bar?: AnnouncementBar
  // Custom CSS (advanced)
  custom_css?: string
}

export interface CustomizationColors {
  primary: string
  secondary: string
  accent: string
  background: string
  text: string
  header_bg: string
  header_text: string
  footer_bg: string
  footer_text: string
}

export interface CustomizationTypography {
  heading_font: string
  body_font: string
  base_font_size: 'small' | 'medium' | 'large'
}

export interface CustomizationLayout {
  theme_template: string
  header_style: 'default' | 'centered' | 'minimal'
  button_style: 'rounded' | 'sharp' | 'pill'
  product_card_style: 'default' | 'minimal' | 'overlay'
  product_grid_columns: 2 | 3 | 4
  homepage_sections: HomepageSection[]
}

export interface HomepageSection {
  type: 'hero' | 'featured_products' | 'categories' | 'testimonials' | 'newsletter' | 'banner'
  enabled: boolean
  order: number
}

export interface AnnouncementBar {
  enabled: boolean
  text: string
  link_url?: string
  link_text?: string
  bg_color: string
  text_color: string
}

// Default customization values
export const DEFAULT_CUSTOMIZATION: StoreCustomization = {
  colors: {
    primary: '#3B82F6',
    secondary: '#6B7280',
    accent: '#F59E0B',
    background: '#FFFFFF',
    text: '#111827',
    header_bg: '#FFFFFF',
    header_text: '#111827',
    footer_bg: '#111827',
    footer_text: '#F9FAFB',
  },
  typography: {
    heading_font: 'Inter',
    body_font: 'Inter',
    base_font_size: 'medium',
  },
  layout: {
    theme_template: 'modern-minimal',
    header_style: 'default',
    button_style: 'rounded',
    product_card_style: 'default',
    product_grid_columns: 3,
    homepage_sections: [
      { type: 'hero', enabled: true, order: 0 },
      { type: 'featured_products', enabled: true, order: 1 },
      { type: 'categories', enabled: true, order: 2 },
      { type: 'testimonials', enabled: true, order: 3 },
      { type: 'newsletter', enabled: true, order: 4 },
    ],
  },
  announcement_bar: {
    enabled: false,
    text: '',
    bg_color: '#3B82F6',
    text_color: '#FFFFFF',
  },
  custom_css: '',
}

// Curated Google Fonts list for the font picker
export const FONT_OPTIONS = [
  // Sans-serif - Modern
  { name: 'Inter', category: 'sans-serif', style: 'modern' },
  { name: 'Poppins', category: 'sans-serif', style: 'modern' },
  { name: 'DM Sans', category: 'sans-serif', style: 'modern' },
  { name: 'Outfit', category: 'sans-serif', style: 'modern' },
  { name: 'Manrope', category: 'sans-serif', style: 'modern' },
  { name: 'Plus Jakarta Sans', category: 'sans-serif', style: 'modern' },
  { name: 'Space Grotesk', category: 'sans-serif', style: 'modern' },
  // Sans-serif - Clean
  { name: 'Roboto', category: 'sans-serif', style: 'clean' },
  { name: 'Open Sans', category: 'sans-serif', style: 'clean' },
  { name: 'Lato', category: 'sans-serif', style: 'clean' },
  { name: 'Source Sans 3', category: 'sans-serif', style: 'clean' },
  { name: 'Work Sans', category: 'sans-serif', style: 'clean' },
  { name: 'Nunito Sans', category: 'sans-serif', style: 'clean' },
  // Sans-serif - Friendly
  { name: 'Nunito', category: 'sans-serif', style: 'friendly' },
  { name: 'Quicksand', category: 'sans-serif', style: 'friendly' },
  { name: 'Comfortaa', category: 'sans-serif', style: 'friendly' },
  { name: 'Varela Round', category: 'sans-serif', style: 'friendly' },
  // Serif - Elegant
  { name: 'Playfair Display', category: 'serif', style: 'elegant' },
  { name: 'Cormorant Garamond', category: 'serif', style: 'elegant' },
  { name: 'Lora', category: 'serif', style: 'elegant' },
  { name: 'Merriweather', category: 'serif', style: 'elegant' },
  { name: 'Libre Baskerville', category: 'serif', style: 'elegant' },
  { name: 'EB Garamond', category: 'serif', style: 'elegant' },
  { name: 'Crimson Pro', category: 'serif', style: 'elegant' },
  // Display
  { name: 'Josefin Sans', category: 'sans-serif', style: 'display' },
  { name: 'Raleway', category: 'sans-serif', style: 'display' },
  { name: 'Montserrat', category: 'sans-serif', style: 'display' },
] as const

export type FontOption = (typeof FONT_OPTIONS)[number]

// Color presets - curated palettes
export const COLOR_PRESETS = [
  {
    name: 'Ocean Blue',
    colors: { primary: '#2563EB', secondary: '#64748B', accent: '#F59E0B', background: '#FFFFFF', text: '#0F172A', header_bg: '#FFFFFF', header_text: '#0F172A', footer_bg: '#0F172A', footer_text: '#F1F5F9' },
  },
  {
    name: 'Forest Green',
    colors: { primary: '#059669', secondary: '#6B7280', accent: '#D97706', background: '#FFFFFF', text: '#111827', header_bg: '#FFFFFF', header_text: '#111827', footer_bg: '#064E3B', footer_text: '#ECFDF5' },
  },
  {
    name: 'Sunset Rose',
    colors: { primary: '#E11D48', secondary: '#71717A', accent: '#F97316', background: '#FFFFFF', text: '#18181B', header_bg: '#FFFFFF', header_text: '#18181B', footer_bg: '#1C1917', footer_text: '#FFF1F2' },
  },
  {
    name: 'Royal Purple',
    colors: { primary: '#7C3AED', secondary: '#6B7280', accent: '#EC4899', background: '#FFFFFF', text: '#1E1B4B', header_bg: '#FFFFFF', header_text: '#1E1B4B', footer_bg: '#1E1B4B', footer_text: '#EDE9FE' },
  },
  {
    name: 'Warm Earth',
    colors: { primary: '#B45309', secondary: '#78716C', accent: '#DC2626', background: '#FFFBEB', text: '#292524', header_bg: '#FFFBEB', header_text: '#292524', footer_bg: '#292524', footer_text: '#FEF3C7' },
  },
  {
    name: 'Midnight Dark',
    colors: { primary: '#6366F1', secondary: '#9CA3AF', accent: '#22D3EE', background: '#0F172A', text: '#F1F5F9', header_bg: '#1E293B', header_text: '#F1F5F9', footer_bg: '#020617', footer_text: '#CBD5E1' },
  },
  {
    name: 'Soft Blush',
    colors: { primary: '#DB2777', secondary: '#9CA3AF', accent: '#8B5CF6', background: '#FFF1F2', text: '#1F2937', header_bg: '#FFFFFF', header_text: '#1F2937', footer_bg: '#831843', footer_text: '#FCE7F3' },
  },
  {
    name: 'Clean Slate',
    colors: { primary: '#0F172A', secondary: '#64748B', accent: '#3B82F6', background: '#FFFFFF', text: '#1E293B', header_bg: '#FFFFFF', header_text: '#1E293B', footer_bg: '#F8FAFC', footer_text: '#334155' },
  },
] as const

// Button radius mapping
export const BUTTON_RADIUS_MAP: Record<StoreCustomization['layout']['button_style'], string> = {
  rounded: '8px',
  sharp: '0px',
  pill: '9999px',
}

// Font size mapping
export const FONT_SIZE_MAP: Record<StoreCustomization['typography']['base_font_size'], string> = {
  small: '14px',
  medium: '16px',
  large: '18px',
}
