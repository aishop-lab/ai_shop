-- Migration: 007_product_variants
-- Description: Create product variant tables for multi-option products (Size, Color, Material)

-- ============================================
-- VARIANT OPTIONS TABLE
-- (Size, Color, Material - per product)
-- ============================================
CREATE TABLE IF NOT EXISTS product_variant_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                    -- "Size", "Color", "Material"
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, name)
);

-- ============================================
-- OPTION VALUES TABLE
-- (S, M, L, Red, Blue - per option)
-- ============================================
CREATE TABLE IF NOT EXISTS product_variant_option_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  option_id UUID NOT NULL REFERENCES product_variant_options(id) ON DELETE CASCADE,
  value TEXT NOT NULL,                   -- "S", "Red", "Cotton"
  color_code TEXT,                       -- "#FF0000" for color swatches
  position INTEGER DEFAULT 0,
  UNIQUE(option_id, value)
);

-- ============================================
-- PRODUCT VARIANTS TABLE
-- (Actual SKU combinations with pricing/inventory)
-- ============================================
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  attributes JSONB NOT NULL DEFAULT '{}', -- {"Size": "S", "Color": "Red"}
  price DECIMAL(10, 2),                   -- NULL = use base price
  compare_at_price DECIMAL(10, 2),
  sku TEXT,
  barcode TEXT,
  quantity INTEGER DEFAULT 0,
  track_quantity BOOLEAN DEFAULT true,
  weight DECIMAL(10, 2),
  image_id UUID REFERENCES product_images(id) ON DELETE SET NULL,
  is_default BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique index on product_id + attributes (prevent duplicate combinations)
CREATE UNIQUE INDEX IF NOT EXISTS idx_variant_attributes
  ON product_variants(product_id, attributes);

-- ============================================
-- ALTER EXISTING TABLES
-- ============================================

-- Add has_variants flag to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS has_variants BOOLEAN DEFAULT false;

-- Add variant support to order_items
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id),
  ADD COLUMN IF NOT EXISTS variant_attributes JSONB,
  ADD COLUMN IF NOT EXISTS variant_sku TEXT;

-- Add variant support to inventory_reservations
ALTER TABLE inventory_reservations
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id);

-- ============================================
-- INDEXES
-- ============================================

-- Variant options indexes
CREATE INDEX IF NOT EXISTS idx_variant_options_product_id
  ON product_variant_options(product_id);
CREATE INDEX IF NOT EXISTS idx_variant_options_position
  ON product_variant_options(product_id, position);

-- Option values indexes
CREATE INDEX IF NOT EXISTS idx_option_values_option_id
  ON product_variant_option_values(option_id);
CREATE INDEX IF NOT EXISTS idx_option_values_position
  ON product_variant_option_values(option_id, position);

-- Product variants indexes
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id
  ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku
  ON product_variants(sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_variants_status
  ON product_variants(product_id, status);
CREATE INDEX IF NOT EXISTS idx_product_variants_image
  ON product_variants(image_id) WHERE image_id IS NOT NULL;

-- Order items variant index
CREATE INDEX IF NOT EXISTS idx_order_items_variant_id
  ON order_items(variant_id) WHERE variant_id IS NOT NULL;

-- Inventory reservations variant index
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_variant_id
  ON inventory_reservations(variant_id) WHERE variant_id IS NOT NULL;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all variant tables
ALTER TABLE product_variant_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variant_option_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

-- ============================================
-- VARIANT OPTIONS RLS POLICIES
-- ============================================

-- Store owners can manage variant options
CREATE POLICY "Store owners can manage variant options"
  ON product_variant_options FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM products
      JOIN stores ON stores.id = products.store_id
      WHERE products.id = product_variant_options.product_id
      AND stores.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products
      JOIN stores ON stores.id = products.store_id
      WHERE products.id = product_variant_options.product_id
      AND stores.owner_id = auth.uid()
    )
  );

-- Anyone can view variant options for published products
CREATE POLICY "Anyone can view variant options"
  ON product_variant_options FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products
      JOIN stores ON stores.id = products.store_id
      WHERE products.id = product_variant_options.product_id
      AND products.status = 'published'
      AND stores.status = 'active'
    )
  );

-- ============================================
-- OPTION VALUES RLS POLICIES
-- ============================================

-- Store owners can manage option values
CREATE POLICY "Store owners can manage option values"
  ON product_variant_option_values FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM product_variant_options
      JOIN products ON products.id = product_variant_options.product_id
      JOIN stores ON stores.id = products.store_id
      WHERE product_variant_options.id = product_variant_option_values.option_id
      AND stores.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM product_variant_options
      JOIN products ON products.id = product_variant_options.product_id
      JOIN stores ON stores.id = products.store_id
      WHERE product_variant_options.id = product_variant_option_values.option_id
      AND stores.owner_id = auth.uid()
    )
  );

-- Anyone can view option values for published products
CREATE POLICY "Anyone can view option values"
  ON product_variant_option_values FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM product_variant_options
      JOIN products ON products.id = product_variant_options.product_id
      JOIN stores ON stores.id = products.store_id
      WHERE product_variant_options.id = product_variant_option_values.option_id
      AND products.status = 'published'
      AND stores.status = 'active'
    )
  );

-- ============================================
-- PRODUCT VARIANTS RLS POLICIES
-- ============================================

-- Store owners can manage variants
CREATE POLICY "Store owners can manage variants"
  ON product_variants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM products
      JOIN stores ON stores.id = products.store_id
      WHERE products.id = product_variants.product_id
      AND stores.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products
      JOIN stores ON stores.id = products.store_id
      WHERE products.id = product_variants.product_id
      AND stores.owner_id = auth.uid()
    )
  );

-- Anyone can view active variants for published products
CREATE POLICY "Anyone can view active variants"
  ON product_variants FOR SELECT
  USING (
    status = 'active'
    AND EXISTS (
      SELECT 1 FROM products
      JOIN stores ON stores.id = products.store_id
      WHERE products.id = product_variants.product_id
      AND products.status = 'published'
      AND stores.status = 'active'
    )
  );

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at for product_variants
CREATE OR REPLACE FUNCTION update_variant_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_variant_timestamp ON product_variants;
CREATE TRIGGER trigger_update_variant_timestamp
  BEFORE UPDATE ON product_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_variant_timestamp();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get total inventory across all variants
CREATE OR REPLACE FUNCTION get_product_total_inventory(p_product_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total INTEGER;
  has_variants BOOLEAN;
BEGIN
  -- Check if product has variants
  SELECT products.has_variants INTO has_variants
  FROM products WHERE id = p_product_id;

  IF has_variants THEN
    -- Sum variant quantities
    SELECT COALESCE(SUM(quantity), 0) INTO total
    FROM product_variants
    WHERE product_id = p_product_id AND status = 'active';
  ELSE
    -- Use base product quantity
    SELECT COALESCE(quantity, 0) INTO total
    FROM products WHERE id = p_product_id;
  END IF;

  RETURN total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get variant count for a product
CREATE OR REPLACE FUNCTION get_product_variant_count(p_product_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM product_variants
  WHERE product_id = p_product_id AND status = 'active';
$$ LANGUAGE SQL SECURITY DEFINER;
