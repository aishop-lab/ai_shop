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

interface LowStockProduct {
  id: string
  title: string
  sku?: string
  current_stock: number
  threshold: number
}

interface LowStockAlertEmailProps {
  storeName: string
  products: LowStockProduct[]
  dashboardUrl: string
}

export default function LowStockAlertEmail({
  storeName,
  products,
  dashboardUrl,
}: LowStockAlertEmailProps) {
  const outOfStock = products.filter(p => p.current_stock === 0)
  const lowStock = products.filter(p => p.current_stock > 0)

  return (
    <Html>
      <Head />
      <Preview>
        {outOfStock.length > 0
          ? `${outOfStock.length} product(s) out of stock on ${storeName}`
          : `${products.length} product(s) running low on stock`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Alert Header */}
          <Section style={alertHeader}>
            <Text style={alertIcon}>
              {outOfStock.length > 0 ? '🚨' : '⚠️'}
            </Text>
            <Heading style={h1}>
              {outOfStock.length > 0 ? 'Stock Alert!' : 'Low Stock Warning'}
            </Heading>
            <Text style={subtitle}>
              {outOfStock.length > 0
                ? `${outOfStock.length} product(s) are now out of stock`
                : `${products.length} product(s) need restocking`}
            </Text>
          </Section>

          {/* Out of Stock Section */}
          {outOfStock.length > 0 && (
            <Section style={section}>
              <Section style={urgentBox}>
                <Heading as="h2" style={h2Red}>
                  Out of Stock ({outOfStock.length})
                </Heading>
                <Text style={urgentText}>
                  These products are no longer available for purchase. Restock immediately to avoid lost sales.
                </Text>
              </Section>

              {outOfStock.map((product) => (
                <Section key={product.id} style={productRowUrgent}>
                  <Text style={productTitle}>{product.title}</Text>
                  <Text style={productDetails}>
                    {product.sku && <>SKU: {product.sku} | </>}
                    Stock: <span style={{ color: '#dc2626', fontWeight: 600 }}>0 units</span>
                  </Text>
                  <Link
                    href={`${dashboardUrl}/products/${product.id}`}
                    style={productLink}
                  >
                    Update inventory →
                  </Link>
                </Section>
              ))}
            </Section>
          )}

          {/* Low Stock Section */}
          {lowStock.length > 0 && (
            <Section style={section}>
              <Section style={warningBox}>
                <Heading as="h2" style={h2Orange}>
                  Low Stock ({lowStock.length})
                </Heading>
                <Text style={warningText}>
                  These products are running low. Consider restocking soon.
                </Text>
              </Section>

              {lowStock.map((product) => (
                <Section key={product.id} style={productRowWarning}>
                  <Text style={productTitle}>{product.title}</Text>
                  <Text style={productDetails}>
                    {product.sku && <>SKU: {product.sku} | </>}
                    Stock: <span style={{ color: '#d97706', fontWeight: 600 }}>{product.current_stock} units</span>
                    {' '}(threshold: {product.threshold})
                  </Text>
                  <Link
                    href={`${dashboardUrl}/products/${product.id}`}
                    style={productLink}
                  >
                    Update inventory →
                  </Link>
                </Section>
              ))}
            </Section>
          )}

          {/* CTA Button */}
          <Section style={buttonSection}>
            <Link href={`${dashboardUrl}/products`} style={button}>
              Manage All Products
            </Link>
          </Section>

          {/* Tips */}
          <Section style={tipsBox}>
            <Heading as="h3" style={h3}>Tips for Inventory Management</Heading>
            <Text style={tipText}>
              • Set appropriate stock thresholds for each product<br />
              • Enable automatic low stock alerts in settings<br />
              • Consider pre-ordering from suppliers for popular items<br />
              • Review sales trends to predict restocking needs
            </Text>
          </Section>

          {/* Footer */}
          <Hr style={divider} />
          <Text style={footer}>
            This notification was sent because products on {storeName} need attention.
          </Text>
          <Text style={footerSmall}>
            You can adjust stock thresholds and notification preferences in your dashboard settings.
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
  margin: '0 0 8px',
  textAlign: 'center' as const,
}

const subtitle = {
  color: '#6b7280',
  fontSize: '16px',
  margin: '0',
  textAlign: 'center' as const,
}

const h2Red = {
  color: '#dc2626',
  fontSize: '16px',
  fontWeight: '600' as const,
  margin: '0 0 8px',
}

const h2Orange = {
  color: '#d97706',
  fontSize: '16px',
  fontWeight: '600' as const,
  margin: '0 0 8px',
}

const h3 = {
  color: '#1a1a1a',
  fontSize: '14px',
  fontWeight: '600' as const,
  margin: '0 0 8px',
}

const section = {
  margin: '24px 0',
}

const urgentBox = {
  backgroundColor: '#fef2f2',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '16px',
  border: '1px solid #fecaca',
}

const urgentText = {
  color: '#991b1b',
  fontSize: '14px',
  margin: '0',
}

const warningBox = {
  backgroundColor: '#fffbeb',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '16px',
  border: '1px solid #fde68a',
}

const warningText = {
  color: '#92400e',
  fontSize: '14px',
  margin: '0',
}

const productRowUrgent = {
  padding: '16px',
  backgroundColor: '#fef2f2',
  borderRadius: '8px',
  marginBottom: '12px',
  borderLeft: '4px solid #dc2626',
}

const productRowWarning = {
  padding: '16px',
  backgroundColor: '#fffbeb',
  borderRadius: '8px',
  marginBottom: '12px',
  borderLeft: '4px solid #d97706',
}

const productTitle = {
  color: '#1a1a1a',
  fontSize: '14px',
  fontWeight: '600' as const,
  margin: '0 0 4px',
}

const productDetails = {
  color: '#6b7280',
  fontSize: '13px',
  margin: '0 0 8px',
}

const productLink = {
  color: '#2563eb',
  fontSize: '13px',
  textDecoration: 'none',
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

const tipsBox = {
  backgroundColor: '#f0f9ff',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 0',
}

const tipText = {
  color: '#0369a1',
  fontSize: '13px',
  lineHeight: '22px',
  margin: '0',
}

const divider = {
  borderColor: '#e5e7eb',
  margin: '24px 0',
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
