-- AI Store Builder - Complete Database Setup
-- Run this in Supabase Dashboard > SQL Editor
-- This creates all required tables, triggers, and policies

-- =============================================
-- 1. PROFILES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'seller' CHECK (role IN ('seller', 'admin', 'support')),
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_current_step INTEGER DEFAULT 0,
  preferences JSONB DEFAULT '{}',
  last_login_at TIMESTAMPTZ,
  login_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- =============================================
-- 2. STORES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  tagline TEXT,
  logo_url TEXT,
  blueprint JSONB DEFAULT '{}',
  brand_colors JSONB DEFAULT '{"primary": "#3B82F6", "secondary": "#6B7280"}',
  typography JSONB DEFAULT '{"heading_font": "Inter", "body_font": "Inter"}',
  theme_template TEXT DEFAULT 'modern-minimal',
  contact_email TEXT,
  contact_phone TEXT,
  whatsapp_number TEXT,
  instagram_handle TEXT,
  facebook_url TEXT,
  settings JSONB DEFAULT '{
    "checkout": {"guest_checkout_enabled": true, "phone_required": true},
    "shipping": {"free_shipping_threshold": 999, "flat_rate_national": 49, "cod_enabled": true, "cod_fee": 20},
    "payments": {"razorpay_enabled": true, "stripe_enabled": false, "upi_enabled": true}
  }',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'suspended')),
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Owners can manage own stores" ON stores;
DROP POLICY IF EXISTS "Anyone can view active stores" ON stores;
DROP POLICY IF EXISTS "Public can view active stores" ON stores;
DROP POLICY IF EXISTS "Owners can view own stores" ON stores;
DROP POLICY IF EXISTS "Owners can insert stores" ON stores;
DROP POLICY IF EXISTS "Authenticated users can create stores" ON stores;
DROP POLICY IF EXISTS "Owners can update own stores" ON stores;
DROP POLICY IF EXISTS "Owners can delete own stores" ON stores;

-- Policy for viewing stores: owners can see their own, anyone can see active stores
CREATE POLICY "Public can view active stores"
  ON stores FOR SELECT
  USING (status = 'active' OR auth.uid() = owner_id);

-- Policy for inserting stores: only authenticated users can create stores they own
CREATE POLICY "Authenticated users can create stores"
  ON stores FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Policy for updating stores: only owners can update their stores
CREATE POLICY "Owners can update own stores"
  ON stores FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Policy for deleting stores: only owners can delete their stores
CREATE POLICY "Owners can delete own stores"
  ON stores FOR DELETE
  USING (auth.uid() = owner_id);

DROP TRIGGER IF EXISTS stores_updated_at ON stores;
CREATE TRIGGER stores_updated_at
  BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_stores_owner_id ON stores(owner_id);
CREATE INDEX IF NOT EXISTS idx_stores_slug ON stores(slug);
CREATE INDEX IF NOT EXISTS idx_stores_status ON stores(status);

-- =============================================
-- 3. PRODUCTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  compare_at_price DECIMAL(10, 2),
  cost_per_item DECIMAL(10, 2),
  sku TEXT,
  barcode TEXT,
  quantity INTEGER DEFAULT 0,
  track_quantity BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  categories JSONB DEFAULT '[]',
  tags JSONB DEFAULT '[]',
  weight DECIMAL(10, 2),
  requires_shipping BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Store owners can manage products" ON products;
DROP POLICY IF EXISTS "Anyone can view published products" ON products;
DROP POLICY IF EXISTS "Public can view published products" ON products;
DROP POLICY IF EXISTS "Owners can manage products" ON products;
DROP POLICY IF EXISTS "Store owners can insert products" ON products;
DROP POLICY IF EXISTS "Store owners can update products" ON products;
DROP POLICY IF EXISTS "Store owners can delete products" ON products;

-- Policy for viewing products: published products in active stores, or owner's products
CREATE POLICY "Public can view published products"
  ON products FOR SELECT
  USING (
    (status = 'published' AND EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = products.store_id
      AND stores.status = 'active'
    ))
    OR
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = products.store_id
      AND stores.owner_id = auth.uid()
    )
  );

