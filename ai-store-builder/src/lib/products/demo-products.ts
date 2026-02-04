/**
 * Demo Products System
 *
 * Provides category-specific demo products for new stores.
 * These are automatically created during onboarding and removed
 * when the merchant uploads their first real product.
 */

export interface DemoProductTemplate {
  title: string
  description: string
  price: number
  compare_at_price?: number
  categories: string[]
  tags: string[]
  image: string
}

// Demo product images organized by category
// Using Unsplash for high-quality, free-to-use images
const DEMO_IMAGES = {
  fashion: [
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=800&fit=crop', // White t-shirt
    'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&h=800&fit=crop', // Jeans
    'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&h=800&fit=crop', // Dress
  ],
  electronics: [
    'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&h=800&fit=crop', // Earbuds
    'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=800&h=800&fit=crop', // Phone
    'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&h=800&fit=crop', // Laptop
  ],
  food: [
    'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800&h=800&fit=crop', // Coffee
    'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&h=800&fit=crop', // Honey
    'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=800&h=800&fit=crop', // Chocolates
  ],
  home: [
    'https://images.unsplash.com/photo-1602028915047-37269d1a73f7?w=800&h=800&fit=crop', // Candle
    'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800&h=800&fit=crop', // Pillow
    'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800&h=800&fit=crop', // Plant
  ],
  beauty: [
    'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&h=800&fit=crop', // Makeup
    'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800&h=800&fit=crop', // Skincare
    'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=800&h=800&fit=crop', // Perfume
  ],
  jewelry: [
    'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&h=800&fit=crop', // Necklace
    'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&h=800&fit=crop', // Earrings
    'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&h=800&fit=crop', // Ring
  ],
  sports: [
    'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&h=800&fit=crop', // Yoga mat
    'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&h=800&fit=crop', // Dumbbells
    'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800&h=800&fit=crop', // Sneakers
  ],
  books: [
    'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&h=800&fit=crop', // Book
    'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=800&h=800&fit=crop', // Notebook
    'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=800&h=800&fit=crop', // Pen set
  ],
  toys: [
    'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=800&h=800&fit=crop', // Building blocks
    'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=800&h=800&fit=crop', // Teddy bear
    'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=800&h=800&fit=crop', // Board game
  ],
  health: [
    'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=800&h=800&fit=crop', // Supplements
    'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&h=800&fit=crop', // Herbs
    'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&h=800&fit=crop', // Essential oils
  ],
  pets: [
    'https://images.unsplash.com/photo-1535294435445-d7249524ef2e?w=800&h=800&fit=crop', // Dog food
    'https://images.unsplash.com/photo-1567612529009-afe25813a308?w=800&h=800&fit=crop', // Pet toy
    'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800&h=800&fit=crop', // Pet bed
  ],
  default: [
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=800&fit=crop', // Watch
    'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&h=800&fit=crop', // Sunglasses
    'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&h=800&fit=crop', // Product
  ],
}

