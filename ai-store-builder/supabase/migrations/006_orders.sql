-- Migration: 006_orders
-- Description: Create orders, order_items, refunds, and inventory_reservations tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ORDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,

  -- Customer details
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20),

  -- Shipping address (stored as JSON)
  shipping_address JSONB NOT NULL,

  -- Pricing
  subtotal DECIMAL(10,2) NOT NULL,
  shipping_cost DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,

  -- Payment details
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('razorpay', 'cod')),
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  razorpay_order_id VARCHAR(100),
  razorpay_payment_id VARCHAR(100),
  payment_error TEXT,

  -- Order status
  order_status VARCHAR(20) DEFAULT 'pending' CHECK (order_status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),

  -- Tracking information
  tracking_number VARCHAR(100),
  courier_name VARCHAR(100),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

-- ============================================
-- ORDER ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),

  -- Product snapshot (at time of order)
  product_title VARCHAR(500) NOT NULL,
  product_image TEXT,

  -- Pricing and quantity
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- REFUNDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  razorpay_refund_id VARCHAR(100),
  amount DECIMAL(10,2) NOT NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- ============================================
-- INVENTORY RESERVATIONS TABLE
-- (Prevents overselling during checkout)
-- ============================================
CREATE TABLE IF NOT EXISTS inventory_reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- ============================================
-- INDEXES
-- ============================================

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_order_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order_id ON orders(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_payment_id ON orders(razorpay_payment_id);

-- Order items indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- Refunds indexes
CREATE INDEX IF NOT EXISTS idx_refunds_order_id ON refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_razorpay_refund_id ON refunds(razorpay_refund_id);

-- Inventory reservations indexes
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_order_id ON inventory_reservations(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_product_id ON inventory_reservations(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_expires ON inventory_reservations(expires_at);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_reservations ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's store ID
CREATE OR REPLACE FUNCTION get_user_store_id()
RETURNS UUID AS $$
  SELECT id FROM stores WHERE owner_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER;

-- ============================================
-- ORDERS RLS POLICIES
-- ============================================

-- Store owners can view their orders
CREATE POLICY "Store owners can view their orders"
  ON orders FOR SELECT
  USING (store_id = get_user_store_id());

-- Store owners can update their orders (status changes)
CREATE POLICY "Store owners can update their orders"
  ON orders FOR UPDATE
  USING (store_id = get_user_store_id());

-- Service role can insert orders (for API)
CREATE POLICY "Service role can insert orders"
  ON orders FOR INSERT
  WITH CHECK (true);

-- ============================================
-- ORDER ITEMS RLS POLICIES
-- ============================================

-- Store owners can view their order items
CREATE POLICY "Store owners can view their order items"
  ON order_items FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM orders WHERE store_id = get_user_store_id()
    )
  );

-- Service role can insert order items
CREATE POLICY "Service role can insert order items"
  ON order_items FOR INSERT
  WITH CHECK (true);

-- ============================================
-- REFUNDS RLS POLICIES
-- ============================================

-- Store owners can view their refunds
CREATE POLICY "Store owners can view their refunds"
  ON refunds FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM orders WHERE store_id = get_user_store_id()
    )
  );

-- Store owners can create refunds
CREATE POLICY "Store owners can create refunds"
  ON refunds FOR INSERT
  WITH CHECK (
    order_id IN (
      SELECT id FROM orders WHERE store_id = get_user_store_id()
    )
  );

-- Service role can update refunds (for webhooks)
CREATE POLICY "Service role can update refunds"
  ON refunds FOR UPDATE
  WITH CHECK (true);

-- ============================================
-- INVENTORY RESERVATIONS RLS POLICIES
-- ============================================

-- Service role can manage inventory reservations
CREATE POLICY "Service role can manage inventory reservations"
  ON inventory_reservations FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to clean up expired inventory reservations
CREATE OR REPLACE FUNCTION cleanup_expired_reservations()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM inventory_reservations
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get order statistics for dashboard
CREATE OR REPLACE FUNCTION get_order_stats(p_store_id UUID)
RETURNS TABLE (
  total_orders BIGINT,
  total_revenue DECIMAL,
  pending_orders BIGINT,
  confirmed_orders BIGINT,
  shipped_orders BIGINT,
  delivered_orders BIGINT,
  cancelled_orders BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_orders,
    COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0)::DECIMAL as total_revenue,
    COUNT(*) FILTER (WHERE order_status = 'pending')::BIGINT as pending_orders,
    COUNT(*) FILTER (WHERE order_status = 'confirmed')::BIGINT as confirmed_orders,
    COUNT(*) FILTER (WHERE order_status = 'shipped')::BIGINT as shipped_orders,
    COUNT(*) FILTER (WHERE order_status = 'delivered')::BIGINT as delivered_orders,
    COUNT(*) FILTER (WHERE order_status = 'cancelled')::BIGINT as cancelled_orders
  FROM orders
  WHERE store_id = p_store_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger to update order timestamps
CREATE OR REPLACE FUNCTION update_order_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- Update shipped_at when status changes to 'shipped'
  IF NEW.order_status = 'shipped' AND OLD.order_status != 'shipped' THEN
    NEW.shipped_at = NOW();
  END IF;

  -- Update delivered_at when status changes to 'delivered'
  IF NEW.order_status = 'delivered' AND OLD.order_status != 'delivered' THEN
    NEW.delivered_at = NOW();
  END IF;

  -- Update cancelled_at when status changes to 'cancelled'
  IF NEW.order_status = 'cancelled' AND OLD.order_status != 'cancelled' THEN
    NEW.cancelled_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_order_timestamps
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_order_timestamps();
