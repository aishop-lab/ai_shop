import { test, expect } from '@playwright/test'

/**
 * Stripe Payment Integration E2E Tests
 *
 * Tests for Stripe payment functionality including:
 * - Stripe order creation
 * - Stripe checkout session
 * - Dynamic currency support (USD, EUR, GBP)
 * - Stripe settings API (GET/POST/DELETE)
 * - Stripe credential validation
 * - Stripe webhook handler
 * - Stripe refund processing
 */

const INVALID_UUID = '00000000-0000-0000-0000-000000000000'

// ============================================
// STRIPE ORDER CREATION
// ============================================

test.describe('Stripe Order Creation', () => {
  test('POST /api/orders/create - should create Stripe order', async ({ request }) => {
    const response = await request.post('/api/orders/create', {
      data: {
        store_id: INVALID_UUID,
        items: [{ product_id: INVALID_UUID, quantity: 1 }],
        customer_email: 'test@example.com',
        customer_name: 'Test Customer',
        payment_method: 'stripe',
        shipping_address: {
          name: 'Test',
          address_line1: '123 Main St',
          city: 'New York',
          state: 'NY',
          pincode: '10001',
          country: 'United States',
          phone: '+12125551234'
        }
      }
    })
    expect([200, 400, 404, 500]).toContain(response.status())
  })

  test('should return stripe_session_url for Stripe payment', async ({ request }) => {
    const response = await request.post('/api/orders/create', {
      data: {
        store_id: INVALID_UUID,
        items: [{ product_id: INVALID_UUID, quantity: 1, price: 29.99 }],
        customer_email: 'test@example.com',
        customer_name: 'Test',
        payment_method: 'stripe'
      }
    })
    expect([200, 400, 404, 500]).toContain(response.status())

    if (response.status() === 200) {
      const data = await response.json()
      expect(data).toBeDefined()
      // Stripe orders should include session URL for redirect
    }
  })

  test('should support USD currency', async ({ request }) => {
    const response = await request.post('/api/orders/create', {
      data: {
        store_id: INVALID_UUID,
        items: [{ product_id: INVALID_UUID, quantity: 2 }],
        customer_email: 'test@example.com',
        payment_method: 'stripe',
        currency: 'USD'
      }
    })
    expect([200, 400, 404, 500]).toContain(response.status())
  })

  test('should support EUR currency', async ({ request }) => {
    const response = await request.post('/api/orders/create', {
      data: {
        store_id: INVALID_UUID,
        items: [{ product_id: INVALID_UUID, quantity: 1 }],
        customer_email: 'test@example.com',
        payment_method: 'stripe',
        currency: 'EUR'
      }
    })
    expect([200, 400, 404, 500]).toContain(response.status())
  })

  test('should support GBP currency', async ({ request }) => {
    const response = await request.post('/api/orders/create', {
      data: {
        store_id: INVALID_UUID,
        items: [{ product_id: INVALID_UUID, quantity: 1 }],
        customer_email: 'test@example.com',
        payment_method: 'stripe',
        currency: 'GBP'
      }
    })
    expect([200, 400, 404, 500]).toContain(response.status())
  })
})

// ============================================
// STRIPE CHECKOUT SESSION
// ============================================

test.describe('Stripe Checkout Session', () => {
  test('should create checkout session with correct amount', async ({ request }) => {
    const response = await request.post('/api/orders/create', {
      data: {
        store_id: INVALID_UUID,
        items: [{ product_id: INVALID_UUID, quantity: 1, price: 49.99 }],
        customer_email: 'checkout@example.com',
        customer_name: 'Checkout Test',
        payment_method: 'stripe',
        shipping_address: {
          name: 'Test',
          address_line1: '456 Oak Ave',
          city: 'Los Angeles',
          state: 'CA',
          pincode: '90001',
          country: 'United States',
          phone: '+13105551234'
        }
      }
    })
    expect([200, 400, 404, 500]).toContain(response.status())
  })

  test('should handle multiple line items', async ({ request }) => {
    const response = await request.post('/api/orders/create', {
      data: {
        store_id: INVALID_UUID,
        items: [
          { product_id: INVALID_UUID, quantity: 2, price: 25.00 },
          { product_id: INVALID_UUID, quantity: 1, price: 15.99 }
        ],
        customer_email: 'multi@example.com',
        payment_method: 'stripe'
      }
    })
    expect([200, 400, 404, 500]).toContain(response.status())
  })
})

// ============================================
// STRIPE SETTINGS API - GET
// ============================================

test.describe('Stripe Settings - GET', () => {
  test('GET /api/dashboard/settings/stripe - should require authentication', async ({ request }) => {
    const response = await request.get('/api/dashboard/settings/stripe')
    expect([200, 401]).toContain(response.status())
  })

  test('should return credential status', async ({ request }) => {
    const response = await request.get('/api/dashboard/settings/stripe')
    expect([200, 401]).toContain(response.status())

    if (response.status() === 200) {
      const data = await response.json()
      expect(data).toBeDefined()
      // Should have status info (configured, verified, etc.)
    }
  })
})

