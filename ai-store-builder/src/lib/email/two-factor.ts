import { Resend } from 'resend'
import TwoFactorOTPEmail from '@/../emails/two-factor-otp'

// Initialize Resend client
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const fromEmail = process.env.RESEND_FROM_EMAIL || 'security@storeforge.site'

interface SendTwoFactorOTPEmailParams {
  email: string
  userName: string
  otpCode: string
  action: 'login' | 'enable' | 'disable'
}

/**
 * Send 2FA OTP verification email
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

    // If Resend is not configured, log and return
    if (!resend) {
      console.log('=== 2FA OTP EMAIL (Resend not configured) ===')
      console.log('To:', email)
      console.log('Action:', action)
      console.log('OTP Code:', otpCode)
      console.log('============================================')
      return { success: true }
    }

    const { data, error } = await resend.emails.send({
      from: `StoreForge Security <${fromEmail}>`,
      to: email,
      subject: getSubject(),
      react: TwoFactorOTPEmail({
        userName,
        otpCode,
        expiresInMinutes: 10,
        action
      })
    })

    if (error) {
      console.error('Failed to send 2FA OTP email:', error)
      return { success: false, error: error.message }
    }

    console.log('2FA OTP email sent:', data?.id)
    return { success: true }
  } catch (error) {
    console.error('Failed to send 2FA OTP email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    }
  }
}
