import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'
import ReferralRow from '@/components/ReferralRow'
import PayoutRow from '@/components/PayoutRow'
import SignOutButton from '@/components/SignOutButton'
import VendorActivationRow from '@/components/VendorActivationRow'

function formatByCurrency(byCurrency: Record<string, number>) {
  const entries = Object.entries(byCurrency).filter(([, cents]) => cents !== 0)
  if (entries.length === 0) return '—'
  return entries.map(([currency, cents]) => `${(cents / 100).toFixed(2)} ${currency}`).join(' + ')
}

export default async function AdminPage() {
  const { data: referrals } = await supabaseAdmin
    .from('referrals')
    .select('*, vendors(name, slug, currency), connectors(name, whatsapp_number)')
    .order('created_at', { ascending: false })

  const { data: vendors } = await supabaseAdmin
    .from('vendors')
    .select('id, name, slug, category, whatsapp_number, active, currency, eco_pledge_pct')
    .order('created_at', { ascending: false })

  const { data: payouts } = await supabaseAdmin
    .from('payouts')
    .select('*, connectors(name), referrals(lead_name, vendors(currency, slug))')
    .order('created_at', { ascending: false })

  const { data: ecoPledgeEntries } = await supabaseAdmin
    .from('ledger_entries')
    .select('payload')
    .eq('entry_type', 'eco_pledge_honoured')

  const activeVendorOptions = (vendors ?? [])
    .filter((v) => v.active)
    .map((v) => ({ id: v.id, name: v.name }))

  // ── Overview stats ──────────────────────────────────────
  const statusCounts: Record<string, number> = { submitted: 0, contacted: 0, quoted: 0, won: 0, lost: 0 }
  const quotedByCurrency: Record<string, number> = {}
  const wonByCurrency: Record<string, number> = {}

  for (const r of referrals ?? []) {
    statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1
    const currency = r.vendors?.currency ?? 'ZAR'
    if (r.quoted_value_cents) {
      quotedByCurrency[currency] = (quotedByCurrency[currency] ?? 0) + r.quoted_value_cents
    }
    if (r.status === 'won' && r.job_value_cents) {
      wonByCurrency[currency] = (wonByCurrency[currency] ?? 0) + r.job_value_cents
    }
  }

  const owedByCurrency: Record<string, number> = {}
  const paidByCurrency: Record<string, number> = {}
  for (const p of payouts ?? []) {
    const currency = p.referrals?.vendors?.currency ?? 'ZAR'
    if (p.paid_at) {
      paidByCurrency[currency] = (paidByCurrency[currency] ?? 0) + p.amount_cents
    } else {
      owedByCurrency[currency] = (owedByCurrency[currency] ?? 0) + p.amount_cents
    }
  }

  // Eco-pledge accrual isn't stored as a cents amount on the ledger entry
  // itself (payload has jobValueCents + ecoPledgePct separately) -- derive
  // it here, per the vendor's currency at time of lookup.
  const vendorCurrencyBySlug = new Map((vendors ?? []).map((v) => [v.slug, v.currency]))
  const ecoPledgeByCurrency: Record<string, number> = {}
  for (const e of ecoPledgeEntries ?? []) {
    const payload = e.payload as { vendorSlug?: string; jobValueCents?: number; ecoPledgePct?: number }
    if (!payload.jobValueCents || !payload.ecoPledgePct) continue
    const currency = (payload.vendorSlug && vendorCurrencyBySlug.get(payload.vendorSlug)) || 'ZAR'
    const cents = Math.round(payload.jobValueCents * (payload.ecoPledgePct / 100))
    ecoPledgeByCurrency[currency] = (ecoPledgeByCurrency[currency] ?? 0) + cents
  }

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

      <h2 className="mt-10 text-lg font-semibold text-white/80">Overview</h2>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="text-xs text-white/50">Referrals by stage</div>
          <div className="mt-2 space-y-1 text-sm">
            {(['submitted', 'contacted', 'quoted', 'won', 'lost'] as const).map((s) => (
              <div key={s} className="flex justify-between">
                <span className="capitalize text-white/60">{s}</span>
                <span className="font-medium">{statusCounts[s] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="text-xs text-white/50">Quoted (proposed value)</div>
          <div className="mt-2 text-lg font-bold text-gold">{formatByCurrency(quotedByCurrency)}</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="text-xs text-white/50">Won (agreed value)</div>
          <div className="mt-2 text-lg font-bold">{formatByCurrency(wonByCurrency)}</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="text-xs text-white/50">Commissions</div>
          <div className="mt-2 text-sm">
            <div className="text-white/60">Owed: <span className="font-medium text-white">{formatByCurrency(owedByCurrency)}</span></div>
            <div className="mt-1 text-white/60">Paid: <span className="font-medium text-green-300">{formatByCurrency(paidByCurrency)}</span></div>
          </div>
        </div>
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
          <div className="text-xs text-green-300/80">Eco pledge accrued</div>
          <div className="mt-2 text-lg font-bold text-green-300">{formatByCurrency(ecoPledgeByCurrency)}</div>
        </div>
      </div>

      <h2 className="mt-10 text-lg font-semibold text-white/80">Vendor approvals</h2>
      <div className="mt-4 overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-white/60">
            <tr>
              <th className="px-4 py-3">Vendor</th>
              <th className="px-4 py-3">Category</th>
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
                <td colSpan={5} className="px-4 py-8 text-center text-white/50">
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
              <th className="px-4 py-3">Value</th>
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

      <h2 className="mt-10 text-lg font-semibold text-white/80">Payouts</h2>
      <div className="mt-4 overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-white/60">
            <tr>
              <th className="px-4 py-3">Connector</th>
              <th className="px-4 py-3">Referral</th>
              <th className="px-4 py-3">Tier</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {payouts?.map((p) => (
              <PayoutRow key={p.id} payout={p} />
            ))}
            {payouts?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-white/50">
                  No payouts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  )
}