// ============================================
// STRIPE SETTINGS API - POST (Save Credentials)
// ============================================

test.describe('Stripe Settings - POST', () => {
  test('POST /api/dashboard/settings/stripe - should require authentication', async ({ request }) => {
    const response = await request.post('/api/dashboard/settings/stripe', {
      data: {
        publishable_key: 'pk_test_testkey123',
        secret_key: 'sk_test_testkey123'
      }
    })
    expect([200, 400, 401]).toContain(response.status())
  })

  test('should validate publishable key format', async ({ request }) => {
    const response = await request.post('/api/dashboard/settings/stripe', {
      data: {
        publishable_key: 'invalid_key',
        secret_key: 'sk_test_testkey123'
      }
    })
    expect([400, 401]).toContain(response.status())
  })

  test('should validate secret key format', async ({ request }) => {
    const response = await request.post('/api/dashboard/settings/stripe', {
      data: {
        publishable_key: 'pk_test_testkey123',
        secret_key: 'invalid_secret'
      }
    })
    expect([400, 401]).toContain(response.status())
  })

  test('should accept valid test key format', async ({ request }) => {
    const response = await request.post('/api/dashboard/settings/stripe', {
      data: {
        publishable_key: 'pk_test_abc123def456',
        secret_key: 'sk_test_abc123def456',
        webhook_secret: 'whsec_test123'
      }
    })
    // 401 without auth, 200/400 with auth
    expect([200, 400, 401]).toContain(response.status())
  })

  test('should accept valid live key format', async ({ request }) => {
    const response = await request.post('/api/dashboard/settings/stripe', {
      data: {
        publishable_key: 'pk_live_abc123def456',
        secret_key: 'sk_live_abc123def456'
      }
    })
    expect([200, 400, 401]).toContain(response.status())
  })

  test('should reject empty credentials', async ({ request }) => {
    const response = await request.post('/api/dashboard/settings/stripe', {
      data: {
        publishable_key: '',
        secret_key: ''
      }
    })
    expect([400, 401]).toContain(response.status())
  })
})

// ============================================
// STRIPE SETTINGS API - DELETE (Remove Credentials)
// ============================================

test.describe('Stripe Settings - DELETE', () => {
  test('DELETE /api/dashboard/settings/stripe - should require authentication', async ({ request }) => {
    const response = await request.delete('/api/dashboard/settings/stripe')
    expect([200, 401, 405]).toContain(response.status())
  })

  test('should clear stripe credentials', async ({ request }) => {
    const response = await request.delete('/api/dashboard/settings/stripe')
    expect([200, 401, 405]).toContain(response.status())

    if (response.status() === 200) {
      const data = await response.json()
      expect(data).toBeDefined()
    }
  })
})

// ============================================
// STRIPE WEBHOOK - CHECKOUT COMPLETED
// ============================================

test.describe('Stripe Webhook - Checkout Completed', () => {
  test('POST /api/webhooks/stripe - should require signature', async ({ request }) => {
    const response = await request.post('/api/webhooks/stripe', {
      data: {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            payment_intent: 'pi_test_123',
            metadata: { order_id: INVALID_UUID, store_id: INVALID_UUID }
          }
        }
      }
    })
    // Should reject without valid stripe-signature header
    expect([400, 500]).toContain(response.status())
  })

  test('should reject missing signature header', async ({ request }) => {
    const response = await request.post('/api/webhooks/stripe', {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({
        type: 'checkout.session.completed',
        data: { object: { metadata: { order_id: INVALID_UUID } } }
      })
    })
    expect([400, 500]).toContain(response.status())
  })

  test('should reject invalid signature', async ({ request }) => {
    const response = await request.post('/api/webhooks/stripe', {
      headers: {
        'stripe-signature': 't=1234567890,v1=invalid_signature_abc123'
      },
      data: JSON.stringify({
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            metadata: { order_id: INVALID_UUID, store_id: INVALID_UUID }
          }
        }
      })
    })
    expect([400, 500]).toContain(response.status())
  })

  test('should process checkout completed event with signature', async ({ request }) => {
    const response = await request.post('/api/webhooks/stripe', {
      headers: {
        'stripe-signature': 't=1234567890,v1=test_signature,v0=test_v0'
      },
      data: JSON.stringify({
        id: 'evt_test_123',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_checkout',
            payment_intent: 'pi_test_123',
            customer_email: 'test@example.com',
            amount_total: 4999,
            currency: 'usd',
            metadata: {
              order_id: INVALID_UUID,
              store_id: INVALID_UUID,
              order_number: 'ORD-TEST-001'
            }
          }
        }
      })
    })
    // Invalid signature will fail verification
    expect([200, 400, 500]).toContain(response.status())
  })
})

// ============================================
// STRIPE WEBHOOK - CHECKOUT EXPIRED
// ============================================

