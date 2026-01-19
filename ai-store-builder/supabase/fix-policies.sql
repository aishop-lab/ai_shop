-- FIX: Infinite Recursion in RLS Policies + Missing Tables
-- Run this in Supabase Dashboard > SQL Editor

-- =============================================
-- 0. ENSURE PRODUCT_IMAGES TABLE EXISTS
-- =============================================

CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  position INTEGER DEFAULT 0,
  alt_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);

-- =============================================
-- 1. DROP ALL EXISTING POLICIES ON STORES
-- =============================================

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'stores' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON stores', pol.policyname);
  END LOOP;
END $$;

-- =============================================
-- 2. CREATE SIMPLE NON-RECURSIVE POLICIES
-- =============================================

-- SELECT: Public can see active stores, owners can see their own
CREATE POLICY "stores_select_policy"
  ON stores FOR SELECT
  USING (status = 'active' OR auth.uid() = owner_id);

-- INSERT: Authenticated users can create stores they own
CREATE POLICY "stores_insert_policy"
  ON stores FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- UPDATE: Only owners can update their stores
CREATE POLICY "stores_update_policy"
  ON stores FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- DELETE: Only owners can delete their stores
CREATE POLICY "stores_delete_policy"
  ON stores FOR DELETE
  USING (auth.uid() = owner_id);

-- =============================================
-- 3. FIX PRODUCTS POLICIES (avoid recursion)
-- =============================================

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'products' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON products', pol.policyname);
  END LOOP;
END $$;

-- SELECT: Use security definer function to avoid recursion
CREATE OR REPLACE FUNCTION get_user_store_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM stores WHERE owner_id = auth.uid();
$$;

-- SELECT: Published products in active stores, or owner's products
CREATE POLICY "products_select_policy"
  ON products FOR SELECT
  USING (
    status = 'published'
    OR store_id IN (SELECT get_user_store_ids())
  );

-- INSERT: Only store owners
CREATE POLICY "products_insert_policy"
  ON products FOR INSERT
  WITH CHECK (store_id IN (SELECT get_user_store_ids()));

-- UPDATE: Only store owners
CREATE POLICY "products_update_policy"
  ON products FOR UPDATE
  USING (store_id IN (SELECT get_user_store_ids()))
  WITH CHECK (store_id IN (SELECT get_user_store_ids()));

-- DELETE: Only store owners
CREATE POLICY "products_delete_policy"
  ON products FOR DELETE
  USING (store_id IN (SELECT get_user_store_ids()));

-- =============================================
-- 4. FIX PRODUCT_IMAGES POLICIES
-- =============================================

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'product_images' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON product_images', pol.policyname);
  END LOOP;
END $$;

-- Helper function to get user's product IDs
CREATE OR REPLACE FUNCTION get_user_product_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT p.id FROM products p
  JOIN stores s ON s.id = p.store_id
  WHERE s.owner_id = auth.uid();
$$;

-- SELECT: Public for published, or owner's images
CREATE POLICY "product_images_select_policy"
  ON product_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_images.product_id
      AND p.status = 'published'
    )
    OR product_id IN (SELECT get_user_product_ids())
  );

-- INSERT: Only store owners
CREATE POLICY "product_images_insert_policy"
  ON product_images FOR INSERT
  WITH CHECK (product_id IN (SELECT get_user_product_ids()));

-- UPDATE: Only store owners
CREATE POLICY "product_images_update_policy"
  ON product_images FOR UPDATE
  USING (product_id IN (SELECT get_user_product_ids()))
  WITH CHECK (product_id IN (SELECT get_user_product_ids()));

-- DELETE: Only store owners
CREATE POLICY "product_images_delete_policy"
  ON product_images FOR DELETE
  USING (product_id IN (SELECT get_user_product_ids()));

-- =============================================
-- DONE! Policies have been fixed.
-- =============================================
