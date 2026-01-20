-- Add 2FA columns to profiles table
-- Migration: 013_two_factor_auth.sql

-- Add 2FA columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS two_factor_secret TEXT,
ADD COLUMN IF NOT EXISTS two_factor_backup_codes TEXT[],
ADD COLUMN IF NOT EXISTS two_factor_enabled_at TIMESTAMPTZ;

-- Create index for faster 2FA lookups
CREATE INDEX IF NOT EXISTS idx_profiles_two_factor_enabled
ON profiles(two_factor_enabled)
WHERE two_factor_enabled = true;

-- Function to mark backup code as used (sets array element to null)
CREATE OR REPLACE FUNCTION use_backup_code(
  p_user_id UUID,
  p_code_index INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET two_factor_backup_codes[p_code_index + 1] = NULL
  WHERE id = p_user_id
    AND two_factor_enabled = true
    AND array_length(two_factor_backup_codes, 1) > p_code_index;

  RETURN FOUND;
END;
$$;

-- Add comment for documentation
COMMENT ON COLUMN profiles.two_factor_enabled IS 'Whether 2FA is enabled for this user';
COMMENT ON COLUMN profiles.two_factor_secret IS 'TOTP secret for 2FA (encrypted at rest)';
COMMENT ON COLUMN profiles.two_factor_backup_codes IS 'Backup codes for 2FA recovery (null = used)';
COMMENT ON COLUMN profiles.two_factor_enabled_at IS 'When 2FA was enabled';
