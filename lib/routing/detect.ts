// Keyword lookup, not NLP -- deliberately simple per the MVP routing
// engine's "no AI complexity" constraint. Best-effort only: if nothing
// matches, category/location stay null and the request still gets
// captured, just routed to the unassigned bucket for manual triage
// instead of an auto-match.
const CATEGORY_KEYWORDS: Record<string, string> = {
  turf: 'Landscaping & Turf',
  landscap: 'Landscaping & Turf',
  garden: 'Landscaping & Turf',
  lawn: 'Landscaping & Turf',
  rent: 'Property & Rentals',
  property: 'Property & Rentals',
  estate: 'Property & Rentals',
  plumb: 'Home Services & Trades',
  electric: 'Home Services & Trades',
  handyman: 'Home Services & Trades',
  clean: 'Home Services & Trades',
  legal: 'Professional Services',
  account: 'Professional Services',
  consult: 'Professional Services',
  event: 'Events & Hospitality',
  catering: 'Events & Hospitality',
  photograph: 'Events & Hospitality',
}

export function detectCategory(message: string): string | null {
  const lower = message.toLowerCase()
  for (const [keyword, category] of Object.entries(CATEGORY_KEYWORDS)) {
    if (lower.includes(keyword)) return category
  }
  return null
}

// Best-effort "... in <place>" extraction -- grabs a trailing "in X" phrase.
// Not location-aware (no geocoding), just a text hint used as a tiebreaker
// between otherwise-equal category matches.
export function detectLocation(message: string): string | null {
  const match = message.match(/\bin\s+([a-z][a-z\s]{1,40})$/i)
  return match ? match[1].trim() : null
}
