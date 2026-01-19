-- Product Images Table Migration
-- Images associated with products

-- Create product_images table
CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  -- Image data
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  position INTEGER DEFAULT 0,
  alt_text TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Store owners can manage images for their products
CREATE POLICY "Store owners can manage product images"
  ON product_images FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM products
      JOIN stores ON stores.id = products.store_id
      WHERE products.id = product_images.product_id
      AND stores.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products
      JOIN stores ON stores.id = products.store_id
      WHERE products.id = product_images.product_id
      AND stores.owner_id = auth.uid()
    )
  );

-- Anyone can view images for published products from active stores
CREATE POLICY "Anyone can view product images"
  ON product_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products
      JOIN stores ON stores.id = products.store_id
      WHERE products.id = product_images.product_id
      AND products.status = 'published'
      AND stores.status = 'active'
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_images_product_id
  ON product_images(product_id);

CREATE INDEX IF NOT EXISTS idx_product_images_position
  ON product_images(product_id, position);


-- =============================================
-- Storage Bucket for Logos
-- =============================================

-- Note: Run this in Supabase Dashboard SQL Editor if buckets don't exist
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('logos', 'logos', true)
-- ON CONFLICT (id) DO NOTHING;

-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('products', 'products', true)
-- ON CONFLICT (id) DO NOTHING;

-- Storage policies for logos bucket
-- CREATE POLICY "Anyone can view logos"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'logos');

-- CREATE POLICY "Authenticated users can upload logos"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'logos' AND auth.role() = 'authenticated');

-- CREATE POLICY "Users can update their own logos"
--   ON storage.objects FOR UPDATE
--   USING (bucket_id = 'logos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can delete their own logos"
--   ON storage.objects FOR DELETE
--   USING (bucket_id = 'logos' AND auth.uid()::text = (storage.foldername(name))[1]);
