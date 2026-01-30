import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface TwoFactorOTPEmailProps {
  userName: string
  otpCode: string
  expiresInMinutes: number
  action: 'login' | 'enable' | 'disable'
}

export default function TwoFactorOTPEmail({
  userName,
  otpCode,
  expiresInMinutes,
  action,
}: TwoFactorOTPEmailProps) {
  const getActionText = () => {
    switch (action) {
      case 'login':
        return 'sign in to your account'
      case 'enable':
        return 'enable two-factor authentication'
      case 'disable':
        return 'disable two-factor authentication'
      default:
        return 'verify your identity'
    }
  }

  const getSubjectText = () => {
    switch (action) {
      case 'login':
        return 'Sign-in verification code'
      case 'enable':
        return 'Enable 2FA verification code'
      case 'disable':
        return 'Disable 2FA verification code'
      default:
        return 'Verification code'
    }
  }

  return (
    <Html>
      <Head />
      <Preview>Your StoreForge verification code: {otpCode}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logoText}>StoreForge</Text>
            <Heading style={h1}>{getSubjectText()}</Heading>
          </Section>

          {/* Greeting */}
          <Text style={greeting}>
            Hi {userName},
          </Text>

          <Text style={text}>
            You requested to {getActionText()}. Use the verification code below to complete the process.
          </Text>

          {/* OTP Code Display */}
          <Section style={codeBox}>
            <Text style={codeLabel}>Your verification code</Text>
            <Text style={codeText}>{otpCode}</Text>
            <Text style={codeExpiry}>
              This code expires in {expiresInMinutes} minutes
            </Text>
          </Section>

          {/* Security Notice */}
          <Section style={warningBox}>
            <Text style={warningTitle}>Security Notice</Text>
            <Text style={warningText}>
              If you did not request this code, someone may be trying to access your account.
              Please ignore this email and consider changing your password.
            </Text>
          </Section>

          <Text style={text}>
            For security reasons, never share this code with anyone. StoreForge staff will never ask for your verification code.
          </Text>

          {/* Footer */}
          <Hr style={divider} />
          <Text style={footer}>
            This is an automated message from StoreForge. Please do not reply to this email.
          </Text>
          <Text style={footerSmall}>
            If you have questions, contact us at support@storeforge.site
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '500px',
}

const header = {
  textAlign: 'center' as const,
  marginBottom: '32px',
}

const logoText = {
  color: '#2563eb',
  fontSize: '24px',
  fontWeight: '700' as const,
  margin: '0 0 16px',
}

const h1 = {
  color: '#1a1a1a',
  fontSize: '24px',
  fontWeight: '600' as const,
  margin: '0',
  textAlign: 'center' as const,
}

const greeting = {
  color: '#1a1a1a',
  fontSize: '16px',
  fontWeight: '500' as const,
  margin: '0 0 16px',
}

const text = {
  color: '#4a4a4a',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 24px',
}

const codeBox = {
  backgroundColor: '#f0f4f8',
  borderRadius: '12px',
  padding: '32px',
  textAlign: 'center' as const,
  margin: '24px 0',
  border: '2px dashed #d1d5db',
}

const codeLabel = {
  color: '#6b7280',
  fontSize: '12px',
  margin: '0 0 12px',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
}

const codeText = {
  color: '#1a1a1a',
  fontSize: '42px',
  fontWeight: '700' as const,
  fontFamily: 'monospace',
  letterSpacing: '8px',
  margin: '0 0 12px',
}

const codeExpiry = {
  color: '#ef4444',
  fontSize: '13px',
  margin: '0',
  fontWeight: '500' as const,
}

const warningBox = {
  backgroundColor: '#fef3c7',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 0',
  borderLeft: '4px solid #f59e0b',
}

const warningTitle = {
  color: '#92400e',
  fontSize: '14px',
  fontWeight: '600' as const,
  margin: '0 0 8px',
}

const warningText = {
  color: '#92400e',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '0',
}

const divider = {
  borderColor: '#e5e7eb',
  margin: '32px 0',
}

const footer = {
  color: '#6b7280',
  fontSize: '13px',
  textAlign: 'center' as const,
  margin: '0',
}

const footerSmall = {
  color: '#9ca3af',
  fontSize: '12px',
  textAlign: 'center' as const,
  margin: '8px 0 0',
}
