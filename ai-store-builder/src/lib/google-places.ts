/**
 * Google Places API utility for address autocomplete
 *
 * This module provides client-side address autocomplete functionality
 * using Google Places Autocomplete API (new version).
 *
 * Setup:
 * 1. Create a Google Cloud project
 * 2. Enable Places API (New)
 * 3. Create an API key restricted to Places API
 * 4. Add NEXT_PUBLIC_GOOGLE_PLACES_API_KEY to env
 */

/// <reference types="@types/google.maps" />

export interface PlacePrediction {
  placeId: string
  description: string
  mainText: string
  secondaryText: string
}

export interface AddressComponents {
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  pincode: string
  country: string
  fullAddress: string
}

// Indian states mapping (short codes to full names)
const INDIAN_STATES: Record<string, string> = {
  'AN': 'Andaman and Nicobar Islands',
  'AP': 'Andhra Pradesh',
  'AR': 'Arunachal Pradesh',
  'AS': 'Assam',
  'BR': 'Bihar',
  'CG': 'Chhattisgarh',
  'CH': 'Chandigarh',
  'DD': 'Dadra and Nagar Haveli and Daman and Diu',
  'DL': 'Delhi',
  'GA': 'Goa',
  'GJ': 'Gujarat',
  'HP': 'Himachal Pradesh',
  'HR': 'Haryana',
  'JH': 'Jharkhand',
  'JK': 'Jammu and Kashmir',
  'KA': 'Karnataka',
  'KL': 'Kerala',
  'LA': 'Ladakh',
  'LD': 'Lakshadweep',
  'MH': 'Maharashtra',
  'ML': 'Meghalaya',
  'MN': 'Manipur',
  'MP': 'Madhya Pradesh',
  'MZ': 'Mizoram',
  'NL': 'Nagaland',
  'OR': 'Odisha',
  'PB': 'Punjab',
  'PY': 'Puducherry',
  'RJ': 'Rajasthan',
  'SK': 'Sikkim',
  'TN': 'Tamil Nadu',
  'TS': 'Telangana',
  'TR': 'Tripura',
  'UK': 'Uttarakhand',
  'UP': 'Uttar Pradesh',
  'WB': 'West Bengal',
}

/**
 * Get full state name from short code
 */
function getFullStateName(shortCode: string): string {
  return INDIAN_STATES[shortCode.toUpperCase()] || shortCode
}

/**
 * Generate a session token for billing optimization
 * Session tokens group autocomplete requests with place details requests
 */
export function generateSessionToken(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}

// Extend Window to include google
declare global {
  interface Window {
    google?: typeof google
  }
}

/**
 * Check if Google Places API is available
 */
export function isGooglePlacesAvailable(): boolean {
  return !!(
    typeof window !== 'undefined' &&
    window.google?.maps?.places?.AutocompleteService
  )
}

/**
 * Create an AutocompleteService instance
 */
export function createAutocompleteService(): google.maps.places.AutocompleteService | null {
  if (!isGooglePlacesAvailable()) {
    return null
  }
  return new google.maps.places.AutocompleteService()
}

/**
 * Create a PlacesService instance (requires a div element)
 */
export function createPlacesService(element: HTMLDivElement): google.maps.places.PlacesService | null {
  if (!isGooglePlacesAvailable()) {
    return null
  }
  return new google.maps.places.PlacesService(element)
}

/**
 * Fetch autocomplete predictions for an input string
 */
export async function getAutocompletePredictions(
  service: google.maps.places.AutocompleteService,
  input: string,
  sessionToken?: google.maps.places.AutocompleteSessionToken
): Promise<PlacePrediction[]> {
  if (!input || input.length < 3) {
    return []
  }

  return new Promise((resolve) => {
    service.getPlacePredictions(
      {
        input,
        componentRestrictions: { country: 'in' }, // Restrict to India
        types: ['address'], // Only return addresses
        sessionToken,
      },
      (predictions, status) => {
        if (
          status !== google.maps.places.PlacesServiceStatus.OK ||
          !predictions
        ) {
          resolve([])
          return
        }

        resolve(
          predictions.map((prediction) => ({
            placeId: prediction.place_id,
            description: prediction.description,
            mainText: prediction.structured_formatting.main_text,
            secondaryText: prediction.structured_formatting.secondary_text,
          }))
        )
      }
    )
  })
}

/**
 * Get place details and extract address components
 */
export async function getPlaceDetails(
  service: google.maps.places.PlacesService,
  placeId: string,
  sessionToken?: google.maps.places.AutocompleteSessionToken
): Promise<AddressComponents | null> {
  return new Promise((resolve) => {
    service.getDetails(
      {
        placeId,
        fields: ['address_components', 'formatted_address'],
        sessionToken,
      },
      (place, status) => {
        if (
          status !== google.maps.places.PlacesServiceStatus.OK ||
          !place?.address_components
        ) {
          resolve(null)
          return
        }

        const components = parseAddressComponents(
          place.address_components,
          place.formatted_address || ''
        )
        resolve(components)
      }
    )
  })
}

/**
 * Parse Google address components into our format
 */
