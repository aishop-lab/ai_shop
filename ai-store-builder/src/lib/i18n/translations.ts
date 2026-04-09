// Storefront translations — English and Hindi
// Dashboard/platform stays English-only

export type Locale = 'en' | 'hi'

export const DEFAULT_LOCALE: Locale = 'en'

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  hi: 'हिन्दी',
}

// Nested translation keys
export interface Translations {
  nav: {
    home: string
    products: string
    collections: string
    about: string
    contact: string
    search: string
    cart: string
    signIn: string
    signUp: string
    account: string
    orders: string
    wishlist: string
    addresses: string
    settings: string
    signOut: string
  }
  cart: {
    title: string
    empty: string
    emptyMessage: string
    continueShopping: string
    subtotal: string
    shipping: string
    shippingCalculated: string
    freeShipping: string
    tax: string
    total: string
    checkout: string
    viewCart: string
    addToCart: string
    added: string
    outOfStock: string
    remove: string
    quantity: string
    itemCount: string
    itemsCount: string
  }
  product: {
    addToCart: string
    buyNow: string
    outOfStock: string
    inStock: string
    lowStock: string
    description: string
    reviews: string
    noReviews: string
    writeReview: string
    sortBy: string
    priceLowHigh: string
    priceHighLow: string
    newest: string
    bestSelling: string
    allCategories: string
    allCollections: string
    noProducts: string
    searchProducts: string
    filters: string
    clearFilters: string
    showingResults: string
    relatedProducts: string
  }
  checkout: {
    title: string
    shippingAddress: string
    paymentMethod: string
    orderSummary: string
    placeOrder: string
    processing: string
    fullName: string
    email: string
    phone: string
    address: string
    addressLine2: string
    city: string
    state: string
    pincode: string
    country: string
    cod: string
    prepaid: string
    upi: string
    securePayment: string
    easyReturns: string
    freeShipping: string
    fastDelivery: string
  }
  account: {
    title: string
    myOrders: string
    myAddresses: string
    myWishlist: string
    settings: string
    noOrders: string
    orderNumber: string
    orderDate: string
    orderStatus: string
    orderTotal: string
    trackOrder: string
    viewDetails: string
    needHelp: string
  }
  common: {
    shopNow: string
    learnMore: string
    seeAll: string
    loading: string
    error: string
    retry: string
    save: string
    cancel: string
    delete: string
    edit: string
    back: string
    next: string
    previous: string
    close: string
    search: string
    noResults: string
    of: string
    items: string
    rupee: string
    free: string
    welcome: string
    newCollection: string
    featuredProducts: string
    qualityIngredients: string
    handcraftedWithLove: string
    safeSecure: string
    copyright: string
  }
  store: {
    heroTagline: string
    heroDescription: string
  }
}

