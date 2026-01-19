-- Stores Table Migration
-- Main table for e-commerce stores created through onboarding

-- Create stores table
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Identity
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  tagline TEXT,
  logo_url TEXT,

  -- Blueprint (complete store configuration)
  blueprint JSONB DEFAULT '{}',

  -- Branding (denormalized from blueprint for quick access)
  brand_colors JSONB DEFAULT '{"primary": "#3B82F6", "secondary": "#6B7280"}',
  typography JSONB DEFAULT '{"heading_font": "Inter", "body_font": "Inter"}',
  theme_template TEXT DEFAULT 'modern-minimal',

  -- Contact
  contact_email TEXT,
  contact_phone TEXT,
  whatsapp_number TEXT,
  instagram_handle TEXT,
  facebook_url TEXT,

  -- Settings (checkout, shipping, payments)
  settings JSONB DEFAULT '{
    "checkout": {"guest_checkout_enabled": true, "phone_required": true},
    "shipping": {"free_shipping_threshold": 999, "flat_rate_national": 49, "cod_enabled": true, "cod_fee": 20},
    "payments": {"razorpay_enabled": true, "stripe_enabled": false, "upi_enabled": true}
  }',

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'suspended')),
  activated_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Owners can do everything with their own stores
CREATE POLICY "Owners can manage own stores"
  ON stores FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Anyone can view active stores (for public store frontends)
CREATE POLICY "Anyone can view active stores"
  ON stores FOR SELECT
  USING (status = 'active');

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS stores_updated_at ON stores;
CREATE TRIGGER stores_updated_at
  BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stores_owner_id ON stores(owner_id);
CREATE INDEX IF NOT EXISTS idx_stores_slug ON stores(slug);
CREATE INDEX IF NOT EXISTS idx_stores_status ON stores(status);

-- Partial index for active stores (most common query)
CREATE INDEX IF NOT EXISTS idx_stores_slug_active
  ON stores(slug)
  WHERE status = 'active';
