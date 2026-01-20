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

interface OrderShippedEmailProps {
    orderNumber: string
    customerName: string
    trackingNumber: string
    courierName: string
    trackingUrl: string
    storeName: string
}

export default function OrderShippedEmail({
    orderNumber,
    customerName,
    trackingNumber,
    courierName,
    trackingUrl,
    storeName,
}: OrderShippedEmailProps) {
    return (
        <Html>
            <Head />
            <Preview>Your order #{orderNumber} has shipped! 📦</Preview>
            <Body style={main}>
                <Container style={container}>
                    {/* Header */}
                    <Text style={emoji}>📦</Text>
                    <Heading style={h1}>Your Order Has Shipped!</Heading>

                    <Text style={text}>
                        Hi {customerName},
                    </Text>

                    <Text style={text}>
                        Great news! Your order <strong>#{orderNumber}</strong> is on its way to you.
                    </Text>

                    {/* Tracking Info Box */}
                    <Section style={trackingBox}>
                        <Section style={trackingRow}>
                            <Text style={trackingLabel}>Tracking Number</Text>
                            <Text style={trackingValue}>{trackingNumber}</Text>
                        </Section>

                        <Hr style={dividerLight} />

                        <Section style={trackingRow}>
                            <Text style={trackingLabel}>Courier</Text>
                            <Text style={trackingValue}>{courierName}</Text>
                        </Section>
                    </Section>

                    {/* Track Button */}
                    <Section style={buttonSection}>
                        <Link href={trackingUrl} style={button}>
                            Track Your Shipment
                        </Link>
                    </Section>

                    <Text style={tipText}>
                        💡 You can track your package anytime using the button above or by visiting the courier's website.
                    </Text>

                    {/* Footer */}
                    <Hr style={divider} />
                    <Text style={footer}>
                        Thank you for shopping with {storeName}!
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

const text = {
    color: '#4a4a4a',
    fontSize: '16px',
    lineHeight: '24px',
    margin: '0 0 16px',
}

const trackingBox = {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    padding: '20px',
    margin: '24px 0',
}

const trackingRow = {
    marginBottom: '8px',
}

const trackingLabel = {
    color: '#6b7280',
    fontSize: '12px',
    textTransform: 'uppercase' as const,
    margin: '0',
}

const trackingValue = {
    color: '#1a1a1a',
    fontSize: '18px',
    fontWeight: '600' as const,
    margin: '4px 0 0',
}

const dividerLight = {
    borderColor: '#d1fae5',
    margin: '16px 0',
}

const divider = {
    borderColor: '#e5e7eb',
    margin: '32px 0',
}

const buttonSection = {
    textAlign: 'center' as const,
    margin: '32px 0',
}

const button = {
    backgroundColor: '#22c55e',
    borderRadius: '8px',
    color: '#ffffff',
    display: 'inline-block',
    fontSize: '16px',
    fontWeight: '600' as const,
    padding: '14px 32px',
    textDecoration: 'none',
}

const tipText = {
    backgroundColor: '#fef3c7',
    borderRadius: '8px',
    color: '#92400e',
    fontSize: '14px',
    padding: '12px 16px',
    margin: '24px 0',
}

const footer = {
    color: '#6b7280',
    fontSize: '14px',
    textAlign: 'center' as const,
    margin: '0',
}