// Demo products by category - 3 products each
const DEMO_PRODUCTS_BY_CATEGORY: Record<string, DemoProductTemplate[]> = {
  fashion: [
    {
      title: 'Classic Cotton T-Shirt',
      description: 'Premium quality cotton t-shirt with a comfortable fit. Perfect for everyday wear. This is a demo product - upload your own products to replace it.',
      price: 799,
      compare_at_price: 999,
      categories: ['Clothing', 'T-Shirts'],
      tags: ['cotton', 'casual', 'bestseller'],
      image: DEMO_IMAGES.fashion[0],
    },
    {
      title: 'Slim Fit Denim Jeans',
      description: 'Stylish slim fit jeans made from premium denim. Comfortable stretch fabric for all-day wear. Demo product.',
      price: 1499,
      compare_at_price: 1999,
      categories: ['Clothing', 'Jeans'],
      tags: ['denim', 'casual', 'trending'],
      image: DEMO_IMAGES.fashion[1],
    },
    {
      title: 'Elegant Summer Dress',
      description: 'Beautiful floral print dress perfect for summer occasions. Light and breathable fabric. Demo product.',
      price: 1299,
      categories: ['Clothing', 'Dresses'],
      tags: ['summer', 'floral', 'party'],
      image: DEMO_IMAGES.fashion[2],
    },
  ],

  electronics: [
    {
      title: 'Wireless Bluetooth Earbuds',
      description: 'Premium wireless earbuds with noise cancellation and 24-hour battery life. Crystal clear sound quality. Demo product.',
      price: 2499,
      compare_at_price: 3499,
      categories: ['Electronics', 'Audio'],
      tags: ['wireless', 'bluetooth', 'bestseller'],
      image: DEMO_IMAGES.electronics[0],
    },
    {
      title: 'Smartphone Pro Max',
      description: 'Latest smartphone with advanced camera system and all-day battery. Demo product - upload your own products.',
      price: 49999,
      compare_at_price: 54999,
      categories: ['Electronics', 'Phones'],
      tags: ['smartphone', 'camera', 'new'],
      image: DEMO_IMAGES.electronics[1],
    },
    {
      title: 'Ultra-thin Laptop',
      description: 'Powerful and portable laptop for work and entertainment. Stunning display and fast performance. Demo product.',
      price: 64999,
      categories: ['Electronics', 'Computers'],
      tags: ['laptop', 'portable', 'professional'],
      image: DEMO_IMAGES.electronics[2],
    },
  ],

  food: [
    {
      title: 'Premium Arabica Coffee Beans',
      description: 'Single-origin arabica coffee beans with rich, smooth flavor. Freshly roasted for the perfect cup. Demo product.',
      price: 599,
      compare_at_price: 799,
      categories: ['Food', 'Coffee'],
      tags: ['organic', 'arabica', 'fresh'],
      image: DEMO_IMAGES.food[0],
    },
    {
      title: 'Raw Organic Honey',
      description: 'Pure, unprocessed honey sourced from local farms. Natural sweetness with health benefits. Demo product.',
      price: 449,
      categories: ['Food', 'Natural'],
      tags: ['organic', 'natural', 'healthy'],
      image: DEMO_IMAGES.food[1],
    },
    {
      title: 'Artisan Dark Chocolates',
      description: 'Handcrafted dark chocolates made with premium cocoa. Perfect gift for chocolate lovers. Demo product.',
      price: 899,
      compare_at_price: 1099,
      categories: ['Food', 'Chocolates'],
      tags: ['artisan', 'gift', 'premium'],
      image: DEMO_IMAGES.food[2],
    },
  ],

  home: [
    {
      title: 'Luxury Scented Candle',
      description: 'Hand-poured soy wax candle with calming lavender fragrance. Burns for 50+ hours. Demo product.',
      price: 699,
      compare_at_price: 899,
      categories: ['Home', 'Candles'],
      tags: ['scented', 'relaxation', 'gift'],
      image: DEMO_IMAGES.home[0],
    },
    {
      title: 'Velvet Throw Pillow',
      description: 'Soft velvet cushion cover with elegant design. Adds a touch of luxury to any room. Demo product.',
      price: 599,
      categories: ['Home', 'Decor'],
      tags: ['velvet', 'comfort', 'decorative'],
      image: DEMO_IMAGES.home[1],
    },
    {
      title: 'Indoor Plant with Ceramic Pot',
      description: 'Low-maintenance indoor plant in a beautiful handcrafted ceramic pot. Perfect for home or office. Demo product.',
      price: 849,
      categories: ['Home', 'Plants'],
      tags: ['indoor', 'green', 'decor'],
      image: DEMO_IMAGES.home[2],
    },
  ],

  beauty: [
    {
      title: 'Professional Makeup Kit',
      description: 'Complete makeup set with eyeshadow palette, brushes, and essentials. Perfect for beginners and pros. Demo product.',
      price: 1999,
      compare_at_price: 2999,
      categories: ['Beauty', 'Makeup'],
      tags: ['professional', 'kit', 'bestseller'],
      image: DEMO_IMAGES.beauty[0],
    },
    {
      title: 'Hydrating Skincare Set',
      description: 'Complete skincare routine with cleanser, serum, and moisturizer. For radiant, healthy skin. Demo product.',
      price: 1499,
      categories: ['Beauty', 'Skincare'],
      tags: ['hydrating', 'natural', 'glowing'],
      image: DEMO_IMAGES.beauty[1],
    },
    {
      title: 'Luxury Eau de Parfum',
      description: 'Long-lasting fragrance with notes of jasmine and sandalwood. Elegant and sophisticated. Demo product.',
      price: 2499,
      compare_at_price: 3499,
      categories: ['Beauty', 'Fragrance'],
      tags: ['luxury', 'long-lasting', 'gift'],
      image: DEMO_IMAGES.beauty[2],
    },
  ],

  jewelry: [
    {
      title: 'Sterling Silver Pendant Necklace',
      description: 'Elegant sterling silver necklace with delicate pendant design. Perfect for everyday elegance. Demo product.',
      price: 1299,
      compare_at_price: 1799,
      categories: ['Jewelry', 'Necklaces'],
      tags: ['silver', 'elegant', 'gift'],
      image: DEMO_IMAGES.jewelry[0],
    },
    {
      title: 'Crystal Drop Earrings',
      description: 'Stunning crystal earrings that catch the light beautifully. Ideal for special occasions. Demo product.',
      price: 899,
      categories: ['Jewelry', 'Earrings'],
      tags: ['crystal', 'party', 'sparkle'],
      image: DEMO_IMAGES.jewelry[1],
    },
    {
      title: 'Gold-Plated Statement Ring',
      description: 'Bold gold-plated ring with contemporary design. Makes a stylish statement. Demo product.',
      price: 699,
      categories: ['Jewelry', 'Rings'],
      tags: ['gold', 'statement', 'trendy'],
      image: DEMO_IMAGES.jewelry[2],
    },
  ],

  sports: [
    {
      title: 'Premium Yoga Mat',
      description: 'Extra-thick non-slip yoga mat with alignment lines. Perfect for yoga, pilates, and workouts. Demo product.',
      price: 1299,
      compare_at_price: 1799,
      categories: ['Sports', 'Yoga'],
      tags: ['yoga', 'fitness', 'non-slip'],
      image: DEMO_IMAGES.sports[0],
    },
    {
      title: 'Adjustable Dumbbell Set',
      description: 'Space-saving adjustable dumbbells for home workouts. Multiple weight options in one. Demo product.',
      price: 3999,
      categories: ['Sports', 'Fitness'],
      tags: ['strength', 'home-gym', 'adjustable'],
      image: DEMO_IMAGES.sports[1],
    },
    {
      title: 'Performance Running Shoes',
      description: 'Lightweight running shoes with superior cushioning and support. Built for speed and comfort. Demo product.',
      price: 4999,
      compare_at_price: 5999,
      categories: ['Sports', 'Footwear'],
      tags: ['running', 'comfort', 'performance'],
      image: DEMO_IMAGES.sports[2],
    },
  ],

  books: [
    {
      title: 'Bestselling Fiction Novel',
      description: 'Award-winning novel that has captivated millions of readers worldwide. A must-read masterpiece. Demo product.',
      price: 399,
      compare_at_price: 499,
      categories: ['Books', 'Fiction'],
      tags: ['bestseller', 'fiction', 'award-winning'],
      image: DEMO_IMAGES.books[0],
    },
    {
      title: 'Premium Leather Journal',
      description: 'Handcrafted leather-bound journal with thick, quality paper. Perfect for writing or sketching. Demo product.',
      price: 799,
      categories: ['Stationery', 'Journals'],
      tags: ['leather', 'premium', 'gift'],
      image: DEMO_IMAGES.books[1],
    },
    {
      title: 'Executive Pen Set',
      description: 'Elegant pen set in a gift box. Smooth writing experience with premium craftsmanship. Demo product.',
      price: 1299,
      compare_at_price: 1599,
      categories: ['Stationery', 'Pens'],
      tags: ['executive', 'gift', 'professional'],
      image: DEMO_IMAGES.books[2],
    },
  ],

  toys: [
    {
      title: 'Creative Building Blocks Set',
      description: '500+ piece building blocks set for endless creative play. Develops problem-solving skills. Demo product.',
      price: 1499,
      compare_at_price: 1999,
      categories: ['Toys', 'Building'],
      tags: ['creative', 'educational', 'kids'],
      image: DEMO_IMAGES.toys[0],
    },
    {
      title: 'Cuddly Plush Teddy Bear',
      description: 'Super soft and huggable teddy bear. Made with child-safe materials. Perfect cuddle companion. Demo product.',
      price: 799,
      categories: ['Toys', 'Plush'],
      tags: ['soft', 'cuddly', 'gift'],
      image: DEMO_IMAGES.toys[1],
    },
    {
      title: 'Family Board Game Collection',
      description: 'Classic board games for family fun nights. Hours of entertainment for all ages. Demo product.',
      price: 999,
      categories: ['Toys', 'Games'],
      tags: ['family', 'fun', 'classic'],
      image: DEMO_IMAGES.toys[2],
    },
  ],

  health: [
    {
      title: 'Daily Multivitamin Supplements',
      description: 'Complete daily vitamins and minerals for optimal health. 90-day supply in each bottle. Demo product.',
      price: 699,
      compare_at_price: 899,
      categories: ['Health', 'Supplements'],
      tags: ['vitamins', 'daily', 'wellness'],
      image: DEMO_IMAGES.health[0],
    },
    {
      title: 'Organic Herbal Tea Collection',
      description: 'Assortment of healing herbal teas. Ayurvedic blends for mind and body wellness. Demo product.',
      price: 449,
      categories: ['Health', 'Herbal'],
      tags: ['organic', 'ayurvedic', 'natural'],
      image: DEMO_IMAGES.health[1],
    },
    {
      title: 'Aromatherapy Essential Oils Set',
      description: 'Pure essential oils for relaxation and wellness. Includes lavender, eucalyptus, and more. Demo product.',
      price: 999,
      compare_at_price: 1299,
      categories: ['Health', 'Aromatherapy'],
      tags: ['essential-oils', 'relaxation', 'natural'],
      image: DEMO_IMAGES.health[2],
    },
  ],

  pets: [
    {
      title: 'Premium Dog Food',
      description: 'Nutritious and delicious dog food made with real meat and vegetables. Vet recommended formula. Demo product.',
      price: 899,
      compare_at_price: 1099,
      categories: ['Pets', 'Dog Food'],
      tags: ['premium', 'nutritious', 'dogs'],
      image: DEMO_IMAGES.pets[0],
    },
    {
      title: 'Interactive Pet Toy',
      description: 'Engaging toy that keeps your pet entertained for hours. Durable and safe materials. Demo product.',
      price: 399,
      categories: ['Pets', 'Toys'],
      tags: ['interactive', 'fun', 'durable'],
      image: DEMO_IMAGES.pets[1],
    },
    {
      title: 'Cozy Pet Bed',
      description: 'Ultra-soft pet bed with washable cover. Perfect sleeping spot for your furry friend. Demo product.',
      price: 1299,
      categories: ['Pets', 'Beds'],
      tags: ['cozy', 'washable', 'comfort'],
      image: DEMO_IMAGES.pets[2],
    },
  ],

  default: [
    {
      title: 'Premium Quality Product',
      description: 'High-quality product crafted with attention to detail. This is a demo product - upload your own products to replace it.',
      price: 999,
      compare_at_price: 1299,
      categories: ['General'],
      tags: ['premium', 'quality', 'bestseller'],
      image: DEMO_IMAGES.default[0],
    },
    {
      title: 'Stylish Accessory',
      description: 'Trendy accessory that complements any style. Perfect for gifting or personal use. Demo product.',
      price: 799,
      categories: ['Accessories'],
      tags: ['stylish', 'trendy', 'gift'],
      image: DEMO_IMAGES.default[1],
    },
    {
      title: 'Essential Daily Item',
      description: 'Must-have item for everyday use. Combining functionality with great design. Demo product.',
      price: 599,
      categories: ['Essentials'],
      tags: ['daily', 'essential', 'practical'],
      image: DEMO_IMAGES.default[2],
    },
  ],
}