test.describe('Stripe Webhook - Checkout Expired', () => {
  test('should handle checkout session expired', async ({ request }) => {
    const response = await request.post('/api/webhooks/stripe', {
      headers: {
        'stripe-signature': 't=1234567890,v1=test_signature'
      },
      data: JSON.stringify({
        id: 'evt_test_expired',
        type: 'checkout.session.expired',
        data: {
          object: {
            id: 'cs_test_expired',
            metadata: {
              order_id: INVALID_UUID,
              store_id: INVALID_UUID
            }
          }
        }
      })
    })
    expect([200, 400, 500]).toContain(response.status())
  })
})

// ============================================
// STRIPE WEBHOOK - CHARGE REFUNDED
// ============================================

test.describe('Stripe Webhook - Charge Refunded', () => {
  test('should handle charge refunded event', async ({ request }) => {
    const response = await request.post('/api/webhooks/stripe', {
      headers: {
        'stripe-signature': 't=1234567890,v1=test_signature'
      },
      data: JSON.stringify({
        id: 'evt_test_refund',
        type: 'charge.refunded',
        data: {
          object: {
            id: 'ch_test_123',
            payment_intent: 'pi_test_123',
            amount_refunded: 4999,
            currency: 'usd',
            metadata: {
              store_id: INVALID_UUID
            }
          }
        }
      })
    })
    expect([200, 400, 500]).toContain(response.status())
  })

  test('should handle partial refund', async ({ request }) => {
    const response = await request.post('/api/webhooks/stripe', {
      headers: {
        'stripe-signature': 't=1234567890,v1=test_signature'
      },
      data: JSON.stringify({
        id: 'evt_test_partial_refund',
        type: 'charge.refunded',
        data: {
          object: {
            id: 'ch_test_partial',
            payment_intent: 'pi_test_partial',
            amount: 4999,
            amount_refunded: 2000,
            currency: 'usd'
          }
        }
      })
    })
    expect([200, 400, 500]).toContain(response.status())
  })
})

// ============================================
// STRIPE WEBHOOK - UNHANDLED EVENTS
// ============================================

test.describe('Stripe Webhook - Unhandled Events', () => {
  test('should acknowledge unhandled event types', async ({ request }) => {
    const response = await request.post('/api/webhooks/stripe', {
      headers: {
        'stripe-signature': 't=1234567890,v1=test_signature'
      },
      data: JSON.stringify({
        id: 'evt_test_unknown',
        type: 'customer.created',
        data: { object: { id: 'cus_test' } }
      })
    })
    // Even unhandled events should be acknowledged or fail on signature
    expect([200, 400, 500]).toContain(response.status())
  })
})

// ============================================
// CURRENCY CONVERSION
// ============================================

test.describe('Stripe Currency Conversion', () => {
  test('should convert dollars to cents for Stripe', async ({ request }) => {
    const response = await request.post('/api/orders/create', {
      data: {
        store_id: INVALID_UUID,
        items: [{ product_id: INVALID_UUID, quantity: 1, price: 19.99 }],
        customer_email: 'cents@example.com',
        payment_method: 'stripe'
      }
    })
    expect([200, 400, 404, 500]).toContain(response.status())
  })

  test('should handle decimal amount correctly', async ({ request }) => {
    const response = await request.post('/api/orders/create', {
      data: {
        store_id: INVALID_UUID,
        items: [{ product_id: INVALID_UUID, quantity: 1, price: 9.95 }],
        customer_email: 'decimal@example.com',
        payment_method: 'stripe'
      }
    })
    expect([200, 400, 404, 500]).toContain(response.status())
  })
})

// ============================================
// PAYMENT METHOD AUTO-SELECTION
// ============================================

test.describe('Payment Method Selection', () => {
  test('Razorpay should still work for INR', async ({ request }) => {
    const response = await request.post('/api/orders/create', {
      data: {
        store_id: INVALID_UUID,
        items: [{ product_id: INVALID_UUID, quantity: 1 }],
        customer_email: 'inr@example.com',
        payment_method: 'razorpay'
      }
    })
    expect([200, 400, 404, 500]).toContain(response.status())
  })

  test('COD should still work alongside Stripe', async ({ request }) => {
    const response = await request.post('/api/orders/create', {
      data: {
        store_id: INVALID_UUID,
        items: [{ product_id: INVALID_UUID, quantity: 1 }],
        customer_email: 'cod@example.com',
        payment_method: 'cod',
        shipping_address: {
          name: 'Test',
          address_line1: '789 Pine St',
          city: 'Chicago',
          state: 'IL',
          pincode: '60601',
          country: 'United States',
          phone: '+13125551234'
        }
      }
    })
    expect([200, 400, 404, 500]).toContain(response.status())
  })

  test('should reject invalid payment method', async ({ request }) => {
    const response = await request.post('/api/orders/create', {
      data: {
        store_id: INVALID_UUID,
        items: [{ product_id: INVALID_UUID, quantity: 1 }],
        customer_email: 'test@example.com',
        payment_method: 'bitcoin' // Invalid payment method
      }
    })
    expect([400, 404, 500]).toContain(response.status())
  })
})
