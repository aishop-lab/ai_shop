// Demo Product Templates - Auto-created when store is built
// These are removed when the user uploads their first real product

export interface DemoProductTemplate {
  title: string
  description: string
  price: number
  compare_at_price?: number
  categories: string[]
  tags: string[]
}

// Placeholder image URLs (using public placeholder services)
const PLACEHOLDER_IMAGES = [
  'https://placehold.co/800x800/e2e8f0/64748b?text=Demo+Product+1',
  'https://placehold.co/800x800/dbeafe/3b82f6?text=Demo+Product+2',
  'https://placehold.co/800x800/dcfce7/22c55e?text=Demo+Product+3',
  'https://placehold.co/800x800/fef3c7/f59e0b?text=Demo+Product+4',
]

// Category-specific demo products
const DEMO_PRODUCTS_BY_CATEGORY: Record<string, DemoProductTemplate[]> = {
  'fashion': [
    {
      title: 'DEMO: Classic Cotton T-Shirt',
      description: 'This is a demo product. Add your first real product to remove all demo items.',
      price: 799,
      compare_at_price: 999,
      categories: ['Clothing', 'T-Shirts'],
      tags: ['demo', 'cotton', 'casual']
    },
    {
      title: 'DEMO: Slim Fit Jeans',
      description: 'This is a demo product. Upload your own products to replace these placeholder items.',
      price: 1499,
      compare_at_price: 1999,
      categories: ['Clothing', 'Jeans'],
      tags: ['demo', 'denim', 'casual']
    },
    {
      title: 'DEMO: Summer Dress',
      description: 'This is a demo product. Your real products will appear here after you add them.',
      price: 1299,
      categories: ['Clothing', 'Dresses'],
      tags: ['demo', 'summer', 'floral']
    },
    {
      title: 'DEMO: Leather Belt',
      description: 'This is a demo product. Start adding your inventory to see your store come to life.',
      price: 599,
      categories: ['Accessories', 'Belts'],
      tags: ['demo', 'leather', 'accessories']
    }
  ],
  'electronics': [
    {
      title: 'DEMO: Wireless Earbuds',
      description: 'This is a demo product. Add your first real product to remove all demo items.',
      price: 2499,
      compare_at_price: 2999,
      categories: ['Electronics', 'Audio'],
      tags: ['demo', 'wireless', 'bluetooth']
    },
    {
      title: 'DEMO: Phone Case',
      description: 'This is a demo product. Upload your own products to replace these placeholder items.',
      price: 499,
      categories: ['Accessories', 'Phone Cases'],
      tags: ['demo', 'protective', 'stylish']
    },
    {
      title: 'DEMO: USB-C Charger',
      description: 'This is a demo product. Your real products will appear here after you add them.',
      price: 799,
      compare_at_price: 999,
      categories: ['Electronics', 'Chargers'],
      tags: ['demo', 'fast-charging', 'usb-c']
    },
    {
      title: 'DEMO: Laptop Stand',
      description: 'This is a demo product. Start adding your inventory to see your store come to life.',
      price: 1299,
      categories: ['Accessories', 'Office'],
      tags: ['demo', 'ergonomic', 'aluminum']
    }
  ],
  'food': [
    {
      title: 'DEMO: Premium Coffee Beans',
      description: 'This is a demo product. Add your first real product to remove all demo items.',
      price: 599,
      categories: ['Beverages', 'Coffee'],
      tags: ['demo', 'arabica', 'premium']
    },
    {
      title: 'DEMO: Organic Honey',
      description: 'This is a demo product. Upload your own products to replace these placeholder items.',
      price: 399,
      categories: ['Food', 'Natural'],
      tags: ['demo', 'organic', 'natural']
    },
    {
      title: 'DEMO: Artisan Chocolates',
      description: 'This is a demo product. Your real products will appear here after you add them.',
      price: 899,
      compare_at_price: 1099,
      categories: ['Food', 'Sweets'],
      tags: ['demo', 'handmade', 'gift']
    },
    {
      title: 'DEMO: Trail Mix',
      description: 'This is a demo product. Start adding your inventory to see your store come to life.',
      price: 299,
      categories: ['Food', 'Snacks'],
      tags: ['demo', 'healthy', 'nuts']
    }
  ],
  'home': [
    {
      title: 'DEMO: Scented Candle',
      description: 'This is a demo product. Add your first real product to remove all demo items.',
      price: 499,
      categories: ['Home', 'Decor'],
      tags: ['demo', 'fragrance', 'relaxing']
    },
    {
      title: 'DEMO: Throw Pillow',
      description: 'This is a demo product. Upload your own products to replace these placeholder items.',
      price: 799,
      categories: ['Home', 'Furnishing'],
      tags: ['demo', 'comfort', 'decorative']
    },
    {
      title: 'DEMO: Plant Pot',
      description: 'This is a demo product. Your real products will appear here after you add them.',
      price: 349,
      categories: ['Home', 'Garden'],
      tags: ['demo', 'ceramic', 'minimalist']
    },
    {
      title: 'DEMO: Wall Art Print',
      description: 'This is a demo product. Start adding your inventory to see your store come to life.',
      price: 1299,
      compare_at_price: 1599,
      categories: ['Home', 'Art'],
      tags: ['demo', 'modern', 'abstract']
    }
  ],
  'default': [
    {
      title: 'DEMO: Sample Product 1',
      description: 'This is a demo product. Add your first real product to remove all demo items.',
      price: 999,
      compare_at_price: 1299,
      categories: ['General'],
      tags: ['demo', 'sample']
    },
    {
      title: 'DEMO: Sample Product 2',
      description: 'This is a demo product. Upload your own products to replace these placeholder items.',
      price: 1499,
      categories: ['General'],
      tags: ['demo', 'sample']
    },
    {
      title: 'DEMO: Sample Product 3',
      description: 'This is a demo product. Your real products will appear here after you add them.',
      price: 799,
      categories: ['General'],
      tags: ['demo', 'sample']
    },
    {
      title: 'DEMO: Sample Product 4',
      description: 'This is a demo product. Start adding your inventory to see your store come to life.',
      price: 599,
      categories: ['General'],
      tags: ['demo', 'sample']
    }
  ]
}

/**
 * Get demo products based on store category
 */
export function getDemoProducts(category?: string): DemoProductTemplate[] {
  if (!category) return DEMO_PRODUCTS_BY_CATEGORY['default']

  const normalizedCategory = category.toLowerCase()

  // Map common category names to our templates
  if (normalizedCategory.includes('fashion') || normalizedCategory.includes('clothing') || normalizedCategory.includes('apparel')) {
    return DEMO_PRODUCTS_BY_CATEGORY['fashion']
  }
  if (normalizedCategory.includes('electronic') || normalizedCategory.includes('tech') || normalizedCategory.includes('gadget')) {
    return DEMO_PRODUCTS_BY_CATEGORY['electronics']
  }
  if (normalizedCategory.includes('food') || normalizedCategory.includes('beverage') || normalizedCategory.includes('grocery')) {
    return DEMO_PRODUCTS_BY_CATEGORY['food']
  }
  if (normalizedCategory.includes('home') || normalizedCategory.includes('decor') || normalizedCategory.includes('furniture')) {
    return DEMO_PRODUCTS_BY_CATEGORY['home']
  }

  return DEMO_PRODUCTS_BY_CATEGORY['default']
}

/**
 * Get placeholder image URL for demo products
 */
export function getDemoProductImageUrl(index: number): string {
  return PLACEHOLDER_IMAGES[index % PLACEHOLDER_IMAGES.length]
}
