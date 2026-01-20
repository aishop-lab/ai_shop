import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { getStoreBySlug } from '@/lib/store/get-store-data'
import { format } from 'date-fns'

interface PolicyPageProps {
    params: Promise<{ storeSlug: string; type: string }>
}

const policyTitles: Record<string, string> = {
    returns: 'Return & Refund Policy',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
    shipping: 'Shipping Policy'
}

export async function generateMetadata({ params }: PolicyPageProps): Promise<Metadata> {
    const { storeSlug, type } = await params
    const store = await getStoreBySlug(storeSlug)

    if (!store) return {}

    const title = policyTitles[type] || 'Policy'

    return {
        title: `${title} | ${store.name}`,
        description: `${title} for ${store.name}`,
    }
}

export default async function PolicyPage({ params }: PolicyPageProps) {
    const { storeSlug, type } = await params

    // Validate policy type
    if (!['returns', 'privacy', 'terms', 'shipping'].includes(type)) {
        notFound()
    }

    const store = await getStoreBySlug(storeSlug)

    if (!store) {
        notFound()
    }

    // Get policy content
    const policyType = type as 'returns' | 'privacy' | 'terms' | 'shipping'
    const policy = store.policies?.[policyType]

    // Check if policy exists
    if (!policy || !policy.content) {
        return (
            <div className="max-w-4xl mx-auto py-12 px-6">
                <h1
                    className="text-3xl font-bold mb-8"
                    style={{ fontFamily: 'var(--font-heading)' }}
                >
                    {policyTitles[type]}
                </h1>
                <p className="text-gray-600">
                    This policy is currently being prepared. Please check back soon.
                </p>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto py-12 px-6">
            <article
                className="prose prose-lg max-w-none"
                style={{ fontFamily: 'var(--font-body)' }}
            >
                <div
                    dangerouslySetInnerHTML={{ __html: policy.content }}
                />
            </article>

            {policy.updated_at && (
                <p className="text-sm text-gray-500 mt-12 pt-6 border-t">
                    Last updated: {format(new Date(policy.updated_at), 'MMMM dd, yyyy')}
                </p>
            )}
        </div>
    )
}
