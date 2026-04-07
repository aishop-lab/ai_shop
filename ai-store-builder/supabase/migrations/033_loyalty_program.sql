-- Loyalty Program Infrastructure
-- Creates 3 tables: loyalty_programs, loyalty_points, loyalty_transactions
-- Provides points-based rewards system per store

-- =============================================================================
-- LOYALTY_PROGRAMS TABLE (One per store)
-- =============================================================================
-- Stores the loyalty program configuration for each store

CREATE TABLE IF NOT EXISTS loyalty_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  points_per_currency_unit NUMERIC(10,2) NOT NULL DEFAULT 1.0,
  min_redemption_points INTEGER NOT NULL DEFAULT 100,
  redemption_value_per_point NUMERIC(10,4) NOT NULL DEFAULT 0.25,
  tiers JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(store_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_loyalty_programs_store_id ON loyalty_programs(store_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_programs_active ON loyalty_programs(is_active) WHERE is_active = true;

-- Trigger
DROP TRIGGER IF EXISTS trigger_loyalty_programs_updated_at ON loyalty_programs;
CREATE TRIGGER trigger_loyalty_programs_updated_at
BEFORE UPDATE ON loyalty_programs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- LOYALTY_POINTS TABLE (Customer balances)
-- =============================================================================
-- Tracks each customer's point balance, lifetime stats, and current tier

CREATE TABLE IF NOT EXISTS loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
  lifetime_earned INTEGER NOT NULL DEFAULT 0,
  lifetime_redeemed INTEGER NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT 'base',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(store_id, customer_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_loyalty_points_store_id ON loyalty_points(store_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_customer_id ON loyalty_points(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_store_customer ON loyalty_points(store_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_tier ON loyalty_points(store_id, tier);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_balance ON loyalty_points(store_id, balance DESC);

-- Trigger
DROP TRIGGER IF EXISTS trigger_loyalty_points_updated_at ON loyalty_points;
CREATE TRIGGER trigger_loyalty_points_updated_at
BEFORE UPDATE ON loyalty_points
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- LOYALTY_TRANSACTIONS TABLE (Point history)
-- =============================================================================
-- Audit log of every point earn, redeem, bonus, expiry, and adjustment

CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('earn', 'redeem', 'bonus', 'expire', 'adjust')),
  points INTEGER NOT NULL,
  description TEXT,
  reference_id TEXT,
  reference_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_store_id ON loyalty_transactions(store_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_customer_id ON loyalty_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_store_customer ON loyalty_transactions(store_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_type ON loyalty_transactions(store_id, type);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_reference ON loyalty_transactions(reference_id) WHERE reference_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_created_at ON loyalty_transactions(store_id, created_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE loyalty_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- loyalty_programs policies (store owners can manage, anyone can view active)
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Anyone can view active loyalty programs" ON loyalty_programs;
CREATE POLICY "Anyone can view active loyalty programs"
ON loyalty_programs FOR SELECT
TO authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "Merchants can view own loyalty program" ON loyalty_programs;
CREATE POLICY "Merchants can view own loyalty program"
ON loyalty_programs FOR SELECT
TO authenticated
USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Merchants can insert own loyalty program" ON loyalty_programs;
CREATE POLICY "Merchants can insert own loyalty program"
ON loyalty_programs FOR INSERT
TO authenticated
WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Merchants can update own loyalty program" ON loyalty_programs;
CREATE POLICY "Merchants can update own loyalty program"
ON loyalty_programs FOR UPDATE
TO authenticated
USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()))
WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Merchants can delete own loyalty program" ON loyalty_programs;
CREATE POLICY "Merchants can delete own loyalty program"
ON loyalty_programs FOR DELETE
TO authenticated
USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

-- -----------------------------------------------------------------------------
-- loyalty_points policies (store owners can manage, customers can view own)
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Merchants can manage loyalty points" ON loyalty_points;
CREATE POLICY "Merchants can manage loyalty points"
ON loyalty_points FOR ALL
TO authenticated
USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()))
WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Customers can view own loyalty points" ON loyalty_points;
CREATE POLICY "Customers can view own loyalty points"
ON loyalty_points FOR SELECT
TO authenticated
USING (customer_id IN (SELECT id FROM customers WHERE email = auth.email()));

-- -----------------------------------------------------------------------------
-- loyalty_transactions policies (store owners can manage, customers can view own)
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Merchants can manage loyalty transactions" ON loyalty_transactions;
CREATE POLICY "Merchants can manage loyalty transactions"
ON loyalty_transactions FOR ALL
TO authenticated
USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()))
WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Customers can view own loyalty transactions" ON loyalty_transactions;
CREATE POLICY "Customers can view own loyalty transactions"
ON loyalty_transactions FOR SELECT
TO authenticated
USING (customer_id IN (SELECT id FROM customers WHERE email = auth.email()));

-- -----------------------------------------------------------------------------
-- Service role bypass for agent operations (getSupabaseAdmin uses service_role)
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Service role full access to loyalty_programs" ON loyalty_programs;
CREATE POLICY "Service role full access to loyalty_programs"
ON loyalty_programs FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access to loyalty_points" ON loyalty_points;
CREATE POLICY "Service role full access to loyalty_points"
ON loyalty_points FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access to loyalty_transactions" ON loyalty_transactions;
CREATE POLICY "Service role full access to loyalty_transactions"
ON loyalty_transactions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- Atomic point increment function (avoids TOCTOU race conditions)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION increment_loyalty_points(
  p_store_id UUID,
  p_customer_id UUID,
  p_points INTEGER
) RETURNS void AS $$
BEGIN
  INSERT INTO loyalty_points (store_id, customer_id, balance, lifetime_earned, lifetime_redeemed, tier)
  VALUES (p_store_id, p_customer_id, p_points, p_points, 0, 'base')
  ON CONFLICT (store_id, customer_id)
  DO UPDATE SET
    balance = loyalty_points.balance + p_points,
    lifetime_earned = loyalty_points.lifetime_earned + p_points,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
