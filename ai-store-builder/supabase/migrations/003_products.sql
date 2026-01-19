-- Products Table Migration
-- Products for each store

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

  -- Basic info
  title TEXT NOT NULL,
  description TEXT,

  -- Pricing
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  compare_at_price DECIMAL(10, 2),
  cost_per_item DECIMAL(10, 2),

  -- Inventory
  sku TEXT,
  barcode TEXT,
  quantity INTEGER DEFAULT 0,
  track_quantity BOOLEAN DEFAULT true,

  -- Display
  featured BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),

  -- Categorization (JSONB arrays for flexibility)
  categories JSONB DEFAULT '[]',
  tags JSONB DEFAULT '[]',

  -- Shipping
  weight DECIMAL(10, 2),
  requires_shipping BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Store owners can manage their products
CREATE POLICY "Store owners can manage products"
  ON products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = products.store_id
      AND stores.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = products.store_id
      AND stores.owner_id = auth.uid()
    )
  );

-- Anyone can view published products from active stores
CREATE POLICY "Anyone can view published products"
  ON products FOR SELECT
  USING (
    status = 'published'
    AND EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = products.store_id
      AND stores.status = 'active'
    )
  );

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS products_updated_at ON products;
CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

-- Partial index for published products (most common query)
CREATE INDEX IF NOT EXISTS idx_products_store_id_published
  ON products(store_id)
  WHERE status = 'published';

-- Index for featured products
CREATE INDEX IF NOT EXISTS idx_products_featured
  ON products(store_id, featured)
  WHERE status = 'published' AND featured = true;

-- Index for sorting by created_at
CREATE INDEX IF NOT EXISTS idx_products_created_at
  ON products(store_id, created_at DESC)
  WHERE status = 'published';

-- Index for sorting by price
CREATE INDEX IF NOT EXISTS idx_products_price
  ON products(store_id, price)
  WHERE status = 'published';

-- GIN index for category filtering (JSONB array)
CREATE INDEX IF NOT EXISTS idx_products_categories
  ON products USING GIN(categories)
  WHERE status = 'published';

-- GIN index for tag filtering (JSONB array)
CREATE INDEX IF NOT EXISTS idx_products_tags
  ON products USING GIN(tags)
  WHERE status = 'published';
