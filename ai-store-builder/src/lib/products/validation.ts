// Product Validation Schemas

import { z } from 'zod'

/**
 * Schema for creating a new product
 */
export const productInputSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title too long'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000, 'Description too long'),
  price: z.number().positive('Price must be positive'),
  compare_at_price: z.number().positive('Compare at price must be positive').optional().nullable(),
  cost_per_item: z.number().positive('Cost must be positive').optional().nullable(),
  sku: z.string().max(100, 'SKU too long').optional().nullable(),
  barcode: z.string().max(100, 'Barcode too long').optional().nullable(),
  quantity: z.number().int('Quantity must be a whole number').min(0, 'Quantity cannot be negative').default(0),
  track_quantity: z.boolean().default(true),
  weight: z.number().positive('Weight must be positive').optional().nullable(),
  requires_shipping: z.boolean().default(true),
  categories: z.array(z.string()).max(5, 'Maximum 5 categories').optional().default([]),
  tags: z.array(z.string()).max(20, 'Maximum 20 tags').optional().default([]),
  status: z.enum(['draft', 'published']).default('draft'),
  featured: z.boolean().default(false)
})

/**
 * Schema for product upload request (allows optional AI extraction)
 */
export const productUploadSchema = z.object({
  store_id: z.string().uuid('Invalid store ID'),
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(10).max(5000).optional(),
  price: z.number().positive().optional(),
  compare_at_price: z.number().positive().optional().nullable(),
  cost_per_item: z.number().positive().optional().nullable(),
  sku: z.string().max(100).optional().nullable(),
  barcode: z.string().max(100).optional().nullable(),
  quantity: z.number().int().min(0).optional().default(0),
  track_quantity: z.boolean().optional().default(true),
  weight: z.number().positive().optional().nullable(),
  requires_shipping: z.boolean().optional().default(true),
  categories: z.array(z.string()).max(5).optional(),
  tags: z.array(z.string()).max(20).optional(),
  status: z.enum(['draft', 'published']).optional().default('draft')
})

/**
 * Schema for updating a product
 */
export const productUpdateSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(10).max(5000).optional(),
  price: z.number().positive().optional(),
  compare_at_price: z.number().positive().optional().nullable(),
  cost_per_item: z.number().positive().optional().nullable(),
  sku: z.string().max(100).optional().nullable(),
  barcode: z.string().max(100).optional().nullable(),
  quantity: z.number().int().min(0).optional(),
  track_quantity: z.boolean().optional(),
  weight: z.number().positive().optional().nullable(),
  requires_shipping: z.boolean().optional(),
  categories: z.array(z.string()).max(5).optional(),
  tags: z.array(z.string()).max(20).optional(),
  status: z.enum(['draft', 'published']).optional(),
  featured: z.boolean().optional()
})

/**
 * Schema for bulk product upload
 */
export const bulkProductSchema = z.object({
  store_id: z.string().uuid('Invalid store ID'),
  products: z.array(productInputSchema).min(1, 'At least one product required').max(100, 'Maximum 100 products per batch')
})

/**
 * Schema for CSV row
 */
export const csvRowSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional().default(''),
  price: z.string().transform(val => parseFloat(val)).pipe(z.number().positive()),
  compare_at_price: z.string().optional().transform(val => val ? parseFloat(val) : null).nullable(),
  sku: z.string().optional().nullable(),
  quantity: z.string().optional().transform(val => val ? parseInt(val) : 0).default('0'),
  category: z.string().optional().transform(val => val ? val.split(',').map(c => c.trim()) : []),
  tags: z.string().optional().transform(val => val ? val.split(',').map(t => t.trim()) : []),
  image_filename: z.string().optional().nullable()
})

/**
 * Schema for product list query params
 */
export const productListQuerySchema = z.object({
  store_id: z.string().uuid(),
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? Math.min(parseInt(val), 100) : 24),
  status: z.enum(['draft', 'published', 'archived', 'all']).optional().default('all'),
  category: z.string().optional(),
  search: z.string().optional(),
  sort_by: z.enum(['created_at', 'price', 'title', 'quantity']).optional().default('created_at'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc')
})

// Type exports
export type ProductInput = z.infer<typeof productInputSchema>
export type ProductUpload = z.infer<typeof productUploadSchema>
export type ProductUpdate = z.infer<typeof productUpdateSchema>
export type BulkProductInput = z.infer<typeof bulkProductSchema>
export type CSVRow = z.infer<typeof csvRowSchema>
export type ProductListQuery = z.infer<typeof productListQuerySchema>

/**
 * Validate that compare_at_price is greater than price
 */
export function validatePricing(price: number, compareAtPrice?: number | null): { valid: boolean; error?: string } {
  if (price <= 0) {
    return { valid: false, error: 'Price must be greater than 0' }
  }
  
  if (compareAtPrice !== null && compareAtPrice !== undefined) {
    if (compareAtPrice <= price) {
      return { valid: false, error: 'Compare at price must be greater than sale price' }
    }
  }
  
  return { valid: true }
}

/**
 * Sanitize product data
 */
export function sanitizeProductData<T extends Record<string, unknown>>(data: T): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sanitized: any = { ...data }

  // Trim string fields
  if (typeof sanitized.title === 'string') {
    sanitized.title = sanitized.title.trim()
  }
  if (typeof sanitized.description === 'string') {
    sanitized.description = sanitized.description.trim()
  }
  if (typeof sanitized.sku === 'string') {
    sanitized.sku = sanitized.sku.trim().toUpperCase()
  }

  // Normalize tags to lowercase
  if (Array.isArray(sanitized.tags)) {
    sanitized.tags = sanitized.tags.map((t: string) => t.toLowerCase().trim())
  }

  // Normalize categories
  if (Array.isArray(sanitized.categories)) {
    sanitized.categories = sanitized.categories.map((c: string) => c.trim())
  }

  return sanitized as T
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const MAX_SIZE = 10 * 1024 * 1024 // 10MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Invalid image type. Allowed: JPEG, PNG, WebP' }
  }
  
  if (file.size > MAX_SIZE) {
    return { valid: false, error: 'Image too large. Maximum size: 10MB' }
  }
  
  return { valid: true }
}

/**
 * Validate multiple image files
 */
export function validateImageFiles(files: File[]): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const MAX_IMAGES = 10
  
  if (files.length === 0) {
    errors.push('At least one image is required')
  }
  
  if (files.length > MAX_IMAGES) {
    errors.push(`Maximum ${MAX_IMAGES} images allowed`)
  }
  
  files.forEach((file, index) => {
    const result = validateImageFile(file)
    if (!result.valid) {
      errors.push(`Image ${index + 1}: ${result.error}`)
    }
  })
  
  return { valid: errors.length === 0, errors }
}
