-- Migration: Add is_demo column to products table
-- This allows tracking of demo products that are auto-created when a store is built

-- Add is_demo column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;

-- Create index for efficient lookup of demo products
CREATE INDEX IF NOT EXISTS idx_products_is_demo ON products(store_id, is_demo) WHERE is_demo = true;

-- Comment for documentation
COMMENT ON COLUMN products.is_demo IS 'Indicates if this is a demo product auto-created during onboarding. Demo products are removed when user adds their first real product.';
