// src/lib/agents/marketing/seasonal-campaigns.ts
// Seasonal campaign calendar and auto-generation for Indian + Global e-commerce events

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

// ============================================
// TYPES
// ============================================

export interface CampaignTemplate {
  name: string
  type: 'flash_sale' | 'countdown' | 'early_bird' | 'last_chance'
  daysBeforeEvent: number
  emailSubject: string
  emailPreview: string
  socialCaption: string
  whatsappMessage: string
}

export interface SeasonalEvent {
  id: string
  name: string
  startDate: string // MM-DD format
  endDate: string // MM-DD format
  region: 'india' | 'global' | 'both'
  category: 'festival' | 'sale' | 'awareness' | 'seasonal'
  description: string
  suggestedDiscount: { min: number; max: number }
  suggestedChannels: ('email' | 'whatsapp' | 'meta_ads' | 'google_ads' | 'social')[]
  campaignTemplates: CampaignTemplate[]
}

export interface CampaignPlan {
  eventId: string
  eventName: string
  storeId: string
  phases: CampaignPhase[]
  totalEstimatedBudget: { min: number; max: number; currency: string }
  expectedROAS: { min: number; max: number }
  generatedAt: string
}

export interface CampaignPhase {
  name: string
  type: CampaignTemplate['type']
  startDate: string // ISO date
  endDate: string // ISO date
  channels: string[]
  emailContent: { subject: string; preview: string; body: string }
  socialContent: { caption: string; hashtags: string[] }
  whatsappContent: { message: string }
  suggestedDiscount: number
  suggestedBudget: number
}

// ============================================
// SEASONAL EVENTS CALENDAR
// ============================================

const log = logger.child({ traceId: `seasonal-campaigns:${Date.now()}` })

