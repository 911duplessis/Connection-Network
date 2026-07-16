import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { CATEGORIES } from '@/lib/routing/categories'

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; location?: string }>
}) {
  const { category, location } = await searchParams

  let query = supabase
    .from('vendors')
    .select('slug, name, category, location, tier1_pct, tier1_flat_cents, tier2_override_pct, currency, eco_pledge_pct')
    .eq('active', true)

  if (category) query = query.eq('category', category)
  if (location) query = query.ilike('location', `%${location}%`)

  const { data: vendors } = await query.order('name')

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-bold">Vendors</h1>
      <p className="mt-2 text-white/70">Reward terms are public. No surprises, no hidden cuts.</p>

      <form className="mt-6 flex flex-wrap gap-3" method="GET">
        <select
          name="category"
          defaultValue={category ?? ''}
          className="rounded-md border border-white/20 bg-white/5 px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          name="location"
          defaultValue={location ?? ''}
          placeholder="Location (e.g. Randburg)"
          className="rounded-md border border-white/20 bg-white/5 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-md bg-cobalt px-4 py-2 text-sm font-semibold text-white">
          Filter
        </button>
        {(category || location) && (
          <Link href="/vendors" className="self-center text-sm text-white/50 underline">
            Clear
          </Link>
        )}
      </form>

      <div className="mt-8 space-y-4">
        {vendors?.map((v) => (
          <Link
            key={v.slug}
            href={`/vendors/${v.slug}`}
            className="block rounded-lg border border-white/10 bg-white/5 p-4 hover:border-cobalt"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold">{v.name}</span>
              {v.eco_pledge_pct > 0 && (
                <span className="rounded-full bg-green-500/20 px-2 py-1 text-xs text-green-300">
                  Eco pledge {v.eco_pledge_pct}%
                </span>
              )}
            </div>
            {(v.category || v.location) && (
              <p className="mt-1 text-xs text-white/50">{[v.category, v.location].filter(Boolean).join(' · ')}</p>
            )}
            <p className="mt-1 text-sm text-white/60">
              Tier 1: {v.tier1_pct}% + {(v.tier1_flat_cents / 100).toFixed(2)} {v.currency} · Tier 2
              override: {v.tier2_override_pct}%
            </p>
          </Link>
        ))}
        {!vendors?.length && (
          <p className="text-sm text-white/50">
            No vendors match those filters.{' '}
            <Link href="/vendors/signup" className="text-cobalt underline">
              Be the first to sign up
            </Link>
            .
          </p>
        )}
      </div>
    </main>
  )
}
