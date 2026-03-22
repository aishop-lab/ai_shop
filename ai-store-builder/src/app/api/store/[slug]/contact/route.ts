// POST /api/store/[slug]/contact - Send contact form message to store owner

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { rateLimit } from '@/lib/rate-limit'

// Contact form rate limit: 3 per minute per IP
const CONTACT_RATE_LIMIT = {
  limit: 3,
  windowSeconds: 60,
  prefix: 'contact',
} as const

interface RouteParams {
  params: Promise<{ slug: string }>
}

/**
 * POST /api/store/[slug]/contact
 * Accepts { name, email, subject, message } and sends an email
 * to the store's contact_email address.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Rate limit check
    const rateLimitResult = rateLimit(request, CONTACT_RATE_LIMIT)
    if (rateLimitResult) return rateLimitResult

    const { slug } = await params

    // Validate slug
    if (!slug || typeof slug !== 'string') {
      return NextResponse.json(
        { error: 'Invalid store slug' },
        { status: 400 }
      )
    }

    // Parse and validate request body
    let body: { name?: string; email?: string; subject?: string; message?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    const { name, email, subject, message } = body

    // Validate all required fields
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    if (!subject || typeof subject !== 'string' || !subject.trim()) {
      return NextResponse.json(
        { error: 'Subject is required' },
        { status: 400 }
      )
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Look up the store by slug using service role client (bypasses RLS)
    const supabase = await createAdminClient()
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, name, contact_email')
      .eq('slug', slug.toLowerCase().trim())
      .eq('is_active', true)
      .single()

    if (storeError || !store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      )
    }

    if (!store.contact_email) {
      return NextResponse.json(
        { error: 'This store has not configured a contact email' },
        { status: 400 }
      )
    }

    // Build the email HTML
    const sanitizedName = escapeHtml(name.trim())
    const sanitizedEmail = escapeHtml(email.trim())
    const sanitizedSubject = escapeHtml(subject.trim())
    const sanitizedMessage = escapeHtml(message.trim()).replace(/\n/g, '<br />')

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f8f9fa; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
          <h2 style="margin: 0 0 8px 0; color: #1a1a1a; font-size: 20px;">New Contact Form Message</h2>
          <p style="margin: 0; color: #666; font-size: 14px;">from ${store.name} store contact page</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #666; width: 100px; vertical-align: top;"><strong>From:</strong></td>
            <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #1a1a1a;">${sanitizedName}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #666; vertical-align: top;"><strong>Email:</strong></td>
            <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #1a1a1a;">
              <a href="mailto:${sanitizedEmail}" style="color: #2563eb; text-decoration: none;">${sanitizedEmail}</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #666; vertical-align: top;"><strong>Subject:</strong></td>
            <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #1a1a1a;">${sanitizedSubject}</td>
          </tr>
        </table>

        <div style="background: #ffffff; border: 1px solid #eee; border-radius: 8px; padding: 20px;">
          <h3 style="margin: 0 0 12px 0; color: #1a1a1a; font-size: 16px;">Message:</h3>
          <div style="color: #333; line-height: 1.6; font-size: 15px;">
            ${sanitizedMessage}
          </div>
        </div>

        <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #eee; color: #999; font-size: 12px;">
          <p>You can reply directly to this email to respond to ${sanitizedName}.</p>
        </div>
      </div>
    `

    // Send the email to the store's contact email
    const result = await sendEmail({
      to: store.contact_email,
      subject: `[${store.name}] Contact: ${subject.trim()}`,
      html: emailHtml,
      replyTo: email.trim(),
      storeId: store.id,
      storeName: store.name,
    })

    if (!result.success) {
      console.error('Contact email failed:', result.error)
      return NextResponse.json(
        { error: 'Failed to send message. Please try again later.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Your message has been sent successfully.',
    })
  } catch (error) {
    console.error('Contact form API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Escape HTML special characters to prevent XSS in email content
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
