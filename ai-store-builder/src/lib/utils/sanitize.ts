/**
 * Sanitize user input for use in Supabase PostgREST .or() filter strings.
 *
 * PostgREST uses commas to separate filter clauses. Injecting commas into
 * an .or() string can append arbitrary filter clauses (e.g., `,id.eq.<uuid>`).
 *
 * We strip commas (clause separator) and parentheses (grouping) but preserve
 * dots (needed for email search like "user@example.com") and other characters.
 */
export function sanitizeSearchQuery(search: string): string {
  // Remove PostgREST clause delimiters: commas and parentheses
  // Dots are safe within ilike value positions and needed for email search
  return search.replace(/[,()\\/]/g, '').trim()
}
