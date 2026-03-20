-- Agent Infrastructure
-- Creates 9 tables for the autonomous AI agent platform:
-- agent_states, agent_approvals, agent_actions, agent_memory, agent_schedules,
-- connected_accounts, agent_cost_tracking, customer_conversations, conversation_messages

-- =============================================================================
-- SHARED UPDATED_AT TRIGGER FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- AGENT_STATES TABLE
-- =============================================================================
-- Per-store agent configuration and runtime state for each of the 5 agent types

CREATE TABLE IF NOT EXISTS agent_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('marketing','sales','support','analytics','technical')),
  is_enabled BOOLEAN DEFAULT false,
  autonomy_level INTEGER DEFAULT 3 CHECK (autonomy_level BETWEEN 1 AND 5),
  config JSONB DEFAULT '{}',
  status TEXT DEFAULT 'idle' CHECK (status IN ('idle','running','waiting_approval','paused','error')),
  last_action_at TIMESTAMPTZ,
  last_error TEXT,
  error_count INTEGER DEFAULT 0,
  total_actions INTEGER DEFAULT 0,
  total_approvals_requested INTEGER DEFAULT 0,
  total_approvals_granted INTEGER DEFAULT 0,
  total_approvals_rejected INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(store_id, agent_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_states_store_id ON agent_states(store_id);
CREATE INDEX IF NOT EXISTS idx_agent_states_store_type ON agent_states(store_id, agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_states_status ON agent_states(status) WHERE status != 'idle';

-- Trigger
DROP TRIGGER IF EXISTS trigger_agent_states_updated_at ON agent_states;
CREATE TRIGGER trigger_agent_states_updated_at
BEFORE UPDATE ON agent_states
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- AGENT_APPROVALS TABLE
-- =============================================================================
-- Pending actions that require merchant approval before execution

CREATE TABLE IF NOT EXISTS agent_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  action_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  reasoning TEXT,
  details JSONB DEFAULT '{}',
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','expired','cancelled')),
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  modifications JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_approvals_store_id ON agent_approvals(store_id);
CREATE INDEX IF NOT EXISTS idx_agent_approvals_status ON agent_approvals(store_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_agent_approvals_agent_type ON agent_approvals(store_id, agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_approvals_expires_at ON agent_approvals(expires_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_agent_approvals_priority ON agent_approvals(store_id, priority, created_at DESC) WHERE status = 'pending';

-- Trigger
DROP TRIGGER IF EXISTS trigger_agent_approvals_updated_at ON agent_approvals;
CREATE TRIGGER trigger_agent_approvals_updated_at
BEFORE UPDATE ON agent_approvals
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- AGENT_ACTIONS TABLE
-- =============================================================================
-- Complete activity log for all agent actions (auto-executed and approved)

CREATE TABLE IF NOT EXISTS agent_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  action_type TEXT NOT NULL,
  action_category TEXT,
  summary TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending','running','completed','failed','cancelled','rolled_back','requires_approval')),
  execution_mode TEXT CHECK (execution_mode IN ('auto','approved','manual')),
  approval_id UUID REFERENCES agent_approvals(id),
  related_entity_type TEXT,
  related_entity_id TEXT,
  model_used TEXT,
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  estimated_cost_usd DECIMAL(10,6) DEFAULT 0,
  api_costs JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_actions_store_id ON agent_actions(store_id);
CREATE INDEX IF NOT EXISTS idx_agent_actions_store_type ON agent_actions(store_id, agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_actions_status ON agent_actions(store_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_actions_created_at ON agent_actions(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_actions_approval_id ON agent_actions(approval_id) WHERE approval_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_actions_entity ON agent_actions(related_entity_type, related_entity_id) WHERE related_entity_type IS NOT NULL;

-- =============================================================================
-- AGENT_MEMORY TABLE
-- =============================================================================
-- Learned preferences, patterns, and context per store/agent combination

CREATE TABLE IF NOT EXISTS agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  memory_type TEXT NOT NULL,
  memory_key TEXT NOT NULL,
  memory_value JSONB NOT NULL,
  confidence DECIMAL(3,2) DEFAULT 1.0,
  source TEXT,
  source_action_id UUID REFERENCES agent_actions(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,

  UNIQUE(store_id, agent_type, memory_key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_memory_store_id ON agent_memory(store_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_store_agent ON agent_memory(store_id, agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_memory_type ON agent_memory(store_id, agent_type, memory_type);
CREATE INDEX IF NOT EXISTS idx_agent_memory_expires ON agent_memory(expires_at) WHERE expires_at IS NOT NULL;

-- Trigger
DROP TRIGGER IF EXISTS trigger_agent_memory_updated_at ON agent_memory;
CREATE TRIGGER trigger_agent_memory_updated_at
BEFORE UPDATE ON agent_memory
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- AGENT_SCHEDULES TABLE
-- =============================================================================
-- Recurring scheduled tasks for agents (digests, reports, syncs, etc.)

CREATE TABLE IF NOT EXISTS agent_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  task_type TEXT NOT NULL,
  schedule_cron TEXT NOT NULL,
  timezone TEXT DEFAULT 'Asia/Kolkata',
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  last_run_status TEXT CHECK (last_run_status IN ('success','failed','skipped')),
  consecutive_failures INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_schedules_store_id ON agent_schedules(store_id);
CREATE INDEX IF NOT EXISTS idx_agent_schedules_next_run ON agent_schedules(next_run_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_agent_schedules_store_agent ON agent_schedules(store_id, agent_type);

-- Trigger
DROP TRIGGER IF EXISTS trigger_agent_schedules_updated_at ON agent_schedules;
CREATE TRIGGER trigger_agent_schedules_updated_at
BEFORE UPDATE ON agent_schedules
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- CONNECTED_ACCOUNTS TABLE
-- =============================================================================
-- OAuth tokens and credentials for third-party service integrations per store

CREATE TABLE IF NOT EXISTS connected_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_account_id TEXT,
  provider_account_name TEXT,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active','expired','revoked','error')),
  last_used_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(store_id, provider)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_connected_accounts_store_id ON connected_accounts(store_id);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_provider ON connected_accounts(store_id, provider);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_status ON connected_accounts(status) WHERE status != 'active';
CREATE INDEX IF NOT EXISTS idx_connected_accounts_expires ON connected_accounts(token_expires_at) WHERE token_expires_at IS NOT NULL;

-- Trigger
DROP TRIGGER IF EXISTS trigger_connected_accounts_updated_at ON connected_accounts;
CREATE TRIGGER trigger_connected_accounts_updated_at
BEFORE UPDATE ON connected_accounts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- AGENT_COST_TRACKING TABLE
-- =============================================================================
-- Monthly budget and cost tracking per store (LLM tokens + API calls)

CREATE TABLE IF NOT EXISTS agent_cost_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_tokens_input BIGINT DEFAULT 0,
  total_tokens_output BIGINT DEFAULT 0,
  total_llm_cost_usd DECIMAL(10,4) DEFAULT 0,
  cost_by_agent JSONB DEFAULT '{}',
  tokens_by_agent JSONB DEFAULT '{}',
  total_api_cost_usd DECIMAL(10,4) DEFAULT 0,
  api_cost_by_provider JSONB DEFAULT '{}',
  budget_limit_usd DECIMAL(10,2),
  budget_alert_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(store_id, period_start)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_cost_tracking_store_id ON agent_cost_tracking(store_id);
CREATE INDEX IF NOT EXISTS idx_agent_cost_tracking_period ON agent_cost_tracking(store_id, period_start DESC);

-- Trigger
DROP TRIGGER IF EXISTS trigger_agent_cost_tracking_updated_at ON agent_cost_tracking;
CREATE TRIGGER trigger_agent_cost_tracking_updated_at
BEFORE UPDATE ON agent_cost_tracking
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- CUSTOMER_CONVERSATIONS TABLE
-- =============================================================================
-- Support agent conversation threads (website chat, email, WhatsApp)

CREATE TABLE IF NOT EXISTS customer_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  channel TEXT NOT NULL CHECK (channel IN ('website_chat','email','whatsapp')),
  channel_identifier TEXT, -- email address, phone number, or anonymous session id
  status TEXT DEFAULT 'open' CHECK (status IN ('open','pending','resolved','closed')),
  assigned_to TEXT DEFAULT 'agent' CHECK (assigned_to IN ('agent','merchant','bot')),
  subject TEXT,
  last_message_at TIMESTAMPTZ,
  message_count INTEGER DEFAULT 0,
  related_order_id UUID REFERENCES orders(id),
  related_product_id UUID REFERENCES products(id),
  first_response_ms INTEGER, -- time to first agent/merchant response
  resolution_ms INTEGER,     -- total time from open to resolved
  customer_satisfaction INTEGER CHECK (customer_satisfaction BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customer_conversations_store_id ON customer_conversations(store_id);
CREATE INDEX IF NOT EXISTS idx_customer_conversations_status ON customer_conversations(store_id, status);
CREATE INDEX IF NOT EXISTS idx_customer_conversations_customer_id ON customer_conversations(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_conversations_channel ON customer_conversations(store_id, channel);
CREATE INDEX IF NOT EXISTS idx_customer_conversations_last_message ON customer_conversations(store_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_conversations_order ON customer_conversations(related_order_id) WHERE related_order_id IS NOT NULL;

-- Trigger
DROP TRIGGER IF EXISTS trigger_customer_conversations_updated_at ON customer_conversations;
CREATE TRIGGER trigger_customer_conversations_updated_at
BEFORE UPDATE ON customer_conversations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- CONVERSATION_MESSAGES TABLE
-- =============================================================================
-- Individual messages within support conversations

CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES customer_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('customer','agent','merchant')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation_id ON conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_created_at ON conversation_messages(conversation_id, created_at ASC);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE agent_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_cost_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- agent_states policies
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Merchants can view own agent states" ON agent_states;
CREATE POLICY "Merchants can view own agent states"
ON agent_states FOR SELECT
TO authenticated
USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Merchants can insert own agent states" ON agent_states;
CREATE POLICY "Merchants can insert own agent states"
ON agent_states FOR INSERT
TO authenticated
WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Merchants can update own agent states" ON agent_states;
CREATE POLICY "Merchants can update own agent states"
ON agent_states FOR UPDATE
TO authenticated
USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()))
WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

-- -----------------------------------------------------------------------------
-- agent_approvals policies
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Merchants can view own agent approvals" ON agent_approvals;
CREATE POLICY "Merchants can view own agent approvals"
ON agent_approvals FOR SELECT
TO authenticated
USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Merchants can insert own agent approvals" ON agent_approvals;
CREATE POLICY "Merchants can insert own agent approvals"
ON agent_approvals FOR INSERT
TO authenticated
WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Merchants can update own agent approvals" ON agent_approvals;
CREATE POLICY "Merchants can update own agent approvals"
ON agent_approvals FOR UPDATE
TO authenticated
USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()))
WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

-- -----------------------------------------------------------------------------
-- agent_actions policies
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Merchants can view own agent actions" ON agent_actions;
CREATE POLICY "Merchants can view own agent actions"
ON agent_actions FOR SELECT
TO authenticated
USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Merchants can insert own agent actions" ON agent_actions;
CREATE POLICY "Merchants can insert own agent actions"
ON agent_actions FOR INSERT
TO authenticated
WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

-- -----------------------------------------------------------------------------
-- agent_memory policies
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Merchants can view own agent memory" ON agent_memory;
CREATE POLICY "Merchants can view own agent memory"
ON agent_memory FOR SELECT
TO authenticated
USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Merchants can insert own agent memory" ON agent_memory;
CREATE POLICY "Merchants can insert own agent memory"
ON agent_memory FOR INSERT
TO authenticated
WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Merchants can update own agent memory" ON agent_memory;
CREATE POLICY "Merchants can update own agent memory"
ON agent_memory FOR UPDATE
TO authenticated
USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()))
WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Merchants can delete own agent memory" ON agent_memory;
CREATE POLICY "Merchants can delete own agent memory"
ON agent_memory FOR DELETE
TO authenticated
USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

-- -----------------------------------------------------------------------------
-- agent_schedules policies
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Merchants can view own agent schedules" ON agent_schedules;
CREATE POLICY "Merchants can view own agent schedules"
ON agent_schedules FOR SELECT
TO authenticated
USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Merchants can insert own agent schedules" ON agent_schedules;
CREATE POLICY "Merchants can insert own agent schedules"
ON agent_schedules FOR INSERT
TO authenticated
WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Merchants can update own agent schedules" ON agent_schedules;
CREATE POLICY "Merchants can update own agent schedules"
ON agent_schedules FOR UPDATE
TO authenticated
USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()))
WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Merchants can delete own agent schedules" ON agent_schedules;
CREATE POLICY "Merchants can delete own agent schedules"
ON agent_schedules FOR DELETE
TO authenticated
USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

-- -----------------------------------------------------------------------------
-- connected_accounts policies
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Merchants can view own connected accounts" ON connected_accounts;
CREATE POLICY "Merchants can view own connected accounts"
ON connected_accounts FOR SELECT
TO authenticated
USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Merchants can insert own connected accounts" ON connected_accounts;
CREATE POLICY "Merchants can insert own connected accounts"
ON connected_accounts FOR INSERT
TO authenticated
WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Merchants can update own connected accounts" ON connected_accounts;
CREATE POLICY "Merchants can update own connected accounts"
ON connected_accounts FOR UPDATE
TO authenticated
USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()))
WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Merchants can delete own connected accounts" ON connected_accounts;
CREATE POLICY "Merchants can delete own connected accounts"
ON connected_accounts FOR DELETE
TO authenticated
USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

-- -----------------------------------------------------------------------------
-- agent_cost_tracking policies
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Merchants can view own cost tracking" ON agent_cost_tracking;
CREATE POLICY "Merchants can view own cost tracking"
ON agent_cost_tracking FOR SELECT
TO authenticated
USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Merchants can insert own cost tracking" ON agent_cost_tracking;
CREATE POLICY "Merchants can insert own cost tracking"
ON agent_cost_tracking FOR INSERT
TO authenticated
WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Merchants can update own cost tracking" ON agent_cost_tracking;
CREATE POLICY "Merchants can update own cost tracking"
ON agent_cost_tracking FOR UPDATE
TO authenticated
USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()))
WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

-- -----------------------------------------------------------------------------
-- customer_conversations policies
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Merchants can view own customer conversations" ON customer_conversations;
CREATE POLICY "Merchants can view own customer conversations"
ON customer_conversations FOR SELECT
TO authenticated
USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Merchants can insert own customer conversations" ON customer_conversations;
CREATE POLICY "Merchants can insert own customer conversations"
ON customer_conversations FOR INSERT
TO authenticated
WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Merchants can update own customer conversations" ON customer_conversations;
CREATE POLICY "Merchants can update own customer conversations"
ON customer_conversations FOR UPDATE
TO authenticated
USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()))
WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

-- -----------------------------------------------------------------------------
-- conversation_messages policies
-- (join through customer_conversations to verify store ownership)
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Merchants can view own conversation messages" ON conversation_messages;
CREATE POLICY "Merchants can view own conversation messages"
ON conversation_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM customer_conversations cc
    JOIN stores s ON s.id = cc.store_id
    WHERE cc.id = conversation_messages.conversation_id
    AND s.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Merchants can insert own conversation messages" ON conversation_messages;
CREATE POLICY "Merchants can insert own conversation messages"
ON conversation_messages FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM customer_conversations cc
    JOIN stores s ON s.id = cc.store_id
    WHERE cc.id = conversation_messages.conversation_id
    AND s.owner_id = auth.uid()
  )
);
