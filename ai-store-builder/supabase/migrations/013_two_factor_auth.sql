-- Migration: 013_two_factor_auth
-- Description: Add 2FA columns to profiles table
-- Safe to re-run

-- ============================================
-- CLEANUP (for re-running)
-- ============================================
DROP INDEX IF EXISTS idx_profiles_two_factor_enabled;
DROP FUNCTION IF EXISTS use_backup_code(UUID, INTEGER);

-- ============================================
-- ADD 2FA COLUMNS TO PROFILES
-- ============================================
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS two_factor_secret TEXT,
ADD COLUMN IF NOT EXISTS two_factor_backup_codes TEXT[],
ADD COLUMN IF NOT EXISTS two_factor_enabled_at TIMESTAMPTZ;

-- ============================================
-- INDEX
-- ============================================
CREATE INDEX idx_profiles_two_factor_enabled
ON profiles(two_factor_enabled)
WHERE two_factor_enabled = true;

-- ============================================
-- FUNCTION TO MARK BACKUP CODE AS USED
-- ============================================
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

-- ============================================
-- DOCUMENTATION
-- ============================================
COMMENT ON COLUMN profiles.two_factor_enabled IS 'Whether 2FA is enabled for this user';
COMMENT ON COLUMN profiles.two_factor_secret IS 'TOTP secret for 2FA (encrypted at rest)';
COMMENT ON COLUMN profiles.two_factor_backup_codes IS 'Backup codes for 2FA recovery (null = used)';
COMMENT ON COLUMN profiles.two_factor_enabled_at IS 'When 2FA was enabled';
