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

interface RefundProcessedEmailProps {
    orderNumber: string
    customerName: string
    refundAmount: number
    storeName: string
    supportEmail?: string
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount)
}

export default function RefundProcessedEmail({
    orderNumber,
    customerName,
    refundAmount,
    storeName,
    supportEmail,
}: RefundProcessedEmailProps) {
    return (
        <Html>
            <Head />
            <Preview>Your refund of {formatCurrency(refundAmount)} has been processed</Preview>
            <Body style={main}>
                <Container style={container}>
                    {/* Header */}
                    <Text style={emoji}>💰</Text>
                    <Heading style={h1}>Your Refund Has Been Processed</Heading>

                    <Text style={text}>
                        Hi {customerName},
                    </Text>

                    <Text style={text}>
                        We've processed your refund for order <strong>#{orderNumber}</strong>.
                        The amount will be credited back to your original payment method.
                    </Text>

                    {/* Refund Amount Box */}
                    <Section style={refundBox}>
                        <Text style={refundLabel}>Refund Amount</Text>
                        <Text style={refundAmount_style}>{formatCurrency(refundAmount)}</Text>
                    </Section>

                    {/* Timeline */}
                    <Section style={timelineBox}>
                        <Heading as="h2" style={h2}>When will I receive my refund?</Heading>
                        <Text style={timelineText}>
                            <strong>Credit/Debit Card:</strong> 5-7 business days<br />
                            <strong>UPI:</strong> 2-3 business days<br />
                            <strong>Net Banking:</strong> 5-7 business days
                        </Text>
                        <Text style={noteText}>
                            The exact timing depends on your bank's processing time.
                        </Text>
                    </Section>

                    {/* Support */}
                    <Text style={helpText}>
                        Questions about your refund? {supportEmail ? (
                            <Link href={`mailto:${supportEmail}`} style={link}>Contact our support team</Link>
                        ) : 'Reply to this email and we\'ll help you out.'}
                    </Text>

                    {/* Footer */}
                    <Hr style={divider} />
                    <Text style={footer}>
                        Thank you for your patience. We hope to serve you again at {storeName}!
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

const refundBox = {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '12px',
    padding: '24px',
    margin: '24px 0',
    textAlign: 'center' as const,
}

const refundLabel = {
    color: '#166534',
    fontSize: '14px',
    margin: '0',
}

const refundAmount_style = {
    color: '#15803d',
    fontSize: '32px',
    fontWeight: '700' as const,
    margin: '8px 0 0',
}

const timelineBox = {
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    padding: '20px',
    margin: '24px 0',
}

const timelineText = {
    color: '#4a4a4a',
    fontSize: '14px',
    lineHeight: '24px',
    margin: '0',
}

const noteText = {
    color: '#6b7280',
    fontSize: '12px',
    fontStyle: 'italic' as const,
    margin: '12px 0 0',
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
