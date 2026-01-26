import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Row,
  Column,
} from '@react-email/components'

interface CartItem {
  title: string
  variant_title?: string
  price: number
  quantity: number
  image_url?: string
}

interface AbandonedCartEmailProps {
  customerName: string
  storeName: string
  storeUrl: string
  recoveryUrl: string
  items: CartItem[]
  subtotal: number
  discountCode?: string
  discountPercentage?: number
  sequenceNumber: 1 | 2 | 3
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const sequenceContent = {
  1: {
    preheader: 'Complete your purchase before items sell out!',
    headline: 'You left something behind!',
    message: "We noticed you didn't complete your purchase. Your cart is saved and waiting for you.",
    cta: 'Complete Your Order',
  },
  2: {
    preheader: 'Your cart misses you - come back and complete your order',
    headline: 'Your cart is waiting',
    message: "The items in your cart are still available, but they're selling fast. Don't miss out on what you loved!",
    cta: 'Return to Cart',
  },
  3: {
    preheader: 'Last chance! Your cart will expire soon',
    headline: 'Last chance to grab your items',
    message: "This is your final reminder. Your saved cart will expire soon. Complete your order now before it's too late!",
    cta: 'Complete Purchase Now',
  },
}

export default function AbandonedCartEmail({
  customerName = 'there',
  storeName = 'Store',
  storeUrl = 'https://example.com',
  recoveryUrl = 'https://example.com/cart/recover',
  items = [],
  subtotal = 0,
  discountCode,
  discountPercentage,
  sequenceNumber = 1,
}: AbandonedCartEmailProps) {
  const content = sequenceContent[sequenceNumber]

  return (
    <Html>
      <Head />
      <Preview>{content.preheader}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={logo}>{storeName}</Heading>
          </Section>

          {/* Main Content */}
          <Section style={content_section}>
            <Heading style={heading}>{content.headline}</Heading>

            <Text style={paragraph}>Hi {customerName},</Text>

            <Text style={paragraph}>{content.message}</Text>

            {/* Discount Banner */}
            {discountCode && discountPercentage && (
              <Section style={discountBanner}>
                <Text style={discountText}>
                  Use code <strong>{discountCode}</strong> for {discountPercentage}% off your order!
                </Text>
              </Section>
            )}

            {/* Cart Items */}
            <Section style={cartSection}>
              <Text style={cartTitle}>Your Cart ({items.length} items)</Text>

              {items.slice(0, 5).map((item, index) => (
                <Row key={index} style={cartItem}>
                  <Column style={itemImageCol}>
                    {item.image_url ? (
                      <Img
                        src={item.image_url}
                        alt={item.title}
                        width={60}
                        height={60}
                        style={itemImage}
                      />
                    ) : (
                      <div style={itemImagePlaceholder} />
                    )}
                  </Column>
                  <Column style={itemDetails}>
                    <Text style={itemTitle}>{item.title}</Text>
                    {item.variant_title && (
                      <Text style={itemVariant}>{item.variant_title}</Text>
                    )}
                    <Text style={itemMeta}>
                      Qty: {item.quantity} × {formatCurrency(item.price)}
                    </Text>
                  </Column>
                  <Column style={itemPriceCol}>
                    <Text style={itemPrice}>
                      {formatCurrency(item.price * item.quantity)}
                    </Text>
                  </Column>
                </Row>
              ))}

              {items.length > 5 && (
                <Text style={moreItems}>+{items.length - 5} more items in cart</Text>
              )}

              <Hr style={divider} />

              <Row style={subtotalRow}>
                <Column>
                  <Text style={subtotalLabel}>Subtotal</Text>
                </Column>
                <Column style={{ textAlign: 'right' }}>
                  <Text style={subtotalValue}>{formatCurrency(subtotal)}</Text>
                </Column>
              </Row>
            </Section>

            {/* CTA Button */}
            <Section style={ctaSection}>
              <Button style={ctaButton} href={recoveryUrl}>
                {content.cta}
              </Button>
            </Section>

            {/* Urgency for sequence 3 */}
            {sequenceNumber === 3 && (
              <Text style={urgencyText}>
                This cart will expire in 24 hours. Don't lose your items!
              </Text>
            )}

            <Text style={paragraph}>
              If you have any questions, simply reply to this email or visit our store.
            </Text>

            <Text style={signature}>
              Thank you for shopping with us!
              <br />
              The {storeName} Team
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              <Link href={storeUrl} style={footerLink}>
                {storeName}
              </Link>
            </Text>
            <Text style={footerText}>
              <Link href={`${recoveryUrl}&unsubscribe=true`} style={unsubscribeLink}>
                Unsubscribe from cart reminders
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0',
  maxWidth: '600px',
}

const header = {
  padding: '24px',
  borderBottom: '1px solid #e6ebf1',
}

const logo = {
  color: '#1a1a1a',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0',
  textAlign: 'center' as const,
}

const content_section = {
  padding: '32px 24px',
}

const heading = {
  color: '#1a1a1a',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '1.3',
  margin: '0 0 24px',
}

const paragraph = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 16px',
}

const discountBanner = {
  backgroundColor: '#fef3c7',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 0',
  textAlign: 'center' as const,
}

const discountText = {
  color: '#92400e',
  fontSize: '16px',
  margin: '0',
}

const cartSection = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
}

