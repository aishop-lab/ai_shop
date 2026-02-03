import { sendEmailWithReact, getResendCredentials } from './index'
import TwoFactorOTPEmail from '@/../emails/two-factor-otp'

interface SendTwoFactorOTPEmailParams {
  email: string
  userName: string
  otpCode: string
  action: 'login' | 'enable' | 'disable'
}

/**
 * Send 2FA OTP verification email
 * Note: 2FA emails always use platform credentials since they're security-related
 */
export async function sendTwoFactorOTPEmail(params: SendTwoFactorOTPEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const { email, userName, otpCode, action } = params

    // Get subject based on action
    const getSubject = () => {
      switch (action) {
        case 'login':
          return `Your StoreForge sign-in code: ${otpCode}`
        case 'enable':
          return `Your StoreForge verification code: ${otpCode}`
        case 'disable':
          return `Confirm disabling 2FA: ${otpCode}`
        default:
          return `Your StoreForge verification code: ${otpCode}`
      }
    }

    // Check if we have credentials (use platform credentials for 2FA)
    const credentials = await getResendCredentials()
    if (!credentials) {
      console.log('=== 2FA OTP EMAIL (Resend not configured) ===')
      console.log('To:', email)
      console.log('Action:', action)
      console.log('OTP Code:', otpCode)
      console.log('============================================')
      return { success: true }
    }

    return sendEmailWithReact({
      to: email,
      subject: getSubject(),
      react: TwoFactorOTPEmail({
        userName,
        otpCode,
        expiresInMinutes: 10,
        action
      }),
      storeName: 'StoreForge Security', // Always use StoreForge for security emails
    })
  } catch (error) {
    console.error('Failed to send 2FA OTP email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    }
  }
}
