// CSV Parser for Bulk Product Upload

import Papa from 'papaparse'
import { csvRowSchema, type ProductInput } from './validation'

export interface CSVParseResult {
  success: boolean
  products: ProductInput[]
  errors: Array<{
    row: number
    field?: string
    error: string
  }>
  warnings: Array<{
    row: number
    message: string
  }>
}

export interface CSVRow {
  title: string
  description?: string
  price: string
  compare_at_price?: string
  sku?: string
  quantity?: string
  category?: string
  tags?: string
  image_filename?: string
}

// Expected CSV headers
const REQUIRED_HEADERS = ['title', 'price']
const OPTIONAL_HEADERS = [
  'description',
  'compare_at_price',
  'sku',
  'barcode',
  'quantity',
  'category',
  'tags',
  'image_filename',
  'weight',
  'requires_shipping'
]

/**
 * Parse CSV file content
 */
export async function parseCSVFile(file: File): Promise<CSVParseResult> {
  const text = await file.text()
  return parseCSVContent(text)
}

/**
 * Parse CSV content string
 */
export function parseCSVContent(content: string): CSVParseResult {
  const result: CSVParseResult = {
    success: true,
    products: [],
    errors: [],
    warnings: []
  }

  // Parse CSV with PapaParse
  const parsed = Papa.parse<CSVRow>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.toLowerCase().trim().replace(/\s+/g, '_')
  })

  // Check for parse errors
  if (parsed.errors.length > 0) {
    parsed.errors.forEach(err => {
      result.errors.push({
        row: err.row !== undefined ? err.row + 2 : 0, // +2 for header and 0-index
        error: err.message
      })
    })
  }

  // Validate headers
  const headers = parsed.meta.fields || []
  const missingRequired = REQUIRED_HEADERS.filter(h => !headers.includes(h))
  
  if (missingRequired.length > 0) {
    result.errors.push({
      row: 1,
      error: `Missing required headers: ${missingRequired.join(', ')}`
    })
    result.success = false
    return result
  }

  // Warn about unknown headers
  const knownHeaders = [...REQUIRED_HEADERS, ...OPTIONAL_HEADERS]
  const unknownHeaders = headers.filter(h => !knownHeaders.includes(h))
  if (unknownHeaders.length > 0) {
    result.warnings.push({
      row: 1,
      message: `Unknown headers will be ignored: ${unknownHeaders.join(', ')}`
    })
  }

  // Process each row
  parsed.data.forEach((row, index) => {
    const rowNumber = index + 2 // +2 for header row and 0-index

    try {
      // Validate and transform row data
      const validatedRow = csvRowSchema.parse({
        title: row.title,
        description: row.description || '',
        price: row.price,
        compare_at_price: row.compare_at_price || null,
        sku: row.sku || null,
        quantity: row.quantity || '0',
        category: row.category || '',
        tags: row.tags || '',
        image_filename: row.image_filename || null
      })

      // Create product input
      const product: ProductInput = {
        title: validatedRow.title,
        description: validatedRow.description || `${validatedRow.title} - Quality product`,
        price: validatedRow.price,
        compare_at_price: validatedRow.compare_at_price,
        sku: validatedRow.sku,
        quantity: validatedRow.quantity,
        track_quantity: true,
        requires_shipping: true,
        categories: validatedRow.category,
        tags: validatedRow.tags,
        status: 'draft',
        featured: false
      }

      // Store image filename in tags for later matching (will be removed)
      if (validatedRow.image_filename) {
        (product as Record<string, unknown>)._image_filename = validatedRow.image_filename
      }

      result.products.push(product)
    } catch (error) {
      if (error instanceof Error) {
        // Parse Zod errors
        if ('errors' in error) {
          const zodError = error as { errors: Array<{ path: string[]; message: string }> }
          zodError.errors.forEach(e => {
            result.errors.push({
              row: rowNumber,
              field: e.path.join('.'),
              error: e.message
            })
          })
        } else {
          result.errors.push({
            row: rowNumber,
            error: error.message
          })
        }
      } else {
        result.errors.push({
          row: rowNumber,
          error: 'Invalid row data'
        })
      }
    }
  })

  // Set success flag
  result.success = result.errors.length === 0 && result.products.length > 0

  // Add warning if no products parsed
  if (result.products.length === 0 && result.errors.length === 0) {
    result.warnings.push({
      row: 0,
      message: 'No valid products found in CSV'
    })
  }

  return result
}

/**
 * Generate sample CSV content
 */
export function generateSampleCSV(): string {
  const headers = [
    'title',
    'description',
    'price',
    'compare_at_price',
    'sku',
    'quantity',
    'category',
    'tags',
    'image_filename'
  ]

  const sampleRows = [
    [
      'Blue Cotton Saree',
      'Beautiful handwoven cotton saree in royal blue',
      '2500',
      '3000',
      'SAR-001',
      '10',
      'Fashion,Women\'s Clothing',
      'saree,cotton,blue,traditional',
      'blue_saree.jpg'
    ],
    [
      'Green Silk Blouse',
      'Premium silk blouse with elegant embroidery',
      '1800',
      '2200',
      'BLS-001',
      '15',
      'Fashion,Women\'s Clothing',
      'blouse,silk,green,ethnic',
      'green_blouse.jpg'
    ]
  ]

  return [
    headers.join(','),
    ...sampleRows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')
}

/**
 * Validate CSV file before parsing
 */
export function validateCSVFile(file: File): { valid: boolean; error?: string } {
  const MAX_SIZE = 5 * 1024 * 1024 // 5MB
  const ALLOWED_TYPES = ['text/csv', 'application/vnd.ms-excel', 'text/plain']
  const ALLOWED_EXTENSIONS = ['.csv', '.txt']

  // Check file size
  if (file.size > MAX_SIZE) {
    return { valid: false, error: 'CSV file too large. Maximum size: 5MB' }
  }

  // Check file type
  const hasValidType = ALLOWED_TYPES.includes(file.type) || file.type === ''
  const hasValidExtension = ALLOWED_EXTENSIONS.some(ext => 
    file.name.toLowerCase().endsWith(ext)
  )

  if (!hasValidType && !hasValidExtension) {
    return { valid: false, error: 'Invalid file type. Please upload a CSV file' }
  }

  return { valid: true }
}

/**
 * Match image files to products by filename
 */
export function matchImagesToProducts(
  products: ProductInput[],
  imageFiles: Map<string, File>
): Map<number, File[]> {
  const matches = new Map<number, File[]>()

  products.forEach((product, index) => {
    const filename = (product as Record<string, unknown>)._image_filename as string | undefined
    
    if (filename) {
      // Try exact match first
      let file = imageFiles.get(filename)
      
      // Try case-insensitive match
      if (!file) {
        const lowerFilename = filename.toLowerCase()
        for (const [key, value] of imageFiles.entries()) {
          if (key.toLowerCase() === lowerFilename) {
            file = value
            break
          }
        }
      }

      // Try matching without extension
      if (!file) {
        const baseName = filename.replace(/\.[^/.]+$/, '').toLowerCase()
        for (const [key, value] of imageFiles.entries()) {
          const keyBase = key.replace(/\.[^/.]+$/, '').toLowerCase()
          if (keyBase === baseName) {
            file = value
            break
          }
        }
      }

      if (file) {
        matches.set(index, [file])
      }

      // Remove internal field
      delete (product as Record<string, unknown>)._image_filename
    }
  })

  return matches
}
