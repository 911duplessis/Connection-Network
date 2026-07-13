// Shared category taxonomy -- used by vendor signup, the admin invitation
// form, and the request-capture keyword matcher, so there's one list, not
// several that can drift apart.
export const CATEGORIES = [
  'Landscaping & Turf',
  'Property & Rentals',
  'Home Services & Trades',
  'Professional Services',
  'Events & Hospitality',
  'Other',
] as const

export type Category = (typeof CATEGORIES)[number]
