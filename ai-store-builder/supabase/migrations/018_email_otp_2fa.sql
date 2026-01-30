-- Migration: 018_email_otp_2fa
-- Description: Add columns for email-based OTP 2FA
-- Safe to re-run

-- ============================================
-- ADD EMAIL OTP COLUMNS TO PROFILES
-- ============================================
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS two_factor_otp_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS two_factor_otp_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS two_factor_last_otp_sent_at TIMESTAMPTZ;

-- ============================================
-- UPDATE COMMENTS
-- ============================================
COMMENT ON COLUMN profiles.two_factor_secret IS 'Hashed OTP code for email-based 2FA';
COMMENT ON COLUMN profiles.two_factor_otp_expires_at IS 'When the current OTP expires (10 minutes from send)';
COMMENT ON COLUMN profiles.two_factor_otp_attempts IS 'Number of failed OTP verification attempts';
COMMENT ON COLUMN profiles.two_factor_last_otp_sent_at IS 'When the last OTP was sent (for rate limiting)';

-- ============================================
-- CLEANUP BACKUP CODES FUNCTION (no longer needed)
-- ============================================
DROP FUNCTION IF EXISTS use_backup_code(UUID, INTEGER);
