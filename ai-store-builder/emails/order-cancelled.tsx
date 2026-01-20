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

interface OrderCancelledEmailProps {
    orderNumber: string
    customerName: string
    storeName: string
    reason?: string
    refundMessage?: string
    supportEmail?: string
}

export default function OrderCancelledEmail({
    orderNumber,
    customerName,
    storeName,
    reason,
    refundMessage,
    supportEmail,
}: OrderCancelledEmailProps) {
    return (
        <Html>
            <Head />
            <Preview>Your order #{orderNumber} has been cancelled</Preview>
            <Body style={main}>
                <Container style={container}>
                    {/* Header */}
                    <Text style={emoji}>📦❌</Text>
                    <Heading style={h1}>Order Cancelled</Heading>

                    <Text style={text}>
                        Hi {customerName},
                    </Text>

                    <Text style={text}>
                        We're sorry to inform you that your order <strong>#{orderNumber}</strong> has been cancelled.
                    </Text>

                    {/* Reason Box (if provided) */}
                    {reason && (
                        <Section style={reasonBox}>
                            <Heading as="h2" style={h2}>Reason for Cancellation</Heading>
                            <Text style={reasonText}>{reason}</Text>
                        </Section>
                    )}

                    {/* Refund Info */}
                    {refundMessage && (
                        <Section style={refundBox}>
                            <Text style={refundIcon}>💰</Text>
                            <Heading as="h2" style={h2}>Refund Information</Heading>
                            <Text style={refundText}>{refundMessage}</Text>
                            <Text style={timelineText}>
                                <strong>Timeline:</strong><br />
                                • Credit/Debit Card: 5-7 business days<br />
                                • UPI: 2-3 business days<br />
                                • Net Banking: 5-7 business days
                            </Text>
                        </Section>
                    )}

                    {/* What's Next */}
                    <Section style={nextStepsBox}>
                        <Heading as="h2" style={h2}>What's Next?</Heading>
                        <Text style={nextStepsText}>
                            • If you paid online, your refund will be processed automatically<br />
                            • You can place a new order anytime on our website<br />
                            • Contact us if you have any questions about this cancellation
                        </Text>
                    </Section>

                    {/* Support */}
                    <Text style={helpText}>
                        Need help? {supportEmail ? (
                            <Link href={`mailto:${supportEmail}`} style={link}>Contact our support team</Link>
                        ) : 'Reply to this email and we\'ll assist you.'}
                    </Text>

                    {/* Footer */}
                    <Hr style={divider} />
                    <Text style={footer}>
                        We apologize for any inconvenience caused. We hope to serve you again at {storeName}!
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

const emoji = {
    fontSize: '48px',
    textAlign: 'center' as const,
    margin: '0 0 16px',
}

const h1 = {
    color: '#1a1a1a',
    fontSize: '28px',
    fontWeight: '700' as const,
    margin: '0 0 24px',
    textAlign: 'center' as const,
}

const h2 = {
    color: '#1a1a1a',
    fontSize: '16px',
    fontWeight: '600' as const,
    margin: '0 0 12px',
}

const text = {
    color: '#4a4a4a',
    fontSize: '16px',
    lineHeight: '24px',
    margin: '0 0 16px',
}

const reasonBox = {
    backgroundColor: '#fef3c7',
    border: '1px solid #fcd34d',
    borderRadius: '8px',
    padding: '20px',
    margin: '24px 0',
}

const reasonText = {
    color: '#92400e',
    fontSize: '14px',
    lineHeight: '22px',
    margin: '0',
}

const refundBox = {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '12px',
    padding: '24px',
    margin: '24px 0',
}

const refundIcon = {
    fontSize: '32px',
    textAlign: 'center' as const,
    margin: '0 0 12px',
}

const refundText = {
    color: '#166534',
    fontSize: '15px',
    fontWeight: '500' as const,
    textAlign: 'center' as const,
    margin: '0 0 16px',
}

const timelineText = {
    color: '#4a4a4a',
    fontSize: '13px',
    lineHeight: '22px',
    margin: '12px 0 0',
    padding: '12px',
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: '6px',
}

const nextStepsBox = {
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    padding: '20px',
    margin: '24px 0',
}

const nextStepsText = {
    color: '#4a4a4a',
    fontSize: '14px',
    lineHeight: '24px',
    margin: '0',
}

const helpText = {
    color: '#6b7280',
    fontSize: '14px',
    textAlign: 'center' as const,
    margin: '24px 0',
}

const link = {
    color: '#2563eb',
    textDecoration: 'underline',
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
