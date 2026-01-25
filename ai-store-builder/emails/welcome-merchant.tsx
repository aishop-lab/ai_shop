import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface WelcomeMerchantEmailProps {
  merchantName: string
  storeName: string
  storeUrl: string
  dashboardUrl: string
}

export default function WelcomeMerchantEmail({
  merchantName,
  storeName,
  storeUrl,
  dashboardUrl,
}: WelcomeMerchantEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to StoreForge! Your store {storeName} is ready</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Welcome Header */}
          <Section style={welcomeHeader}>
            <Text style={welcomeIcon}>🎉</Text>
            <Heading style={h1}>Welcome to StoreForge!</Heading>
            <Text style={subtitle}>
              Your store is ready to start selling
            </Text>
          </Section>

          {/* Greeting */}
          <Text style={greeting}>
            Hi {merchantName},
          </Text>

          <Text style={text}>
            Congratulations! Your online store <strong>{storeName}</strong> is now live and ready
            to accept orders. We're excited to have you as part of the StoreForge community!
          </Text>

          {/* Store URL Box */}
          <Section style={urlBox}>
            <Text style={urlLabel}>Your Store URL</Text>
            <Link href={storeUrl} style={urlLink}>
              {storeUrl}
            </Link>
            <Text style={urlHint}>
              Share this link with your customers
            </Text>
          </Section>

          {/* Getting Started Steps */}
          <Section style={section}>
            <Heading as="h2" style={h2}>Get Started in 3 Steps</Heading>

            <Section style={stepBox}>
              <Text style={stepNumber}>1</Text>
              <Section style={stepContent}>
                <Text style={stepTitle}>Add Your Products</Text>
                <Text style={stepText}>
                  Upload product images and let AI help you create compelling descriptions
                  and suggest optimal pricing.
                </Text>
                <Link href={`${dashboardUrl}/products/new`} style={stepLink}>
                  Add your first product →
                </Link>
              </Section>
            </Section>

            <Section style={stepBox}>
              <Text style={stepNumber}>2</Text>
              <Section style={stepContent}>
                <Text style={stepTitle}>Configure Payments</Text>
                <Text style={stepText}>
                  Set up Razorpay to accept UPI, cards, and net banking. Enable COD
                  if you want to offer cash on delivery.
                </Text>
                <Link href={`${dashboardUrl}/settings`} style={stepLink}>
                  Configure payments →
                </Link>
              </Section>
            </Section>

            <Section style={stepBox}>
              <Text style={stepNumber}>3</Text>
              <Section style={stepContent}>
                <Text style={stepTitle}>Share Your Store</Text>
                <Text style={stepText}>
                  Promote your store on social media, WhatsApp, and other channels
                  to start getting orders.
                </Text>
                <Link href={storeUrl} style={stepLink}>
                  View your store →
                </Link>
              </Section>
            </Section>
          </Section>

          {/* Features Highlight */}
          <Section style={featuresBox}>
            <Heading as="h2" style={h2White}>What's Included</Heading>
            <Section style={featureGrid}>
              <Section style={featureItem}>
                <Text style={featureIcon}>💳</Text>
                <Text style={featureText}>UPI, Cards & COD</Text>
              </Section>
              <Section style={featureItem}>
                <Text style={featureIcon}>📦</Text>
                <Text style={featureText}>Shipping Integration</Text>
              </Section>
              <Section style={featureItem}>
                <Text style={featureIcon}>✨</Text>
                <Text style={featureText}>AI-Powered Tools</Text>
              </Section>
              <Section style={featureItem}>
                <Text style={featureIcon}>📊</Text>
                <Text style={featureText}>Analytics Dashboard</Text>
              </Section>
            </Section>
          </Section>

          {/* CTA Button */}
          <Section style={buttonSection}>
            <Link href={dashboardUrl} style={button}>
              Go to Dashboard
            </Link>
          </Section>

          {/* Help Section */}
          <Section style={helpBox}>
            <Heading as="h3" style={h3}>Need Help?</Heading>
            <Text style={helpText}>
              Our support team is here to help you succeed. If you have any questions
              or need assistance, don't hesitate to reach out.
            </Text>
            <Link href="mailto:support@storeforge.site" style={helpLink}>
              support@storeforge.site
            </Link>
          </Section>

          {/* Footer */}
          <Hr style={divider} />
          <Text style={footer}>
            Thank you for choosing StoreForge. We're here to help you grow your business!
          </Text>
          <Text style={footerSmall}>
            You received this email because you created a store on StoreForge.
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
  maxWidth: '600px',
}

