import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default async function VendorsPage() {
  const { data: vendors } = await supabase
    .from('vendors')
    .select('slug, name, tier1_pct, tier1_flat_cents, tier2_override_pct, currency, eco_pledge_pct')
    .eq('active', true)
    .order('name')

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-bold">Vendors</h1>
      <p className="mt-2 text-white/70">Reward terms are public. No surprises, no hidden cuts.</p>
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
            <p className="mt-1 text-sm text-white/60">
              Tier 1: {v.tier1_pct}% + {(v.tier1_flat_cents / 100).toFixed(2)} {v.currency} · Tier 2
              override: {v.tier2_override_pct}%
            </p>
          </Link>
        ))}
      </div>
    </main>
  )
}
