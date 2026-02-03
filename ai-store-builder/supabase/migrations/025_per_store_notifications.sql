-- Per-store notification credentials (MSG91 WhatsApp and Resend Email)
-- This allows merchants to use their own notification service accounts

-- Add MSG91 (WhatsApp) credentials columns
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS msg91_auth_key_encrypted TEXT,
ADD COLUMN IF NOT EXISTS msg91_whatsapp_number TEXT,
ADD COLUMN IF NOT EXISTS msg91_sender_id TEXT,
ADD COLUMN IF NOT EXISTS msg91_credentials_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS msg91_credentials_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS whatsapp_notifications_enabled BOOLEAN DEFAULT TRUE;

-- Add Resend (Email) credentials columns
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS resend_api_key_encrypted TEXT,
ADD COLUMN IF NOT EXISTS resend_from_email TEXT,
ADD COLUMN IF NOT EXISTS resend_from_name TEXT,
ADD COLUMN IF NOT EXISTS resend_credentials_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS resend_credentials_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT TRUE;

-- Add notification settings
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{
  "order_confirmation_email": true,
  "order_confirmation_whatsapp": true,
  "shipping_update_email": true,
  "shipping_update_whatsapp": true,
  "delivery_confirmation_email": true,
  "delivery_confirmation_whatsapp": true,
  "abandoned_cart_email": true,
  "abandoned_cart_whatsapp": false,
  "low_stock_alert_email": true
}'::jsonb;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_stores_msg91_configured
ON stores (id)
WHERE msg91_credentials_verified = TRUE;

CREATE INDEX IF NOT EXISTS idx_stores_resend_configured
ON stores (id)
WHERE resend_credentials_verified = TRUE;

COMMENT ON COLUMN stores.msg91_auth_key_encrypted IS 'AES-256-GCM encrypted MSG91 auth key for WhatsApp notifications';
COMMENT ON COLUMN stores.msg91_whatsapp_number IS 'MSG91 WhatsApp Business integrated number';
COMMENT ON COLUMN stores.resend_api_key_encrypted IS 'AES-256-GCM encrypted Resend API key for email notifications';
COMMENT ON COLUMN stores.resend_from_email IS 'Custom sender email address (e.g., orders@mystore.com)';
COMMENT ON COLUMN stores.notification_settings IS 'Per-channel notification preferences';
