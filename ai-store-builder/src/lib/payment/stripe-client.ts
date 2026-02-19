/**
 * Client-side Stripe utilities
 * Stripe Checkout uses a redirect flow — no SDK needed on the frontend
 */

/**
 * Redirect the browser to a Stripe Checkout Session URL
 */
export function redirectToStripeCheckout(sessionUrl: string): void {
  window.location.href = sessionUrl
}
