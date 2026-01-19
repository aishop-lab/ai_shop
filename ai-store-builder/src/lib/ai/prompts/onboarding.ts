// AI Prompts for Onboarding

export const CATEGORY_EXTRACTION_PROMPT = `You are an expert at categorizing e-commerce businesses. Analyze the business description and extract category information.

Business Description: {description}

Return a JSON object with:
- business_type: The main type of business (e.g., "Fashion", "Food & Beverages", "Electronics", "Home & Living", "Beauty & Personal Care", "Health & Wellness", "Arts & Crafts", "Services", "Other")
- business_category: Array of 1-3 specific categories (e.g., ["Women's Clothing", "Ethnic Wear"])
- niche: The specific niche or specialty (e.g., "Handmade Saree Blouses")
- keywords: Array of 3-5 relevant keywords for SEO and discovery
- confidence: Your confidence score from 0.0 to 1.0

Return ONLY valid JSON, no other text.

Example response:
{
  "business_type": "Fashion",
  "business_category": ["Women's Clothing", "Ethnic Wear"],
  "niche": "Saree Blouses",
  "keywords": ["handmade", "sustainable", "ethnic", "traditional", "custom"],
  "confidence": 0.95
}`

export const NAME_SUGGESTION_PROMPT = `You are a creative brand naming expert. Generate 3 unique, memorable store names for an Indian e-commerce business.

Business Description: {description}

Requirements:
- Names should be catchy, easy to remember, and easy to spell
- Names should reflect the business essence
- Names should work well as a domain/subdomain
- Prefer short names (1-2 words, max 15 characters)
- Can use creative spellings or combine words
- Should appeal to Indian audience

Return ONLY a JSON object with an array of 3 suggestions:
{
  "suggestions": [
    {"name": "StoreName1", "reasoning": "Why this name works"},
    {"name": "StoreName2", "reasoning": "Why this name works"},
    {"name": "StoreName3", "reasoning": "Why this name works"}
  ]
}`

export const TAGLINE_PROMPT = `You are an expert copywriter. Generate a catchy tagline for an e-commerce store.

Store Name: {name}
Business Description: {description}

Requirements:
- Maximum 60 characters
- Should capture the essence of the brand
- Should be memorable and unique
- Can include a call to action or value proposition
- Should appeal to Indian customers

Return ONLY a JSON object:
{
  "tagline": "Your generated tagline here"
}`

export const NEXT_QUESTION_PROMPT = `You are a friendly onboarding assistant for an e-commerce platform. Generate the next question based on the conversation flow.

Current Step: {step}
Step Name: {step_name}
Collected Data: {collected_data}
Previous Response: {previous_response}

Generate a natural, conversational question that:
1. Acknowledges the previous response (if any)
2. Smoothly transitions to the next topic
3. Is warm and encouraging
4. Explains why we need this information (briefly)

Return ONLY a JSON object:
{
  "question": "Your generated question",
  "acknowledgment": "Brief acknowledgment of previous answer"
}`

export const BRAND_COLOR_SUGGESTION_PROMPT = `You are a brand design expert. Suggest a primary brand color based on the business type and vibe.

Business Type: {business_type}
Brand Vibe: {brand_vibe}
Business Description: {description}

Return ONLY a JSON object with hex color suggestions:
{
  "primary": "#hexcode",
  "secondary": "#hexcode",
  "reasoning": "Why these colors work for this brand"
}`

// Helper function to fill prompt templates
export function fillPrompt(template: string, variables: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
  }
  return result
}
