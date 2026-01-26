-- Abandoned Cart Recovery System
-- Tracks cart contents and enables recovery email sequences

-- =============================================================================
-- ABANDONED CARTS TABLE
-- =============================================================================

-- Drop and recreate if table exists but is malformed (missing recovery_status column)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'abandoned_carts') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'abandoned_carts' AND column_name = 'recovery_status') THEN
      DROP TABLE abandoned_carts CASCADE;
    END IF;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS abandoned_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,

  -- Guest identification
  email VARCHAR(255),
  phone VARCHAR(20),

  -- Cart contents
  items JSONB NOT NULL DEFAULT '[]',
  -- Format: [{ product_id, variant_id, title, variant_title, price, quantity, image_url }]

  -- Cart totals
  subtotal DECIMAL(12, 2) DEFAULT 0,
  item_count INTEGER DEFAULT 0,

  -- Recovery tracking
  recovery_status VARCHAR(20) DEFAULT 'active', -- active, recovered, expired, unsubscribed
  recovery_emails_sent INTEGER DEFAULT 0,
  last_email_sent_at TIMESTAMPTZ,
  recovered_at TIMESTAMPTZ,
  recovered_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,

  -- Recovery token for secure cart restoration
  recovery_token VARCHAR(64) UNIQUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  abandoned_at TIMESTAMPTZ, -- Set when cart is marked as abandoned
  expires_at TIMESTAMPTZ -- When to stop recovery attempts
);

-- Unique constraint: one active cart per email per store (partial unique index)
DO $$
BEGIN
  DROP INDEX IF EXISTS idx_abandoned_carts_unique_active;
  CREATE UNIQUE INDEX idx_abandoned_carts_unique_active
  ON abandoned_carts(store_id, email)
  WHERE recovery_status = 'active' AND email IS NOT NULL;
END $$;

-- Indexes for efficient queries (only if table exists with proper columns)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'abandoned_carts' AND column_name = 'recovery_status') THEN
    CREATE INDEX IF NOT EXISTS idx_abandoned_carts_store ON abandoned_carts(store_id);
    CREATE INDEX IF NOT EXISTS idx_abandoned_carts_customer ON abandoned_carts(customer_id) WHERE customer_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_abandoned_carts_email ON abandoned_carts(email) WHERE email IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_abandoned_carts_status ON abandoned_carts(recovery_status);
    CREATE INDEX IF NOT EXISTS idx_abandoned_carts_recovery ON abandoned_carts(recovery_status, last_email_sent_at, abandoned_at)
      WHERE recovery_status = 'active';
    CREATE INDEX IF NOT EXISTS idx_abandoned_carts_token ON abandoned_carts(recovery_token) WHERE recovery_token IS NOT NULL;
  END IF;
END $$;

-- =============================================================================
-- CART RECOVERY EMAILS TABLE
-- =============================================================================
-- Track individual recovery emails sent

CREATE TABLE IF NOT EXISTS cart_recovery_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES abandoned_carts(id) ON DELETE CASCADE,
  sequence_number INTEGER NOT NULL, -- 1, 2, 3 for the email sequence
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,

  UNIQUE(cart_id, sequence_number)
);

CREATE INDEX IF NOT EXISTS idx_cart_recovery_emails_cart ON cart_recovery_emails(cart_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE abandoned_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_recovery_emails ENABLE ROW LEVEL SECURITY;

-- Store owners can manage abandoned carts
DROP POLICY IF EXISTS "Store owners can manage abandoned carts" ON abandoned_carts;
CREATE POLICY "Store owners can manage abandoned carts"
ON abandoned_carts FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM stores
    WHERE stores.id = abandoned_carts.store_id
    AND stores.owner_id = auth.uid()
  )
);

-- Customers can view their own carts
DROP POLICY IF EXISTS "Customers can view own carts" ON abandoned_carts;
CREATE POLICY "Customers can view own carts"
ON abandoned_carts FOR SELECT
TO authenticated
USING (
  customer_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM customers
    WHERE customers.id = abandoned_carts.customer_id
    AND customers.user_id = auth.uid()
  )
);

-- Store owners can view recovery emails
DROP POLICY IF EXISTS "Store owners can view recovery emails" ON cart_recovery_emails;
CREATE POLICY "Store owners can view recovery emails"
ON cart_recovery_emails FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM abandoned_carts ac
    JOIN stores s ON s.id = ac.store_id
    WHERE ac.id = cart_recovery_emails.cart_id
    AND s.owner_id = auth.uid()
  )
);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Generate secure recovery token
CREATE OR REPLACE FUNCTION generate_recovery_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.recovery_token IS NULL THEN
    NEW.recovery_token = encode(gen_random_bytes(32), 'hex');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_recovery_token ON abandoned_carts;
CREATE TRIGGER trigger_generate_recovery_token
BEFORE INSERT ON abandoned_carts
FOR EACH ROW
EXECUTE FUNCTION generate_recovery_token();

-- Update abandoned_at timestamp
CREATE OR REPLACE FUNCTION mark_cart_abandoned()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark as abandoned after 1 hour of inactivity
  IF NEW.updated_at < NOW() - INTERVAL '1 hour' AND NEW.abandoned_at IS NULL THEN
    NEW.abandoned_at = NEW.updated_at + INTERVAL '1 hour';
    NEW.expires_at = NEW.abandoned_at + INTERVAL '7 days'; -- Stop after 7 days
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- STORE SETTINGS UPDATE
-- =============================================================================
-- Add abandoned cart settings to stores table

ALTER TABLE stores
ADD COLUMN IF NOT EXISTS cart_recovery_settings JSONB DEFAULT '{
  "enabled": true,
  "email_sequence": [
    {"delay_hours": 1, "subject": "You left something behind!"},
    {"delay_hours": 24, "subject": "Your cart is waiting for you"},
    {"delay_hours": 72, "subject": "Last chance to complete your order"}
  ],
  "discount_code": null,
  "discount_percentage": null
}';
