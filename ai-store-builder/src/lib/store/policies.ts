// Store Policy Generation Functions

import { SupabaseClient } from '@supabase/supabase-js'
import type {
  PolicyConfig,
  ReturnPolicyConfig,
  ShippingPolicyConfig
} from '@/lib/types/store'

export interface StorePolicies {
  returns: { content: string; updated_at: string }
  privacy: { content: string; updated_at: string }
  terms: { content: string; updated_at: string }
  shipping: { content: string; updated_at: string }
}

/**
 * Generate and save all legal policies for a store
 */
export async function generateStorePolicies(
  supabase: SupabaseClient,
  storeId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get store info including policy config
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, name, settings, blueprint, policy_config')
      .eq('id', storeId)
      .single()

    if (storeError || !store) {
      console.error('[Policies] Store not found:', storeError)
      return { success: false, error: 'Store not found' }
    }

    console.log('[Policies] Generating policies for store:', store.name)

    // Extract store info for policy generation
    const settings = store.settings || {}
    const policyConfig: PolicyConfig = store.policy_config || {
      returns: {
        enabled: true,
        window_days: 14,
        condition: 'unused_with_tags',
        refund_method: 'original_payment'
      },
      shipping: {
        free_shipping: 'threshold',
        free_threshold: settings.shipping?.free_shipping_threshold || 999,
        delivery_speed: 'standard',
        regions: 'pan_india',
        processing_days: 2
      }
    }

    const codEnabled = settings.shipping?.cod_enabled !== false

    // Generate all policies
    const now = new Date().toISOString()

    const policies: StorePolicies = {
      returns: {
        content: generateReturnPolicy(store.name, policyConfig.returns),
        updated_at: now
      },
      privacy: {
        content: generatePrivacyPolicy(store.name),
        updated_at: now
      },
      terms: {
        content: generateTermsOfService(store.name),
        updated_at: now
      },
      shipping: {
        content: generateShippingPolicy(store.name, policyConfig.shipping, codEnabled),
        updated_at: now
      }
    }

    // Save policies to store
    const { error: updateError } = await supabase
      .from('stores')
      .update({ policies })
      .eq('id', storeId)

    if (updateError) {
      console.error('[Policies] Failed to save policies:', updateError)
      return { success: false, error: 'Failed to save policies' }
    }

    console.log('[Policies] All policies generated successfully for:', store.name)
    return { success: true }
  } catch (error) {
    console.error('[Policies] Error generating policies:', error)
    return { success: false, error: 'Policy generation failed' }
  }
}

// Policy content generators

function generateReturnPolicy(storeName: string, config: ReturnPolicyConfig): string {
  // No returns policy
  if (!config.enabled || config.window_days === 0) {
    return `
<h2>Return & Refund Policy</h2>

<p>At ${storeName}, all sales are final. We do not accept returns or provide refunds for purchased items.</p>

<h3>Why We Don't Accept Returns</h3>
<p>Due to the nature of our products, we are unable to accept returns. We encourage you to carefully review product descriptions, images, and sizing guides before making a purchase.</p>

<h3>Damaged or Defective Items</h3>
<p>If you receive a damaged or defective item, please contact us within 48 hours of delivery with photos. We'll assess the situation and may offer a replacement or store credit at our discretion.</p>

<h3>Wrong Item Received</h3>
<p>If you received a different item than what you ordered, please contact us immediately. We'll arrange for the correct item to be sent to you.</p>

<h3>Consumer Protection</h3>
<p>This policy is compliant with the Consumer Protection Act, 2019 of India. Your statutory rights for defective products are not affected.</p>
`.trim()
  }

  // Return condition text
  const conditionText: Record<typeof config.condition, string> = {
    'unused_with_tags': 'Items must be unused, unworn, and in their original packaging with all tags attached.',
    'opened_ok': 'Items may have been opened but must be in original condition, unused, and with all accessories.',
    'any_condition': 'We accept returns in any condition. However, items that are damaged or used may receive partial refunds.',
    'no_returns': '' // This won't be reached as we handle it above
  }

  // Refund method text
  const refundText: Record<typeof config.refund_method, string> = {
    'original_payment': 'The refund will be credited to your original payment method within 7-10 business days.',
    'store_credit': 'You will receive store credit that can be used for future purchases. Store credit never expires.',
    'exchange_only': 'We offer exchanges only. You can choose a different size, color, or an item of equal or lesser value.',
    'buyer_choice': 'You can choose between a refund to your original payment method, store credit, or an exchange for another item.'
  }

  const refundProcessingText = config.refund_method === 'exchange_only'
    ? 'Once we receive and inspect your return, we\'ll ship your exchange item within 3-5 business days.'
    : config.refund_method === 'store_credit'
    ? 'Store credit will be issued within 3-5 business days after we receive your return.'
    : 'Refunds are processed within 7-10 business days after we receive your return.'

  return `
<h2>Return & Refund Policy</h2>

<p>At ${storeName}, we want you to be completely satisfied with your purchase. If you're not happy with your order, we're here to help.</p>

<h3>Return Window</h3>
<p>You may return most items within <strong>${config.window_days} days</strong> of delivery. ${conditionText[config.condition]}</p>

<h3>How to Initiate a Return</h3>
<ol>
  <li>Contact us via email or WhatsApp with your order number</li>
  <li>We'll provide instructions and a return address</li>
  <li>Pack the item securely and ship it back</li>
  <li>Once received and inspected, we'll process your ${config.refund_method === 'exchange_only' ? 'exchange' : config.refund_method === 'store_credit' ? 'store credit' : 'refund'}</li>
</ol>

<h3>${config.refund_method === 'exchange_only' ? 'Exchange' : 'Refund'} Processing</h3>
<p>${refundProcessingText} ${refundText[config.refund_method]}</p>

<h3>Non-Returnable Items</h3>
<ul>
  <li>Customized or personalized products</li>
  <li>Intimate wear and undergarments</li>
  <li>Items marked as "Final Sale" or "Non-Returnable"</li>
  <li>Products damaged due to misuse</li>
</ul>

<h3>Damaged or Defective Items</h3>
<p>If you receive a damaged or defective item, please contact us within 48 hours of delivery with photos. We'll arrange for a replacement or full refund at no extra cost.</p>

<h3>Return Shipping</h3>
<p>Return shipping costs are the responsibility of the customer, unless the return is due to our error (wrong item, defective product).</p>

<h3>Consumer Protection</h3>
<p>This policy is compliant with the Consumer Protection Act, 2019 of India. Your statutory rights are not affected.</p>
`.trim()
}