const SEASONAL_EVENTS: SeasonalEvent[] = [
  // ---- INDIA: Festivals ----
  {
    id: 'diwali',
    name: 'Diwali',
    startDate: '10-20',
    endDate: '11-05',
    region: 'india',
    category: 'festival',
    description: 'Festival of Lights — biggest shopping season in India. Consumers spend heavily on gifts, electronics, fashion, home decor, and sweets.',
    suggestedDiscount: { min: 20, max: 50 },
    suggestedChannels: ['email', 'whatsapp', 'meta_ads', 'google_ads', 'social'],
    campaignTemplates: [
      {
        name: 'Diwali Early Bird Sale',
        type: 'early_bird',
        daysBeforeEvent: 14,
        emailSubject: 'Diwali Sale starts early for you! 🪔',
        emailPreview: 'Exclusive early access to our biggest Diwali offers',
        socialCaption: 'The Diwali celebrations begin early! 🪔✨ Get exclusive early bird discounts before the rush. Shop now and light up your festive season!',
        whatsappMessage: '🪔 Diwali Early Bird Sale is LIVE! Shop before everyone else and save big. Tap to explore: {{store_url}}',
      },
      {
        name: 'Diwali Mega Sale',
        type: 'flash_sale',
        daysBeforeEvent: 3,
        emailSubject: 'Diwali Mega Sale — Up to {{discount}}% Off!',
        emailPreview: 'Biggest discounts of the year are here',
        socialCaption: '🎆 DIWALI MEGA SALE IS HERE! 🎆\n\nUp to {{discount}}% off on everything! This is our biggest sale of the year.\n\nShop now before stocks run out! 🛒',
        whatsappMessage: '🎆 Diwali Mega Sale! Up to {{discount}}% OFF everything. Limited stock — shop now: {{store_url}}',
      },
      {
        name: 'Diwali Last Chance',
        type: 'last_chance',
        daysBeforeEvent: 0,
        emailSubject: 'Last chance! Diwali deals end tonight',
        emailPreview: 'Final hours to grab Diwali discounts',
        socialCaption: '⏰ LAST CHANCE! Diwali deals end TONIGHT!\n\nDon\'t miss out on up to {{discount}}% off. Once it\'s gone, it\'s gone!',
        whatsappMessage: '⏰ Last chance! Diwali sale ends tonight. Grab your deals now: {{store_url}}',
      },
    ],
  },
  {
    id: 'holi',
    name: 'Holi',
    startDate: '03-10',
    endDate: '03-20',
    region: 'india',
    category: 'festival',
    description: 'Festival of Colors — consumers buy colors, white clothes, sweets, skincare, and celebration items.',
    suggestedDiscount: { min: 15, max: 35 },
    suggestedChannels: ['email', 'whatsapp', 'meta_ads', 'social'],
    campaignTemplates: [
      {
        name: 'Holi Countdown',
        type: 'countdown',
        daysBeforeEvent: 7,
        emailSubject: 'Get Holi-ready! 🎨 Special offers inside',
        emailPreview: 'Colorful deals to celebrate Holi in style',
        socialCaption: '🎨 Holi is coming! Get ready to celebrate with our special Holi collection. Vibrant deals, vibrant colors! 🌈',
        whatsappMessage: '🎨 Holi Special! Get ready with amazing deals. Shop now: {{store_url}}',
      },
      {
        name: 'Holi Flash Sale',
        type: 'flash_sale',
        daysBeforeEvent: 1,
        emailSubject: 'Holi Flash Sale — {{discount}}% OFF today only!',
        emailPreview: 'One-day Holi special — don\'t miss it',
        socialCaption: '🌈 HOLI FLASH SALE! 🌈\n\n{{discount}}% off TODAY ONLY! Celebrate with the best deals.\n\nShop now before midnight! 🛍️',
        whatsappMessage: '🌈 Holi Flash Sale! {{discount}}% OFF today only. Shop: {{store_url}}',
      },
    ],
  },
  {
    id: 'eid',
    name: 'Eid',
    startDate: '03-28',
    endDate: '04-05',
    region: 'india',
    category: 'festival',
    description: 'Eid ul-Fitr — consumers shop for ethnic wear, perfumes, sweets, gifts, and home decor.',
    suggestedDiscount: { min: 15, max: 40 },
    suggestedChannels: ['email', 'whatsapp', 'meta_ads', 'social'],
    campaignTemplates: [
      {
        name: 'Eid Early Bird',
        type: 'early_bird',
        daysBeforeEvent: 10,
        emailSubject: 'Eid Mubarak! 🌙 Early deals await you',
        emailPreview: 'Shop Eid essentials with early bird discounts',
        socialCaption: '🌙 Eid preparations start here! ✨ Shop our curated Eid collection with exclusive early bird prices. Eid Mubarak! 🕌',
        whatsappMessage: '🌙 Eid Mubarak! Early bird deals on festive essentials. Shop now: {{store_url}}',
      },
      {
        name: 'Eid Flash Sale',
        type: 'flash_sale',
        daysBeforeEvent: 2,
        emailSubject: 'Eid Sale — Up to {{discount}}% Off!',
        emailPreview: 'Last-minute Eid shopping? We have you covered',
        socialCaption: '🌙✨ EID SALE IS LIVE! Up to {{discount}}% off on festive favourites. Make this Eid extra special! 🛍️',
        whatsappMessage: '🌙 Eid Sale LIVE! Up to {{discount}}% off. Shop now: {{store_url}}',
      },
    ],
  },
  {
    id: 'raksha-bandhan',
    name: 'Raksha Bandhan',
    startDate: '08-10',
    endDate: '08-20',
    region: 'india',
    category: 'festival',
    description: 'Sibling bond celebration — consumers buy rakhis, gifts, sweets, and personalized items.',
    suggestedDiscount: { min: 10, max: 30 },
    suggestedChannels: ['email', 'whatsapp', 'meta_ads', 'social'],
    campaignTemplates: [
      {
        name: 'Rakhi Gift Guide',
        type: 'early_bird',
        daysBeforeEvent: 10,
        emailSubject: 'Find the perfect Rakhi gift 🎁',
        emailPreview: 'Curated gifts your sibling will love',
        socialCaption: '🎀 Raksha Bandhan is around the corner! Find the perfect gift for your sibling from our curated collection. 🎁💝',
        whatsappMessage: '🎀 Raksha Bandhan Gift Guide! Find perfect gifts: {{store_url}}',
      },
      {
        name: 'Rakhi Last Minute',
        type: 'last_chance',
        daysBeforeEvent: 1,
        emailSubject: 'Last day! Rakhi gifts with express delivery',
        emailPreview: 'Still shopping? Express delivery available',
        socialCaption: '⏰ Last day to order Rakhi gifts with express delivery! Don\'t let your sibling down. Shop NOW! 🎁',
        whatsappMessage: '⏰ Last day for Rakhi gifts with express delivery! Order now: {{store_url}}',
      },
    ],
  },
  {
    id: 'independence-day',
    name: 'Independence Day Sale',
    startDate: '08-10',
    endDate: '08-16',
    region: 'india',
    category: 'festival',
    description: 'Independence Day — patriotic-themed sales, tri-color collections, freedom sales.',
    suggestedDiscount: { min: 15, max: 40 },
    suggestedChannels: ['email', 'meta_ads', 'social'],
    campaignTemplates: [
      {
        name: 'Freedom Sale',
        type: 'flash_sale',
        daysBeforeEvent: 5,
        emailSubject: 'Freedom Sale 🇮🇳 Up to {{discount}}% Off!',
        emailPreview: 'Celebrate Independence Day with massive discounts',
        socialCaption: '🇮🇳 FREEDOM SALE! 🇮🇳\n\nCelebrate Independence Day with up to {{discount}}% off! Jai Hind! 🎉\n\nShop the tri-color collection! 🛍️',
        whatsappMessage: '🇮🇳 Freedom Sale! Up to {{discount}}% OFF. Shop now: {{store_url}}',
      },
    ],
  },
  {
    id: 'republic-day',
    name: 'Republic Day Sale',
    startDate: '01-22',
    endDate: '01-27',
    region: 'india',
    category: 'festival',
    description: 'Republic Day — patriotic sales event, new year energy still active.',
    suggestedDiscount: { min: 15, max: 35 },
    suggestedChannels: ['email', 'meta_ads', 'social'],
    campaignTemplates: [
      {
        name: 'Republic Day Sale',
        type: 'flash_sale',
        daysBeforeEvent: 3,
        emailSubject: 'Republic Day Sale 🇮🇳 Big savings!',
        emailPreview: 'Start the year with great deals',
        socialCaption: '🇮🇳 Republic Day Sale is LIVE! Great savings to kick off the new year. Shop now! 🛍️',
        whatsappMessage: '🇮🇳 Republic Day Sale! Grab deals now: {{store_url}}',
      },
    ],
  },
  {
    id: 'navratri',
    name: 'Navratri',
    startDate: '10-01',
    endDate: '10-15',
    region: 'india',
    category: 'festival',
    description: 'Nine nights of celebration — consumers shop for ethnic wear, jewelry, pooja items, and dance accessories.',
    suggestedDiscount: { min: 15, max: 35 },
    suggestedChannels: ['email', 'whatsapp', 'meta_ads', 'social'],
    campaignTemplates: [
      {
        name: 'Navratri Collection Launch',
        type: 'early_bird',
        daysBeforeEvent: 7,
        emailSubject: 'Navratri Collection is here! 🙏',
        emailPreview: 'Festive wear and accessories for nine nights',
        socialCaption: '🙏 Navratri Collection LIVE! 9 nights of celebration deserve the best outfits. Shop our festive collection now! ✨💃',
        whatsappMessage: '🙏 Navratri Collection launched! Shop festive essentials: {{store_url}}',
      },
      {
        name: 'Navratri Flash Deals',
        type: 'flash_sale',
        daysBeforeEvent: 0,
        emailSubject: 'Navratri Flash Deals — 24 hours only!',
        emailPreview: 'Daily color-themed offers inside',
        socialCaption: '🌈 Today\'s Navratri color: special deals on matching items! Flash offers for 24 hours only. ⏰',
        whatsappMessage: '🌈 Navratri Flash Deal! 24-hour offer: {{store_url}}',
      },
    ],
  },
  {
    id: 'pongal',
    name: 'Pongal',
    startDate: '01-13',
    endDate: '01-16',
    region: 'india',
    category: 'festival',
    description: 'Tamil harvest festival — consumers shop for traditional clothes, kitchen items, and gifts.',
    suggestedDiscount: { min: 10, max: 30 },
    suggestedChannels: ['email', 'whatsapp', 'social'],
    campaignTemplates: [
      {
        name: 'Pongal Special',
        type: 'flash_sale',
        daysBeforeEvent: 3,
        emailSubject: 'Pongal Sale! Harvest-time deals 🌾',
        emailPreview: 'Celebrate Pongal with special offers',
        socialCaption: '🌾 Happy Pongal! Celebrate the harvest season with special deals on traditional favourites. 🎉',
        whatsappMessage: '🌾 Pongal Special! Great deals await: {{store_url}}',
      },
    ],
  },
  {
    id: 'onam',
    name: 'Onam',
    startDate: '08-25',
    endDate: '09-05',
    region: 'india',
    category: 'festival',
    description: 'Kerala harvest festival — consumers shop for traditional wear, jewelry, electronics, and home decor.',
    suggestedDiscount: { min: 15, max: 40 },
    suggestedChannels: ['email', 'whatsapp', 'meta_ads', 'social'],
    campaignTemplates: [
      {
        name: 'Onam Sale',
        type: 'early_bird',
        daysBeforeEvent: 7,
        emailSubject: 'Onam Mega Sale! 🌼 Up to {{discount}}% Off',
        emailPreview: 'Celebrate Onam with the best deals',
        socialCaption: '🌼 Onam Mega Sale! Celebrate the season of abundance with up to {{discount}}% off. Happy Onam! 🎉🛍️',
        whatsappMessage: '🌼 Onam Sale! Up to {{discount}}% off. Shop: {{store_url}}',
      },
    ],
  },
  {
    id: 'makar-sankranti',
    name: 'Makar Sankranti',
    startDate: '01-12',
    endDate: '01-15',
    region: 'india',
    category: 'festival',
    description: 'Kite festival and harvest celebration — consumers shop for kites, traditional sweets, and festive items.',
    suggestedDiscount: { min: 10, max: 25 },
    suggestedChannels: ['email', 'whatsapp', 'social'],
    campaignTemplates: [
      {
        name: 'Sankranti Sale',
        type: 'flash_sale',
        daysBeforeEvent: 2,
        emailSubject: 'Soar high with Sankranti deals! 🪁',
        emailPreview: 'Festive offers to celebrate Makar Sankranti',
        socialCaption: '🪁 Makar Sankranti Sale! Let your savings soar high like kites this festival. Shop festive deals now! 🎉',
        whatsappMessage: '🪁 Sankranti Sale! Festive deals: {{store_url}}',
      },
    ],
  },
  {
    id: 'ganesh-chaturthi',
    name: 'Ganesh Chaturthi',
    startDate: '09-01',
    endDate: '09-12',
    region: 'india',
    category: 'festival',
    description: 'Lord Ganesha festival — consumers shop for pooja items, decor, sweets, and eco-friendly idols.',
    suggestedDiscount: { min: 10, max: 30 },
    suggestedChannels: ['email', 'whatsapp', 'meta_ads', 'social'],
    campaignTemplates: [
      {
        name: 'Ganesh Chaturthi Special',
        type: 'early_bird',
        daysBeforeEvent: 5,
        emailSubject: 'Ganpati Bappa Morya! 🙏 Festive deals',
        emailPreview: 'Celebrate Ganesh Chaturthi with special offers',
        socialCaption: '🙏 Ganpati Bappa Morya! Celebrate Ganesh Chaturthi with our festive collection. Special deals on pooja essentials and more! ✨',
        whatsappMessage: '🙏 Ganesh Chaturthi deals! Shop festive items: {{store_url}}',
      },
    ],
  },

  // ---- GLOBAL: Holidays ----
  {
    id: 'new-year',
    name: 'New Year Sale',
    startDate: '12-28',
    endDate: '01-03',
    region: 'global',
    category: 'seasonal',
    description: 'New Year celebration — consumers shop for party supplies, fashion, electronics, and self-care products.',
    suggestedDiscount: { min: 20, max: 40 },
    suggestedChannels: ['email', 'whatsapp', 'meta_ads', 'google_ads', 'social'],
    campaignTemplates: [
      {
        name: 'New Year Countdown',
        type: 'countdown',
        daysBeforeEvent: 5,
        emailSubject: 'New Year, New Deals! 🎆',
        emailPreview: 'Ring in the new year with massive savings',
        socialCaption: '🎆 New Year Sale COUNTDOWN! 5 days of incredible deals to end the year right. New year, new you, new savings! 🛍️',
        whatsappMessage: '🎆 New Year Sale starts now! Shop deals: {{store_url}}',
      },
      {
        name: 'New Year Flash',
        type: 'flash_sale',
        daysBeforeEvent: 0,
        emailSubject: 'Happy New Year! 🎉 Flash deals inside',
        emailPreview: '24-hour New Year special — shop now',
        socialCaption: '🎉 HAPPY NEW YEAR! 🎊\n\nCelebrate with our 24-hour flash sale! Best deals to start the year. Shop NOW! 🛍️',
        whatsappMessage: '🎉 Happy New Year! 24-hour flash sale: {{store_url}}',
      },
    ],
  },
  {
    id: 'valentines-day',
    name: "Valentine's Day",
    startDate: '02-07',
    endDate: '02-15',
    region: 'global',
    category: 'seasonal',
    description: "Valentine's Day — consumers shop for gifts, jewelry, fashion, flowers, chocolates, and personalized items.",
    suggestedDiscount: { min: 10, max: 30 },
    suggestedChannels: ['email', 'whatsapp', 'meta_ads', 'social'],
    campaignTemplates: [
      {
        name: 'Valentine Gift Guide',
        type: 'early_bird',
        daysBeforeEvent: 7,
        emailSubject: "Valentine's Gift Guide 💝",
        emailPreview: 'Find the perfect gift for your special someone',
        socialCaption: "💝 Valentine's Day is coming! Find the perfect gift for your special someone. Our curated gift guide makes shopping easy. 🎁❤️",
        whatsappMessage: "💝 Valentine's Gift Guide! Perfect gifts: {{store_url}}",
      },
      {
        name: 'Valentine Last Minute',
        type: 'last_chance',
        daysBeforeEvent: 1,
        emailSubject: "Last minute Valentine's gifts — express delivery!",
        emailPreview: "Still need a Valentine's gift? We got you",
        socialCaption: "⏰ Last minute Valentine's shopping? We've got you! Express delivery available on all gifts. Order NOW! 💝🚀",
        whatsappMessage: "⏰ Last minute Valentine's gifts with express delivery: {{store_url}}",
      },
    ],
  },
  {
    id: 'mothers-day',
    name: "Mother's Day",
    startDate: '05-04',
    endDate: '05-12',
    region: 'global',
    category: 'awareness',
    description: "Mother's Day — consumers shop for gifts, jewelry, flowers, spa products, and personalized items for moms.",
    suggestedDiscount: { min: 10, max: 25 },
    suggestedChannels: ['email', 'whatsapp', 'meta_ads', 'social'],
    campaignTemplates: [
      {
        name: "Mother's Day Gift Guide",
        type: 'early_bird',
        daysBeforeEvent: 10,
        emailSubject: "Make Mom's day special 💐",
        emailPreview: 'Thoughtful gifts she will actually love',
        socialCaption: "💐 Mother's Day is coming! Show your love with a thoughtful gift she'll cherish. Shop our curated collection for moms. 🎁❤️",
        whatsappMessage: "💐 Mother's Day gifts! Make her day special: {{store_url}}",
      },
      {
        name: "Mother's Day Last Chance",
        type: 'last_chance',
        daysBeforeEvent: 2,
        emailSubject: "2 days left! Mother's Day gifts",
        emailPreview: 'Don\'t forget Mom — express delivery available',
        socialCaption: "⏰ 2 days to Mother's Day! Don't forget to get something special for Mom. Express delivery available! 💐🚀",
        whatsappMessage: "⏰ 2 days to Mother's Day! Express delivery: {{store_url}}",
      },
    ],
  },
  {
    id: 'fathers-day',
    name: "Father's Day",
    startDate: '06-10',
    endDate: '06-16',
    region: 'global',
    category: 'awareness',
    description: "Father's Day — consumers shop for gifts, gadgets, accessories, and personalized items for dads.",
    suggestedDiscount: { min: 10, max: 25 },
    suggestedChannels: ['email', 'whatsapp', 'meta_ads', 'social'],
    campaignTemplates: [
      {
        name: "Father's Day Gift Guide",
        type: 'early_bird',
        daysBeforeEvent: 7,
        emailSubject: "Make Dad proud! Father's Day gifts 🎁",
        emailPreview: 'Gifts Dad will actually use and love',
        socialCaption: "👔 Father's Day is around the corner! Find the perfect gift for Dad from our curated collection. He deserves the best! 🎁",
        whatsappMessage: "👔 Father's Day gifts! Make Dad smile: {{store_url}}",
      },
    ],
  },
  {
    id: 'black-friday',
    name: 'Black Friday',
    startDate: '11-24',
    endDate: '11-30',
    region: 'global',
    category: 'sale',
    description: 'Biggest global shopping event — deep discounts across all categories. High competition for attention.',
    suggestedDiscount: { min: 25, max: 60 },
    suggestedChannels: ['email', 'whatsapp', 'meta_ads', 'google_ads', 'social'],
    campaignTemplates: [
      {
        name: 'Black Friday Early Access',
        type: 'early_bird',
        daysBeforeEvent: 3,
        emailSubject: 'Black Friday EARLY ACCESS 🖤',
        emailPreview: 'Shop Black Friday deals before everyone else',
        socialCaption: '🖤 BLACK FRIDAY EARLY ACCESS! 🖤\n\nGet the deals before everyone else. Up to {{discount}}% off EVERYTHING! VIP access starts NOW. 🛍️',
        whatsappMessage: '🖤 Black Friday Early Access! Up to {{discount}}% off. Shop now: {{store_url}}',
      },
      {
        name: 'Black Friday Main Sale',
        type: 'flash_sale',
        daysBeforeEvent: 0,
        emailSubject: 'BLACK FRIDAY IS HERE! Up to {{discount}}% OFF',
        emailPreview: 'Our biggest sale of the year — shop now',
        socialCaption: '🖤🔥 BLACK FRIDAY IS HERE! 🔥🖤\n\nUp to {{discount}}% OFF EVERYTHING!\n\nThis is it. Our BIGGEST sale of the year. Shop before it\'s gone! 🛒💨',
        whatsappMessage: '🖤 BLACK FRIDAY! Up to {{discount}}% OFF everything! Shop: {{store_url}}',
      },
      {
        name: 'Black Friday Last Hours',
        type: 'last_chance',
        daysBeforeEvent: -1,
        emailSubject: 'FINAL HOURS — Black Friday ends at midnight!',
        emailPreview: 'Last chance for Black Friday deals',
        socialCaption: '⏰🖤 FINAL HOURS! Black Friday ends at MIDNIGHT!\n\nLast chance to grab up to {{discount}}% off. Don\'t regret it tomorrow! 🛒',
        whatsappMessage: '⏰ Black Friday ends at midnight! Last chance: {{store_url}}',
      },
    ],
  },
  {
    id: 'cyber-monday',
    name: 'Cyber Monday',
    startDate: '11-30',
    endDate: '12-02',
    region: 'global',
    category: 'sale',
    description: 'Online-focused shopping event following Black Friday — extra discounts on digital and tech products.',
    suggestedDiscount: { min: 20, max: 50 },
    suggestedChannels: ['email', 'meta_ads', 'google_ads', 'social'],
    campaignTemplates: [
      {
        name: 'Cyber Monday Deals',
        type: 'flash_sale',
        daysBeforeEvent: 0,
        emailSubject: 'CYBER MONDAY 💻 Even more savings!',
        emailPreview: 'Online-exclusive deals you can not miss',
        socialCaption: '💻 CYBER MONDAY! Online-exclusive deals you won\'t find anywhere else. Up to {{discount}}% off! 🛒✨',
        whatsappMessage: '💻 Cyber Monday! Extra discounts online: {{store_url}}',
      },
    ],
  },
  {
    id: 'christmas',
    name: 'Christmas',
    startDate: '12-15',
    endDate: '12-26',
    region: 'global',
    category: 'festival',
    description: 'Christmas season — consumers shop for gifts, decorations, party supplies, and festive fashion.',
    suggestedDiscount: { min: 15, max: 40 },
    suggestedChannels: ['email', 'whatsapp', 'meta_ads', 'google_ads', 'social'],
    campaignTemplates: [
      {
        name: 'Christmas Gift Guide',
        type: 'early_bird',
        daysBeforeEvent: 10,
        emailSubject: 'Christmas Gift Guide 🎄 Shop early!',
        emailPreview: 'Find the perfect gift for everyone on your list',
        socialCaption: '🎄 Christmas Gift Guide! Find the perfect presents for everyone on your list. Shop early, avoid the rush! 🎁🛍️',
        whatsappMessage: '🎄 Christmas Gift Guide! Shop early: {{store_url}}',
      },
      {
        name: 'Christmas Countdown Sale',
        type: 'countdown',
        daysBeforeEvent: 5,
        emailSubject: '5 days to Christmas! 🎁 Last-minute deals',
        emailPreview: 'Festive savings and express delivery available',
        socialCaption: '🎅 5 DAYS TO CHRISTMAS! Still shopping? Our festive sale has you covered with express delivery! 🎁🚀',
        whatsappMessage: '🎅 5 days to Christmas! Last-minute deals: {{store_url}}',
      },
    ],
  },
  {
    id: 'halloween',
    name: 'Halloween',
    startDate: '10-25',
    endDate: '11-01',
    region: 'global',
    category: 'seasonal',
    description: 'Halloween — consumers shop for costumes, decorations, party supplies, and themed merchandise.',
    suggestedDiscount: { min: 10, max: 30 },
    suggestedChannels: ['email', 'meta_ads', 'social'],
    campaignTemplates: [
      {
        name: 'Halloween Spooky Sale',
        type: 'flash_sale',
        daysBeforeEvent: 3,
        emailSubject: 'Spooky savings! 🎃 Halloween Sale',
        emailPreview: 'Frighteningly good deals inside',
        socialCaption: '🎃👻 BOO! Our Halloween Sale is here with SPOOKY savings! Up to {{discount}}% off. Don\'t be scared to shop! 🛍️',
        whatsappMessage: '🎃 Halloween Sale! Spooky savings: {{store_url}}',
      },
    ],
  },
  {
    id: 'easter',
    name: 'Easter',
    startDate: '04-10',
    endDate: '04-22',
    region: 'global',
    category: 'seasonal',
    description: 'Easter — consumers shop for gifts, chocolates, spring fashion, and home decor.',
    suggestedDiscount: { min: 10, max: 25 },
    suggestedChannels: ['email', 'social'],
    campaignTemplates: [
      {
        name: 'Easter Sale',
        type: 'flash_sale',
        daysBeforeEvent: 3,
        emailSubject: 'Easter Sale 🐣 Egg-citing deals!',
        emailPreview: 'Spring savings on your favorites',
        socialCaption: '🐣 Easter Sale! Egg-citing deals on spring favorites. Hop to it before they are gone! 🌷🛍️',
        whatsappMessage: '🐣 Easter Sale! Spring deals: {{store_url}}',
      },
    ],
  },

  // ---- SALES EVENTS ----
  {
    id: 'eoss-january',
    name: 'End of Season Sale (Winter)',
    startDate: '01-05',
    endDate: '01-20',
    region: 'both',
    category: 'sale',
    description: 'Winter end-of-season clearance — deep discounts to clear winter inventory before spring arrivals.',
    suggestedDiscount: { min: 30, max: 60 },
    suggestedChannels: ['email', 'whatsapp', 'meta_ads', 'social'],
    campaignTemplates: [
      {
        name: 'Winter EOSS',
        type: 'flash_sale',
        daysBeforeEvent: 0,
        emailSubject: 'EOSS 🏷️ Up to {{discount}}% OFF winter stock!',
        emailPreview: 'Clearance prices on winter collection',
        socialCaption: '🏷️ END OF SEASON SALE! Up to {{discount}}% off winter collection. Grab your favorites at clearance prices before they are gone! 🛍️',
        whatsappMessage: '🏷️ Winter EOSS! Up to {{discount}}% off: {{store_url}}',
      },
    ],
  },
  {
    id: 'eoss-july',
    name: 'End of Season Sale (Summer)',
    startDate: '07-01',
    endDate: '07-15',
    region: 'both',
    category: 'sale',
    description: 'Summer end-of-season clearance — deep discounts to clear summer inventory before monsoon/fall arrivals.',
    suggestedDiscount: { min: 30, max: 60 },
    suggestedChannels: ['email', 'whatsapp', 'meta_ads', 'social'],
    campaignTemplates: [
      {
        name: 'Summer EOSS',
        type: 'flash_sale',
        daysBeforeEvent: 0,
        emailSubject: 'Summer Clearance 🌞 Up to {{discount}}% OFF!',
        emailPreview: 'Massive discounts on summer collection',
        socialCaption: '🌞 SUMMER CLEARANCE! Up to {{discount}}% off the summer collection. Last chance to grab summer favorites at the best prices! 🛍️',
        whatsappMessage: '🌞 Summer EOSS! Up to {{discount}}% off: {{store_url}}',
      },
    ],
  },
  {
    id: 'back-to-school',
    name: 'Back to School',
    startDate: '06-15',
    endDate: '07-05',
    region: 'both',
    category: 'sale',
    description: 'Back to school season — consumers shop for stationery, bags, uniforms, electronics, and study accessories.',
    suggestedDiscount: { min: 10, max: 30 },
    suggestedChannels: ['email', 'meta_ads', 'social'],
    campaignTemplates: [
      {
        name: 'Back to School Sale',
        type: 'early_bird',
        daysBeforeEvent: 7,
        emailSubject: 'Back to School! 📚 Get ready for the new year',
        emailPreview: 'Everything they need at great prices',
        socialCaption: '📚 Back to School Sale! Get everything you need for the new academic year at amazing prices. Shop smart, save big! 🎒✏️',
        whatsappMessage: '📚 Back to School deals! Shop now: {{store_url}}',
      },
    ],
  },
  {
    id: 'summer-sale',
    name: 'Summer Sale',
    startDate: '05-01',
    endDate: '05-15',
    region: 'both',
    category: 'seasonal',
    description: 'Summer sale — consumers shop for summer fashion, outdoor items, cooling products, and travel accessories.',
    suggestedDiscount: { min: 15, max: 40 },
    suggestedChannels: ['email', 'whatsapp', 'meta_ads', 'social'],
    campaignTemplates: [
      {
        name: 'Summer Sale',
        type: 'flash_sale',
        daysBeforeEvent: 0,
        emailSubject: 'Summer Sale ☀️ Hot deals, cool prices!',
        emailPreview: 'Beat the heat with our hottest offers',
        socialCaption: '☀️ SUMMER SALE IS HERE! Hot deals and cool prices on summer essentials. Beat the heat with great savings! 🏖️🛍️',
        whatsappMessage: '☀️ Summer Sale! Hot deals: {{store_url}}',
      },
    ],
  },
  {
    id: 'winter-sale',
    name: 'Winter Sale',
    startDate: '11-15',
    endDate: '11-25',
    region: 'both',
    category: 'seasonal',
    description: 'Pre-holiday winter sale — consumers shop for winter fashion, blankets, heaters, and warm accessories.',
    suggestedDiscount: { min: 15, max: 35 },
    suggestedChannels: ['email', 'whatsapp', 'meta_ads', 'social'],
    campaignTemplates: [
      {
        name: 'Winter Sale',
        type: 'flash_sale',
        daysBeforeEvent: 0,
        emailSubject: 'Winter Sale ❄️ Warm deals inside!',
        emailPreview: 'Cozy up with winter savings',
        socialCaption: '❄️ WINTER SALE! Warm up with our hottest deals on winter essentials. Cozy savings await! 🧣🛍️',
        whatsappMessage: '❄️ Winter Sale! Warm deals: {{store_url}}',
      },
    ],
  },
  {
    id: 'monsoon-sale',
    name: 'Monsoon Sale',
    startDate: '07-15',
    endDate: '07-30',
    region: 'india',
    category: 'seasonal',
    description: 'Monsoon sale — consumers shop for rainwear, umbrellas, waterproof items, and monsoon essentials.',
    suggestedDiscount: { min: 15, max: 35 },
    suggestedChannels: ['email', 'whatsapp', 'meta_ads', 'social'],
    campaignTemplates: [
      {
        name: 'Monsoon Sale',
        type: 'flash_sale',
        daysBeforeEvent: 0,
        emailSubject: 'Monsoon Sale 🌧️ Rain or shine, great deals!',
        emailPreview: 'Splash into savings this monsoon',
        socialCaption: '🌧️ MONSOON SALE! Don\'t let the rain dampen your shopping spirit. Splash into amazing deals on monsoon essentials! ☔🛍️',
        whatsappMessage: '🌧️ Monsoon Sale! Great deals: {{store_url}}',
      },
    ],
  },
]

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Get upcoming seasonal events within the next N days.
 */