/**
 * Get demo products for a specific business category
 * Uses intelligent matching to find the best template
 */
export function getDemoProducts(category?: string): DemoProductTemplate[] {
  if (!category) return DEMO_PRODUCTS_BY_CATEGORY['default']

  const normalizedCategory = category.toLowerCase()

  // Fashion & Apparel
  if (
    normalizedCategory.includes('fashion') ||
    normalizedCategory.includes('clothing') ||
    normalizedCategory.includes('apparel') ||
    normalizedCategory.includes('garment') ||
    normalizedCategory.includes('boutique')
  ) {
    return DEMO_PRODUCTS_BY_CATEGORY['fashion']
  }

  // Electronics & Tech
  if (
    normalizedCategory.includes('electronic') ||
    normalizedCategory.includes('tech') ||
    normalizedCategory.includes('gadget') ||
    normalizedCategory.includes('computer') ||
    normalizedCategory.includes('mobile') ||
    normalizedCategory.includes('phone')
  ) {
    return DEMO_PRODUCTS_BY_CATEGORY['electronics']
  }

  // Food & Beverages
  if (
    normalizedCategory.includes('food') ||
    normalizedCategory.includes('beverage') ||
    normalizedCategory.includes('grocery') ||
    normalizedCategory.includes('gourmet') ||
    normalizedCategory.includes('bakery') ||
    normalizedCategory.includes('cafe') ||
    normalizedCategory.includes('restaurant')
  ) {
    return DEMO_PRODUCTS_BY_CATEGORY['food']
  }

  // Home & Decor
  if (
    normalizedCategory.includes('home') ||
    normalizedCategory.includes('decor') ||
    normalizedCategory.includes('furniture') ||
    normalizedCategory.includes('interior') ||
    normalizedCategory.includes('kitchen') ||
    normalizedCategory.includes('living')
  ) {
    return DEMO_PRODUCTS_BY_CATEGORY['home']
  }

  // Beauty & Cosmetics
  if (
    normalizedCategory.includes('beauty') ||
    normalizedCategory.includes('cosmetic') ||
    normalizedCategory.includes('makeup') ||
    normalizedCategory.includes('skincare') ||
    normalizedCategory.includes('salon') ||
    normalizedCategory.includes('spa')
  ) {
    return DEMO_PRODUCTS_BY_CATEGORY['beauty']
  }

  // Jewelry & Accessories
  if (
    normalizedCategory.includes('jewel') ||
    normalizedCategory.includes('accessori') ||
    normalizedCategory.includes('watch') ||
    normalizedCategory.includes('ornament')
  ) {
    return DEMO_PRODUCTS_BY_CATEGORY['jewelry']
  }

  // Sports & Fitness
  if (
    normalizedCategory.includes('sport') ||
    normalizedCategory.includes('fitness') ||
    normalizedCategory.includes('gym') ||
    normalizedCategory.includes('yoga') ||
    normalizedCategory.includes('athletic') ||
    normalizedCategory.includes('outdoor')
  ) {
    return DEMO_PRODUCTS_BY_CATEGORY['sports']
  }

  // Books & Stationery
  if (
    normalizedCategory.includes('book') ||
    normalizedCategory.includes('stationery') ||
    normalizedCategory.includes('office') ||
    normalizedCategory.includes('education') ||
    normalizedCategory.includes('art supply')
  ) {
    return DEMO_PRODUCTS_BY_CATEGORY['books']
  }

  // Toys & Kids
  if (
    normalizedCategory.includes('toy') ||
    normalizedCategory.includes('kid') ||
    normalizedCategory.includes('child') ||
    normalizedCategory.includes('baby') ||
    normalizedCategory.includes('game')
  ) {
    return DEMO_PRODUCTS_BY_CATEGORY['toys']
  }

  // Health & Wellness
  if (
    normalizedCategory.includes('health') ||
    normalizedCategory.includes('wellness') ||
    normalizedCategory.includes('herb') ||
    normalizedCategory.includes('ayurved') ||
    normalizedCategory.includes('supplement') ||
    normalizedCategory.includes('vitamin') ||
    normalizedCategory.includes('organic') ||
    normalizedCategory.includes('natural')
  ) {
    return DEMO_PRODUCTS_BY_CATEGORY['health']
  }

  // Pets
  if (
    normalizedCategory.includes('pet') ||
    normalizedCategory.includes('dog') ||
    normalizedCategory.includes('cat') ||
    normalizedCategory.includes('animal')
  ) {
    return DEMO_PRODUCTS_BY_CATEGORY['pets']
  }

  // Default fallback
  return DEMO_PRODUCTS_BY_CATEGORY['default']
}

/**
 * Get placeholder image URL for demo products
 * @deprecated Use product.image instead
 */
export function getDemoProductImageUrl(index: number): string {
  return DEMO_IMAGES.default[index % DEMO_IMAGES.default.length]
}
