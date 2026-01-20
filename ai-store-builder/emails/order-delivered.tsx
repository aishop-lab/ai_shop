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

interface OrderDeliveredEmailProps {
    orderNumber: string
    customerName: string
    storeName: string
    reviewUrl?: string
}

export default function OrderDeliveredEmail({
    orderNumber,
    customerName,
    storeName,
    reviewUrl,
}: OrderDeliveredEmailProps) {
    return (
        <Html>
            <Head />
            <Preview>Your order #{orderNumber} has been delivered! 🎉</Preview>
            <Body style={main}>
                <Container style={container}>
                    {/* Header */}
                    <Text style={emoji}>🎉</Text>
                    <Heading style={h1}>Your Order Was Delivered!</Heading>

                    <Text style={text}>
                        Hi {customerName},
                    </Text>

                    <Text style={text}>
                        Your order <strong>#{orderNumber}</strong> has been successfully delivered.
                        We hope you love your purchase!
                    </Text>

                    {/* Review CTA */}
                    <Section style={reviewBox}>
                        <Heading as="h2" style={h2}>How was your experience?</Heading>
                        <Text style={reviewText}>
                            Your feedback helps other customers and helps us improve.
                            Take a moment to share your thoughts!
                        </Text>

                        {reviewUrl && (
                            <Link href={reviewUrl} style={button}>
                                Write a Review ⭐
                            </Link>
                        )}
                    </Section>

                    <Text style={helpText}>
                        Having issues with your order? Reply to this email and we'll help you out.
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

const h2 = {
    color: '#1a1a1a',
    fontSize: '20px',
    fontWeight: '600' as const,
    margin: '0 0 12px',
    textAlign: 'center' as const,
}

const text = {
    color: '#4a4a4a',
    fontSize: '16px',
    lineHeight: '24px',
    margin: '0 0 16px',
}

const reviewBox = {
    backgroundColor: '#fef3c7',
    borderRadius: '12px',
    padding: '32px 24px',
    margin: '32px 0',
    textAlign: 'center' as const,
}

const reviewText = {
    color: '#92400e',
    fontSize: '14px',
    lineHeight: '22px',
    margin: '0 0 20px',
}

const button = {
    backgroundColor: '#f59e0b',
    borderRadius: '8px',
    color: '#ffffff',
    display: 'inline-block',
    fontSize: '16px',
    fontWeight: '600' as const,
    padding: '14px 32px',
    textDecoration: 'none',
}

const helpText = {
    color: '#6b7280',
    fontSize: '14px',
    textAlign: 'center' as const,
    margin: '24px 0',
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
