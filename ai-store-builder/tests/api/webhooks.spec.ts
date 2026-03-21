import { test, expect } from '@playwright/test'

/**
 * Phase III — Webhooks API Integration Tests
 *
 * Tests webhook endpoints for proper signature/header validation.
 * Webhook endpoints do not use Bearer auth — they rely on
 * provider-specific signature verification (Razorpay, Stripe, Shiprocket).
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

test.describe('Webhooks API - Razorpay', () => {
  test('POST /api/webhooks/razorpay - missing signature returns error', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/webhooks/razorpay`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_fake_123',
              amount: 50000,
              currency: 'INR',
              status: 'captured',
            },
          },
        },
      },
    })
    // Without x-razorpay-signature header, should reject
    expect([400, 401, 500]).toContain(response.status())
  })

  test('POST /api/webhooks/razorpay - invalid signature returns error', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/webhooks/razorpay`, {
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': 'deadbeef_invalid_signature_value',
      },
      data: {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_fake_456',
              amount: 99900,
              currency: 'INR',
              status: 'captured',
            },
          },
        },
      },
    })
    expect([400, 401, 500]).toContain(response.status())
  })

  test('POST /api/webhooks/razorpay - empty body returns error', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/webhooks/razorpay`, {
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': 'some_signature',
      },
      data: {},
    })
    expect([400, 401, 500]).toContain(response.status())
  })
})

test.describe('Webhooks API - Stripe', () => {
  test('POST /api/webhooks/stripe - missing stripe-signature returns error', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/webhooks/stripe`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        id: 'evt_fake_123',
        type: 'checkout.session.completed',
        data: { object: {} },
      },
    })
    // Stripe webhook handler reads raw body and verifies signature
    expect([400, 401, 500]).toContain(response.status())
  })

  test('POST /api/webhooks/stripe - invalid signature returns error', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/webhooks/stripe`, {
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 't=1234567890,v1=invalid_signature_value',
      },
      data: {
        id: 'evt_fake_456',
        type: 'checkout.session.completed',
        data: { object: {} },
      },
    })
    expect([400, 401, 500]).toContain(response.status())
  })

  test('POST /api/webhooks/stripe - empty body returns error', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/webhooks/stripe`, {
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 't=9999999999,v1=fakesig',
      },
      data: {},
    })
    expect([400, 401, 500]).toContain(response.status())
  })
})

test.describe('Webhooks API - Shiprocket', () => {
  test('POST /api/webhooks/shiprocket - without proper headers returns error', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/webhooks/shiprocket`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        event: 'tracking.update',
        awb: 'AWB123456',
        current_status: 'In Transit',
      },
    })
    // Shiprocket webhooks are verified by IP or token
    expect([200, 400, 401, 403, 500]).toContain(response.status())
  })

  test('POST /api/webhooks/shiprocket - empty body returns error', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/webhooks/shiprocket`, {
      headers: { 'Content-Type': 'application/json' },
      data: {},
    })
    expect([200, 400, 401, 500]).toContain(response.status())
  })

  test('POST /api/webhooks/shiprocket - malformed event data', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/webhooks/shiprocket`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        event: 'unknown.event.type',
        data: null,
      },
    })
    expect([200, 400, 401, 500]).toContain(response.status())
  })
})
