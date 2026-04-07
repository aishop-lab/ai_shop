-- Influencer Management
-- Creates 2 tables for the influencer finder sub-agent:
-- influencers, influencer_outreach

-- =============================================================================
-- INFLUENCERS TABLE
-- =============================================================================
-- Real influencer contacts saved per store for outreach & partnership tracking

CREATE TABLE IF NOT EXISTS influencers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  handle TEXT NOT NULL,
  name TEXT,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'youtube', 'tiktok', 'twitter', 'facebook', 'other')),
  tier TEXT CHECK (tier IN ('nano', 'micro', 'macro', 'mega')),
  niche TEXT,
  followers_count INTEGER,
  engagement_rate NUMERIC(5,2),
  email TEXT,
  phone TEXT,
  profile_url TEXT,
  audience_fit_score INTEGER CHECK (audience_fit_score BETWEEN 0 AND 100),
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'prospect' CHECK (status IN ('prospect', 'contacted', 'negotiating', 'active', 'declined', 'inactive')),
  last_contacted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(store_id, platform, handle)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_influencers_store_id ON influencers(store_id);
CREATE INDEX IF NOT EXISTS idx_influencers_status ON influencers(store_id, status);
CREATE INDEX IF NOT EXISTS idx_influencers_platform ON influencers(store_id, platform);
CREATE INDEX IF NOT EXISTS idx_influencers_niche ON influencers(store_id, niche) WHERE niche IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_influencers_tier ON influencers(store_id, tier) WHERE tier IS NOT NULL;

-- Trigger
DROP TRIGGER IF EXISTS trigger_influencers_updated_at ON influencers;
CREATE TRIGGER trigger_influencers_updated_at
BEFORE UPDATE ON influencers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- INFLUENCER_OUTREACH TABLE
-- =============================================================================
-- Tracks outreach messages (drafts, sent, replied) per influencer

CREATE TABLE IF NOT EXISTS influencer_outreach (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  influencer_id UUID NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'dm', 'whatsapp', 'other')),
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'replied', 'no_reply')),
  sent_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_influencer_outreach_store_id ON influencer_outreach(store_id);
CREATE INDEX IF NOT EXISTS idx_influencer_outreach_influencer ON influencer_outreach(influencer_id);
CREATE INDEX IF NOT EXISTS idx_influencer_outreach_status ON influencer_outreach(store_id, status);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE influencers ENABLE ROW LEVEL SECURITY;
ALTER TABLE influencer_outreach ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- influencers policies
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Merchants can view own influencers" ON influencers;
CREATE POLICY "Merchants can view own influencers"
ON influencers FOR SELECT
TO authenticated
USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Merchants can insert own influencers" ON influencers;
CREATE POLICY "Merchants can insert own influencers"
ON influencers FOR INSERT
TO authenticated
WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Merchants can update own influencers" ON influencers;
CREATE POLICY "Merchants can update own influencers"
ON influencers FOR UPDATE
TO authenticated
USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()))
WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Merchants can delete own influencers" ON influencers;
CREATE POLICY "Merchants can delete own influencers"
ON influencers FOR DELETE
TO authenticated
USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

-- Service role bypass for agent operations
DROP POLICY IF EXISTS "Service role full access to influencers" ON influencers;
CREATE POLICY "Service role full access to influencers"
ON influencers FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- influencer_outreach policies
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Merchants can view own outreach" ON influencer_outreach;
CREATE POLICY "Merchants can view own outreach"
ON influencer_outreach FOR SELECT
TO authenticated
USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Merchants can insert own outreach" ON influencer_outreach;
CREATE POLICY "Merchants can insert own outreach"
ON influencer_outreach FOR INSERT
TO authenticated
WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Merchants can update own outreach" ON influencer_outreach;
CREATE POLICY "Merchants can update own outreach"
ON influencer_outreach FOR UPDATE
TO authenticated
USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()))
WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Merchants can delete own outreach" ON influencer_outreach;
CREATE POLICY "Merchants can delete own outreach"
ON influencer_outreach FOR DELETE
TO authenticated
USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

-- Service role bypass for agent operations
DROP POLICY IF EXISTS "Service role full access to influencer_outreach" ON influencer_outreach;
CREATE POLICY "Service role full access to influencer_outreach"
ON influencer_outreach FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
