-- =============================================
-- Migration: Discount & Coupon System
-- =============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. COUPONS TABLE
-- =============================================
-- Stores all discount coupons created by sellers

CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  
  -- Coupon details
  code VARCHAR(50) NOT NULL,
  description TEXT,
  
  -- Discount type: 'percentage', 'fixed_amount', 'free_shipping'
  discount_type VARCHAR(20) NOT NULL,
  discount_value DECIMAL(10, 2) NOT NULL,
  
  -- Conditions
  minimum_order_value DECIMAL(10, 2),
  maximum_discount_amount DECIMAL(10, 2),
  
  -- Product/Category restrictions (for Phase 2)
  applicable_products UUID[],
  applicable_categories TEXT[],
  
  -- Usage limits
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  usage_limit_per_customer INTEGER DEFAULT 1,
  
  -- Date restrictions
  starts_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Status
  active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_coupon_code UNIQUE (store_id, code),
  CONSTRAINT valid_discount_value CHECK (discount_value > 0),
  CONSTRAINT valid_discount_type CHECK (
    discount_type IN ('percentage', 'fixed_amount', 'free_shipping')
  ),
  CONSTRAINT valid_percentage CHECK (
    (discount_type != 'percentage') OR (discount_value <= 100)
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_coupons_store_id ON coupons(store_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(active);
CREATE INDEX IF NOT EXISTS idx_coupons_expires_at ON coupons(expires_at);

-- =============================================
-- 2. COUPON USAGE TABLE
-- =============================================
-- Tracks every time a coupon is used in an order

CREATE TABLE IF NOT EXISTS coupon_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  customer_email VARCHAR(255) NOT NULL,
  discount_amount DECIMAL(10, 2) NOT NULL,
  
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate usage per order
  CONSTRAINT unique_coupon_order UNIQUE (coupon_id, order_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon_id ON coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_customer_email ON coupon_usage(customer_email);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_order_id ON coupon_usage(order_id);

-- =============================================
-- 3. UPDATE ORDERS TABLE
-- =============================================
-- Add coupon-related columns to orders

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES coupons(id),
ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2) DEFAULT 0;

-- Index for finding orders with coupons
CREATE INDEX IF NOT EXISTS idx_orders_coupon_id ON orders(coupon_id);

-- =============================================
-- 4. RPC FUNCTION: INCREMENT COUPON USAGE
-- =============================================
-- Atomic function to increment usage count

CREATE OR REPLACE FUNCTION increment_coupon_usage(coupon_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE coupons
  SET 
    usage_count = usage_count + 1,
    updated_at = NOW()
  WHERE id = coupon_uuid;
END;
$$;

-- =============================================
-- 5. UPDATED_AT TRIGGER
-- =============================================
-- Auto-update the updated_at column

CREATE OR REPLACE FUNCTION update_coupon_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_coupon_updated_at ON coupons;
CREATE TRIGGER trigger_coupon_updated_at
  BEFORE UPDATE ON coupons
  FOR EACH ROW
  EXECUTE FUNCTION update_coupon_updated_at();

-- =============================================
-- 6. ROW LEVEL SECURITY
-- =============================================

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;

-- Coupons: Store owners can manage their coupons
CREATE POLICY "Store owners can manage coupons"
  ON coupons
  FOR ALL
  USING (
    store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()
    )
  );

-- Coupons: Public can read active coupons for validation
CREATE POLICY "Public can read active coupons"
  ON coupons
  FOR SELECT
  USING (active = true);

-- Coupon usage: Store owners can view usage
CREATE POLICY "Store owners can view coupon usage"
  ON coupon_usage
  FOR SELECT
  USING (
    coupon_id IN (
      SELECT c.id FROM coupons c
      JOIN stores s ON c.store_id = s.id
      WHERE s.owner_id = auth.uid()
    )
  );

-- Coupon usage: System can insert (for order creation)
CREATE POLICY "System can insert coupon usage"
  ON coupon_usage
  FOR INSERT
  WITH CHECK (true);

-- =============================================
-- 7. HELPER VIEW: COUPON STATS
-- =============================================

CREATE OR REPLACE VIEW coupon_stats AS
SELECT 
  c.id,
  c.store_id,
  c.code,
  c.discount_type,
  c.discount_value,
  c.usage_count,
  c.usage_limit,
  c.active,
  c.expires_at,
  COALESCE(SUM(cu.discount_amount), 0) as total_discount_given,
  COUNT(DISTINCT cu.order_id) as orders_with_coupon
FROM coupons c
LEFT JOIN coupon_usage cu ON c.id = cu.coupon_id
GROUP BY c.id;

COMMENT ON TABLE coupons IS 'Discount coupons created by sellers';
COMMENT ON TABLE coupon_usage IS 'Tracks coupon usage per order';
COMMENT ON FUNCTION increment_coupon_usage IS 'Atomically increments coupon usage count';
