// Unified AI Prompts - Batched for optimal API usage

/**
 * Single prompt for ALL onboarding AI needs
 * Returns: category + store names + brand colors + tagline in one call
 */
export const UNIFIED_ONBOARDING_PROMPT = `You are an expert e-commerce business analyst and brand strategist. Analyze the business description and provide a comprehensive brand analysis.

Business Description: {description}
Business Name (if provided): {business_name}

Analyze this business and return a complete brand strategy in ONE JSON response:

1. **Category Analysis**: Identify the business type, categories, niche, and SEO keywords
2. **Store Name Suggestions**: Generate 3 creative, memorable store names (if business_name is not provided or is generic)
3. **Brand Colors**: Suggest primary and secondary colors that match the business type and target audience
4. **Tagline**: Create a catchy tagline (max 60 characters) that captures the brand essence

Requirements for store names:
- Catchy, easy to remember and spell
- Work well as domain/subdomain (1-2 words, max 15 chars)
- Appeal to Indian audience
- Reflect the business essence

Requirements for colors:
- Primary: Main brand color (hex)
- Secondary: Complementary color (hex)
- Consider industry standards and psychology

Return ONLY valid JSON in this exact format:
{
  "category": {
    "business_type": "Fashion|Food & Beverages|Electronics|Home & Living|Beauty & Personal Care|Health & Wellness|Arts & Crafts|Services|Other",
    "business_category": ["Category1", "Category2"],
    "niche": "Specific niche description",
    "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
    "confidence": 0.95
  },
  "store_names": [
    {"name": "StoreName1", "slug": "storename1", "reasoning": "Why this works"},
    {"name": "StoreName2", "slug": "storename2", "reasoning": "Why this works"},
    {"name": "StoreName3", "slug": "storename3", "reasoning": "Why this works"}
  ],
  "brand_colors": {
    "primary": "#hexcode",
    "secondary": "#hexcode",
    "reasoning": "Why these colors work"
  },
  "tagline": "Catchy tagline here (max 60 chars)",
  "overall_confidence": 0.90
}`

/**
 * Single prompt for ALL product extraction needs
 * Returns: title, description, categories, tags, attributes, OCR text, quality assessment
 */
export const UNIFIED_PRODUCT_PROMPT = `You are an expert e-commerce product analyst with OCR capabilities. Analyze this product image comprehensively.

Extract ALL of the following in ONE response:

1. **Product Details**:
   - Title (SEO-friendly, 3-7 words)
   - Description (2-3 compelling sentences)
   - Categories (main and subcategory)
   - Tags (5-10 relevant search tags)

2. **Product Attributes**:
   - Color (exact shade if visible)
   - Material (fabric, metal, plastic, etc.)
   - Style (modern, traditional, casual, formal, etc.)
   - Pattern (solid, striped, printed, etc.)
   - Size category (if visible: small, medium, large, one-size)
   - Any other visible features (brand name, condition, etc.)

3. **OCR Text Extraction**:
   - Extract ALL visible text from the image (labels, tags, brands, descriptions, prices, SKUs)
   - Include partial text if clearly visible

4. **Image Quality Assessment**:
   - Overall quality (1-10 scale)
   - Is the image blurry? (boolean)
   - Brightness level (dark, normal, bright)
   - Has complex/cluttered background? (boolean)
   - Recommended actions (enhance, remove_background, crop, none)

Return ONLY valid JSON:
{
  "title": "Product title here",
  "description": "Detailed product description...",
  "categories": ["Main Category", "Sub Category"],
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "attributes": {
    "color": "Blue",
    "material": "Cotton",
    "style": "Casual",
    "pattern": "Solid"
  },
  "ocr_text": ["Brand Name", "Size: M", "100% Cotton", "₹999"],
  "image_quality": {
    "score": 8,
    "is_blurry": false,
    "brightness": "normal",
    "has_complex_background": true,
    "recommended_actions": ["remove_background"]
  },
  "confidence": 0.85
}

Focus on what you can clearly see. If uncertain, omit rather than guess.`

/**
 * Prompt for logo color extraction
 */
export const LOGO_COLOR_EXTRACTION_PROMPT = `Analyze this logo image and extract the dominant colors.

Return ONLY valid JSON:
{
  "colors": [
    {"hex": "#hexcode", "name": "Color Name", "percentage": 45},
    {"hex": "#hexcode", "name": "Color Name", "percentage": 30},
    {"hex": "#hexcode", "name": "Color Name", "percentage": 25}
  ],
  "suggested_primary": "#hexcode",
  "suggested_secondary": "#hexcode",
  "color_harmony": "complementary|analogous|triadic|monochromatic"
}`

/**
 * Prompt for enhancing product description
 */
export const ENHANCE_DESCRIPTION_PROMPT = `Enhance this product description for e-commerce.

Original Description: "{description}"
Product Title: "{title}"
Category: "{category}"

Requirements:
- Keep the core message intact
- Improve clarity, flow, and persuasiveness
- Add compelling, benefit-focused language
- Ensure SEO-friendly keywords naturally integrated
- Maintain professional but warm tone
- 2-4 sentences maximum

Return ONLY valid JSON:
{
  "enhanced_description": "Your enhanced description here",
  "seo_keywords": ["keyword1", "keyword2", "keyword3"],
  "improvement_notes": "What was improved"
}`

/**
 * Prompt for generating SEO-optimized title
 */
export const GENERATE_TITLE_PROMPT = `Generate an SEO-optimized product title.

Product Info: {product_info}
Category: {category}
Extracted Attributes: {attributes}

Requirements:
- 3-7 words maximum
- Include key identifying features (color, material, type)
- SEO-optimized with searchable terms
- Professional and appealing
- Avoid generic words like "Beautiful", "Amazing", "Best"

Return ONLY valid JSON:
{
  "title": "Generated product title",
  "alternative_titles": ["Alternative 1", "Alternative 2"],
  "target_keywords": ["keyword1", "keyword2"]
}`

// Helper function to fill prompt templates
export function fillUnifiedPrompt(template: string, variables: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '')
  }
  return result
}

// Types for unified responses
export interface UnifiedOnboardingResult {
  category: {
    business_type: string
    business_category: string[]
    niche: string
    keywords: string[]
    confidence: number
  }
  store_names: Array<{
    name: string
    slug: string
    reasoning: string
  }>
  brand_colors: {
    primary: string
    secondary: string
    reasoning: string
  }
  tagline: string
  overall_confidence: number
}

export interface UnifiedProductResult {
  title: string
  description: string
  categories: string[]
  tags: string[]
  attributes: Record<string, string>
  ocr_text: string[]
  image_quality: {
    score: number
    is_blurry: boolean
    brightness: 'dark' | 'normal' | 'bright'
    has_complex_background: boolean
    recommended_actions: Array<'enhance' | 'remove_background' | 'crop' | 'none'>
  }
  confidence: number
}

export interface LogoColorResult {
  colors: Array<{
    hex: string
    name: string
    percentage: number
  }>
  suggested_primary: string
  suggested_secondary: string
  color_harmony: 'complementary' | 'analogous' | 'triadic' | 'monochromatic'
}

export interface EnhancedDescriptionResult {
  enhanced_description: string
  seo_keywords: string[]
  improvement_notes: string
}

export interface GeneratedTitleResult {
  title: string
  alternative_titles: string[]
  target_keywords: string[]
}
