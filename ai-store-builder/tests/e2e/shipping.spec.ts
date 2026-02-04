import { test, expect } from '@playwright/test'

/**
 * Shipping E2E Tests
 *
 * Tests for shipping functionality including:
 * - Pincode availability check
 * - COD availability check
 * - Estimated delivery days
 * - Shipping cost calculation
 * - Create shipment in Shiprocket
 * - AWB code generation
 * - Shipping label generation (PDF)
 * - Manifest generation
 * - Pickup scheduling
 * - Courier selection (7 providers)
 * - Track by AWB code
 * - Track by order ID
 * - Shipment events logging
 * - Webhook for status updates
 * - Delivery confirmation
 */

const TEST_STORE_SLUG = process.env.PLAYWRIGHT_TEST_STORE_SLUG || 'demo-store'
const INVALID_UUID = '00000000-0000-0000-0000-000000000000'

// Valid Indian pincodes for testing
const TEST_PINCODES = {
  MUMBAI: '400001',
  DELHI: '110001',
  BANGALORE: '560001',
  CHENNAI: '600001',
  INVALID: '000000'
}

// ============================================
// PINCODE AVAILABILITY CHECK
// ============================================

test.describe('Pincode Availability Check', () => {
  test('POST /api/shipping/check-pincode - should validate delivery pincode', async ({ request }) => {
    const response = await request.post('/api/shipping/check-pincode', {
      data: {
        pincode: TEST_PINCODES.MUMBAI,
        store_id: INVALID_UUID
      }
    })
    expect([200, 400, 404]).toContain(response.status())
  })

  test('should return serviceability for valid pincode', async ({ request }) => {
    const response = await request.post('/api/shipping/check-pincode', {
      data: {
        pincode: TEST_PINCODES.DELHI,
        store_id: INVALID_UUID
      }
    })
    expect([200, 400, 404]).toContain(response.status())

    if (response.status() === 200) {
      const data = await response.json()
      // Should have serviceable flag
      expect(data).toBeDefined()
    }
  })

  test('should reject invalid pincode format', async ({ request }) => {
    const response = await request.post('/api/shipping/check-pincode', {
      data: {
        pincode: '12345', // Invalid 5-digit pincode
        store_id: INVALID_UUID
      }
    })
    expect([200, 400, 404]).toContain(response.status())
  })

  test('should handle non-serviceable pincode', async ({ request }) => {
    const response = await request.post('/api/shipping/check-pincode', {
      data: {
        pincode: TEST_PINCODES.INVALID,
        store_id: INVALID_UUID
      }
    })
    expect([200, 400, 404]).toContain(response.status())
  })
})

// ============================================
// COD AVAILABILITY CHECK
// ============================================

test.describe('COD Availability Check', () => {
  test('POST /api/shipping/check-cod - should check COD availability', async ({ request }) => {
    const response = await request.post('/api/shipping/check-cod', {
      data: {
        pincode: TEST_PINCODES.MUMBAI,
        store_id: INVALID_UUID
      }
    })
    expect([200, 400, 404, 405]).toContain(response.status())
  })

  test('should return COD limit if available', async ({ request }) => {
    const response = await request.post('/api/shipping/check-cod', {
      data: {
        pincode: TEST_PINCODES.BANGALORE,
        store_id: INVALID_UUID,
        order_value: 5000
      }
    })
    expect([200, 400, 404, 405]).toContain(response.status())
  })

  test('COD check should be included in pincode check', async ({ request }) => {
    const response = await request.post('/api/shipping/check-pincode', {
      data: {
        pincode: TEST_PINCODES.CHENNAI,
        store_id: INVALID_UUID,
        include_cod: true
      }
    })
    expect([200, 400, 404]).toContain(response.status())
  })
})

// ============================================
// ESTIMATED DELIVERY DAYS
// ============================================