export const translations: Record<Locale, Translations> = {
  en: {
    nav: {
      home: 'Home',
      products: 'Products',
      collections: 'Collections',
      about: 'About',
      contact: 'Contact',
      search: 'Search',
      cart: 'Cart',
      signIn: 'Sign In',
      signUp: 'Sign Up',
      account: 'Account',
      orders: 'Orders',
      wishlist: 'Wishlist',
      addresses: 'Addresses',
      settings: 'Settings',
      signOut: 'Sign Out',
    },
    cart: {
      title: 'Shopping Cart',
      empty: 'Your cart is empty',
      emptyMessage: 'Add some products to get started',
      continueShopping: 'Continue Shopping',
      subtotal: 'Subtotal',
      shipping: 'Shipping',
      shippingCalculated: 'Calculated at checkout',
      freeShipping: 'Free Shipping',
      tax: 'Tax',
      total: 'Total',
      checkout: 'Proceed to Checkout',
      viewCart: 'View Cart',
      addToCart: 'Add to Cart',
      added: 'Added',
      outOfStock: 'Out of Stock',
      remove: 'Remove',
      quantity: 'Quantity',
      itemCount: 'item',
      itemsCount: 'items',
    },
    product: {
      addToCart: 'Add to Cart',
      buyNow: 'Buy Now',
      outOfStock: 'Out of Stock',
      inStock: 'In Stock',
      lowStock: 'Only a few left',
      description: 'Description',
      reviews: 'Reviews',
      noReviews: 'No reviews yet',
      writeReview: 'Write a Review',
      sortBy: 'Sort by',
      priceLowHigh: 'Price: Low to High',
      priceHighLow: 'Price: High to Low',
      newest: 'Newest First',
      bestSelling: 'Best Selling',
      allCategories: 'All Categories',
      allCollections: 'All Collections',
      noProducts: 'No products found',
      searchProducts: 'Search products...',
      filters: 'Filters',
      clearFilters: 'Clear Filters',
      showingResults: 'Showing results',
      relatedProducts: 'Related Products',
    },
    checkout: {
      title: 'Checkout',
      shippingAddress: 'Shipping Address',
      paymentMethod: 'Payment Method',
      orderSummary: 'Order Summary',
      placeOrder: 'Place Order',
      processing: 'Processing...',
      fullName: 'Full Name',
      email: 'Email',
      phone: 'Phone',
      address: 'Address',
      addressLine2: 'Apartment, suite, etc.',
      city: 'City',
      state: 'State',
      pincode: 'PIN Code',
      country: 'Country',
      cod: 'Cash on Delivery',
      prepaid: 'Pay Online',
      upi: 'UPI Payment',
      securePayment: 'Secure Payment',
      easyReturns: 'Easy Returns',
      freeShipping: 'Free Shipping',
      fastDelivery: 'Fast Delivery',
    },
    account: {
      title: 'My Account',
      myOrders: 'My Orders',
      myAddresses: 'My Addresses',
      myWishlist: 'My Wishlist',
      settings: 'Account Settings',
      noOrders: 'No orders yet',
      orderNumber: 'Order',
      orderDate: 'Date',
      orderStatus: 'Status',
      orderTotal: 'Total',
      trackOrder: 'Track Order',
      viewDetails: 'View Details',
      needHelp: 'Need help with your order?',
    },
    common: {
      shopNow: 'Shop Now',
      learnMore: 'Learn More',
      seeAll: 'See All',
      loading: 'Loading...',
      error: 'Something went wrong',
      retry: 'Try Again',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      close: 'Close',
      search: 'Search',
      noResults: 'No results found',
      of: 'of',
      items: 'items',
      rupee: '₹',
      free: 'Free',
      welcome: 'Welcome to',
      newCollection: 'New Collection',
      featuredProducts: 'Featured Products',
      qualityIngredients: 'Quality Ingredients',
      handcraftedWithLove: 'Handcrafted with Love',
      safeSecure: 'Safe & Secure',
      copyright: '©',
    },
    store: {
      heroTagline: 'Discover our curated collection of premium products',
      heroDescription: 'Experience the best quality products, handpicked just for you.',
    },
  },
  hi: {
    nav: {
      home: 'होम',
      products: 'उत्पाद',
      collections: 'संग्रह',
      about: 'हमारे बारे में',
      contact: 'संपर्क करें',
      search: 'खोजें',
      cart: 'कार्ट',
      signIn: 'साइन इन',
      signUp: 'साइन अप',
      account: 'खाता',
      orders: 'ऑर्डर',
      wishlist: 'विशलिस्ट',
      addresses: 'पते',
      settings: 'सेटिंग्स',
      signOut: 'साइन आउट',
    },
    cart: {
      title: 'शॉपिंग कार्ट',
      empty: 'आपकी कार्ट खाली है',
      emptyMessage: 'शुरू करने के लिए कुछ उत्पाद जोड़ें',
      continueShopping: 'खरीदारी जारी रखें',
      subtotal: 'उप-योग',
      shipping: 'शिपिंग',
      shippingCalculated: 'चेकआउट पर गणना की जाएगी',
      freeShipping: 'मुफ्त शिपिंग',
      tax: 'कर',
      total: 'कुल',
      checkout: 'चेकआउट करें',
      viewCart: 'कार्ट देखें',
      addToCart: 'कार्ट में डालें',
      added: 'जोड़ा गया',
      outOfStock: 'स्टॉक में नहीं',
      remove: 'हटाएं',
      quantity: 'मात्रा',
      itemCount: 'आइटम',
      itemsCount: 'आइटम',
    },
    product: {
      addToCart: 'कार्ट में डालें',
      buyNow: 'अभी खरीदें',
      outOfStock: 'स्टॉक में नहीं',
      inStock: 'स्टॉक में उपलब्ध',
      lowStock: 'केवल कुछ बचे हैं',
      description: 'विवरण',
      reviews: 'समीक्षाएं',
      noReviews: 'अभी तक कोई समीक्षा नहीं',
      writeReview: 'समीक्षा लिखें',
      sortBy: 'क्रम से',
      priceLowHigh: 'मूल्य: कम से अधिक',
      priceHighLow: 'मूल्य: अधिक से कम',
      newest: 'नवीनतम पहले',
      bestSelling: 'सबसे ज्यादा बिकने वाले',
      allCategories: 'सभी श्रेणियां',
      allCollections: 'सभी संग्रह',
      noProducts: 'कोई उत्पाद नहीं मिला',
      searchProducts: 'उत्पाद खोजें...',
      filters: 'फ़िल्टर',
      clearFilters: 'फ़िल्टर हटाएं',
      showingResults: 'परिणाम दिखा रहे हैं',
      relatedProducts: 'संबंधित उत्पाद',
    },
    checkout: {
      title: 'चेकआउट',
      shippingAddress: 'शिपिंग पता',
      paymentMethod: 'भुगतान विधि',
      orderSummary: 'ऑर्डर सारांश',
      placeOrder: 'ऑर्डर दें',
      processing: 'प्रोसेसिंग...',
      fullName: 'पूरा नाम',
      email: 'ईमेल',
      phone: 'फ़ोन',
      address: 'पता',
      addressLine2: 'अपार्टमेंट, सूट, आदि',
      city: 'शहर',
      state: 'राज्य',
      pincode: 'पिन कोड',
      country: 'देश',
      cod: 'कैश ऑन डिलीवरी',
      prepaid: 'ऑनलाइन भुगतान',
      upi: 'UPI भुगतान',
      securePayment: 'सुरक्षित भुगतान',
      easyReturns: 'आसान रिटर्न',
      freeShipping: 'मुफ्त शिपिंग',
      fastDelivery: 'तेज डिलीवरी',
    },
    account: {
      title: 'मेरा खाता',
      myOrders: 'मेरे ऑर्डर',
      myAddresses: 'मेरे पते',
      myWishlist: 'मेरी विशलिस्ट',
      settings: 'खाता सेटिंग्स',
      noOrders: 'अभी तक कोई ऑर्डर नहीं',
      orderNumber: 'ऑर्डर',
      orderDate: 'तारीख',
      orderStatus: 'स्थिति',
      orderTotal: 'कुल',
      trackOrder: 'ऑर्डर ट्रैक करें',
      viewDetails: 'विवरण देखें',
      needHelp: 'अपने ऑर्डर में मदद चाहिए?',
    },
    common: {
      shopNow: 'अभी खरीदें',
      learnMore: 'और जानें',
      seeAll: 'सभी देखें',
      loading: 'लोड हो रहा है...',
      error: 'कुछ गलत हो गया',
      retry: 'पुनः प्रयास करें',
      save: 'सहेजें',
      cancel: 'रद्द करें',
      delete: 'हटाएं',
      edit: 'संपादित करें',
      back: 'वापस',
      next: 'आगे',
      previous: 'पीछे',
      close: 'बंद करें',
      search: 'खोजें',
      noResults: 'कोई परिणाम नहीं मिला',
      of: 'का',
      items: 'आइटम',
      rupee: '₹',
      free: 'मुफ्त',
      welcome: 'आपका स्वागत है',
      newCollection: 'नया संग्रह',
      featuredProducts: 'विशेष उत्पाद',
      qualityIngredients: 'गुणवत्ता सामग्री',
      handcraftedWithLove: 'प्यार से हस्तनिर्मित',
      safeSecure: 'सुरक्षित',
      copyright: '©',
    },
    store: {
      heroTagline: 'प्रीमियम उत्पादों का हमारा चयनित संग्रह खोजें',
      heroDescription: 'आपके लिए खास चुने गए सर्वोत्तम गुणवत्ता वाले उत्पादों का अनुभव करें।',
    },
  },
}
