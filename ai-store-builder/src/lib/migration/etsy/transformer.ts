// Transform Etsy data to StoreForge normalized format

import type {
  EtsyListing,
  EtsySection,
  MigrationProduct,
  MigrationCollection,
  MigrationVariant,
  MigrationImage,
} from '../types'

/**
 * Transform an Etsy listing to StoreForge product format
 */
export function transformEtsyListing(listing: EtsyListing): MigrationProduct | null {
  // Skip non-active/draft listings
  if (listing.state !== 'active' && listing.state !== 'draft') return null

  // Calculate price (Etsy stores price as amount/divisor)
  const price = listing.price.amount / listing.price.divisor

  // Transform images
  const images: MigrationImage[] = (listing.images || []).map((img, idx) => ({
    source_url: img.url_fullxfull,
    alt_text: img.alt_text || undefined,
    position: img.rank || idx,
  }))

  // Transform property values to variants
  const variants: MigrationVariant[] = []
  if (listing.property_values && listing.property_values.length > 0) {
    // Etsy property_values represent the variation options
    // For simple cases (single property with multiple values), create a variant per value
    const variationProperties = listing.property_values.filter(
      p => p.values.length > 0
    )

    if (variationProperties.length === 1) {
      // Single dimension variant (e.g. just Size or just Color)
      const prop = variationProperties[0]
      for (const value of prop.values) {
        variants.push({
          source_id: `${listing.listing_id}_${prop.property_name}_${value}`,
          title: value,
          price,
          quantity: Math.max(0, Math.floor(listing.quantity / prop.values.length)),
          options: { [prop.property_name.toLowerCase()]: value },
        })
      }
    } else if (variationProperties.length >= 2) {
      // Multi-dimension variants (e.g. Size x Color)
      const prop1 = variationProperties[0]
      const prop2 = variationProperties[1]
      for (const v1 of prop1.values) {
        for (const v2 of prop2.values) {
          variants.push({
            source_id: `${listing.listing_id}_${v1}_${v2}`,
            title: `${v1} / ${v2}`,
            price,
            quantity: Math.max(
              0,
              Math.floor(listing.quantity / (prop1.values.length * prop2.values.length))
            ),
            options: {
              [prop1.property_name.toLowerCase()]: v1,
              [prop2.property_name.toLowerCase()]: v2,
            },
          })
        }
      }
    }
  }

  return {
    source_id: listing.listing_id.toString(),
    title: listing.title,
    description: listing.description,
    price,
    quantity: Math.max(0, listing.quantity),
    track_quantity: true,
    categories: [],
    tags: listing.tags || [],
    images,
    variants,
    status: listing.state === 'active' ? 'active' : 'draft',
  }
}

/**
 * Transform an Etsy shop section to StoreForge collection format
 */
export function transformEtsySection(
  section: EtsySection,
  listingIds: number[]
): MigrationCollection {
  return {
    source_id: section.shop_section_id.toString(),
    title: section.title,
    product_source_ids: listingIds.map(id => id.toString()),
  }
}
