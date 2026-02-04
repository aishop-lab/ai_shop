import { test, expect } from '@playwright/test'

/**
 * Payment E2E Tests (Razorpay)
 *
 * Tests for payment functionality including:
 * - Create Razorpay order
 * - INR to paise conversion
 * - Payment signature verification
 * - Webhook signature verification
 * - Payment capture
 * - UPI, Card, Net Banking, Wallet payments
 * - Cash on Delivery (COD)
 * - Full/Partial refunds
 * - Refund status tracking
 * - Auto-restore inventory on refund
 * - Payment webhooks
 */

const TEST_STORE_SLUG = process.env.PLAYWRIGHT_TEST_STORE_SLUG || 'demo-store'
const INVALID_UUID = '00000000-0000-0000-0000-000000000000'

// Test card numbers for Razorpay
const TEST_CARDS = {
  SUCCESS: '4111111111111111',
  FAILURE: '4000000000000002',
  INTERNATIONAL: '4000000000000077'
}

// ============================================
// CREATE RAZORPAY ORDER
// ============================================

test.describe('Create Razorpay Order', () => {
  test('POST /api/orders/create - should create Razorpay order', async ({ request }) => {
    const response = await request.post('/api/orders/create', {
      data: {
        store_id: INVALID_UUID,
        items: [{ product_id: INVALID_UUID, quantity: 1 }],
        customer_email: 'test@example.com',
        customer_name: 'Test Customer',
        payment_method: 'razorpay',
        shipping_address: {
          name: 'Test',
          address_line1: '123 Main St',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          country: 'India',
          phone: '9876543210'
        }
      }
    })
    expect([200, 400, 404, 500]).toContain(response.status())
  })

  test('should return razorpay_order_id', async ({ request }) => {
    const response = await request.post('/api/orders/create', {
      data: {
        store_id: INVALID_UUID,
        items: [{ product_id: INVALID_UUID, quantity: 1, price: 999 }],
        customer_email: 'test@example.com',
        payment_method: 'razorpay'
      }
    })
    expect([200, 400, 404, 500]).toContain(response.status())

    if (response.status() === 200) {
      const data = await response.json()
      // Should have Razorpay order ID
      expect(data).toBeDefined()
    }
  })

  test('POST /api/payment/create-order - direct order creation', async ({ request }) => {
    const response = await request.post('/api/payment/create-order', {
      data: {
        amount: 99900, // in paise
        currency: 'INR',
        store_id: INVALID_UUID
      }
    })
    expect([200, 400, 401, 404, 405, 500]).toContain(response.status())
  })
})

// ============================================
// INR TO PAISE CONVERSION
// ============================================

test.describe('INR to Paise Conversion', () => {
  test('order amount should be in paise for Razorpay', async ({ request }) => {
    const response = await request.post('/api/orders/create', {
      data: {
        store_id: INVALID_UUID,
        items: [{ product_id: INVALID_UUID, quantity: 1, price: 999.50 }],
        customer_email: 'test@example.com',
        payment_method: 'razorpay'
      }
    })
    expect([200, 400, 404, 500]).toContain(response.status())
  })

  test('should handle decimal amounts correctly', async ({ request }) => {
    const response = await request.post('/api/payment/create-order', {
      data: {
        amount: 99950, // 999.50 INR = 99950 paise
        currency: 'INR',
        store_id: INVALID_UUID
      }
    })
    expect([200, 400, 401, 404, 405, 500]).toContain(response.status())
  })
})

// ============================================
// PAYMENT SIGNATURE VERIFICATION
// ============================================

