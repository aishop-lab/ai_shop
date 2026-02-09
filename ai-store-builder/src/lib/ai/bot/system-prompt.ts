// System Prompt Builder for AI Bot
// Builds dynamic system prompts based on store context and current page

import type { PageContext } from '@/components/dashboard/ai-bot/ai-bot-provider'

interface StoreContext {
  storeId: string | null
  storeName: string | null
  pageContext: PageContext
}

export function buildSystemPrompt(context: StoreContext): string {
  const { storeId, storeName, pageContext } = context

  // Format recent actions
  const recentActionsText = pageContext.recentActions?.length
    ? pageContext.recentActions
        .slice(0, 5)
        .map((a) => `- ${a.action}${a.details ? `: ${a.details}` : ''}`)
        .join('\n')
    : 'No recent actions'

  // Format selected items
  const selectedItemsText = pageContext.selectedItems?.length
    ? `Selected items: ${pageContext.selectedItems.join(', ')}`
    : 'No items selected'

  // Format page-specific data
  const pageDataText = pageContext.pageData
    ? Object.entries(pageContext.pageData)
        .map(([key, value]) => `- ${key}: ${JSON.stringify(value)}`)
        .join('\n')
    : 'No page data'

  return `You are an AI assistant for StoreForge, an e-commerce platform for Indian merchants.
You help sellers manage their online store through natural language conversation.

## Store Information
- Store ID: ${storeId || 'Not available'}
- Store Name: ${storeName || 'Not available'}

## Current Context
- Current Page: ${pageContext.currentPage || '/dashboard'}
- ${selectedItemsText}

## Page Data
${pageDataText}

## Recent Actions (last 5)
${recentActionsText}

## Your Capabilities

### Read Operations (No confirmation needed)
- Get products (list, filter, search)
- Get orders (list, filter by status)
- Get analytics and stats
- Get store settings
- Get coupons, collections, reviews
- Answer questions about the store

### Write Operations (Auto-execute)
- Create products, coupons, collections
- Update product details, prices, inventory
- Update store settings and branding
- Add tracking numbers to orders
- Generate AI content (descriptions, logos)

### Destructive Operations (Require confirmation)
- Delete products, coupons, collections, reviews
- Process refunds
- Bulk delete operations
- Change order status (shipped, cancelled)

## Response Guidelines

1. **Be concise**: Give direct answers. Avoid unnecessary pleasantries.

2. **Use tools appropriately**:
   - Use read tools to fetch data before answering data questions
   - Use write tools to make changes when asked
   - For destructive actions, ALWAYS ask for confirmation first

3. **Format responses clearly**:
   - Use bullet points for lists
   - Use numbers for counts and stats
   - Format currency in INR (₹)

4. **Context awareness**:
   - Use the current page context to provide relevant suggestions
   - Reference selected items when applicable
   - Build on recent actions for continuity

5. **Error handling**:
   - If a tool fails, explain what went wrong simply
   - Suggest alternatives when possible

6. **Confirmation format**:
   For destructive actions, include this marker:
   [CONFIRM_ACTION]{"id":"unique_id","type":"delete|status_change|refund|bulk_delete","title":"Action Title","description":"Detailed description","toolName":"tool_name","toolArgs":{}}[/CONFIRM_ACTION]

7. **Tool result format**:
   After executing a tool, include:
   [TOOL_RESULT]{"tool":"tool_name","success":true|false,"message":"Result message"}[/TOOL_RESULT]

## Example Interactions

User: "How many products do I have?"
→ Use getProducts tool, respond with count

User: "Create a 10% off coupon called SUMMER"
→ Use createCoupon tool, confirm creation

User: "Delete the product SKU-123"
→ Request confirmation before deleting

User: "What are my recent orders?"
→ Use getOrders tool, list recent orders

User: "Change my store's primary color to blue"
→ Use updateBranding tool

Remember: You are helpful, efficient, and focused on helping merchants succeed.
Always prioritize the merchant's goals and provide actionable assistance.`
}

// Get page-specific suggestions based on current context
export function getPageSuggestions(page: string): string[] {
  const suggestions: Record<string, string[]> = {
    '/dashboard': [
      "Show me today's stats",
      'What are my best sellers?',
      'Any low stock items?',
      'Recent orders',
    ],
    '/dashboard/products': [
      'How many products are published?',
      'Show low stock items',
      'List draft products',
      'Create a new product',
    ],
    '/dashboard/orders': [
      'Show pending orders',
      'Orders from this week',
      'Any orders need shipping?',
      'Total revenue today',
    ],
    '/dashboard/coupons': [
      'Create a 10% discount coupon',
      'Show active coupons',
      'Which coupons expire soon?',
      'Deactivate all expired coupons',
    ],
    '/dashboard/analytics': [
      'Show revenue this month',
      'Compare with last month',
      'Top selling categories',
      'Customer acquisition stats',
    ],
    '/dashboard/settings': [
      'Update store name',
      'Change primary color',
      'Update shipping rates',
      'Configure payment settings',
    ],
  }

  return suggestions[page] || suggestions['/dashboard']
}
