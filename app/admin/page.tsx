import { supabaseAdmin } from '@/lib/supabase'
import ReferralRow from './ReferralRow'
import SignOutButton from './SignOutButton'

export default async function AdminPage() {
  const { data: referrals } = await supabaseAdmin
    .from('referrals')
    .select('*, vendors(name, slug, currency), connectors(name, whatsapp_number)')
    .order('created_at', { ascending: false })

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Referrals</h1>
        <SignOutButton />
      </div>

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