function parseAddressComponents(
  components: google.maps.GeocoderAddressComponent[],
  formattedAddress: string
): AddressComponents {
  const result: AddressComponents = {
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    fullAddress: formattedAddress,
  }

  // Extract components
  let streetNumber = ''
  let route = ''
  let sublocality = ''
  let sublocality2 = ''
  let sublocality3 = ''
  let locality = ''
  let adminArea2 = '' // District
  let adminArea1 = '' // State
  let postalCode = ''

  for (const component of components) {
    const types = component.types

    if (types.includes('street_number')) {
      streetNumber = component.long_name
    } else if (types.includes('route')) {
      route = component.long_name
    } else if (types.includes('sublocality_level_3')) {
      sublocality3 = component.long_name
    } else if (types.includes('sublocality_level_2')) {
      sublocality2 = component.long_name
    } else if (types.includes('sublocality_level_1') || types.includes('sublocality')) {
      sublocality = component.long_name
    } else if (types.includes('locality')) {
      locality = component.long_name
    } else if (types.includes('administrative_area_level_2')) {
      adminArea2 = component.long_name
    } else if (types.includes('administrative_area_level_1')) {
      // Google sometimes returns short names like "MH" for Maharashtra
      adminArea1 = getFullStateName(component.short_name) || component.long_name
    } else if (types.includes('postal_code')) {
      postalCode = component.long_name
    }
  }

  // Build address lines
  // Line 1: Street number + route, or sublocality level 3
  const streetPart = [streetNumber, route].filter(Boolean).join(' ')

  if (streetPart) {
    result.addressLine1 = streetPart
    // Line 2: Sublocalities
    const sublocalityParts = [sublocality3, sublocality2, sublocality].filter(Boolean)
    if (sublocalityParts.length > 0) {
      result.addressLine2 = sublocalityParts.join(', ')
    }
  } else {
    // No street, use sublocalities for line 1
    const allSublocalities = [sublocality3, sublocality2, sublocality].filter(Boolean)
    if (allSublocalities.length > 0) {
      result.addressLine1 = allSublocalities[0]
      if (allSublocalities.length > 1) {
        result.addressLine2 = allSublocalities.slice(1).join(', ')
      }
    }
  }

  // City: Prefer locality, fallback to district
  result.city = locality || adminArea2 || ''

  // State
  result.state = adminArea1 || ''

  // Pincode
  result.pincode = postalCode || ''

  return result
}

/**
 * Load Google Maps JavaScript API dynamically
 */
export function loadGoogleMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (isGooglePlacesAvailable()) {
      resolve()
      return
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com"]'
    )
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve())
      existingScript.addEventListener('error', () =>
        reject(new Error('Failed to load Google Maps'))
      )
      return
    }

    // Create and load script
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true

    script.addEventListener('load', () => resolve())
    script.addEventListener('error', () =>
      reject(new Error('Failed to load Google Maps'))
    )

    document.head.appendChild(script)
  })
}

/**
 * Hook-friendly class for managing autocomplete state
 */
export class AddressAutocompleteManager {
  private autocompleteService: google.maps.places.AutocompleteService | null = null
  private placesService: google.maps.places.PlacesService | null = null
  private sessionToken: google.maps.places.AutocompleteSessionToken | null = null
  private attributionElement: HTMLDivElement | null = null

  constructor() {
    // Initialize when Google Maps is available
    if (isGooglePlacesAvailable()) {
      this.initializeServices()
    }
  }

  private initializeServices() {
    this.autocompleteService = createAutocompleteService()

    // Create a hidden div for PlacesService (required by Google)
    if (typeof document !== 'undefined') {
      this.attributionElement = document.createElement('div')
      this.attributionElement.style.display = 'none'
      document.body.appendChild(this.attributionElement)
      this.placesService = createPlacesService(this.attributionElement)
    }

    this.refreshSessionToken()
  }

  /**
   * Initialize services (call after Google Maps loads)
   */
  initialize() {
    if (!this.autocompleteService && isGooglePlacesAvailable()) {
      this.initializeServices()
    }
  }

  /**
   * Refresh session token (call when starting a new search session)
   */
  refreshSessionToken() {
    if (isGooglePlacesAvailable()) {
      this.sessionToken = new google.maps.places.AutocompleteSessionToken()
    }
  }

  /**
   * Get predictions for input
   */
  async getPredictions(input: string): Promise<PlacePrediction[]> {
    if (!this.autocompleteService) {
      return []
    }

    return getAutocompletePredictions(
      this.autocompleteService,
      input,
      this.sessionToken || undefined
    )
  }

  /**
   * Get place details and address components
   * Note: This consumes the session token, refresh after calling
   */
  async getAddressDetails(placeId: string): Promise<AddressComponents | null> {
    if (!this.placesService) {
      return null
    }

    const details = await getPlaceDetails(
      this.placesService,
      placeId,
      this.sessionToken || undefined
    )

    // Refresh session token after getting details (billing optimization)
    this.refreshSessionToken()

    return details
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.attributionElement && this.attributionElement.parentNode) {
      this.attributionElement.parentNode.removeChild(this.attributionElement)
    }
    this.autocompleteService = null
    this.placesService = null
    this.sessionToken = null
    this.attributionElement = null
  }
}
