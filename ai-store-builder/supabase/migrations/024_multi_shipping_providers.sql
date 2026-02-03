-- Migration: 024_multi_shipping_providers
-- Description: Add multi-provider shipping support with per-store credentials
-- Supports: Shiprocket, Delhivery, Blue Dart, Self-delivery

-- ============================================
-- ALTER STORES TABLE
-- ============================================

-- Add shipping_providers column for per-store provider credentials
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS shipping_providers JSONB DEFAULT '{
  "providers": [],
  "defaultProvider": null,
  "autoCreateShipment": false,
  "preferredCourierStrategy": "cheapest",
  "defaultPackageDimensions": {
    "length": 20,
    "breadth": 15,
    "height": 10,
    "weight": 0.5
  }
}'::jsonb;

-- ============================================
-- ALTER ORDERS TABLE
-- ============================================

-- Add courier_company_id for multi-provider support
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS courier_company_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS courier_name VARCHAR(100);

-- Update shipping_provider to support more providers
COMMENT ON COLUMN orders.shipping_provider IS 'Shipping provider: self, shiprocket, delhivery, bluedart';

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON COLUMN stores.shipping_providers IS 'Per-store shipping provider configurations with encrypted credentials. Structure: { providers: [{ provider, isActive, isDefault, credentials (encrypted), pickupLocation }], defaultProvider, autoCreateShipment, preferredCourierStrategy }';

COMMENT ON COLUMN orders.courier_company_id IS 'Internal courier company ID from the shipping provider';
COMMENT ON COLUMN orders.courier_name IS 'Human-readable courier name (e.g., Delhivery, Blue Dart, DTDC)';

-- ============================================
-- INDEX FOR BETTER PERFORMANCE
-- ============================================

-- Index for querying by shipping provider
CREATE INDEX IF NOT EXISTS idx_orders_shipping_provider ON orders(shipping_provider);
CREATE INDEX IF NOT EXISTS idx_orders_courier_name ON orders(courier_name);
