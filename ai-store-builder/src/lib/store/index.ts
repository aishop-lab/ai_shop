// Store Module - Main Export File

// Data fetching functions
export {
  getStoreBySlug,
  getStoreData,
  getProductData,
  validateStoreAccess,
  getStoreProductsPaginated,
  getStoreCategoriesBySlug,
  getRelatedProducts
} from './get-store-data'

// Database queries
export {
  getStore,
  storeExists,
  getFeaturedProducts,
  getStoreProducts,
  getProduct,
  getProductForStore,
  getStoreCategories
} from './queries'

// Caching utilities
export {
  CACHE_CONFIG,
  getCachedStore,
  getCachedFeaturedProducts,
  getCachedProducts,
  revalidateStoreCache,
  revalidateProductsCache,
  revalidateProductCache,
  revalidateAllStoreData,
  getCacheHeaders,
  getStoreCacheKey,
  getProductsCacheKey,
  getProductCacheKey,
  ISR_CONFIG
} from './cache'

// SEO utilities
export {
  generateStoreMeta,
  generateProductMeta,
  generateStoreStructuredData,
  generateProductStructuredData,
  generateBreadcrumbStructuredData,
  generateOrganizationStructuredData,
  generateRobotsTxt,
  generateSitemapUrls
} from './seo'

// Dynamic styling
export {
  adjustColor,
  generateStyleVars,
  getBrandClasses,
  getGoogleFontsUrl,
  getBrandFontsUrl,
  generateCSSString,
  getInlineStyles,
  getContrastColor,
  hexToRgb,
  hexToRgba,
  generateColorPalette,
  FONT_STACKS,
  POPULAR_FONTS
} from './dynamic-styles'

// Policies
export { generateStorePolicies } from './policies'
export type { StorePolicies } from './policies'
export type {
  PolicyConfig,
  ReturnPolicyConfig,
  ShippingPolicyConfig,
  ReturnCondition,
  RefundMethod,
  FreeShippingType,
  DeliverySpeed,
  ShippingRegion
} from '@/lib/types/store'
export { DEFAULT_POLICY_CONFIG } from '@/lib/types/store'

// Theme system
export { 
  THEME_REGISTRY, 
  getTheme, 
  getAvailableThemes, 
  themeExists,
  getThemePreview,
  getAllThemePreviews
} from './themes/registry'

export type {
  ThemeComponentName,
  ThemeLayout,
  ThemeComponent,
  ThemeComponents,
  ThemeDefinition,
  ThemeRegistry,
  BrandStyles,
  StyleVariables,
  BrandClasses,
  ThemeVibe,
  ThemeMapping
} from './themes/types'

export { VIBE_TO_THEME } from './themes/types'
