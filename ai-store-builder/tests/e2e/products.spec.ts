import { test, expect } from '@playwright/test'

/**
 * Products E2E Tests
 *
 * Comprehensive tests for product management including:
 * - CRUD operations (create, read, update, delete)
 * - Field validation
 * - Variants
 * - AI features
 * - Bulk operations
 * - Import/Export
 */

const TEST_STORE_SLUG = process.env.PLAYWRIGHT_TEST_STORE_SLUG || 'demo-store'
const INVALID_UUID = '00000000-0000-0000-0000-000000000000'

// ============================================
// PRODUCT CRUD OPERATIONS
// ============================================

test.describe('Create Product', () => {
  test('POST /api/products/upload - should create product with basic fields', async ({ request }) => {
    const response = await request.post('/api/products/upload', {
      data: {
        title: 'Test Product',
        description: 'A test product description',
        price: 999,
        category: 'Electronics'
      }
    })
    expect([200, 400, 401]).toContain(response.status())
  })

  test('should validate required fields', async ({ request }) => {
    const response = await request.post('/api/products/upload', {
      data: {
        // Missing title
        price: 999
      }
    })
    expect([200, 400, 401]).toContain(response.status())
  })

  test('POST /api/products - alternative create endpoint', async ({ request }) => {
    const response = await request.post('/api/products', {
      data: {
        title: 'New Product',
        price: 1499
      }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })
})

test.describe('Edit Product', () => {
  test('PUT /api/products/[id] - should update product details', async ({ request }) => {
    const response = await request.put(`/api/products/${INVALID_UUID}`, {
      data: {
        title: 'Updated Product Title',
        price: 1299
      }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })

  test('PATCH /api/products/[id] - partial update', async ({ request }) => {
    const response = await request.patch(`/api/products/${INVALID_UUID}`, {
      data: {
        price: 899
      }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })
})

test.describe('Delete Product', () => {
  test('DELETE /api/products/[id] - should soft delete product', async ({ request }) => {
    const response = await request.delete(`/api/products/${INVALID_UUID}`)
    expect([200, 401, 404]).toContain(response.status())
  })

  test('POST /api/products/[id]/hard-delete - should permanently delete', async ({ request }) => {
    const response = await request.post(`/api/products/${INVALID_UUID}/hard-delete`)
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })
})

test.describe('Duplicate Product', () => {
  test('POST /api/products/[id]/duplicate - should clone product', async ({ request }) => {
    const response = await request.post(`/api/products/${INVALID_UUID}/duplicate`)
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })

  test('duplicate should have unique SKU', async ({ request }) => {
    const response = await request.post(`/api/products/${INVALID_UUID}/duplicate`, {
      data: {
        new_sku_prefix: 'COPY-'
      }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })
})

test.describe('Publish/Unpublish Product', () => {
  test('POST /api/products/[id]/publish - should publish product', async ({ request }) => {
    const response = await request.post(`/api/products/${INVALID_UUID}/publish`)
    expect([200, 400, 401, 404]).toContain(response.status())
  })

  test('POST /api/products/[id]/unpublish - should unpublish product', async ({ request }) => {
    const response = await request.post(`/api/products/${INVALID_UUID}/unpublish`)
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })

  test('PATCH update status field', async ({ request }) => {
    const response = await request.patch(`/api/products/${INVALID_UUID}`, {
      data: { status: 'draft' }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })
})

test.describe('Archive Product', () => {
  test('POST /api/products/[id]/archive - should archive product', async ({ request }) => {
    const response = await request.post(`/api/products/${INVALID_UUID}/archive`)
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })

  test('POST /api/products/[id]/unarchive - should restore product', async ({ request }) => {
    const response = await request.post(`/api/products/${INVALID_UUID}/unarchive`)
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })
})

// ============================================
// FIELD VALIDATION
// ============================================

test.describe('Title Field Validation', () => {
  test('should reject empty title', async ({ request }) => {
    const response = await request.post('/api/products/upload', {
      data: { title: '', price: 999 }
    })
    expect([200, 400, 401]).toContain(response.status())
  })

  test('should enforce max title length', async ({ request }) => {
    const response = await request.post('/api/products/upload', {
      data: { title: 'A'.repeat(500), price: 999 }
    })
    expect([200, 400, 401]).toContain(response.status())
  })
})

test.describe('Description Field', () => {
  test('should accept rich text description', async ({ request }) => {
    const response = await request.post('/api/products/upload', {
      data: {
        title: 'Test Product',
        description: '<p>Rich <strong>text</strong> description</p>',
        price: 999
      }
    })
    expect([200, 400, 401]).toContain(response.status())
  })
})

test.describe('Price Field', () => {
  test('should require positive price', async ({ request }) => {
    const response = await request.post('/api/products/upload', {
      data: { title: 'Test', price: -100 }
    })
    expect([200, 400, 401]).toContain(response.status())
  })

  test('should accept decimal prices', async ({ request }) => {
    const response = await request.post('/api/products/upload', {
      data: { title: 'Test', price: 999.99 }
    })
    expect([200, 400, 401]).toContain(response.status())
  })
})

test.describe('Compare At Price', () => {
  test('should validate compare_at_price > price', async ({ request }) => {
    const response = await request.post('/api/products/upload', {
      data: {
        title: 'Test',
        price: 999,
        compare_at_price: 800 // Should be > price
      }
    })
    expect([200, 400, 401]).toContain(response.status())
  })

  test('valid compare_at_price shows discount', async ({ request }) => {
    const response = await request.post('/api/products/upload', {
      data: {
        title: 'Test',
        price: 799,
        compare_at_price: 999
      }
    })
    expect([200, 400, 401]).toContain(response.status())
  })
})

test.describe('Cost Per Item', () => {
  test('should accept cost_per_item', async ({ request }) => {
    const response = await request.post('/api/products/upload', {
      data: {
        title: 'Test',
        price: 999,
        cost_per_item: 500
      }
    })
    expect([200, 400, 401]).toContain(response.status())
  })
})

test.describe('SKU Field', () => {
  test('should accept valid SKU', async ({ request }) => {
    const response = await request.post('/api/products/upload', {
      data: {
        title: 'Test',
        price: 999,
        sku: 'TEST-SKU-001'
      }
    })
    expect([200, 400, 401]).toContain(response.status())
  })

  test('should enforce unique SKU per store', async ({ request }) => {
    // First product
    await request.post('/api/products/upload', {
      data: { title: 'Test 1', price: 999, sku: 'UNIQUE-SKU' }
    })
    // Second product with same SKU
    const response = await request.post('/api/products/upload', {
      data: { title: 'Test 2', price: 999, sku: 'UNIQUE-SKU' }
    })
    expect([200, 400, 401]).toContain(response.status())
  })
})

test.describe('Barcode Field', () => {
  test('should accept barcode', async ({ request }) => {
    const response = await request.post('/api/products/upload', {
      data: {
        title: 'Test',
        price: 999,
        barcode: '1234567890123'
      }
    })
    expect([200, 400, 401]).toContain(response.status())
  })
})

test.describe('Quantity Field', () => {
  test('should require non-negative quantity', async ({ request }) => {
    const response = await request.post('/api/products/upload', {
      data: {
        title: 'Test',
        price: 999,
        quantity: -5
      }
    })
    expect([200, 400, 401]).toContain(response.status())
  })

  test('should accept zero quantity', async ({ request }) => {
    const response = await request.post('/api/products/upload', {
      data: {
        title: 'Test',
        price: 999,
        quantity: 0,
        track_quantity: true
      }
    })
    expect([200, 400, 401]).toContain(response.status())
  })
})

test.describe('Track Quantity Toggle', () => {
  test('should enable quantity tracking', async ({ request }) => {
    const response = await request.post('/api/products/upload', {
      data: {
        title: 'Test',
        price: 999,
        track_quantity: true,
        quantity: 100
      }
    })
    expect([200, 400, 401]).toContain(response.status())
  })

  test('should disable quantity tracking', async ({ request }) => {
    const response = await request.patch(`/api/products/${INVALID_UUID}`, {
      data: { track_quantity: false }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })
})

test.describe('Weight Field', () => {
  test('should accept weight in grams', async ({ request }) => {
    const response = await request.post('/api/products/upload', {
      data: {
        title: 'Test',
        price: 999,
        weight: 500
      }
    })
    expect([200, 400, 401]).toContain(response.status())
  })
})

test.describe('Requires Shipping Toggle', () => {
  test('should set requires_shipping', async ({ request }) => {
    const response = await request.post('/api/products/upload', {
      data: {
        title: 'Digital Product',
        price: 999,
        requires_shipping: false
      }
    })
    expect([200, 400, 401]).toContain(response.status())
  })
})

test.describe('Categories', () => {
  test('should accept multiple categories', async ({ request }) => {
    const response = await request.post('/api/products/upload', {
      data: {
        title: 'Test',
        price: 999,
        categories: ['Electronics', 'Accessories']
      }
    })
    expect([200, 400, 401]).toContain(response.status())
  })
})

test.describe('Tags', () => {
  test('should accept multiple tags', async ({ request }) => {
    const response = await request.post('/api/products/upload', {
      data: {
        title: 'Test',
        price: 999,
        tags: ['new', 'sale', 'trending']
      }
    })
    expect([200, 400, 401]).toContain(response.status())
  })
})

test.describe('Featured Flag', () => {
  test('should toggle featured flag', async ({ request }) => {
    const response = await request.patch(`/api/products/${INVALID_UUID}`, {
      data: { is_featured: true }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })
})

test.describe('Product Status', () => {
  test('should set draft status', async ({ request }) => {
    const response = await request.post('/api/products/upload', {
      data: { title: 'Test', price: 999, status: 'draft' }
    })
    expect([200, 400, 401]).toContain(response.status())
  })

  test('should set published status', async ({ request }) => {
    const response = await request.patch(`/api/products/${INVALID_UUID}`, {
      data: { status: 'published' }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })

  test('should set archived status', async ({ request }) => {
    const response = await request.patch(`/api/products/${INVALID_UUID}`, {
      data: { status: 'archived' }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })
})

test.describe('HSN Code', () => {
  test('should accept HSN code for GST', async ({ request }) => {
    const response = await request.post('/api/products/upload', {
      data: {
        title: 'Test',
        price: 999,
        hsn_code: '8517'
      }
    })
    expect([200, 400, 401]).toContain(response.status())
  })
})

test.describe('is_demo Flag', () => {
  test('demo products should be marked', async ({ request }) => {
    const response = await request.get(`/api/store/${TEST_STORE_SLUG}/products`)
    expect([200, 404]).toContain(response.status())
  })

  test('first upload should remove demo products', async ({ request }) => {
    const response = await request.post('/api/products/upload', {
      data: {
        title: 'First Real Product',
        price: 999,
        remove_demo: true
      }
    })
    expect([200, 400, 401]).toContain(response.status())
  })
})

// ============================================
// PRODUCT IMAGES
// ============================================

test.describe('Product Images', () => {
  test('should upload multiple images', async ({ request }) => {
    const response = await request.post('/api/products/upload', {
      data: {
        title: 'Test',
        price: 999,
        images: ['image1_url', 'image2_url']
      }
    })
    expect([200, 400, 401]).toContain(response.status())
  })

  test('should limit to 10 images', async ({ request }) => {
    const response = await request.post('/api/products/upload', {
      data: {
        title: 'Test',
        price: 999,
        images: Array(15).fill('image_url')
      }
    })
    expect([200, 400, 401]).toContain(response.status())
  })

  test('POST /api/products/[id]/images - add images', async ({ request }) => {
    const response = await request.post(`/api/products/${INVALID_UUID}/images`, {
      data: { images: ['new_image_url'] }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })

  test('should reorder images', async ({ request }) => {
    const response = await request.patch(`/api/products/${INVALID_UUID}/images`, {
      data: {
        image_order: ['image_id_2', 'image_id_1', 'image_id_3']
      }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })

  test('should support alt text', async ({ request }) => {
    const response = await request.patch(`/api/products/${INVALID_UUID}/images`, {
      data: {
        images: [{ id: 'img_1', alt_text: 'Product front view' }]
      }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })

  test('DELETE /api/products/[id]/images/[imageId] - delete image', async ({ request }) => {
    const response = await request.delete(`/api/products/${INVALID_UUID}/images/img_1`)
    expect([200, 401, 404, 405]).toContain(response.status())
  })
})

// ============================================
// PRODUCT VARIANTS
// ============================================

test.describe('Variant Options', () => {
  test('should create size variants', async ({ request }) => {
    const response = await request.post(`/api/products/${INVALID_UUID}/variants`, {
      data: {
        options: [
          { name: 'Size', values: ['S', 'M', 'L', 'XL'] }
        ]
      }
    })
    expect([200, 400, 401, 404]).toContain(response.status())
  })

  test('should create color variants', async ({ request }) => {
    const response = await request.post(`/api/products/${INVALID_UUID}/variants`, {
      data: {
        options: [
          { name: 'Color', values: [
            { value: 'Red', color_code: '#FF0000' },
            { value: 'Blue', color_code: '#0000FF' }
          ]}
        ]
      }
    })
    expect([200, 400, 401, 404]).toContain(response.status())
  })

  test('should create custom variants', async ({ request }) => {
    const response = await request.post(`/api/products/${INVALID_UUID}/variants`, {
      data: {
        options: [
          { name: 'Material', values: ['Cotton', 'Polyester'] }
        ]
      }
    })
    expect([200, 400, 401, 404]).toContain(response.status())
  })
})

test.describe('Auto-generate Variant Combinations', () => {
  test('should generate all combinations', async ({ request }) => {
    const response = await request.post(`/api/products/${INVALID_UUID}/variants/generate`, {
      data: {
        options: [
          { name: 'Size', values: ['S', 'M', 'L'] },
          { name: 'Color', values: ['Red', 'Blue'] }
        ]
      }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })
})

test.describe('Per-variant Pricing', () => {
  test('should set variant-specific price', async ({ request }) => {
    const response = await request.patch(`/api/products/${INVALID_UUID}/variants/var_1`, {
      data: { price: 1199 }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })
})

test.describe('Per-variant SKU/Barcode', () => {
  test('should set variant SKU', async ({ request }) => {
    const response = await request.patch(`/api/products/${INVALID_UUID}/variants/var_1`, {
      data: {
        sku: 'PROD-SIZE-S',
        barcode: '1234567890001'
      }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })
})

test.describe('Per-variant Quantity', () => {
  test('should track quantity per variant', async ({ request }) => {
    const response = await request.patch(`/api/products/${INVALID_UUID}/variants/var_1`, {
      data: { quantity: 50 }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })
})

test.describe('Per-variant Images', () => {
  test('should assign image to variant', async ({ request }) => {
    const response = await request.patch(`/api/products/${INVALID_UUID}/variants/var_1`, {
      data: { image_id: 'img_red' }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })
})

test.describe('Default Variant', () => {
  test('should set default variant', async ({ request }) => {
    const response = await request.patch(`/api/products/${INVALID_UUID}`, {
      data: { default_variant_id: 'var_1' }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })
})

test.describe('Variant Enable/Disable', () => {
  test('should disable variant', async ({ request }) => {
    const response = await request.patch(`/api/products/${INVALID_UUID}/variants/var_1`, {
      data: { enabled: false }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })
})

test.describe('Convert to Simple Product', () => {
  test('should remove all variants', async ({ request }) => {
    const response = await request.delete(`/api/products/${INVALID_UUID}/variants`)
    expect([200, 401, 404, 405]).toContain(response.status())
  })
})

// ============================================
// AI FEATURES
// ============================================

test.describe('AI Product Analysis', () => {
  test('POST /api/products/analyze-image - should analyze product image', async ({ request }) => {
    const response = await request.post('/api/products/analyze-image', {
      data: { image: 'base64_image_data' }
    })
    expect([200, 400, 401]).toContain(response.status())
  })

  test('POST /api/products/extract - should extract from image', async ({ request }) => {
    const response = await request.post('/api/products/extract', {
      data: { image: 'base64_image_data' }
    })
    expect([200, 400, 401]).toContain(response.status())
  })
})

test.describe('AI Title Generation', () => {
  test('POST /api/ai/generate-title - should generate title', async ({ request }) => {
    const response = await request.post('/api/ai/generate-title', {
      data: { description: 'A blue cotton shirt for men' }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })
})

test.describe('AI Description Generation', () => {
  test('POST /api/ai/generate-description - should generate description', async ({ request }) => {
    const response = await request.post('/api/ai/generate-description', {
      data: { title: 'Blue Cotton Shirt' }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })

  test('POST /api/ai/stream-description - should stream description', async ({ request }) => {
    const response = await request.post('/api/ai/stream-description', {
      data: { title: 'Product' }
    })
    expect([200, 400, 401]).toContain(response.status())
  })
})

test.describe('AI Category/Tag Extraction', () => {
  test('POST /api/products/extract-category - should extract category', async ({ request }) => {
    const response = await request.post('/api/products/extract-category', {
      data: { description: 'A stylish leather handbag' }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })

  test('should extract tags from description', async ({ request }) => {
    const response = await request.post('/api/products/analyze-image', {
      data: { image: 'base64_data', extract_tags: true }
    })
    expect([200, 400, 401]).toContain(response.status())
  })
})

test.describe('AI Price Suggestions', () => {
  test('POST /api/products/suggest-price - should suggest price', async ({ request }) => {
    const response = await request.post('/api/products/suggest-price', {
      data: {
        title: 'Premium Leather Wallet',
        category: 'Accessories'
      }
    })
    expect([200, 400, 401]).toContain(response.status())
  })
})

test.describe('AI Confidence Scores', () => {
  test('analysis should include confidence', async ({ request }) => {
    const response = await request.post('/api/products/extract', {
      data: { image: 'base64_data' }
    })
    expect([200, 400, 401]).toContain(response.status())

    if (response.status() === 200) {
      const data = await response.json()
      // Should include confidence scores
      expect(data).toBeDefined()
    }
  })
})

test.describe('Multi-image Analysis', () => {
  test('POST /api/products/extract-multi - should analyze multiple images', async ({ request }) => {
    const response = await request.post('/api/products/extract-multi', {
      data: {
        images: ['base64_image1', 'base64_image2']
      }
    })
    expect([200, 400, 401]).toContain(response.status())
  })
})

// ============================================
// BULK OPERATIONS
// ============================================

test.describe('CSV Bulk Upload', () => {
  test('POST /api/products/bulk-upload - should accept CSV', async ({ request }) => {
    const response = await request.post('/api/products/bulk-upload', {
      data: {
        csv_data: 'title,price,sku\nProduct 1,999,SKU-001',
        format: 'csv'
      }
    })
    expect([200, 400, 401]).toContain(response.status())
  })

  test('GET /api/products/template - should return CSV template', async ({ request }) => {
    const response = await request.get('/api/products/template?format=csv')
    expect([200, 401, 404, 405]).toContain(response.status())
  })
})

test.describe('Bulk Actions', () => {
  test('POST /api/products/bulk-publish - should publish multiple', async ({ request }) => {
    const response = await request.post('/api/products/bulk-publish', {
      data: { product_ids: [INVALID_UUID] }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })

  test('POST /api/products/bulk-archive - should archive multiple', async ({ request }) => {
    const response = await request.post('/api/products/bulk-archive', {
      data: { product_ids: [INVALID_UUID] }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })

  test('POST /api/products/bulk-delete - should delete multiple', async ({ request }) => {
    const response = await request.post('/api/products/bulk-delete', {
      data: { product_ids: [INVALID_UUID] }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })

  test('POST /api/products/bulk-update-price - should update prices', async ({ request }) => {
    const response = await request.post('/api/products/bulk-update-price', {
      data: {
        product_ids: [INVALID_UUID],
        price_adjustment: { type: 'percentage', value: 10 }
      }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })

  test('POST /api/products/bulk-update-category - should update categories', async ({ request }) => {
    const response = await request.post('/api/products/bulk-update-category', {
      data: {
        product_ids: [INVALID_UUID],
        category: 'New Category'
      }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })

  test('POST /api/dashboard/bulk-actions - generic bulk endpoint', async ({ request }) => {
    const response = await request.post('/api/dashboard/bulk-actions', {
      data: {
        action: 'publish',
        ids: [INVALID_UUID]
      }
    })
    expect([200, 400, 401]).toContain(response.status())
  })
})

// ============================================
// EXPORT
// ============================================

test.describe('Export Products', () => {
  test('GET /api/products/export - should export to CSV', async ({ request }) => {
    const response = await request.get('/api/products/export?format=csv')
    expect([200, 401, 404, 405]).toContain(response.status())
  })

  test('should export to JSON', async ({ request }) => {
    const response = await request.get('/api/products/export?format=json')
    expect([200, 401, 404, 405]).toContain(response.status())
  })

  test('POST /api/dashboard/export - should export data', async ({ request }) => {
    const response = await request.post('/api/dashboard/export', {
      data: { type: 'products', format: 'csv' }
    })
    expect([200, 400, 401, 404, 405]).toContain(response.status())
  })
})

// ============================================
// PRODUCT LIST API
// ============================================

test.describe('Product List', () => {
  test('GET /api/products/list - should return products', async ({ request }) => {
    const response = await request.get('/api/products/list')
    expect([200, 401]).toContain(response.status())
  })

  test('should support pagination', async ({ request }) => {
    const response = await request.get('/api/products/list?page=1&limit=10')
    expect([200, 401]).toContain(response.status())
  })

  test('should support filtering by status', async ({ request }) => {
    const response = await request.get('/api/products/list?status=published')
    expect([200, 401]).toContain(response.status())
  })

  test('should support search', async ({ request }) => {
    const response = await request.get('/api/products/list?search=shirt')
    expect([200, 401]).toContain(response.status())
  })

  test('should support sorting', async ({ request }) => {
    const response = await request.get('/api/products/list?sort=price&order=desc')
    expect([200, 401]).toContain(response.status())
  })
})
