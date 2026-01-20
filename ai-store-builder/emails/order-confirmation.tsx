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

interface OrderItem {
    product_title: string
    quantity: number
    unit_price: number
    total_price: number
}

interface ShippingAddress {
    name: string
    address_line1: string
    address_line2?: string
    city: string
    state: string
    pincode: string
    country: string
    phone: string
}

interface OrderConfirmationEmailProps {
    orderNumber: string
    customerName: string
    items: OrderItem[]
    subtotal: number
    shippingCost: number
    taxAmount: number
    discountAmount: number
    totalAmount: number
    shippingAddress: ShippingAddress
    paymentMethod: string
    paymentStatus: string
    storeName: string
    trackingUrl?: string
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount)
}

export default function OrderConfirmationEmail({
    orderNumber,
    customerName,
    items,
    subtotal,
    shippingCost,
    taxAmount,
    discountAmount,
    totalAmount,
    shippingAddress,
    paymentMethod,
    paymentStatus,
    storeName,
    trackingUrl,
}: OrderConfirmationEmailProps) {
    return (
        <Html>
            <Head />
            <Preview>Your order #{orderNumber} has been confirmed!</Preview>
            <Body style={main}>
                <Container style={container}>
                    {/* Header */}
                    <Heading style={h1}>Thank you for your order!</Heading>

                    <Text style={text}>
                        Hi {customerName},
                    </Text>

                    <Text style={text}>
                        Your order has been confirmed and will be processed soon. We'll notify you when it ships.
                    </Text>

                    {/* Order Number Box */}
                    <Section style={orderBox}>
                        <Text style={orderLabel}>Order Number</Text>
                        <Text style={orderNumberText}>{orderNumber}</Text>
                    </Section>

                    {/* Order Items */}
                    <Section style={section}>
                        <Heading as="h2" style={h2}>Order Summary</Heading>

                        {items.map((item, index) => (
                            <Section key={index} style={itemRow}>
                                <Text style={itemName}>{item.product_title}</Text>
                                <Text style={itemDetails}>
                                    Qty: {item.quantity} × {formatCurrency(item.unit_price)} = {formatCurrency(item.total_price)}
                                </Text>
                            </Section>
                        ))}

                        <Hr style={divider} />

                        {/* Pricing */}
                        <Section style={priceRow}>
                            <Text style={priceLabel}>Subtotal</Text>
                            <Text style={priceValue}>{formatCurrency(subtotal)}</Text>
                        </Section>

                        <Section style={priceRow}>
                            <Text style={priceLabel}>Shipping</Text>
                            <Text style={shippingCost > 0 ? priceValue : freeText}>
                                {shippingCost > 0 ? formatCurrency(shippingCost) : 'FREE'}
                            </Text>
                        </Section>

                        {taxAmount > 0 && (
                            <Section style={priceRow}>
                                <Text style={priceLabel}>Tax</Text>
                                <Text style={priceValue}>{formatCurrency(taxAmount)}</Text>
                            </Section>
                        )}

                        {discountAmount > 0 && (
                            <Section style={priceRow}>
                                <Text style={priceLabel}>Discount</Text>
                                <Text style={discountText}>-{formatCurrency(discountAmount)}</Text>
                            </Section>
                        )}

                        <Hr style={divider} />

                        <Section style={priceRow}>
                            <Text style={totalLabel}>Total</Text>
                            <Text style={totalValue}>{formatCurrency(totalAmount)}</Text>
                        </Section>
                    </Section>

                    {/* Shipping Address */}
                    <Section style={section}>
                        <Heading as="h2" style={h2}>Shipping Address</Heading>
                        <Text style={addressText}>
                            <strong>{shippingAddress.name}</strong><br />
                            {shippingAddress.address_line1}<br />
                            {shippingAddress.address_line2 && <>{shippingAddress.address_line2}<br /></>}
                            {shippingAddress.city}, {shippingAddress.state} {shippingAddress.pincode}<br />
                            {shippingAddress.country}<br />
                            Phone: {shippingAddress.phone}
                        </Text>
                    </Section>

                    {/* Payment Info */}
                    <Section style={section}>
                        <Heading as="h2" style={h2}>Payment Method</Heading>
                        <Text style={text}>
                            {paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment (Razorpay)'}
                        </Text>
                        <Text style={paymentStatus === 'paid' ? paidText : pendingText}>
                            {paymentStatus === 'paid' ? '✓ Paid' : '⏳ Payment Pending'}
                        </Text>
                    </Section>

                    {/* Track Order Button */}
                    {trackingUrl && (
                        <Section style={buttonSection}>
                            <Link href={trackingUrl} style={button}>
                                Track Your Order
                            </Link>
                        </Section>
                    )}

                    {/* Footer */}
                    <Hr style={divider} />
                    <Text style={footer}>
                        Thank you for shopping with {storeName}!
                    </Text>
                    <Text style={footerSmall}>
                        If you have any questions, reply to this email or contact our support team.
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

const h1 = {
    color: '#1a1a1a',
    fontSize: '28px',
    fontWeight: '700' as const,
    margin: '0 0 20px',
    textAlign: 'center' as const,
}

const h2 = {
    color: '#1a1a1a',
    fontSize: '18px',
    fontWeight: '600' as const,
    margin: '0 0 16px',
}

const text = {
    color: '#4a4a4a',
    fontSize: '16px',
    lineHeight: '24px',
    margin: '0 0 16px',
}

const orderBox = {
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center' as const,
    margin: '24px 0',
}

const orderLabel = {
    color: '#6b7280',
    fontSize: '14px',
    margin: '0',
}

const orderNumberText = {
    color: '#1a1a1a',
    fontSize: '24px',
    fontWeight: '700' as const,
    margin: '8px 0 0',
}

const section = {
    margin: '32px 0',
}

const itemRow = {
    marginBottom: '12px',
}

const itemName = {
    color: '#1a1a1a',
    fontSize: '16px',
    fontWeight: '500' as const,
    margin: '0',
}

const itemDetails = {
    color: '#6b7280',
    fontSize: '14px',
    margin: '4px 0 0',
}

const divider = {
    borderColor: '#e5e7eb',
    margin: '20px 0',
}

const priceRow = {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
}

const priceLabel = {
    color: '#6b7280',
    fontSize: '14px',
    margin: '0',
}

const priceValue = {
    color: '#1a1a1a',
    fontSize: '14px',
    margin: '0',
    textAlign: 'right' as const,
}

const freeText = {
    color: '#22c55e',
    fontSize: '14px',
    fontWeight: '500' as const,
    margin: '0',
}

const discountText = {
    color: '#22c55e',
    fontSize: '14px',
    margin: '0',
}

const totalLabel = {
    color: '#1a1a1a',
    fontSize: '18px',
    fontWeight: '600' as const,
    margin: '0',
}

const totalValue = {
    color: '#1a1a1a',
    fontSize: '18px',
    fontWeight: '600' as const,
    margin: '0',
}

const addressText = {
    color: '#4a4a4a',
    fontSize: '14px',
    lineHeight: '22px',
    margin: '0',
}

const paidText = {
    color: '#22c55e',
    fontSize: '14px',
    fontWeight: '500' as const,
    margin: '8px 0 0',
}

const pendingText = {
    color: '#f59e0b',
    fontSize: '14px',
    fontWeight: '500' as const,
    margin: '8px 0 0',
}

const buttonSection = {
    textAlign: 'center' as const,
    margin: '32px 0',
}

const button = {
    backgroundColor: '#1a1a1a',
    borderRadius: '8px',
    color: '#ffffff',
    display: 'inline-block',
    fontSize: '16px',
    fontWeight: '600' as const,
    padding: '14px 32px',
    textDecoration: 'none',
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
