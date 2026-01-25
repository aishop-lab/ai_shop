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
  sku?: string
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

interface NewOrderMerchantEmailProps {
  orderNumber: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  items: OrderItem[]
  subtotal: number
  shippingCost: number
  totalAmount: number
  shippingAddress: ShippingAddress
  paymentMethod: string
  paymentStatus: string
  storeName: string
  dashboardUrl: string
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function NewOrderMerchantEmail({
  orderNumber,
  customerName,
  customerEmail,
  customerPhone,
  items,
  subtotal,
  shippingCost,
  totalAmount,
  shippingAddress,
  paymentMethod,
  paymentStatus,
  storeName,
  dashboardUrl,
}: NewOrderMerchantEmailProps) {
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0)

  return (
    <Html>
      <Head />
      <Preview>
        New order #{orderNumber} - {formatCurrency(totalAmount)} from {customerName}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Alert Header */}
          <Section style={alertHeader}>
            <Text style={alertIcon}>🛒</Text>
            <Heading style={h1}>New Order Received!</Heading>
          </Section>

          {/* Quick Stats */}
          <Section style={statsRow}>
            <Section style={statBox}>
              <Text style={statLabel}>Order Total</Text>
              <Text style={statValue}>{formatCurrency(totalAmount)}</Text>
            </Section>
            <Section style={statBox}>
              <Text style={statLabel}>Items</Text>
              <Text style={statValue}>{itemCount}</Text>
            </Section>
            <Section style={statBox}>
              <Text style={statLabel}>Payment</Text>
              <Text style={paymentStatus === 'paid' ? statValueGreen : statValueOrange}>
                {paymentStatus === 'paid' ? 'Paid' : 'Pending'}
              </Text>
            </Section>
          </Section>

          {/* Order Details */}
          <Section style={orderBox}>
            <Text style={orderLabel}>Order Number</Text>
            <Text style={orderNumberText}>{orderNumber}</Text>
          </Section>

          {/* Customer Info */}
          <Section style={section}>
            <Heading as="h2" style={h2}>Customer Details</Heading>
            <Text style={infoText}>
              <strong>{customerName}</strong><br />
              {customerEmail}<br />
              {customerPhone && <>Phone: {customerPhone}<br /></>}
            </Text>
          </Section>

          {/* Shipping Address */}
          <Section style={section}>
            <Heading as="h2" style={h2}>Shipping Address</Heading>
            <Text style={addressText}>
              {shippingAddress.name}<br />
              {shippingAddress.address_line1}<br />
              {shippingAddress.address_line2 && <>{shippingAddress.address_line2}<br /></>}
              {shippingAddress.city}, {shippingAddress.state} {shippingAddress.pincode}<br />
              {shippingAddress.country}<br />
              Phone: {shippingAddress.phone}
            </Text>
          </Section>

          {/* Order Items */}
          <Section style={section}>
            <Heading as="h2" style={h2}>Order Items</Heading>

            {items.map((item, index) => (
              <Section key={index} style={itemRow}>
                <Text style={itemName}>{item.product_title}</Text>
                <Text style={itemDetails}>
                  {item.sku && <>SKU: {item.sku} | </>}
                  Qty: {item.quantity} × {formatCurrency(item.unit_price)} = {formatCurrency(item.total_price)}
                </Text>
              </Section>
            ))}

            <Hr style={divider} />

            <Section style={priceRow}>
              <Text style={priceLabel}>Subtotal</Text>
              <Text style={priceValue}>{formatCurrency(subtotal)}</Text>
            </Section>

            <Section style={priceRow}>
              <Text style={priceLabel}>Shipping</Text>
              <Text style={priceValue}>
                {shippingCost > 0 ? formatCurrency(shippingCost) : 'FREE'}
              </Text>
            </Section>

            <Hr style={divider} />

            <Section style={priceRow}>
              <Text style={totalLabel}>Total</Text>
              <Text style={totalValue}>{formatCurrency(totalAmount)}</Text>
            </Section>
          </Section>

          {/* Payment Info */}
          <Section style={paymentBox}>
            <Text style={paymentInfo}>
              <strong>Payment Method:</strong> {paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
            </Text>
            <Text style={paymentStatus === 'paid' ? paidText : pendingText}>
              {paymentStatus === 'paid' ? '✓ Payment Received' : '⏳ Payment Pending (COD)'}
            </Text>
          </Section>

          {/* CTA Button */}
          <Section style={buttonSection}>
            <Link href={`${dashboardUrl}/orders?search=${orderNumber}`} style={button}>
              View Order in Dashboard
            </Link>
          </Section>

          {/* Action Required */}
          {paymentStatus === 'paid' && (
            <Section style={actionBox}>
              <Text style={actionTitle}>Action Required</Text>
              <Text style={actionText}>
                This order is ready to be processed. Please prepare the items for shipping.
              </Text>
            </Section>
          )}

          {/* Footer */}
          <Hr style={divider} />
          <Text style={footer}>
            This notification was sent because you received an order on {storeName}.
          </Text>
          <Text style={footerSmall}>
            You can manage your notification preferences in your dashboard settings.
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

const alertHeader = {
  textAlign: 'center' as const,
  marginBottom: '24px',
}

const alertIcon = {
  fontSize: '48px',
  margin: '0 0 16px',
}

const h1 = {
  color: '#1a1a1a',
  fontSize: '28px',
  fontWeight: '700' as const,
  margin: '0',
  textAlign: 'center' as const,
}

const h2 = {
  color: '#1a1a1a',
  fontSize: '16px',
  fontWeight: '600' as const,
  margin: '0 0 12px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
}

const statsRow = {
  display: 'flex',
  justifyContent: 'space-between',
  margin: '24px 0',
}

const statBox = {
  textAlign: 'center' as const,
  flex: '1',
}

const statLabel = {
  color: '#6b7280',
  fontSize: '12px',
  margin: '0',
  textTransform: 'uppercase' as const,
}

const statValue = {
  color: '#1a1a1a',
  fontSize: '24px',
  fontWeight: '700' as const,
  margin: '4px 0 0',
}

const statValueGreen = {
  ...statValue,
  color: '#22c55e',
}

const statValueOrange = {
  ...statValue,
  color: '#f59e0b',
}

const orderBox = {
  backgroundColor: '#f0fdf4',
  borderRadius: '8px',
  padding: '16px',
  textAlign: 'center' as const,
  margin: '24px 0',
  border: '1px solid #86efac',
}

const orderLabel = {
  color: '#15803d',
  fontSize: '12px',
  margin: '0',
  textTransform: 'uppercase' as const,
}

const orderNumberText = {
  color: '#15803d',
  fontSize: '20px',
  fontWeight: '700' as const,
  margin: '4px 0 0',
}

const section = {
  margin: '24px 0',
}

const infoText = {
  color: '#4a4a4a',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
}

const addressText = {
  color: '#4a4a4a',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
  backgroundColor: '#f9fafb',
  padding: '12px',
  borderRadius: '6px',
}

const itemRow = {
  marginBottom: '12px',
  padding: '12px',
  backgroundColor: '#f9fafb',
  borderRadius: '6px',
}

const itemName = {
  color: '#1a1a1a',
  fontSize: '14px',
  fontWeight: '500' as const,
  margin: '0',
}

const itemDetails = {
  color: '#6b7280',
  fontSize: '13px',
  margin: '4px 0 0',
}

const divider = {
  borderColor: '#e5e7eb',
  margin: '16px 0',
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
}

const totalLabel = {
  color: '#1a1a1a',
  fontSize: '16px',
  fontWeight: '600' as const,
  margin: '0',
}

const totalValue = {
  color: '#1a1a1a',
  fontSize: '16px',
  fontWeight: '600' as const,
  margin: '0',
}

const paymentBox = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 0',
}

const paymentInfo = {
  color: '#4a4a4a',
  fontSize: '14px',
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
  backgroundColor: '#2563eb',
  borderRadius: '8px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: '600' as const,
  padding: '14px 32px',
  textDecoration: 'none',
}

const actionBox = {
  backgroundColor: '#fef3c7',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 0',
  border: '1px solid #fbbf24',
}

const actionTitle = {
  color: '#92400e',
  fontSize: '14px',
  fontWeight: '600' as const,
  margin: '0 0 8px',
}

const actionText = {
  color: '#92400e',
  fontSize: '14px',
  margin: '0',
}

const footer = {
  color: '#6b7280',
  fontSize: '12px',
  textAlign: 'center' as const,
  margin: '0',
}

const footerSmall = {
  color: '#9ca3af',
  fontSize: '11px',
  textAlign: 'center' as const,
  margin: '8px 0 0',
}
