import { Resend } from 'resend'

// Initialize Resend client
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  replyTo?: string
}

/**
 * Generic email sending function
 */
export async function sendEmail(
  options: SendEmailOptions
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn('Email service not configured (missing RESEND_API_KEY)')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: options.to,
      subject: options.subject,
      html: options.html,
      replyTo: options.replyTo,
    })

    if (error) {
      console.error('Failed to send email:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Email send error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Re-export other email functions
export { sendOrderConfirmationEmail, sendRefundProcessedEmail } from './order-confirmation'
export { sendNewOrderMerchantEmail, sendShipmentFailedEmail, sendLowStockAlertEmail } from './merchant-notifications'
export { sendTwoFactorOTPEmail } from './two-factor'