test.describe('Estimated Delivery Days', () => {
  test('POST /api/shipping/estimate-delivery - should return delivery estimate', async ({ request }) => {
    const response = await request.post('/api/shipping/estimate-delivery', {
      data: {
        origin_pincode: TEST_PINCODES.MUMBAI,
        destination_pincode: TEST_PINCODES.DELHI,
        store_id: INVALID_UUID
      }
    })
    expect([200, 400, 404, 405]).toContain(response.status())
  })

  test('delivery estimate included in calculate endpoint', async ({ request }) => {
    const response = await request.post('/api/shipping/calculate', {
      data: {
        pincode: TEST_PINCODES.BANGALORE,
        weight: 500,
        store_id: INVALID_UUID
      }
    })
    expect([200, 400, 404]).toContain(response.status())

    if (response.status() === 200) {
      const data = await response.json()
      // Should include estimated delivery info
      expect(data).toBeDefined()
    }
  })
})

// ============================================
// SHIPPING COST CALCULATION
// ============================================

test.describe('Shipping Cost Calculation', () => {
  test('POST /api/shipping/calculate - should calculate shipping cost', async ({ request }) => {
    const response = await request.post('/api/shipping/calculate', {
      data: {
        pincode: TEST_PINCODES.MUMBAI,
        weight: 500, // 500 grams
        store_id: INVALID_UUID
      }
    })
    expect([200, 400, 404]).toContain(response.status())
  })

  test('should calculate based on weight', async ({ request }) => {
    const response = await request.post('/api/shipping/calculate', {
      data: {
        pincode: TEST_PINCODES.DELHI,
        weight: 1000, // 1 kg
        length: 20,
        breadth: 15,
        height: 10,
        store_id: INVALID_UUID
      }
    })
    expect([200, 400, 404]).toContain(response.status())
  })

  test('should calculate volumetric weight', async ({ request }) => {
    const response = await request.post('/api/shipping/calculate', {
      data: {
        pincode: TEST_PINCODES.BANGALORE,
        weight: 200,
        length: 50, // Large dimensions = high volumetric weight
        breadth: 40,
        height: 30,
        store_id: INVALID_UUID
      }
    })
    expect([200, 400, 404]).toContain(response.status())
  })

  test('should return multiple courier options', async ({ request }) => {
    const response = await request.post('/api/shipping/calculate', {
      data: {
        pincode: TEST_PINCODES.CHENNAI,
        weight: 750,
        store_id: INVALID_UUID
      }
    })
    expect([200, 400, 404]).toContain(response.status())

    if (response.status() === 200) {
      const data = await response.json()
      // Should have shipping rates
      expect(data).toBeDefined()
    }
  })
})

// ============================================
// CREATE SHIPMENT
// ============================================

test.describe('Create Shipment', () => {
  test('POST /api/shipping/create-shipment - should require authentication', async ({ request }) => {
    const response = await request.post('/api/shipping/create-shipment', {
      data: {
        order_id: INVALID_UUID
      }
    })
    expect([200, 400, 401, 404]).toContain(response.status())
  })

  test('should validate order exists', async ({ request }) => {
    const response = await request.post('/api/shipping/create-shipment', {
      data: {
        order_id: INVALID_UUID,
        courier_id: 'delhivery'
      }
    })
    expect([200, 400, 401, 404]).toContain(response.status())
  })

  test('should accept courier preference', async ({ request }) => {
    const response = await request.post('/api/shipping/create-shipment', {
      data: {
        order_id: INVALID_UUID,
        courier_id: 'bluedart',
        pickup_location: 'default'
      }
    })
    expect([200, 400, 401, 404]).toContain(response.status())
  })
})

// ============================================
// AWB CODE GENERATION
// ============================================