-- Policy for inserting products: only store owners
CREATE POLICY "Store owners can insert products"
  ON products FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = products.store_id
      AND stores.owner_id = auth.uid()
    )
  );

-- Policy for updating products: only store owners
CREATE POLICY "Store owners can update products"
  ON products FOR UPDATE
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

-- Policy for deleting products: only store owners
CREATE POLICY "Store owners can delete products"
  ON products FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = products.store_id
      AND stores.owner_id = auth.uid()
    )
  );

DROP TRIGGER IF EXISTS products_updated_at ON products;
CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

-- =============================================
-- 4. PRODUCT IMAGES TABLE
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

-- Drop existing policies
DROP POLICY IF EXISTS "Store owners can manage product images" ON product_images;
DROP POLICY IF EXISTS "Anyone can view product images" ON product_images;
DROP POLICY IF EXISTS "Public can view product images" ON product_images;
DROP POLICY IF EXISTS "Store owners can insert product images" ON product_images;
DROP POLICY IF EXISTS "Store owners can update product images" ON product_images;
DROP POLICY IF EXISTS "Store owners can delete product images" ON product_images;

-- Policy for viewing images: public for published products, or owner's products
CREATE POLICY "Public can view product images"
  ON product_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products
      JOIN stores ON stores.id = products.store_id
      WHERE products.id = product_images.product_id
      AND (
        (products.status = 'published' AND stores.status = 'active')
        OR stores.owner_id = auth.uid()
      )
    )
  );

-- Policy for inserting images: only store owners
CREATE POLICY "Store owners can insert product images"
  ON product_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products
      JOIN stores ON stores.id = products.store_id
      WHERE products.id = product_images.product_id
      AND stores.owner_id = auth.uid()
    )
  );

-- Policy for updating images: only store owners
CREATE POLICY "Store owners can update product images"
  ON product_images FOR UPDATE
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

-- Policy for deleting images: only store owners
CREATE POLICY "Store owners can delete product images"
  ON product_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM products
      JOIN stores ON stores.id = products.store_id
      WHERE products.id = product_images.product_id
      AND stores.owner_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);

-- =============================================
-- 5. STORAGE BUCKET FOR LOGOS
-- =============================================
-- Note: You may need to create the 'logos' bucket manually in Supabase Dashboard
-- Go to Storage > New Bucket > Name: logos > Public: true

-- If you have access to storage schema, uncomment below:
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('logos', 'logos', true)
-- ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 6. STORAGE BUCKETS
-- =============================================

-- IMPORTANT: Create these buckets manually in Supabase Dashboard FIRST:
-- 1. Go to Storage > New Bucket
-- 2. Create bucket named "logos" with Public: true
-- 3. Create bucket named "product-images" with Public: true

-- Then run these policies in the SQL Editor:

-- =============================================
-- STORAGE POLICIES FOR LOGOS BUCKET
-- =============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their logos" ON storage.objects;

-- Allow anyone to view logos
CREATE POLICY "Anyone can view logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');

-- Allow authenticated users to upload logos
CREATE POLICY "Authenticated users can upload logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'logos' AND
  auth.role() = 'authenticated'
);

-- Allow users to delete their own logos (based on path containing their user id)
CREATE POLICY "Users can delete their logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'logos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- =============================================
-- STORAGE POLICIES FOR PRODUCT-IMAGES BUCKET
-- =============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own product images" ON storage.objects;

-- Allow anyone to view product images
CREATE POLICY "Anyone can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Allow authenticated users to upload product images
CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' AND
  auth.role() = 'authenticated'
);

-- Allow authenticated users to update product images
CREATE POLICY "Users can update their own product images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-images' AND
  auth.role() = 'authenticated'
);

-- Allow authenticated users to delete product images
CREATE POLICY "Users can delete their own product images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-images' AND
  auth.role() = 'authenticated'
);

-- =============================================
-- DONE! Your database is now set up.
-- =============================================
--
-- CHECKLIST:
-- [ ] Create 'logos' bucket in Supabase Storage (public)
-- [ ] Create 'product-images' bucket in Supabase Storage (public)
-- [ ] Run this SQL file in Supabase SQL Editor
-- [ ] Set up environment variables in .env.local
-- =============================================
