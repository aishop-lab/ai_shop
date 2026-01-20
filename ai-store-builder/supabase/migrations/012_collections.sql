-- Collections System Migration
-- Groups products into curated collections like "Summer Sale", "Bestsellers", "New Arrivals"

-- Collections table
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  cover_image_url TEXT,

  -- SEO
  meta_title VARCHAR(255),
  meta_description TEXT,

  -- Display
  featured BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  visible BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_collection_slug UNIQUE (store_id, slug)
);

-- Collection products junction table
CREATE TABLE IF NOT EXISTS collection_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_collection_product UNIQUE (collection_id, product_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_collections_store_id ON collections(store_id);
CREATE INDEX IF NOT EXISTS idx_collections_slug ON collections(slug);
CREATE INDEX IF NOT EXISTS idx_collections_featured ON collections(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_collection_products_collection_id ON collection_products(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_products_product_id ON collection_products(product_id);

-- Enable RLS
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_products ENABLE ROW LEVEL SECURITY;

-- RLS Policies for collections
CREATE POLICY "Users can view their own collections"
  ON collections FOR SELECT
  USING (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()));

CREATE POLICY "Users can create collections for their store"
  ON collections FOR INSERT
  WITH CHECK (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own collections"
  ON collections FOR UPDATE
  USING (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their own collections"
  ON collections FOR DELETE
  USING (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()));

-- Public can view visible collections
CREATE POLICY "Public can view visible collections"
  ON collections FOR SELECT
  USING (visible = true);

-- RLS Policies for collection_products
CREATE POLICY "Users can manage collection products"
  ON collection_products FOR ALL
  USING (collection_id IN (
    SELECT id FROM collections WHERE store_id IN (
      SELECT id FROM stores WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Public can view collection products"
  ON collection_products FOR SELECT
  USING (collection_id IN (SELECT id FROM collections WHERE visible = true));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_collection_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_collection_timestamp ON collections;
CREATE TRIGGER trigger_update_collection_timestamp
  BEFORE UPDATE ON collections
  FOR EACH ROW
  EXECUTE FUNCTION update_collection_updated_at();

-- Function to generate slug from title
CREATE OR REPLACE FUNCTION generate_collection_slug(title TEXT, store_id UUID)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Generate base slug from title
  base_slug := lower(regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);

  final_slug := base_slug;

  -- Check for uniqueness and add suffix if needed
  WHILE EXISTS (SELECT 1 FROM collections c WHERE c.slug = final_slug AND c.store_id = generate_collection_slug.store_id) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;