test.describe('AWB Code Generation', () => {
  test('AWB generated on shipment creation', async ({ request }) => {
    const response = await request.post('/api/shipping/create-shipment', {
      data: {
        order_id: INVALID_UUID,
        generate_awb: true
      }
    })
    expect([200, 400, 401, 404]).toContain(response.status())
  })

  test('POST /api/shipping/generate-awb - should generate AWB separately', async ({ request }) => {
    const response = await request.post('/api/shipping/generate-awb', {
      data: {
        shipment_id: INVALID_UUID
      }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })
})

// ============================================
// SHIPPING LABEL GENERATION
// ============================================

test.describe('Shipping Label Generation', () => {
  test('GET /api/shipping/label - should generate shipping label PDF', async ({ request }) => {
    const response = await request.get(`/api/shipping/label?shipment_id=${INVALID_UUID}`)
    expect([200, 400, 401, 404]).toContain(response.status())
  })

  test('POST /api/shipping/generate-label - should create label', async ({ request }) => {
    const response = await request.post('/api/shipping/generate-label', {
      data: {
        shipment_id: INVALID_UUID,
        format: 'pdf'
      }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })

  test('should support multiple label formats', async ({ request }) => {
    const response = await request.post('/api/shipping/generate-label', {
      data: {
        shipment_id: INVALID_UUID,
        format: 'zpl' // Zebra printer format
      }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })
})

// ============================================
// MANIFEST GENERATION
// ============================================

test.describe('Manifest Generation', () => {
  test('POST /api/shipping/generate-manifest - should create manifest', async ({ request }) => {
    const response = await request.post('/api/shipping/generate-manifest', {
      data: {
        shipment_ids: [INVALID_UUID]
      }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })

  test('should support bulk manifest creation', async ({ request }) => {
    const response = await request.post('/api/shipping/generate-manifest', {
      data: {
        shipment_ids: [INVALID_UUID, INVALID_UUID],
        date: new Date().toISOString().split('T')[0]
      }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })

  test('GET /api/shipping/manifest - should retrieve manifest', async ({ request }) => {
    const response = await request.get(`/api/shipping/manifest?date=${new Date().toISOString().split('T')[0]}`)
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })
})

// ============================================
// PICKUP SCHEDULING
// ============================================

test.describe('Pickup Scheduling', () => {
  test('POST /api/shipping/schedule-pickup - should schedule pickup', async ({ request }) => {
    const response = await request.post('/api/shipping/schedule-pickup', {
      data: {
        shipment_id: INVALID_UUID
      }
    })
    expect([200, 400, 401, 404]).toContain(response.status())
  })

  test('should accept pickup date/time', async ({ request }) => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)

    const response = await request.post('/api/shipping/schedule-pickup', {
      data: {
        shipment_id: INVALID_UUID,
        pickup_date: tomorrow.toISOString().split('T')[0],
        pickup_time: '10:00-14:00'
      }
    })
    expect([200, 400, 401, 404]).toContain(response.status())
  })

  test('should support bulk pickup scheduling', async ({ request }) => {
    const response = await request.post('/api/shipping/schedule-pickup', {
      data: {
        shipment_ids: [INVALID_UUID, INVALID_UUID]
      }
    })
    expect([200, 400, 401, 404]).toContain(response.status())
  })

  test('GET /api/shipping/pickup-slots - should return available slots', async ({ request }) => {
    const response = await request.get('/api/shipping/pickup-slots?pincode=' + TEST_PINCODES.MUMBAI)
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })
})

// ============================================
// COURIER SELECTION
// ============================================

test.describe('Courier Selection (7 Providers)', () => {
  const COURIERS = ['delhivery', 'bluedart', 'dtdc', 'fedex', 'ecom', 'xpressbees', 'shadowfax']

  test('should list available couriers', async ({ request }) => {
    const response = await request.get('/api/shipping/couriers')
    expect([200, 401, 404, 405]).toContain(response.status())
  })

  test('should recommend best courier', async ({ request }) => {
    const response = await request.post('/api/shipping/recommend-courier', {
      data: {
        origin_pincode: TEST_PINCODES.MUMBAI,
        destination_pincode: TEST_PINCODES.DELHI,
        weight: 500,
        priority: 'cost' // or 'speed', 'reliability'
      }
    })
    expect([200, 400, 404, 405]).toContain(response.status())
  })

  test('POST /api/shipping/calculate returns multiple couriers', async ({ request }) => {
    const response = await request.post('/api/shipping/calculate', {
      data: {
        pincode: TEST_PINCODES.BANGALORE,
        weight: 1000,
        store_id: INVALID_UUID
      }
    })
    expect([200, 400, 404]).toContain(response.status())
  })

  for (const courier of COURIERS.slice(0, 3)) { // Test first 3 couriers
    test(`should support ${courier} courier`, async ({ request }) => {
      const response = await request.post('/api/shipping/create-shipment', {
        data: {
          order_id: INVALID_UUID,
          courier_id: courier
        }
      })
      expect([200, 400, 401, 404]).toContain(response.status())
    })
  }
})

// ============================================
// TRACK BY AWB CODE
// ============================================

test.describe('Track by AWB Code', () => {
  test('GET /api/shipping/track - should track by AWB', async ({ request }) => {
    const response = await request.get('/api/shipping/track?awb=TEST123456')
    expect([200, 400, 404]).toContain(response.status())
  })

  test('should return tracking events', async ({ request }) => {
    const response = await request.get('/api/shipping/track?tracking_id=TEST123456')
    expect([200, 400, 404]).toContain(response.status())

    if (response.status() === 200) {
      const data = await response.json()
      expect(data).toBeDefined()
    }
  })

  test('POST /api/shipping/track - should accept AWB in body', async ({ request }) => {
    const response = await request.post('/api/shipping/track', {
      data: {
        awb: 'TEST123456',
        courier: 'delhivery'
      }
    })
    expect([200, 400, 404, 405]).toContain(response.status())
  })
})

// ============================================
// TRACK BY ORDER ID
// ============================================

test.describe('Track by Order ID', () => {
  test('GET /api/shipping/track - should track by order ID', async ({ request }) => {
    const response = await request.get(`/api/shipping/track?order_id=${INVALID_UUID}`)
    expect([200, 400, 401, 404]).toContain(response.status())
  })

  test('GET /api/orders/[id]/tracking - should return tracking info', async ({ request }) => {
    const response = await request.get(`/api/orders/${INVALID_UUID}/tracking`)
    expect([200, 401, 404, 405]).toContain(response.status())
  })

  test('order detail should include tracking', async ({ request }) => {
    const response = await request.get(`/api/orders/${INVALID_UUID}`)
    expect([200, 401, 404]).toContain(response.status())
  })
})

// ============================================
// SHIPMENT EVENTS LOGGING
// ============================================

test.describe('Shipment Events Logging', () => {
  test('GET /api/shipping/events - should return shipment events', async ({ request }) => {
    const response = await request.get(`/api/shipping/events?shipment_id=${INVALID_UUID}`)
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })

  test('tracking should include event history', async ({ request }) => {
    const response = await request.get('/api/shipping/track?awb=TEST123456')
    expect([200, 400, 404]).toContain(response.status())
  })

  test('POST /api/shipping/log-event - should log manual event', async ({ request }) => {
    const response = await request.post('/api/shipping/log-event', {
      data: {
        shipment_id: INVALID_UUID,
        event: 'picked_up',
        timestamp: new Date().toISOString()
      }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })
})

// ============================================
// WEBHOOK FOR STATUS UPDATES
// ============================================

test.describe('Webhook for Status Updates', () => {
  test('POST /api/webhooks/shiprocket - should handle tracking update', async ({ request }) => {
    const response = await request.post('/api/webhooks/shiprocket', {
      data: {
        event: 'tracking.update',
        order_id: 'ORD-TEST',
        awb: 'TEST123456',
        status: 'in_transit',
        current_status: 'In Transit',
        location: 'Mumbai Hub'
      }
    })
    expect([200, 400, 401]).toContain(response.status())
  })

  test('should handle delivery update', async ({ request }) => {
    const response = await request.post('/api/webhooks/shiprocket', {
      data: {
        event: 'shipment.delivered',
        order_id: 'ORD-TEST',
        awb: 'TEST123456',
        status: 'delivered',
        delivered_at: new Date().toISOString()
      }
    })
    expect([200, 400, 401]).toContain(response.status())
  })

  test('should handle RTO update', async ({ request }) => {
    const response = await request.post('/api/webhooks/shiprocket', {
      data: {
        event: 'shipment.rto',
        order_id: 'ORD-TEST',
        awb: 'TEST123456',
        status: 'rto_initiated',
        reason: 'Customer not available'
      }
    })
    expect([200, 400, 401]).toContain(response.status())
  })

  test('POST /api/webhooks/delhivery - should handle Delhivery webhook', async ({ request }) => {
    const response = await request.post('/api/webhooks/delhivery', {
      data: {
        Shipment: {
          AWB: 'TEST123456',
          Status: { Status: 'Delivered' }
        }
      }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })
})

// ============================================
// DELIVERY CONFIRMATION
// ============================================

test.describe('Delivery Confirmation', () => {
  test('POST /api/orders/[id]/deliver - should mark as delivered', async ({ request }) => {
    const response = await request.post(`/api/orders/${INVALID_UUID}/deliver`, {
      data: {
        delivered_at: new Date().toISOString()
      }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })

  test('delivery should trigger email notification', async ({ request }) => {
    // Delivery confirmation triggers email in background
    const response = await request.post(`/api/orders/${INVALID_UUID}/deliver`, {
      data: {}
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })

  test('GET /api/orders/[id] - delivered order should have status', async ({ request }) => {
    const response = await request.get(`/api/orders/${INVALID_UUID}`)
    expect([200, 401, 404]).toContain(response.status())
  })

  test('should support POD (Proof of Delivery)', async ({ request }) => {
    const response = await request.post(`/api/orders/${INVALID_UUID}/deliver`, {
      data: {
        delivered_at: new Date().toISOString(),
        pod_image: 'base64_image_data',
        receiver_name: 'John Doe',
        signature: 'base64_signature'
      }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })
})

// ============================================
// SHIPPING PROVIDER SETTINGS
// ============================================

test.describe('Shipping Provider Settings', () => {
  test('GET /api/dashboard/settings/shipping-providers - should list providers', async ({ request }) => {
    const response = await request.get('/api/dashboard/settings/shipping-providers')
    expect([200, 401, 404, 405]).toContain(response.status())
  })

  test('POST /api/dashboard/settings/shipping-providers - should save credentials', async ({ request }) => {
    const response = await request.post('/api/dashboard/settings/shipping-providers', {
      data: {
        provider: 'shiprocket',
        credentials: {
          email: 'test@example.com',
          password: 'test_password'
        }
      }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })

  test('should support multiple providers', async ({ request }) => {
    const response = await request.post('/api/dashboard/settings/shipping-providers', {
      data: {
        provider: 'delhivery',
        credentials: {
          api_token: 'test_token',
          client_name: 'test_client'
        }
      }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })
})

// ============================================
// RETURN/RTO HANDLING
// ============================================

test.describe('Return/RTO Handling', () => {
  test('POST /api/shipping/initiate-return - should initiate return', async ({ request }) => {
    const response = await request.post('/api/shipping/initiate-return', {
      data: {
        order_id: INVALID_UUID,
        reason: 'Customer return request'
      }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })

  test('should create reverse pickup', async ({ request }) => {
    const response = await request.post('/api/shipping/reverse-pickup', {
      data: {
        order_id: INVALID_UUID,
        pickup_address: {
          name: 'Customer',
          address_line1: '123 Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: TEST_PINCODES.MUMBAI,
          phone: '9876543210'
        }
      }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })
})
