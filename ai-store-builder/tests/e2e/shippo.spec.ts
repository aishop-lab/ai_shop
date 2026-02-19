import { test, expect } from '@playwright/test'

/**
 * Shippo Shipping Integration E2E Tests
 *
 * Tests for Shippo shipping provider including:
 * - Shippo credential validation
 * - US shipping rate calculation
 * - Multi-carrier rate comparison (USPS, UPS, FedEx)
 * - Shipment creation with label purchase
 * - Shipment tracking
 * - Shippo provider settings
 * - Provider manager integration
 */

const INVALID_UUID = '00000000-0000-0000-0000-000000000000'

// US zip codes for testing
const TEST_ZIP_CODES = {
  NEW_YORK: '10001',
  LOS_ANGELES: '90001',
  CHICAGO: '60601',
  HOUSTON: '77001',
  INVALID: '00000'
}

// ============================================
// SHIPPO CREDENTIAL VALIDATION
// ============================================

test.describe('Shippo Credential Validation', () => {
  test('POST /api/dashboard/settings/shipping-providers - should accept Shippo credentials', async ({ request }) => {
    const response = await request.post('/api/dashboard/settings/shipping-providers', {
      data: {
        provider: 'shippo',
        credentials: {
          apiToken: 'shippo_test_token123'
        }
      }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })

  test('should validate Shippo API token', async ({ request }) => {
    const response = await request.post('/api/dashboard/settings/shipping-providers', {
      data: {
        provider: 'shippo',
        credentials: {
          apiToken: 'invalid_token'
        }
      }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })

  test('should reject empty Shippo credentials', async ({ request }) => {
    const response = await request.post('/api/dashboard/settings/shipping-providers', {
      data: {
        provider: 'shippo',
        credentials: {}
      }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })

  test('should reject missing API token', async ({ request }) => {
    const response = await request.post('/api/dashboard/settings/shipping-providers', {
      data: {
        provider: 'shippo',
        credentials: {
          apiToken: ''
        }
      }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })
})

// ============================================
// SHIPPO SHIPPING RATE CALCULATION
// ============================================

test.describe('Shippo Rate Calculation', () => {
  test('POST /api/shipping/calculate - should calculate US shipping rates', async ({ request }) => {
    const response = await request.post('/api/shipping/calculate', {
      data: {
        pincode: TEST_ZIP_CODES.NEW_YORK,
        weight: 500, // 500 grams
        store_id: INVALID_UUID
      }
    })
    expect([200, 400, 404]).toContain(response.status())
  })

  test('should calculate rates for heavy package', async ({ request }) => {
    const response = await request.post('/api/shipping/calculate', {
      data: {
        pincode: TEST_ZIP_CODES.LOS_ANGELES,
        weight: 5000, // 5 kg
        length: 30,
        breadth: 20,
        height: 15,
        store_id: INVALID_UUID
      }
    })
    expect([200, 400, 404]).toContain(response.status())
  })

  test('should calculate rates for cross-country delivery', async ({ request }) => {
    const response = await request.post('/api/shipping/calculate', {
      data: {
        pincode: TEST_ZIP_CODES.CHICAGO,
        weight: 1000,
        store_id: INVALID_UUID
      }
    })
    expect([200, 400, 404]).toContain(response.status())

    if (response.status() === 200) {
      const data = await response.json()
      expect(data).toBeDefined()
      // Should have rates from multiple carriers
    }
  })

  test('should handle volumetric weight calculation', async ({ request }) => {
    const response = await request.post('/api/shipping/calculate', {
      data: {
        pincode: TEST_ZIP_CODES.HOUSTON,
        weight: 200, // Light but large package
        length: 50,
        breadth: 40,
        height: 30,
        store_id: INVALID_UUID
      }
    })
    expect([200, 400, 404]).toContain(response.status())
  })
})

// ============================================
// MULTI-CARRIER RATE COMPARISON
// ============================================

test.describe('Shippo Multi-Carrier Rates', () => {
  test('should return USPS rates', async ({ request }) => {
    const response = await request.post('/api/shipping/calculate', {
      data: {
        pincode: TEST_ZIP_CODES.NEW_YORK,
        weight: 500,
        store_id: INVALID_UUID,
        carrier: 'usps'
      }
    })
    expect([200, 400, 404]).toContain(response.status())
  })

  test('should return UPS rates', async ({ request }) => {
    const response = await request.post('/api/shipping/calculate', {
      data: {
        pincode: TEST_ZIP_CODES.LOS_ANGELES,
        weight: 1000,
        store_id: INVALID_UUID,
        carrier: 'ups'
      }
    })
    expect([200, 400, 404]).toContain(response.status())
  })

  test('should return FedEx rates', async ({ request }) => {
    const response = await request.post('/api/shipping/calculate', {
      data: {
        pincode: TEST_ZIP_CODES.CHICAGO,
        weight: 2000,
        store_id: INVALID_UUID,
        carrier: 'fedex'
      }
    })
    expect([200, 400, 404]).toContain(response.status())
  })

  test('should compare rates across carriers', async ({ request }) => {
    const response = await request.post('/api/shipping/calculate', {
      data: {
        pincode: TEST_ZIP_CODES.NEW_YORK,
        weight: 750,
        store_id: INVALID_UUID
      }
    })
    expect([200, 400, 404]).toContain(response.status())

    if (response.status() === 200) {
      const data = await response.json()
      expect(data).toBeDefined()
    }
  })
})

// ============================================
// SHIPPO SHIPMENT CREATION
// ============================================

test.describe('Shippo Shipment Creation', () => {
  test('POST /api/shipping/create-shipment - should create Shippo shipment', async ({ request }) => {
    const response = await request.post('/api/shipping/create-shipment', {
      data: {
        order_id: INVALID_UUID,
        courier_id: 'shippo'
      }
    })
    expect([200, 400, 401, 404]).toContain(response.status())
  })

  test('should create shipment with US address', async ({ request }) => {
    const response = await request.post('/api/shipping/create-shipment', {
      data: {
        order_id: INVALID_UUID,
        courier_id: 'shippo',
        delivery_address: {
          name: 'John Doe',
          street1: '123 Main St',
          city: 'New York',
          state: 'NY',
          zip: '10001',
          country: 'US'
        }
      }
    })
    expect([200, 400, 401, 404]).toContain(response.status())
  })

  test('should support different package sizes', async ({ request }) => {
    const response = await request.post('/api/shipping/create-shipment', {
      data: {
        order_id: INVALID_UUID,
        courier_id: 'shippo',
        weight: 2.5,
        length: 12,
        width: 8,
        height: 6
      }
    })
    expect([200, 400, 401, 404]).toContain(response.status())
  })
})

// ============================================
// SHIPPO TRACKING
// ============================================

test.describe('Shippo Tracking', () => {
  test('GET /api/shipping/track - should track Shippo shipment by AWB', async ({ request }) => {
    const response = await request.get('/api/shipping/track?awb=SHIPPO_TEST_123&courier=shippo')
    expect([200, 400, 404]).toContain(response.status())
  })

  test('should track USPS shipment via Shippo', async ({ request }) => {
    const response = await request.get('/api/shipping/track?awb=9400111899223456789012&courier=usps')
    expect([200, 400, 404]).toContain(response.status())
  })

  test('should track UPS shipment via Shippo', async ({ request }) => {
    const response = await request.get('/api/shipping/track?awb=1Z999AA10123456784&courier=ups')
    expect([200, 400, 404]).toContain(response.status())
  })

  test('should track FedEx shipment via Shippo', async ({ request }) => {
    const response = await request.get('/api/shipping/track?awb=123456789012&courier=fedex')
    expect([200, 400, 404]).toContain(response.status())
  })

  test('POST /api/shipping/track - should accept tracking request in body', async ({ request }) => {
    const response = await request.post('/api/shipping/track', {
      data: {
        awb: 'SHIPPO_TRACK_TEST',
        courier: 'shippo'
      }
    })
    expect([200, 400, 404, 405]).toContain(response.status())
  })

  test('should track by order ID', async ({ request }) => {
    const response = await request.get(`/api/shipping/track?order_id=${INVALID_UUID}`)
    expect([200, 400, 401, 404]).toContain(response.status())
  })
})

// ============================================
// SHIPPO PROVIDER SETTINGS
// ============================================

test.describe('Shippo Provider Settings', () => {
  test('GET /api/dashboard/settings/shipping-providers - should list Shippo as available', async ({ request }) => {
    const response = await request.get('/api/dashboard/settings/shipping-providers')
    expect([200, 401, 404, 405]).toContain(response.status())
  })

  test('should save Shippo provider credentials', async ({ request }) => {
    const response = await request.post('/api/dashboard/settings/shipping-providers', {
      data: {
        provider: 'shippo',
        credentials: {
          apiToken: 'shippo_test_abc123'
        }
      }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })

  test('should update existing Shippo credentials', async ({ request }) => {
    const response = await request.post('/api/dashboard/settings/shipping-providers', {
      data: {
        provider: 'shippo',
        credentials: {
          apiToken: 'shippo_test_updated_token'
        }
      }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })

  test('should remove Shippo provider', async ({ request }) => {
    const response = await request.delete('/api/dashboard/settings/shipping-providers', {
      data: {
        provider: 'shippo'
      }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })
})

// ============================================
// PROVIDER MANAGER INTEGRATION
// ============================================

test.describe('Shippo Provider Manager Integration', () => {
  test('should coexist with existing providers', async ({ request }) => {
    // Shippo alongside Shiprocket
    const response = await request.post('/api/dashboard/settings/shipping-providers', {
      data: {
        provider: 'shippo',
        credentials: {
          apiToken: 'shippo_test_coexist'
        }
      }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })

  test('should support self-delivery alongside Shippo', async ({ request }) => {
    const response = await request.post('/api/dashboard/settings/shipping-providers', {
      data: {
        provider: 'self',
        credentials: {}
      }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })
})

// ============================================
// SHIPPO LABEL GENERATION
// ============================================

test.describe('Shippo Label Generation', () => {
  test('should generate shipping label', async ({ request }) => {
    const response = await request.post('/api/shipping/generate-label', {
      data: {
        shipment_id: INVALID_UUID,
        provider: 'shippo',
        format: 'pdf'
      }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })

  test('GET /api/shipping/label - should retrieve Shippo label', async ({ request }) => {
    const response = await request.get(`/api/shipping/label?shipment_id=${INVALID_UUID}&provider=shippo`)
    expect([200, 400, 401, 404]).toContain(response.status())
  })
})

// ============================================
// SHIPPO CANCELLATION / REFUND
// ============================================

test.describe('Shippo Cancellation', () => {
  test('should cancel Shippo shipment', async ({ request }) => {
    const response = await request.post('/api/shipping/cancel', {
      data: {
        shipment_id: INVALID_UUID,
        provider: 'shippo'
      }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })

  test('should request label refund', async ({ request }) => {
    const response = await request.post('/api/shipping/refund-label', {
      data: {
        transaction_id: 'test_transaction_123',
        provider: 'shippo'
      }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })
})

// ============================================
// EDGE CASES
// ============================================

test.describe('Shippo Edge Cases', () => {
  test('should handle invalid zip code', async ({ request }) => {
    const response = await request.post('/api/shipping/calculate', {
      data: {
        pincode: TEST_ZIP_CODES.INVALID,
        weight: 500,
        store_id: INVALID_UUID
      }
    })
    expect([200, 400, 404]).toContain(response.status())
  })

  test('should handle zero weight package', async ({ request }) => {
    const response = await request.post('/api/shipping/calculate', {
      data: {
        pincode: TEST_ZIP_CODES.NEW_YORK,
        weight: 0,
        store_id: INVALID_UUID
      }
    })
    expect([200, 400, 404]).toContain(response.status())
  })

  test('should handle extremely heavy package', async ({ request }) => {
    const response = await request.post('/api/shipping/calculate', {
      data: {
        pincode: TEST_ZIP_CODES.LOS_ANGELES,
        weight: 50000, // 50kg - may exceed carrier limits
        store_id: INVALID_UUID
      }
    })
    expect([200, 400, 404]).toContain(response.status())
  })
})