function generatePrivacyPolicy(storeName: string): string {
  return `
<h2>Privacy Policy</h2>

<p>At ${storeName}, we are committed to protecting your privacy and personal data. This policy explains how we collect, use, and safeguard your information.</p>

<h3>Information We Collect</h3>
<ul>
  <li><strong>Personal Information:</strong> Name, email address, phone number, shipping address</li>
  <li><strong>Payment Information:</strong> Payment method details (processed securely via payment gateways)</li>
  <li><strong>Usage Data:</strong> Browser type, pages visited, time spent on site</li>
</ul>

<h3>How We Use Your Information</h3>
<ul>
  <li>To process and fulfill your orders</li>
  <li>To communicate about your orders and provide customer support</li>
  <li>To send promotional emails (with your consent)</li>
  <li>To improve our website and services</li>
</ul>

<h3>Data Protection</h3>
<p>We implement appropriate security measures to protect your personal data. Your payment information is never stored on our servers - it's processed directly by secure payment gateways.</p>

<h3>Your Rights</h3>
<p>You have the right to:</p>
<ul>
  <li>Access your personal data</li>
  <li>Request correction of inaccurate data</li>
  <li>Request deletion of your data</li>
  <li>Opt-out of marketing communications</li>
</ul>

<h3>Cookies</h3>
<p>We use cookies to enhance your browsing experience and analyze site traffic. You can manage cookie preferences in your browser settings.</p>

<h3>Data Storage</h3>
<p>Your data is stored on secure servers within India, complying with applicable data protection regulations.</p>

<h3>Contact Us</h3>
<p>For any privacy-related queries, please contact us through our website.</p>
`.trim()
}

function generateTermsOfService(storeName: string): string {
  return `
<h2>Terms of Service</h2>

<p>Welcome to ${storeName}. By accessing or using our website, you agree to be bound by these terms and conditions.</p>

<h3>Account Registration</h3>
<p>You may need to create an account to make purchases. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.</p>

<h3>Orders & Pricing</h3>
<ul>
  <li>All prices are displayed in Indian Rupees (INR) and include applicable taxes</li>
  <li>We reserve the right to modify prices without prior notice</li>
  <li>Orders are subject to availability and confirmation</li>
  <li>We may cancel orders if there are pricing errors or stock issues</li>
</ul>

<h3>Payment Terms</h3>
<p>We accept various payment methods including UPI, credit/debit cards, net banking, and Cash on Delivery (where available). All payments are processed securely.</p>

<h3>Intellectual Property</h3>
<p>All content on this website, including images, text, logos, and designs, is the property of ${storeName} and protected by intellectual property laws. Unauthorized use is prohibited.</p>

<h3>Limitation of Liability</h3>
<p>${storeName} shall not be liable for any indirect, incidental, or consequential damages arising from your use of our products or services.</p>

<h3>Dispute Resolution</h3>
<p>Any disputes arising from these terms shall be governed by the laws of India. Disputes shall be subject to the exclusive jurisdiction of courts in India.</p>

<h3>Changes to Terms</h3>
<p>We may update these terms from time to time. Continued use of our website after changes constitutes acceptance of the new terms.</p>

<h3>Contact</h3>
<p>For questions about these terms, please contact us through our website.</p>
`.trim()
}

