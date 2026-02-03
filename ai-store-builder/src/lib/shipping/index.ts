/**
 * Shipping Module
 * Multi-provider shipping support for StoreForge
 */

// Types
export * from './types'

// Provider Manager (main entry point)
export {
  getStoreShippingSettings,
  saveShippingProvider,
  removeShippingProvider,
  validateProviderCredentials,
  createShipmentForStore,
  getShippingRatesForStore,
  trackShipmentForStore,
  autoCreateShipmentForStore,
  SHIPPING_PROVIDERS,
} from './provider-manager'

// Individual Providers
export { DelhiveryProvider, delhiveryProvider } from './delhivery'
export { BlueDartProvider, bluedartProvider } from './bluedart'

// Legacy Shiprocket (for backward compatibility)
export { shiprocket, autoCreateShipment } from './shiprocket'
