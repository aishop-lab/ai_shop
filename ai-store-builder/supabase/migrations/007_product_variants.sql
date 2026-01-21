-- Migration: 007_product_variants
-- Description: Create product variant tables for multi-option products (Size, Color, Material)
-- Safe to re-run

-- ============================================
-- CLEANUP (for re-running)
-- ============================================

-- Drop tables first (CASCADE handles policies, triggers, indexes)
DROP TABLE IF EXISTS product_variants CASCADE;
DROP TABLE IF EXISTS product_variant_option_values CASCADE;
DROP TABLE IF EXISTS product_variant_options CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_variant_timestamp() CASCADE;
DROP FUNCTION IF EXISTS get_product_total_inventory(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_product_variant_count(UUID) CASCADE;

-- Remove columns from other tables if they exist
ALTER TABLE products DROP COLUMN IF EXISTS has_variants;
ALTER TABLE order_items DROP COLUMN IF EXISTS variant_id;
ALTER TABLE order_items DROP COLUMN IF EXISTS variant_attributes;
ALTER TABLE order_items DROP COLUMN IF EXISTS variant_sku;

-- ============================================
-- VARIANT OPTIONS TABLE
-- (Size, Color, Material - per product)
-- ============================================
CREATE TABLE product_variant_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, name)
);

-- ============================================
-- OPTION VALUES TABLE
-- (S, M, L, Red, Blue - per option)
-- ============================================
CREATE TABLE product_variant_option_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  option_id UUID NOT NULL REFERENCES product_variant_options(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  color_code TEXT,
  position INTEGER DEFAULT 0,
  UNIQUE(option_id, value)
);

-- ============================================
-- PRODUCT VARIANTS TABLE
-- (Actual SKU combinations with pricing/inventory)
-- ============================================
CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  attributes JSONB NOT NULL DEFAULT '{}',
  price DECIMAL(10, 2),
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

-- Unique index on product_id + attributes
CREATE UNIQUE INDEX idx_variant_attributes ON product_variants(product_id, attributes);

-- ============================================
-- ALTER EXISTING TABLES
-- ============================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS has_variants BOOLEAN DEFAULT false;

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id),
  ADD COLUMN IF NOT EXISTS variant_attributes JSONB,
  ADD COLUMN IF NOT EXISTS variant_sku TEXT;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_variant_options_product_id ON product_variant_options(product_id);
CREATE INDEX idx_variant_options_position ON product_variant_options(product_id, position);
CREATE INDEX idx_option_values_option_id ON product_variant_option_values(option_id);
CREATE INDEX idx_option_values_position ON product_variant_option_values(option_id, position);
CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_product_variants_sku ON product_variants(sku) WHERE sku IS NOT NULL;
CREATE INDEX idx_product_variants_status ON product_variants(product_id, status);
CREATE INDEX idx_product_variants_image ON product_variants(image_id) WHERE image_id IS NOT NULL;
CREATE INDEX idx_order_items_variant_id ON order_items(variant_id) WHERE variant_id IS NOT NULL;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE product_variant_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variant_option_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

-- ============================================
-- VARIANT OPTIONS RLS POLICIES
-- ============================================
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
CREATE OR REPLACE FUNCTION update_variant_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_variant_timestamp
  BEFORE UPDATE ON product_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_variant_timestamp();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION get_product_total_inventory(p_product_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total INTEGER;
  has_vars BOOLEAN;
BEGIN
  SELECT products.has_variants INTO has_vars
  FROM products WHERE id = p_product_id;

  IF has_vars THEN
    SELECT COALESCE(SUM(quantity), 0) INTO total
    FROM product_variants
    WHERE product_id = p_product_id AND status = 'active';
  ELSE
    SELECT COALESCE(quantity, 0) INTO total
    FROM products WHERE id = p_product_id;
  END IF;

  RETURN total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_product_variant_count(p_product_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM product_variants
  WHERE product_id = p_product_id AND status = 'active';
$$ LANGUAGE SQL SECURITY DEFINER;
