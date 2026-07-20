import Image from 'next/image'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { UNASSIGNED_VENDOR_SLUG } from '@/lib/routing/constants'
import ReferralForm from './ReferralForm'

export default async function VendorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const { data: vendor } = await supabase.from('vendors').select('*').eq('slug', slug).single()
  if (!vendor) notFound()

  // Every active vendor, for the "refer to a different vendor instead" option
  // on the form below — plus this vendor even if it's an unactivated preview,
  // so the default selection is never missing from its own dropdown.
  const { data: allVendors } = await supabase
    .from('vendors')
    .select('slug, name, whatsapp_number, active')
    .neq('slug', UNASSIGNED_VENDOR_SLUG)
    .order('name')

  const vendorOptions = (allVendors ?? []).filter((v) => v.active || v.slug === vendor.slug)

  const { data: reviews } = await supabase
    .from('reviews')
    .select('reviewer_name, rating, comment, created_at')
    .eq('vendor_id', vendor.id)
    .order('created_at', { ascending: false })

  const avgRating = reviews?.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      {!vendor.active && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold">
          <Image src="/tcn-logo.jpg" alt="" width={24} height={24} className="rounded" />
          <span>
            This is a preview of your page. It isn&apos;t public yet — an admin still needs to activate your
            listing before it appears on the vendor directory.
          </span>
        </div>
      )}
      <h1 className="text-2xl font-bold">{vendor.name}</h1>
      {(vendor.category || vendor.location) && (
        <p className="mt-1 text-sm text-white/50">
          {[vendor.category, vendor.location].filter(Boolean).join(' · ')}
        </p>
      )}
      {avgRating && (
        <p className="mt-1 text-white/70">
          {avgRating} / 5 average ({reviews?.length} reviews)
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <h2 className="font-semibold">Reward terms</h2>
          <p className="mt-2 text-sm text-white/70">
            Tier 1 (direct connector): {vendor.tier1_pct}% of job value +{' '}
            {(vendor.tier1_flat_cents / 100).toFixed(2)} {vendor.currency} bonus
          </p>
          <p className="mt-1 text-sm text-white/70">
            Tier 2 (upline override): {vendor.tier2_override_pct}% of the Tier 1 payout
          </p>
        </div>
        {vendor.eco_pledge_pct > 0 && (
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
            <h2 className="font-semibold text-green-300">Eco pledge</h2>
            <p className="mt-2 text-sm text-white/80">
              {vendor.eco_pledge_pct}% of profit per sale committed.
            </p>
            {vendor.eco_practices && <p className="mt-1 text-sm text-white/60">{vendor.eco_practices}</p>}
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold">Submit a referral</h2>
        <ReferralForm
          vendorSlug={vendor.slug}
          whatsappNumber={vendor.whatsapp_number}
          vendors={vendorOptions.map((v) => ({
            slug: v.slug,
            name: v.name,
            whatsappNumber: v.whatsapp_number,
          }))}
        />
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold">Reviews</h2>
        <div className="mt-4 space-y-3">
          {reviews?.map((r, i) => (
            <div key={i} className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{r.reviewer_name}</span>
                <span className="text-gold">{r.rating} / 5</span>
              </div>
              {r.comment && <p className="mt-1 text-sm text-white/70">{r.comment}</p>}
            </div>
          ))}
          {!reviews?.length && <p className="text-sm text-white/50">No reviews yet.</p>}
        </div>
      </div>
    </main>
  )
}