export function getUpcomingEvents(daysAhead: number = 30): Array<SeasonalEvent & { daysUntil: number; nextOccurrence: string }> {
  const now = new Date()
  const currentYear = now.getFullYear()

  const upcoming: Array<SeasonalEvent & { daysUntil: number; nextOccurrence: string }> = []

  for (const event of SEASONAL_EVENTS) {
    const [startMonth, startDay] = event.startDate.split('-').map(Number)

    // Try this year first, then next year
    let eventDate = new Date(currentYear, startMonth - 1, startDay)
    if (eventDate < now) {
      eventDate = new Date(currentYear + 1, startMonth - 1, startDay)
    }

    const diffMs = eventDate.getTime() - now.getTime()
    const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    if (daysUntil >= 0 && daysUntil <= daysAhead) {
      upcoming.push({
        ...event,
        daysUntil,
        nextOccurrence: eventDate.toISOString().split('T')[0],
      })
    }
  }

  // Sort by days until event
  upcoming.sort((a, b) => a.daysUntil - b.daysUntil)

  return upcoming
}

/**
 * Get the full seasonal calendar, optionally filtered by month.
 */
export function getSeasonalCalendar(month?: number): SeasonalEvent[] {
  if (month === undefined) {
    return SEASONAL_EVENTS
  }

  const monthStr = String(month).padStart(2, '0')

  return SEASONAL_EVENTS.filter((event) => {
    const startMonth = event.startDate.split('-')[0]
    const endMonth = event.endDate.split('-')[0]

    // Check if the given month falls within the event's range
    const start = parseInt(startMonth, 10)
    const end = parseInt(endMonth, 10)
    const m = parseInt(monthStr, 10)

    if (start <= end) {
      return m >= start && m <= end
    }
    // Wraps around year (e.g., Dec-Jan)
    return m >= start || m <= end
  })
}