const cartTitle = {
  color: '#1a1a1a',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 16px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
}

const cartItem = {
  marginBottom: '16px',
}

const itemImageCol = {
  width: '70px',
  verticalAlign: 'top' as const,
}

const itemImage = {
  borderRadius: '4px',
  objectFit: 'cover' as const,
}

const itemImagePlaceholder = {
  width: '60px',
  height: '60px',
  backgroundColor: '#e5e7eb',
  borderRadius: '4px',
}

const itemDetails = {
  verticalAlign: 'top' as const,
  paddingLeft: '12px',
}

const itemTitle = {
  color: '#1a1a1a',
  fontSize: '14px',
  fontWeight: '500',
  margin: '0 0 4px',
  lineHeight: '1.3',
}

const itemVariant = {
  color: '#6b7280',
  fontSize: '12px',
  margin: '0 0 4px',
}

const itemMeta = {
  color: '#6b7280',
  fontSize: '12px',
  margin: '0',
}

const itemPriceCol = {
  width: '80px',
  textAlign: 'right' as const,
  verticalAlign: 'top' as const,
}

const itemPrice = {
  color: '#1a1a1a',
  fontSize: '14px',
  fontWeight: '500',
  margin: '0',
}

const moreItems = {
  color: '#6b7280',
  fontSize: '13px',
  fontStyle: 'italic' as const,
  margin: '0 0 16px',
  textAlign: 'center' as const,
}

const divider = {
  borderColor: '#e5e7eb',
  margin: '16px 0',
}

const subtotalRow = {
  marginTop: '8px',
}

const subtotalLabel = {
  color: '#525f7f',
  fontSize: '14px',
  fontWeight: '500',
  margin: '0',
}

const subtotalValue = {
  color: '#1a1a1a',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0',
}

const ctaSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const ctaButton = {
  backgroundColor: '#000000',
  borderRadius: '6px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: '600',
  padding: '14px 32px',
  textDecoration: 'none',
}

const urgencyText = {
  color: '#dc2626',
  fontSize: '14px',
  fontWeight: '500',
  textAlign: 'center' as const,
  margin: '0 0 24px',
}

const signature = {
  color: '#525f7f',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '24px 0 0',
}

const footer = {
  backgroundColor: '#f6f9fc',
  padding: '24px',
  textAlign: 'center' as const,
}

const footerText = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '1.5',
  margin: '0 0 8px',
}

const footerLink = {
  color: '#525f7f',
  textDecoration: 'none',
}

const unsubscribeLink = {
  color: '#8898aa',
  textDecoration: 'underline',
}
