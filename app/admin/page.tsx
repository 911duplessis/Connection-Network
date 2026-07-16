import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'
import ReferralRow from '@/components/ReferralRow'
import SignOutButton from '@/components/SignOutButton'
import VendorActivationRow from '@/components/VendorActivationRow'

export default async function AdminPage() {
  const { data: referrals } = await supabaseAdmin
    .from('referrals')
    .select('*, vendors(name, slug, currency), connectors(name, whatsapp_number)')
    .order('created_at', { ascending: false })

  const { data: vendors } = await supabaseAdmin
    .from('vendors')
    .select('id, name, slug, whatsapp_number, active')
    .order('created_at', { ascending: false })

  const activeVendorOptions = (vendors ?? [])
    .filter((v) => v.active)
    .map((v) => ({ id: v.id, name: v.name }))

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin</h1>
        <div className="flex items-center gap-4">
          <Link href="/admin/invitations" className="text-sm text-cobalt underline">
            Outreach invitations
          </Link>
          <SignOutButton logoutUrl="/api/admin/logout" redirectTo="/admin/login" />
        </div>
      </div>

      <h2 className="mt-10 text-lg font-semibold text-white/80">Vendor approvals</h2>
      <div className="mt-4 overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-white/60">
            <tr>
              <th className="px-4 py-3">Vendor</th>
              <th className="px-4 py-3">WhatsApp</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {vendors?.map((v) => (
              <VendorActivationRow key={v.id} vendor={v} />
            ))}
            {vendors?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-white/50">
                  No vendors yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 text-lg font-semibold text-white/80">Referrals</h2>
      <div className="mt-4 overflow-x-auto rounded-lg border border-white/10">
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
              <ReferralRow key={r.id} referral={r} vendors={activeVendorOptions} />
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
