import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { VENDOR_SESSION_COOKIE, verifyVendorSession, unsafeDecodeVendorId } from '@/lib/vendor/auth'
import ReferralRow from '@/components/ReferralRow'
import SignOutButton from '@/components/SignOutButton'
import LiveRefresh from '@/components/LiveRefresh'
import { UNASSIGNED_CONNECTOR_CODE } from '@/lib/routing/constants'

export default async function VendorDashboardPage() {
  const cookieStore = await cookies()
  const vendorCookie = cookieStore.get(VENDOR_SESSION_COOKIE)?.value
  const claimedVendorId = unsafeDecodeVendorId(vendorCookie)

  if (!claimedVendorId) {
    redirect('/vendor-login')
  }

  const { data: vendor } = await supabaseAdmin
    .from('vendors')
    .select('id, name, password_hash, whatsapp_number, email, category, location')
    .eq('id', claimedVendorId)
    .single()

  const verifiedVendorId = await verifyVendorSession(vendorCookie, vendor?.password_hash ?? null)

  // verifiedVendorId is the only trusted identity here (its signature was
  // checked against vendor.password_hash) — claimedVendorId only picked which
  // row to fetch. Require them to agree before using either one.
  if (!verifiedVendorId || !vendor || verifiedVendorId !== vendor.id) {
    redirect('/vendor-login')
  }

  const { data: referrals } = await supabaseAdmin
    .from('referrals')
    .select('*, vendors(name, slug, currency), connectors(name, whatsapp_number)')
    .eq('vendor_id', verifiedVendorId)
    .order('created_at', { ascending: false })

  const joinParams = new URLSearchParams({ upline: UNASSIGNED_CONNECTOR_CODE })
  if (vendor.name) joinParams.set('name', vendor.name)
  if (vendor.whatsapp_number) joinParams.set('whatsapp', vendor.whatsapp_number)
  if (vendor.email) joinParams.set('email', vendor.email)

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{vendor.name}</h1>
          <p className="text-sm text-white/50">
            {[vendor.category, vendor.location].filter(Boolean).join(' · ') || 'No category set'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link href={`/join?${joinParams.toString()}`} className="text-sm text-cobalt underline">
            Become a connector too
          </Link>
          <SignOutButton logoutUrl="/api/vendor/logout" redirectTo="/vendor-login" />
        </div>
      </div>

      <LiveRefresh />

      <div className="mt-8 overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-white/60">
            <tr>
              <th className="px-4 py-3">Lead</th>
              <th className="px-4 py-3">Vendor</th>
              <th className="px-4 py-3">Connector</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Job value</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {referrals?.map((r) => (
              <ReferralRow key={r.id} referral={r} />
            ))}
            {referrals?.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-white/50">
                  No referrals yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  )
}
