-- Billing & Subscriptions Infrastructure
-- Creates 3 tables: subscription_tiers, merchant_subscriptions, subscription_usage
-- Adds subscription_tier column to stores table

-- =============================================================================
-- SUBSCRIPTION_TIERS TABLE (Reference Data)
-- =============================================================================
-- Defines the available subscription plans with pricing and limits

CREATE TABLE IF NOT EXISTS subscription_tiers (
  id TEXT PRIMARY KEY, -- 'free', 'pro', 'business'
  name TEXT NOT NULL,
  price_monthly_inr INTEGER NOT NULL DEFAULT 0, -- price in paisa
  price_monthly_usd INTEGER NOT NULL DEFAULT 0, -- price in cents
  stripe_price_id_inr TEXT, -- Stripe price ID for INR
  stripe_price_id_usd TEXT, -- Stripe price ID for USD
  max_products INTEGER, -- NULL = unlimited
  max_agent_actions_per_day INTEGER, -- NULL = unlimited
  llm_budget_usd NUMERIC(10,2) NOT NULL DEFAULT 2.00, -- monthly LLM budget
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default tiers
INSERT INTO subscription_tiers (id, name, price_monthly_inr, price_monthly_usd, max_products, max_agent_actions_per_day, llm_budget_usd, features) VALUES
('free', 'Free', 0, 0, 50, 5, 2.00, '["website_chat", "basic_analytics", "seo_optimization", "5_agent_actions_per_day"]'::jsonb),
('pro', 'Pro', 299900, 3900, NULL, NULL, 20.00, '["unlimited_products", "unlimited_agent_actions", "email_whatsapp_support", "advanced_analytics", "reports", "priority_execution"]'::jsonb),
('business', 'Business', 999900, 12900, NULL, NULL, 100.00, '["everything_in_pro", "meta_google_ads", "custom_agent_config", "dedicated_support", "api_access"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Trigger
DROP TRIGGER IF EXISTS trigger_subscription_tiers_updated_at ON subscription_tiers;
CREATE TRIGGER trigger_subscription_tiers_updated_at
BEFORE UPDATE ON subscription_tiers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- MERCHANT_SUBSCRIPTIONS TABLE
-- =============================================================================
-- Tracks each store's active subscription, Stripe IDs, and billing period

CREATE TABLE IF NOT EXISTS merchant_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier_id TEXT NOT NULL REFERENCES subscription_tiers(id) DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'trialing')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_merchant_subscriptions_store_id ON merchant_subscriptions(store_id);
CREATE INDEX IF NOT EXISTS idx_merchant_subscriptions_user_id ON merchant_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_merchant_subscriptions_tier_id ON merchant_subscriptions(tier_id);
CREATE INDEX IF NOT EXISTS idx_merchant_subscriptions_status ON merchant_subscriptions(status) WHERE status != 'active';
CREATE INDEX IF NOT EXISTS idx_merchant_subscriptions_stripe_customer ON merchant_subscriptions(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_merchant_subscriptions_stripe_sub ON merchant_subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- Trigger
DROP TRIGGER IF EXISTS trigger_merchant_subscriptions_updated_at ON merchant_subscriptions;
CREATE TRIGGER trigger_merchant_subscriptions_updated_at
BEFORE UPDATE ON merchant_subscriptions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- SUBSCRIPTION_USAGE TABLE (Daily Usage Tracking)
-- =============================================================================
-- Tracks daily agent action counts and LLM token/cost usage per store

CREATE TABLE IF NOT EXISTS subscription_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  agent_actions_count INTEGER NOT NULL DEFAULT 0,
  llm_tokens_input BIGINT NOT NULL DEFAULT 0,
  llm_tokens_output BIGINT NOT NULL DEFAULT 0,
  llm_cost_usd NUMERIC(10,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscription_usage_store_id ON subscription_usage(store_id);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_date ON subscription_usage(store_id, date DESC);

-- Trigger
DROP TRIGGER IF EXISTS trigger_subscription_usage_updated_at ON subscription_usage;
CREATE TRIGGER trigger_subscription_usage_updated_at
BEFORE UPDATE ON subscription_usage
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ADD SUBSCRIPTION_TIER COLUMN TO STORES TABLE
-- =============================================================================

ALTER TABLE stores ADD COLUMN IF NOT EXISTS subscription_tier TEXT NOT NULL DEFAULT 'free' REFERENCES subscription_tiers(id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_usage ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- subscription_tiers policies (readable by all authenticated users)
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Anyone can view active subscription tiers" ON subscription_tiers;
CREATE POLICY "Anyone can view active subscription tiers"
ON subscription_tiers FOR SELECT
TO authenticated
USING (is_active = true);

-- -----------------------------------------------------------------------------
-- merchant_subscriptions policies
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Merchants can view own subscription" ON merchant_subscriptions;
CREATE POLICY "Merchants can view own subscription"
ON merchant_subscriptions FOR SELECT
TO authenticated
USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Merchants can insert own subscription" ON merchant_subscriptions;
CREATE POLICY "Merchants can insert own subscription"
ON merchant_subscriptions FOR INSERT
TO authenticated
WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Merchants can update own subscription" ON merchant_subscriptions;
CREATE POLICY "Merchants can update own subscription"
ON merchant_subscriptions FOR UPDATE
TO authenticated
USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()))
WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

-- -----------------------------------------------------------------------------
-- subscription_usage policies
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Merchants can view own usage" ON subscription_usage;
CREATE POLICY "Merchants can view own usage"
ON subscription_usage FOR SELECT
TO authenticated
USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Merchants can insert own usage" ON subscription_usage;
CREATE POLICY "Merchants can insert own usage"
ON subscription_usage FOR INSERT
TO authenticated
WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Merchants can update own usage" ON subscription_usage;
CREATE POLICY "Merchants can update own usage"
ON subscription_usage FOR UPDATE
TO authenticated
USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()))
WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));