function generateShippingPolicy(
  storeName: string,
  config: ShippingPolicyConfig,
  codEnabled: boolean
): string {
  // Shipping rates section based on free shipping config
  let shippingRatesSection: string
  switch (config.free_shipping) {
    case 'always':
      shippingRatesSection = `
<h3>Shipping Rates</h3>
<p><strong>Free Shipping</strong> on all orders! No minimum purchase required.</p>`
      break
    case 'never':
      shippingRatesSection = `
<h3>Shipping Rates</h3>
<p>Shipping charges are calculated at checkout based on your location and order weight. The exact amount will be displayed before you confirm your order.</p>`
      break
    case 'threshold':
    default:
      shippingRatesSection = `
<h3>Shipping Rates</h3>
<ul>
  <li><strong>Free Shipping:</strong> On all orders above ₹${config.free_threshold.toLocaleString('en-IN')}</li>
  <li><strong>Standard Shipping:</strong> Calculated at checkout for orders below ₹${config.free_threshold.toLocaleString('en-IN')}</li>
</ul>`
      break
  }

  // Delivery timeframes based on speed
  const deliveryTimes: Record<typeof config.delivery_speed, { metro: string; other: string; remote: string }> = {
    'express': { metro: '1-2 business days', other: '2-3 business days', remote: '3-5 business days' },
    'standard': { metro: '3-5 business days', other: '5-7 business days', remote: '7-10 business days' },
    'economy': { metro: '5-7 business days', other: '7-10 business days', remote: '10-14 business days' }
  }
  const times = deliveryTimes[config.delivery_speed]

  // Processing time text
  const processingText = config.processing_days === 1
    ? 'within 1 business day'
    : `within ${config.processing_days} business days`

  // Shipping regions text
  let regionsSection: string
  switch (config.regions) {
    case 'metro_only':
      regionsSection = `
<h3>Delivery Areas</h3>
<p>We currently deliver to major metro cities only, including Delhi NCR, Mumbai, Bangalore, Chennai, Kolkata, Hyderabad, Pune, and Ahmedabad.</p>
<p>We're working on expanding our delivery network. If your city is not serviceable, please check back soon!</p>`
      break
    case 'specific_states':
      const stateList = config.specific_states?.length
        ? config.specific_states.join(', ')
        : 'selected states'
      regionsSection = `
<h3>Delivery Areas</h3>
<p>We currently ship to the following states: ${stateList}.</p>
<p>If your location is not in our delivery area, please contact us to check for special arrangements.</p>`
      break
    case 'pan_india':
    default:
      regionsSection = `
<h3>Delivery Areas</h3>
<p>${storeName} ships across India. We deliver to all serviceable PIN codes through our trusted courier partners.</p>`
      break
  }

  return `
<h2>Shipping Policy</h2>

<p>${storeName} is committed to delivering your orders quickly and safely.</p>

${shippingRatesSection}

<h3>Processing Time</h3>
<p>Orders are processed ${processingText} after payment confirmation. You'll receive a confirmation email once your order is dispatched.</p>

<h3>Delivery Time</h3>
<ul>
  <li><strong>Metro Cities:</strong> ${times.metro}</li>
  <li><strong>Other Cities:</strong> ${times.other}</li>
  <li><strong>Remote Areas:</strong> ${times.remote}</li>
</ul>
<p><em>Note: Delivery times are estimates and may vary during peak seasons, festivals, or due to unforeseen circumstances.</em></p>

${regionsSection}

<h3>Tracking Your Order</h3>
<p>Once your order is shipped, you'll receive a tracking number via email and SMS. You can track your package on our website or the courier's website.</p>

${codEnabled ? `
<h3>Cash on Delivery (COD)</h3>
<p>COD is available for eligible orders. A small COD fee may apply. Please keep the exact amount ready at the time of delivery.</p>
` : ''}

<h3>Delivery Attempts</h3>
<p>Our delivery partner will attempt delivery up to 3 times. If unsuccessful, the package will be returned to us, and we'll contact you for re-delivery arrangements (additional charges may apply).</p>

<h3>Delays</h3>
<p>While we make every effort to deliver on time, delays may occur due to unforeseen circumstances such as weather, festivals, strikes, or courier issues. We appreciate your patience and will keep you informed of any significant delays.</p>

<h3>Questions?</h3>
<p>For shipping-related queries, please contact our support team through our website.</p>
`.trim()
}
