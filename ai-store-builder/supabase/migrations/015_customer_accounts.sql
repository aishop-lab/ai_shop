-- Customer Accounts System
-- Enables customer registration, order history, saved addresses, and wishlists

-- =============================================================================
-- CUSTOMERS TABLE
-- =============================================================================
-- Store-specific customer accounts (a customer can have accounts at multiple stores)

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Optional: link to Supabase auth
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  full_name VARCHAR(255),
  password_hash VARCHAR(255), -- For store-specific auth (alternative to Supabase auth)
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}',
  marketing_consent BOOLEAN DEFAULT FALSE,
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(12, 2) DEFAULT 0,
  last_order_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(store_id, email)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customers_store_id ON customers(store_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id) WHERE user_id IS NOT NULL;

-- =============================================================================
-- CUSTOMER ADDRESSES TABLE
-- =============================================================================
-- Saved shipping addresses for customers

CREATE TABLE IF NOT EXISTS customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label VARCHAR(50) DEFAULT 'Home', -- Home, Work, Other
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  pincode VARCHAR(10) NOT NULL,
  country VARCHAR(100) DEFAULT 'India',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_id ON customer_addresses(customer_id);

-- Ensure only one default address per customer
DROP INDEX IF EXISTS idx_customer_addresses_default;
CREATE UNIQUE INDEX idx_customer_addresses_default
ON customer_addresses(customer_id)
WHERE is_default = TRUE;

-- =============================================================================
-- WISHLISTS TABLE
-- =============================================================================
-- Customer product wishlists/favorites

DO $$
BEGIN
  -- Only proceed if products table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN

    -- Drop and recreate if table exists but is malformed
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wishlists') THEN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wishlists' AND column_name = 'product_id') THEN
        DROP TABLE wishlists CASCADE;
      END IF;
    END IF;

    -- Create table if not exists
    CREATE TABLE IF NOT EXISTS wishlists (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(customer_id, product_id)
    );

  END IF;
END $$;

-- Indexes (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wishlists') THEN
    CREATE INDEX IF NOT EXISTS idx_wishlists_customer_id ON wishlists(customer_id);
    CREATE INDEX IF NOT EXISTS idx_wishlists_product_id ON wishlists(product_id);
  END IF;
END $$;

-- =============================================================================
-- CUSTOMER SESSIONS TABLE
-- =============================================================================
-- For store-specific customer auth (optional, alternative to Supabase auth)

CREATE TABLE IF NOT EXISTS customer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  device_info JSONB,
  ip_address INET,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for session lookups
CREATE INDEX IF NOT EXISTS idx_customer_sessions_token ON customer_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_customer_id ON customer_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_expires ON customer_sessions(expires_at);

-- Index for finding expired sessions (used by cleanup job)
-- Note: We don't use a partial index with NOW() as it's not immutable
-- The cleanup function will query: WHERE expires_at < NOW()

-- =============================================================================
-- UPDATE ORDERS TABLE
-- =============================================================================
-- Add customer_id to orders for account linking

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

-- Index for customer order history
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id) WHERE customer_id IS NOT NULL;

-- =============================================================================
-- NOTIFICATIONS TABLE (if not exists)
-- =============================================================================
-- Store notifications for merchants (orders, low stock, etc.)

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'new_order', 'low_stock', 'review', etc.
  title VARCHAR(255) NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add 'read' column if table exists but column doesn't
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'read') THEN
      ALTER TABLE notifications ADD COLUMN read BOOLEAN DEFAULT FALSE;
    END IF;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_store_id ON notifications(store_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- Create unread index only if 'read' column exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'read') THEN
    CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(store_id, read) WHERE read = FALSE;
  END IF;
END $$;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Enable RLS on wishlists if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wishlists') THEN
    ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Customers: Store owners can manage customers, customers can view/update own profile
DROP POLICY IF EXISTS "Store owners can manage customers" ON customers;
CREATE POLICY "Store owners can manage customers"
ON customers FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM stores
    WHERE stores.id = customers.store_id
    AND stores.owner_id = auth.uid()
  )
);

-- Customers can view and update their own record
DROP POLICY IF EXISTS "Customers can view own profile" ON customers;
CREATE POLICY "Customers can view own profile"
ON customers FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Customers can update own profile" ON customers;
CREATE POLICY "Customers can update own profile"
ON customers FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Customer Addresses: Store owners and customers
DROP POLICY IF EXISTS "Store owners can view customer addresses" ON customer_addresses;
CREATE POLICY "Store owners can view customer addresses"
ON customer_addresses FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM customers c
    JOIN stores s ON s.id = c.store_id
    WHERE c.id = customer_addresses.customer_id
    AND s.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Customers can manage own addresses" ON customer_addresses;
CREATE POLICY "Customers can manage own addresses"
ON customer_addresses FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM customers
    WHERE customers.id = customer_addresses.customer_id
    AND customers.user_id = auth.uid()
  )
);

-- Wishlists: Customers manage own (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wishlists') THEN
    DROP POLICY IF EXISTS "Customers can manage own wishlist" ON wishlists;
    CREATE POLICY "Customers can manage own wishlist"
    ON wishlists FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM customers
        WHERE customers.id = wishlists.customer_id
        AND customers.user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Customer Sessions: Customers and store owners
DROP POLICY IF EXISTS "Customers can manage own sessions" ON customer_sessions;
CREATE POLICY "Customers can manage own sessions"
ON customer_sessions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM customers
    WHERE customers.id = customer_sessions.customer_id
    AND customers.user_id = auth.uid()
  )
);

-- Notifications: Store owners only
DROP POLICY IF EXISTS "Store owners can manage notifications" ON notifications;
CREATE POLICY "Store owners can manage notifications"
ON notifications FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM stores
    WHERE stores.id = notifications.store_id
    AND stores.owner_id = auth.uid()
  )
  OR user_id = auth.uid()
);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Update customer stats on order completion
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_id IS NOT NULL AND NEW.payment_status = 'paid' THEN
    UPDATE customers
    SET
      total_orders = total_orders + 1,
      total_spent = total_spent + NEW.total_amount,
      last_order_at = NOW(),
      updated_at = NOW()
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for customer stats
DROP TRIGGER IF EXISTS trigger_update_customer_stats ON orders;
CREATE TRIGGER trigger_update_customer_stats
AFTER INSERT OR UPDATE OF payment_status ON orders
FOR EACH ROW
WHEN (NEW.payment_status = 'paid')
EXECUTE FUNCTION update_customer_stats();

-- Auto-clear default flag when setting new default address
CREATE OR REPLACE FUNCTION manage_default_address()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = TRUE THEN
    UPDATE customer_addresses
    SET is_default = FALSE, updated_at = NOW()
    WHERE customer_id = NEW.customer_id
    AND id != NEW.id
    AND is_default = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_manage_default_address ON customer_addresses;
CREATE TRIGGER trigger_manage_default_address
BEFORE INSERT OR UPDATE OF is_default ON customer_addresses
FOR EACH ROW
WHEN (NEW.is_default = TRUE)
EXECUTE FUNCTION manage_default_address();

-- Cleanup expired customer sessions (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_customer_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM customer_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Fast customer lookup by store and email
CREATE INDEX IF NOT EXISTS idx_customers_store_email ON customers(store_id, email);

-- Fast order history lookup
CREATE INDEX IF NOT EXISTS idx_orders_customer_created ON orders(customer_id, created_at DESC)
WHERE customer_id IS NOT NULL;