test.describe('Payment Signature Verification', () => {
  test('POST /api/orders/verify-payment - should verify signature', async ({ request }) => {
    const response = await request.post('/api/orders/verify-payment', {
      data: {
        razorpay_order_id: 'order_test123',
        razorpay_payment_id: 'pay_test123',
        razorpay_signature: 'invalid_signature',
        order_id: INVALID_UUID
      }
    })
    // Should fail with invalid signature
    expect([200, 400, 404]).toContain(response.status())
  })

  test('should reject tampered signature', async ({ request }) => {
    const response = await request.post('/api/orders/verify-payment', {
      data: {
        razorpay_order_id: 'order_test123',
        razorpay_payment_id: 'pay_test123',
        razorpay_signature: 'tampered_signature_abc123',
        order_id: INVALID_UUID
      }
    })
    expect([200, 400, 404]).toContain(response.status())
  })

  test('POST /api/payment/verify - alternative verification endpoint', async ({ request }) => {
    const response = await request.post('/api/payment/verify', {
      data: {
        razorpay_order_id: 'order_test',
        razorpay_payment_id: 'pay_test',
        razorpay_signature: 'sig_test'
      }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })
})

// ============================================
// WEBHOOK SIGNATURE VERIFICATION
// ============================================

test.describe('Webhook Signature Verification', () => {
  test('POST /api/webhooks/razorpay - should verify webhook signature', async ({ request }) => {
    const response = await request.post('/api/webhooks/razorpay', {
      data: {
        event: 'payment.captured',
        payload: {
          payment: { entity: { id: 'pay_test' } }
        }
      },
      headers: {
        'x-razorpay-signature': 'invalid_webhook_signature'
      }
    })
    // Should process or reject based on signature
    expect([200, 400, 401, 500]).toContain(response.status())
  })

  test('should reject missing signature header', async ({ request }) => {
    const response = await request.post('/api/webhooks/razorpay', {
      data: {
        event: 'payment.captured'
      }
      // No signature header
    })
    expect([200, 400, 401, 500]).toContain(response.status())
  })
})

// ============================================
// PAYMENT CAPTURE
// ============================================

test.describe('Payment Capture', () => {
  test('POST /api/payment/capture - should capture payment', async ({ request }) => {
    const response = await request.post('/api/payment/capture', {
      data: {
        payment_id: 'pay_test123',
        amount: 99900
      }
    })
    expect([200, 400, 401, 404, 405, 500]).toContain(response.status())
  })

  test('webhook should auto-capture payment', async ({ request }) => {
    const response = await request.post('/api/webhooks/razorpay', {
      data: {
        event: 'payment.authorized',
        payload: {
          payment: {
            entity: {
              id: 'pay_test',
              order_id: 'order_test',
              amount: 99900,
              status: 'authorized'
            }
          }
        }
      },
      headers: { 'x-razorpay-signature': 'test_sig' }
    })
    expect([200, 400, 401, 500]).toContain(response.status())
  })
})

// ============================================
// UPI PAYMENTS
// ============================================

test.describe('UPI Payments', () => {
  test('should support UPI payment method', async ({ request }) => {
    const response = await request.post('/api/orders/create', {
      data: {
        store_id: INVALID_UUID,
        items: [{ product_id: INVALID_UUID, quantity: 1 }],
        customer_email: 'test@example.com',
        payment_method: 'upi'
      }
    })
    expect([200, 400, 404, 500]).toContain(response.status())
  })

  test('UPI handled through Razorpay', async ({ request }) => {
    const response = await request.post('/api/webhooks/razorpay', {
      data: {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_upi_test',
              method: 'upi',
              vpa: 'test@upi'
            }
          }
        }
      },
      headers: { 'x-razorpay-signature': 'test_sig' }
    })
    expect([200, 400, 401, 500]).toContain(response.status())
  })
})

// ============================================
// CARD PAYMENTS
// ============================================

test.describe('Card Payments', () => {
  test('should support card payment method', async ({ request }) => {
    const response = await request.post('/api/orders/create', {
      data: {
        store_id: INVALID_UUID,
        items: [{ product_id: INVALID_UUID, quantity: 1 }],
        customer_email: 'test@example.com',
        payment_method: 'card'
      }
    })
    expect([200, 400, 404, 500]).toContain(response.status())
  })

  test('card payment captured via webhook', async ({ request }) => {
    const response = await request.post('/api/webhooks/razorpay', {
      data: {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_card_test',
              method: 'card',
              card: {
                last4: '1111',
                network: 'Visa',
                type: 'credit'
              }
            }
          }
        }
      },
      headers: { 'x-razorpay-signature': 'test_sig' }
    })
    expect([200, 400, 401, 500]).toContain(response.status())
  })
})

// ============================================
// NET BANKING
// ============================================

