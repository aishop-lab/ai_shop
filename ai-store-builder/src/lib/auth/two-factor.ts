/**
 * @deprecated TOTP-based 2FA has been replaced with email OTP.
 * This file is kept for backwards compatibility.
 * Use email-otp.ts for all new 2FA functionality.
 */

export {
  generateOTP,
  hashOTP,
  verifyOTP,
  isOTPExpired,
  getOTPExpiry,
  canSendOTP,
  getCooldownRemaining,
  hasExceededAttempts,
  createPendingToken,
  verifyPendingToken,
  OTP_CONFIG
} from './email-otp'
