import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ slug: string }>
}

// GET - Fetch store by slug
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params

    if (!slug) {
      return NextResponse.json({ error: 'Store slug is required' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: store, error } = await supabase
      .from('stores')
      .select('id, name, slug, status, logo_url, tagline, theme_template')
      .eq('slug', slug.toLowerCase())
      .eq('status', 'active')
      .single()

    if (error || !store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      store: {
        id: store.id,
        name: store.name,
        slug: store.slug,
        logoUrl: store.logo_url,
        tagline: store.tagline,
        theme: store.theme_template
      }
    })
  } catch (error) {
    console.error('Get store error:', error)
    return NextResponse.json({ error: 'Failed to fetch store' }, { status: 500 })
  }
}
