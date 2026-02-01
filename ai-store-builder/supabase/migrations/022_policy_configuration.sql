-- Add policy configuration column to stores table
-- This stores the merchant's answers to policy questions

ALTER TABLE stores
ADD COLUMN IF NOT EXISTS policy_config JSONB DEFAULT '{
  "returns": {
    "enabled": true,
    "window_days": 14,
    "condition": "unused_with_tags",
    "refund_method": "original_payment"
  },
  "shipping": {
    "free_shipping": "threshold",
    "free_threshold": 999,
    "delivery_speed": "standard",
    "regions": "pan_india",
    "processing_days": 2
  }
}'::jsonb;

-- Add index for policy config queries
CREATE INDEX IF NOT EXISTS idx_stores_policy_config ON stores USING gin(policy_config);

-- Comment for documentation
COMMENT ON COLUMN stores.policy_config IS 'Merchant policy configuration from MCQ questionnaire. Used to generate customized return and shipping policies.';