const welcomeHeader = {
  textAlign: 'center' as const,
  marginBottom: '32px',
}

const welcomeIcon = {
  fontSize: '56px',
  margin: '0 0 16px',
}

const h1 = {
  color: '#1a1a1a',
  fontSize: '32px',
  fontWeight: '700' as const,
  margin: '0 0 8px',
  textAlign: 'center' as const,
}

const subtitle = {
  color: '#6b7280',
  fontSize: '18px',
  margin: '0',
  textAlign: 'center' as const,
}

const greeting = {
  color: '#1a1a1a',
  fontSize: '18px',
  fontWeight: '500' as const,
  margin: '0 0 16px',
}

const text = {
  color: '#4a4a4a',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '0 0 24px',
}

const urlBox = {
  backgroundColor: '#f0fdf4',
  borderRadius: '12px',
  padding: '24px',
  textAlign: 'center' as const,
  margin: '24px 0',
  border: '2px solid #86efac',
}

const urlLabel = {
  color: '#15803d',
  fontSize: '12px',
  margin: '0 0 8px',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
}

const urlLink = {
  color: '#15803d',
  fontSize: '20px',
  fontWeight: '600' as const,
  textDecoration: 'none',
}

const urlHint = {
  color: '#16a34a',
  fontSize: '13px',
  margin: '12px 0 0',
}

const section = {
  margin: '32px 0',
}

const h2 = {
  color: '#1a1a1a',
  fontSize: '20px',
  fontWeight: '600' as const,
  margin: '0 0 20px',
}

const h2White = {
  ...h2,
  color: '#ffffff',
}

const h3 = {
  color: '#1a1a1a',
  fontSize: '16px',
  fontWeight: '600' as const,
  margin: '0 0 12px',
}

const stepBox = {
  display: 'flex',
  marginBottom: '24px',
  alignItems: 'flex-start',
}

const stepNumber = {
  backgroundColor: '#2563eb',
  borderRadius: '50%',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600' as const,
  width: '28px',
  height: '28px',
  lineHeight: '28px',
  textAlign: 'center' as const,
  margin: '0 16px 0 0',
  flexShrink: 0,
}

const stepContent = {
  flex: 1,
}

const stepTitle = {
  color: '#1a1a1a',
  fontSize: '16px',
  fontWeight: '600' as const,
  margin: '0 0 4px',
}

const stepText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0 0 8px',
}

const stepLink = {
  color: '#2563eb',
  fontSize: '14px',
  textDecoration: 'none',
}

const featuresBox = {
  backgroundColor: '#1e3a8a',
  borderRadius: '12px',
  padding: '24px',
  margin: '32px 0',
}

const featureGrid = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  justifyContent: 'space-between',
}

const featureItem = {
  width: '45%',
  textAlign: 'center' as const,
  marginBottom: '16px',
}

const featureIcon = {
  fontSize: '24px',
  margin: '0 0 4px',
}

const featureText = {
  color: '#ffffff',
  fontSize: '13px',
  margin: '0',
}

const buttonSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '8px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: '600' as const,
  padding: '16px 40px',
  textDecoration: 'none',
}

const helpBox = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  textAlign: 'center' as const,
}

const helpText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0 0 12px',
}

const helpLink = {
  color: '#2563eb',
  fontSize: '14px',
  textDecoration: 'none',
}

const divider = {
  borderColor: '#e5e7eb',
  margin: '32px 0',
}

const footer = {
  color: '#6b7280',
  fontSize: '14px',
  textAlign: 'center' as const,
  margin: '0',
}

const footerSmall = {
  color: '#9ca3af',
  fontSize: '12px',
  textAlign: 'center' as const,
  margin: '8px 0 0',
}