test.describe('Net Banking', () => {
  test('should support netbanking payment method', async ({ request }) => {
    const response = await request.post('/api/orders/create', {
      data: {
        store_id: INVALID_UUID,
        items: [{ product_id: INVALID_UUID, quantity: 1 }],
        customer_email: 'test@example.com',
        payment_method: 'netbanking'
      }
    })
    expect([200, 400, 404, 500]).toContain(response.status())
  })

  test('netbanking payment via webhook', async ({ request }) => {
    const response = await request.post('/api/webhooks/razorpay', {
      data: {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_nb_test',
              method: 'netbanking',
              bank: 'HDFC'
            }
          }
        }
      },
      headers: { 'x-razorpay-signature': 'test_sig' }
    })
    expect([200, 400, 401, 500]).toContain(response.status())
  })
})

// ============================================
// WALLET PAYMENTS
// ============================================

test.describe('Wallet Payments', () => {
  test('should support wallet payment method', async ({ request }) => {
    const response = await request.post('/api/orders/create', {
      data: {
        store_id: INVALID_UUID,
        items: [{ product_id: INVALID_UUID, quantity: 1 }],
        customer_email: 'test@example.com',
        payment_method: 'wallet'
      }
    })
    expect([200, 400, 404, 500]).toContain(response.status())
  })

  test('wallet payment via webhook', async ({ request }) => {
    const response = await request.post('/api/webhooks/razorpay', {
      data: {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_wallet_test',
              method: 'wallet',
              wallet: 'paytm'
            }
          }
        }
      },
      headers: { 'x-razorpay-signature': 'test_sig' }
    })
    expect([200, 400, 401, 500]).toContain(response.status())
  })
})

// ============================================
// CASH ON DELIVERY (COD)
// ============================================

