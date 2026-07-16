import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'
import InvitationForm from '@/components/InvitationForm'
import InvitationRow from '@/components/InvitationRow'

export default async function AdminInvitationsPage() {
  const { data: invitations } = await supabaseAdmin
    .from('invitations')
    .select('id, business_name, contact_whatsapp, category, status, sent_at, signed_at')
    .order('created_at', { ascending: false })

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Outreach invitations</h1>
        <Link href="/admin" className="text-sm text-cobalt underline">
          Back to admin
        </Link>
      </div>
      <p className="mt-2 text-sm text-white/60">
        Businesses already connected to the network informally but not yet signed up. Add them here, then send a
        personalized invite one at a time — the platform tracks where each one is in the funnel.
      </p>

      <InvitationForm />

      <div className="mt-6 overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-white/60">
            <tr>
              <th className="px-4 py-3">Business</th>
              <th className="px-4 py-3">WhatsApp</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {invitations?.map((i) => (
              <InvitationRow key={i.id} invitation={i} />
            ))}
            {invitations?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-white/50">
                  No invitations yet — add the first business above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  )
}
