-- Migration: Marketing Campaigns & WhatsApp Consent
-- Adds whatsapp_consent to customers, creates marketing_campaigns and campaign_messages tables

-- 1. Add whatsapp_consent column to customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS whatsapp_consent BOOLEAN DEFAULT FALSE;

-- 2. Create marketing_campaigns table
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled')),
  segment_filters JSONB DEFAULT '{}',
  template_name TEXT,
  subject TEXT,
  content JSONB DEFAULT '{}',
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  target_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  read_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create campaign_messages table
CREATE TABLE IF NOT EXISTS campaign_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email')),
  recipient TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed', 'bounced')),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  external_message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_store_id ON marketing_campaigns(store_id);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_scheduled_at ON marketing_campaigns(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_campaign_messages_campaign_id ON campaign_messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_messages_customer_id ON campaign_messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_campaign_messages_status ON campaign_messages(status);
CREATE INDEX IF NOT EXISTS idx_customers_whatsapp_consent ON customers(whatsapp_consent);

-- 5. RLS Policies for marketing_campaigns
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners can view their campaigns"
  ON marketing_campaigns FOR SELECT
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

CREATE POLICY "Store owners can create campaigns"
  ON marketing_campaigns FOR INSERT
  WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

CREATE POLICY "Store owners can update their campaigns"
  ON marketing_campaigns FOR UPDATE
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

CREATE POLICY "Store owners can delete their campaigns"
  ON marketing_campaigns FOR DELETE
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

-- 6. RLS Policies for campaign_messages
ALTER TABLE campaign_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners can view campaign messages"
  ON campaign_messages FOR SELECT
  USING (campaign_id IN (
    SELECT id FROM marketing_campaigns
    WHERE store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  ));

CREATE POLICY "Store owners can create campaign messages"
  ON campaign_messages FOR INSERT
  WITH CHECK (campaign_id IN (
    SELECT id FROM marketing_campaigns
    WHERE store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  ));

CREATE POLICY "Store owners can update campaign messages"
  ON campaign_messages FOR UPDATE
  USING (campaign_id IN (
    SELECT id FROM marketing_campaigns
    WHERE store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  ));

-- 7. Updated_at trigger for marketing_campaigns
CREATE OR REPLACE FUNCTION update_marketing_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_marketing_campaigns_updated_at
  BEFORE UPDATE ON marketing_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_marketing_campaigns_updated_at();