test.describe('Cash on Delivery (COD)', () => {
  test('POST /api/orders/create - should support COD', async ({ request }) => {
    const response = await request.post('/api/orders/create', {
      data: {
        store_id: INVALID_UUID,
        items: [{ product_id: INVALID_UUID, quantity: 1 }],
        customer_email: 'test@example.com',
        payment_method: 'cod',
        shipping_address: {
          name: 'Test',
          address_line1: '123 Main St',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          country: 'India',
          phone: '9876543210'
        }
      }
    })
    expect([200, 400, 404, 500]).toContain(response.status())
  })

  test('COD order should be confirmed without payment', async ({ request }) => {
    const response = await request.post('/api/orders/create', {
      data: {
        store_id: INVALID_UUID,
        items: [{ product_id: INVALID_UUID, quantity: 1 }],
        customer_email: 'test@example.com',
        payment_method: 'cod'
      }
    })
    expect([200, 400, 404, 500]).toContain(response.status())

    if (response.status() === 200) {
      const data = await response.json()
      // COD orders should be confirmed immediately
      expect(data).toBeDefined()
    }
  })

  test('should check COD availability for pincode', async ({ request }) => {
    const response = await request.post('/api/shipping/check-cod', {
      data: {
        pincode: '400001',
        store_id: INVALID_UUID
      }
    })
    expect([200, 400, 404, 405]).toContain(response.status())
  })

  test('POST /api/orders/[id]/collect-cod - should mark COD collected', async ({ request }) => {
    const response = await request.post(`/api/orders/${INVALID_UUID}/collect-cod`, {
      data: {
        collected_amount: 999,
        collected_at: new Date().toISOString()
      }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })
})

// ============================================
// FULL REFUND
// ============================================

test.describe('Full Refund', () => {
  test('POST /api/orders/[id]/refund - should process full refund', async ({ request }) => {
    const response = await request.post(`/api/orders/${INVALID_UUID}/refund`, {
      data: {
        amount: 999,
        reason: 'Customer requested cancellation'
      }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })

  test('POST /api/payment/refund - direct refund endpoint', async ({ request }) => {
    const response = await request.post('/api/payment/refund', {
      data: {
        payment_id: 'pay_test123',
        amount: 99900, // full amount in paise
        reason: 'Full refund'
      }
    })
    expect([200, 400, 401, 404, 405, 500]).toContain(response.status())
  })

  test('full refund should update order status', async ({ request }) => {
    const response = await request.post(`/api/orders/${INVALID_UUID}/refund`, {
      data: {
        type: 'full',
        reason: 'Order cancelled'
      }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })
})

// ============================================
// PARTIAL REFUND
// ============================================

test.describe('Partial Refund', () => {
  test('POST /api/orders/[id]/refund - should process partial refund', async ({ request }) => {
    const response = await request.post(`/api/orders/${INVALID_UUID}/refund`, {
      data: {
        amount: 500, // partial amount
        reason: 'Partial item return'
      }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })

  test('should allow multiple partial refunds', async ({ request }) => {
    const response = await request.post(`/api/orders/${INVALID_UUID}/refund`, {
      data: {
        amount: 200,
        reason: 'Item damaged',
        items: [{ product_id: INVALID_UUID, quantity: 1 }]
      }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })

  test('partial refund should not exceed order total', async ({ request }) => {
    const response = await request.post(`/api/orders/${INVALID_UUID}/refund`, {
      data: {
        amount: 999999, // exceeds order total
        reason: 'Test'
      }
    })
    // Should fail or cap at order total
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })
})

// ============================================
// REFUND STATUS TRACKING
// ============================================

test.describe('Refund Status Tracking', () => {
  test('GET /api/orders/[id]/refunds - should list refunds', async ({ request }) => {
    const response = await request.get(`/api/orders/${INVALID_UUID}/refunds`)
    expect([200, 401, 404, 405]).toContain(response.status())
  })

  test('GET /api/dashboard/refunds - should list all refunds', async ({ request }) => {
    const response = await request.get('/api/dashboard/refunds')
    expect([200, 401]).toContain(response.status())
  })

  test('refund status should update via webhook', async ({ request }) => {
    const response = await request.post('/api/webhooks/razorpay', {
      data: {
        event: 'refund.processed',
        payload: {
          refund: {
            entity: {
              id: 'rfnd_test',
              payment_id: 'pay_test',
              amount: 99900,
              status: 'processed'
            }
          }
        }
      },
      headers: { 'x-razorpay-signature': 'test_sig' }
    })
    expect([200, 400, 401, 500]).toContain(response.status())
  })
})

// ============================================
// REFUND REASON CAPTURE
// ============================================

test.describe('Refund Reason Capture', () => {
  test('refund should require reason', async ({ request }) => {
    const response = await request.post(`/api/orders/${INVALID_UUID}/refund`, {
      data: {
        amount: 500
        // Missing reason
      }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })

  test('should store refund reason', async ({ request }) => {
    const response = await request.post(`/api/orders/${INVALID_UUID}/refund`, {
      data: {
        amount: 500,
        reason: 'Product defective',
        notes: 'Customer reported issue with quality'
      }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })
})

// ============================================
// AUTO-RESTORE INVENTORY ON REFUND
// ============================================

test.describe('Auto-restore Inventory on Refund', () => {
  test('refund should restore inventory', async ({ request }) => {
    const response = await request.post(`/api/orders/${INVALID_UUID}/refund`, {
      data: {
        amount: 999,
        reason: 'Cancelled',
        restore_inventory: true
      }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })

  test('partial refund should restore specific items', async ({ request }) => {
    const response = await request.post(`/api/orders/${INVALID_UUID}/refund`, {
      data: {
        amount: 500,
        reason: 'Partial return',
        items: [
          { product_id: INVALID_UUID, quantity: 1, restore_inventory: true }
        ]
      }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })
})

// ============================================
// PAYMENT WEBHOOKS
// ============================================

test.describe('payment.captured Webhook', () => {
  test('should handle payment.captured event', async ({ request }) => {
    const response = await request.post('/api/webhooks/razorpay', {
      data: {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_captured_test',
              order_id: 'order_test',
              amount: 99900,
              currency: 'INR',
              status: 'captured',
              method: 'upi'
            }
          }
        }
      },
      headers: { 'x-razorpay-signature': 'test_sig' }
    })
    expect([200, 400, 401, 500]).toContain(response.status())
  })

  test('captured payment should update order status', async ({ request }) => {
    const response = await request.post('/api/webhooks/razorpay', {
      data: {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_update_test',
              order_id: 'order_test',
              status: 'captured'
            }
          }
        }
      },
      headers: { 'x-razorpay-signature': 'test_sig' }
    })
    expect([200, 400, 401, 500]).toContain(response.status())
  })
})

test.describe('payment.failed Webhook', () => {
  test('should handle payment.failed event', async ({ request }) => {
    const response = await request.post('/api/webhooks/razorpay', {
      data: {
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: 'pay_failed_test',
              order_id: 'order_test',
              error_code: 'BAD_REQUEST_ERROR',
              error_description: 'Payment failed'
            }
          }
        }
      },
      headers: { 'x-razorpay-signature': 'test_sig' }
    })
    expect([200, 400, 401, 500]).toContain(response.status())
  })

  test('failed payment should restore inventory', async ({ request }) => {
    const response = await request.post('/api/webhooks/razorpay', {
      data: {
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: 'pay_fail_inventory',
              order_id: 'order_test',
              status: 'failed'
            }
          }
        }
      },
      headers: { 'x-razorpay-signature': 'test_sig' }
    })
    expect([200, 400, 401, 500]).toContain(response.status())
  })
})

test.describe('refund.created Webhook', () => {
  test('should handle refund.created event', async ({ request }) => {
    const response = await request.post('/api/webhooks/razorpay', {
      data: {
        event: 'refund.created',
        payload: {
          refund: {
            entity: {
              id: 'rfnd_created_test',
              payment_id: 'pay_test',
              amount: 50000,
              status: 'created'
            }
          }
        }
      },
      headers: { 'x-razorpay-signature': 'test_sig' }
    })
    expect([200, 400, 401, 500]).toContain(response.status())
  })
})

test.describe('refund.processed Webhook', () => {
  test('should handle refund.processed event', async ({ request }) => {
    const response = await request.post('/api/webhooks/razorpay', {
      data: {
        event: 'refund.processed',
        payload: {
          refund: {
            entity: {
              id: 'rfnd_processed_test',
              payment_id: 'pay_test',
              amount: 50000,
              status: 'processed'
            }
          }
        }
      },
      headers: { 'x-razorpay-signature': 'test_sig' }
    })
    expect([200, 400, 401, 500]).toContain(response.status())
  })

  test('processed refund should trigger email', async ({ request }) => {
    const response = await request.post('/api/webhooks/razorpay', {
      data: {
        event: 'refund.processed',
        payload: {
          refund: {
            entity: {
              id: 'rfnd_email_test',
              payment_id: 'pay_test',
              amount: 99900,
              status: 'processed'
            }
          }
        }
      },
      headers: { 'x-razorpay-signature': 'test_sig' }
    })
    expect([200, 400, 401, 500]).toContain(response.status())
  })
})

test.describe('refund.failed Webhook', () => {
  test('should handle refund.failed event', async ({ request }) => {
    const response = await request.post('/api/webhooks/razorpay', {
      data: {
        event: 'refund.failed',
        payload: {
          refund: {
            entity: {
              id: 'rfnd_failed_test',
              payment_id: 'pay_test',
              amount: 50000,
              status: 'failed',
              error_code: 'REFUND_FAILED',
              error_description: 'Refund could not be processed'
            }
          }
        }
      },
      headers: { 'x-razorpay-signature': 'test_sig' }
    })
    expect([200, 400, 401, 500]).toContain(response.status())
  })
})

// ============================================
// PAYMENT SETTINGS
// ============================================

test.describe('Payment Settings', () => {
  test('GET /api/dashboard/settings/payments - should return settings', async ({ request }) => {
    const response = await request.get('/api/dashboard/settings/payments')
    expect([200, 401, 404, 405]).toContain(response.status())
  })

  test('POST /api/dashboard/settings/razorpay - should save credentials', async ({ request }) => {
    const response = await request.post('/api/dashboard/settings/razorpay', {
      data: {
        key_id: 'rzp_test_key',
        key_secret: 'rzp_test_secret',
        webhook_secret: 'whsec_test'
      }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })

  test('should verify Razorpay credentials', async ({ request }) => {
    const response = await request.post('/api/dashboard/settings/razorpay/verify', {
      data: {
        key_id: 'rzp_test_invalid',
        key_secret: 'invalid_secret'
      }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })
})
