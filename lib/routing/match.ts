import { supabaseAdmin } from '@/lib/supabase'
import { UNASSIGNED_VENDOR_SLUG } from './constants'

export interface MatchResult {
  vendorId: string
  matchedOn: 'category_location' | 'category' | 'unassigned'
}

/**
 * Deterministic filter, not a weighted score -- there's no rating or
 * availability data to weight (explicitly out of scope for the MVP
 * routing engine). Prefers a location match among same-category vendors,
 * otherwise takes the first. Falls back to the existing `unassigned`
 * vendor bucket if nothing matches, so `vendor_id` is never left null and
 * a request is never dropped.
 */
export async function findMatchingVendor(input: {
  category: string | null
  location: string | null
}): Promise<MatchResult> {
  if (input.category) {
    const { data: candidates } = await supabaseAdmin
      .from('vendors')
      .select('id, location')
      .eq('active', true)
      .eq('category', input.category)

    if (candidates && candidates.length > 0) {
      if (input.location) {
        const locationMatch = candidates.find(
          (v) => v.location && v.location.toLowerCase().includes(input.location!.toLowerCase())
        )
        if (locationMatch) return { vendorId: locationMatch.id, matchedOn: 'category_location' }
      }
      return { vendorId: candidates[0].id, matchedOn: 'category' }
    }
  }

  const { data: unassigned } = await supabaseAdmin
    .from('vendors')
    .select('id')
    .eq('slug', UNASSIGNED_VENDOR_SLUG)
    .single()

  if (!unassigned) {
    throw new Error('Request routing is not set up yet -- run scripts/seed-unassigned.ts')
  }

  return { vendorId: unassigned.id, matchedOn: 'unassigned' }
}