/**
 * Generate a full campaign plan for a seasonal event using AI.
 */
export async function generateCampaignPlan(
  storeId: string,
  eventId: string
): Promise<CampaignPlan> {
  const event = SEASONAL_EVENTS.find((e) => e.id === eventId)
  if (!event) {
    throw new Error(`Seasonal event not found: ${eventId}`)
  }

  // Fetch store info for context
  const supabase = getSupabaseAdmin()
  const { data: store } = await supabase
    .from('stores')
    .select('name, blueprint, settings')
    .eq('id', storeId)
    .single()

  if (!store) {
    throw new Error(`Store not found: ${storeId}`)
  }

  const blueprint = store.blueprint as Record<string, unknown> | null
  const storeName = store.name || 'Store'
  const currency = ((blueprint?.location as Record<string, unknown>)?.currency as string) || 'INR'

  // Fetch top products for context
  const { data: topProducts } = await supabase
    .from('products')
    .select('title, price, category')
    .eq('store_id', storeId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(10)

  const productContext = (topProducts || [])
    .map((p) => `${p.title} (${currency} ${p.price}, ${p.category || 'uncategorized'})`)
    .join('\n')

  // Calculate event dates for current/next year
  const now = new Date()
  const currentYear = now.getFullYear()
  const [startMonth, startDay] = event.startDate.split('-').map(Number)
  let eventStart = new Date(currentYear, startMonth - 1, startDay)
  if (eventStart < now) {
    eventStart = new Date(currentYear + 1, startMonth - 1, startDay)
  }
  const [endMonth, endDay] = event.endDate.split('-').map(Number)
  let eventEnd = new Date(eventStart.getFullYear(), endMonth - 1, endDay)
  // Handle year wrap
  if (eventEnd < eventStart) {
    eventEnd = new Date(eventStart.getFullYear() + 1, endMonth - 1, endDay)
  }

  // Use AI to generate a tailored campaign plan
  const { generateText } = await import('ai')
  const { getModelForTier } = await import('../model-router')

  const model = getModelForTier('fast')

  const result = await generateText({
    model,
    system: `You are an expert e-commerce marketing strategist specializing in seasonal campaigns for Indian and global markets. You create detailed, actionable campaign plans that maximize sales during peak shopping periods. You understand Indian festivals, payment preferences (UPI, COD), and regional nuances.`,
    prompt: `Generate a detailed campaign plan for "${event.name}" for the store "${storeName}".

Event Details:
- Name: ${event.name}
- Period: ${eventStart.toISOString().split('T')[0]} to ${eventEnd.toISOString().split('T')[0]}
- Region: ${event.region}
- Category: ${event.category}
- Description: ${event.description}
- Suggested Discount: ${event.suggestedDiscount.min}% to ${event.suggestedDiscount.max}%
- Channels: ${event.suggestedChannels.join(', ')}

Store Products:
${productContext || 'No products listed yet'}

Currency: ${currency}

Generate a multi-phase campaign plan with the following phases. Respond in JSON:
{
  "phases": [
    {
      "name": "Phase name",
      "type": "early_bird | countdown | flash_sale | last_chance",
      "startOffset": -14,
      "endOffset": -7,
      "channels": ["email", "social", "whatsapp"],
      "emailContent": {
        "subject": "Email subject line",
        "preview": "Preview text",
        "body": "Email body text with key message and CTA"
      },
      "socialContent": {
        "caption": "Social media post caption",
        "hashtags": ["#hashtag1", "#hashtag2"]
      },
      "whatsappContent": {
        "message": "WhatsApp message text"
      },
      "suggestedDiscount": 20,
      "suggestedBudgetPercent": 30
    }
  ],
  "totalEstimatedBudget": { "min": 5000, "max": 15000 },
  "expectedROAS": { "min": 3.0, "max": 8.0 }
}

Guidelines:
- Create 3-4 phases: early_bird (2 weeks before), countdown (1 week before), flash_sale (during event), last_chance (final day)
- Each phase should have content for all specified channels
- Budget suggestions in ${currency}
- Discount should stay within ${event.suggestedDiscount.min}-${event.suggestedDiscount.max}% range
- suggestedBudgetPercent is the % of total budget for that phase (all phases should sum to 100)
- Make content specific to "${storeName}" and their products
- For Indian festivals, incorporate cultural context and sentiment
- Keep WhatsApp messages under 160 characters`,
  })

  // Track usage
  const { trackUsage } = await import('../cost-tracker')
  await trackUsage({
    storeId,
    agentType: 'marketing',
    modelUsed: 'gemini-2.0-flash',
    tokensInput: result.usage?.inputTokens || 0,
    tokensOutput: result.usage?.outputTokens || 0,
  })

  // Parse AI response
  let parsed: {
    phases: Array<{
      name: string
      type: 'flash_sale' | 'countdown' | 'early_bird' | 'last_chance'
      startOffset: number
      endOffset: number
      channels: string[]
      emailContent: { subject: string; preview: string; body: string }
      socialContent: { caption: string; hashtags: string[] }
      whatsappContent: { message: string }
      suggestedDiscount: number
      suggestedBudgetPercent: number
    }>
    totalEstimatedBudget: { min: number; max: number }
    expectedROAS: { min: number; max: number }
  }

  try {
    const cleaned = result.text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()
    parsed = JSON.parse(cleaned)
  } catch {
    log.warn('Failed to parse AI campaign plan, using template fallback', { eventId, storeId })
    // Fall back to template-based plan
    parsed = buildFallbackPlan(event, currency)
  }

  // Convert offsets to actual dates
  const phases: CampaignPhase[] = (parsed.phases || []).map((phase) => {
    const phaseStart = new Date(eventStart)
    phaseStart.setDate(phaseStart.getDate() + (phase.startOffset || 0))
    const phaseEnd = new Date(eventStart)
    phaseEnd.setDate(phaseEnd.getDate() + (phase.endOffset || 0))

    const budgetMin = (parsed.totalEstimatedBudget?.min || 5000) * ((phase.suggestedBudgetPercent || 25) / 100)

    return {
      name: phase.name,
      type: phase.type,
      startDate: phaseStart.toISOString().split('T')[0],
      endDate: phaseEnd.toISOString().split('T')[0],
      channels: phase.channels || event.suggestedChannels,
      emailContent: phase.emailContent || { subject: '', preview: '', body: '' },
      socialContent: phase.socialContent || { caption: '', hashtags: [] },
      whatsappContent: phase.whatsappContent || { message: '' },
      suggestedDiscount: phase.suggestedDiscount || event.suggestedDiscount.min,
      suggestedBudget: Math.round(budgetMin),
    }
  })

  // Log action
  const { logAgentAction } = await import('../db')
  await logAgentAction({
    storeId,
    agentType: 'marketing',
    actionType: 'generate_campaign_plan',
    actionCategory: 'campaign',
    summary: `Generated ${phases.length}-phase campaign plan for ${event.name}`,
    details: { eventId, eventName: event.name, phaseCount: phases.length },
    status: 'completed',
    executionMode: 'auto',
  })

  return {
    eventId: event.id,
    eventName: event.name,
    storeId,
    phases,
    totalEstimatedBudget: {
      min: parsed.totalEstimatedBudget?.min || 5000,
      max: parsed.totalEstimatedBudget?.max || 15000,
      currency,
    },
    expectedROAS: {
      min: parsed.expectedROAS?.min || 3.0,
      max: parsed.expectedROAS?.max || 8.0,
    },
    generatedAt: new Date().toISOString(),
  }
}

/**
 * Build a fallback campaign plan from event templates when AI parsing fails.
 */
function buildFallbackPlan(
  event: SeasonalEvent,
  _currency: string
): {
  phases: Array<{
    name: string
    type: 'flash_sale' | 'countdown' | 'early_bird' | 'last_chance'
    startOffset: number
    endOffset: number
    channels: string[]
    emailContent: { subject: string; preview: string; body: string }
    socialContent: { caption: string; hashtags: string[] }
    whatsappContent: { message: string }
    suggestedDiscount: number
    suggestedBudgetPercent: number
  }>
  totalEstimatedBudget: { min: number; max: number }
  expectedROAS: { min: number; max: number }
} {
  const avgDiscount = Math.round((event.suggestedDiscount.min + event.suggestedDiscount.max) / 2)

  const phases = event.campaignTemplates.map((template, index) => {
    const budgetPercent = Math.round(100 / event.campaignTemplates.length)

    return {
      name: template.name,
      type: template.type,
      startOffset: -template.daysBeforeEvent - 1,
      endOffset: -template.daysBeforeEvent + 1,
      channels: event.suggestedChannels,
      emailContent: {
        subject: template.emailSubject.replace('{{discount}}', String(avgDiscount)),
        preview: template.emailPreview,
        body: `Don't miss our ${event.name} special! ${template.emailPreview}. Shop now and save up to ${avgDiscount}%.`,
      },
      socialContent: {
        caption: template.socialCaption.replace(/\{\{discount\}\}/g, String(avgDiscount)),
        hashtags: [`#${event.name.replace(/[^a-zA-Z]/g, '')}`, '#Sale', '#Shopping', '#Deals'],
      },
      whatsappContent: {
        message: template.whatsappMessage.replace('{{discount}}', String(avgDiscount)),
      },
      suggestedDiscount: avgDiscount,
      suggestedBudgetPercent: index === event.campaignTemplates.length - 1
        ? 100 - budgetPercent * (event.campaignTemplates.length - 1)
        : budgetPercent,
    }
  })

  return {
    phases,
    totalEstimatedBudget: { min: 5000, max: 15000 },
    expectedROAS: { min: 3.0, max: 8.0 },
  }
}

/**
 * Get a single event by ID.
 */
export function getEventById(eventId: string): SeasonalEvent | undefined {
  return SEASONAL_EVENTS.find((e) => e.id === eventId)
}
