'use client'

import { useState } from 'react'

interface Referral {
  id: string
  lead_name: string
  status: string
  job_value_cents: number | null
  created_at: string
  vendors: { name: string; currency: string } | null
}

interface LookupResult {
  connector: { name: string; referralCode: string; agreementSigned: boolean }
  referrals: Referral[]
  earnings: { tier1Cents: number; tier2Cents: number; totalCents: number }
}

function formatCents(cents: number, currency = 'ZAR') {
  return `${(cents / 100).toFixed(2)} ${currency}`
}

export default function ConnectorDashboardPage() {
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [result, setResult] = useState<LookupResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/connector/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsappNumber, referralCode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Lookup failed')
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed')
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{result.connector.name}</h1>
          <button
            onClick={() => setResult(null)}
            className="text-sm text-white/50 hover:text-white"
          >
            Look up another connector
          </button>
        </div>
        <p className="mt-1 text-sm text-white/50">Referral code: {result.connector.referralCode}</p>
        {!result.connector.agreementSigned && (
          <p className="mt-2 text-sm text-gold">
            You haven't signed the partner agreement yet — do that from your /join confirmation.
          </p>
        )}

        <div className="mt-8 grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-white/10 p-4">
            <div className="text-xs text-white/50">Tier 1 earned</div>
            <div className="mt-1 text-xl font-bold">{formatCents(result.earnings.tier1Cents)}</div>
          </div>
          <div className="rounded-lg border border-white/10 p-4">
            <div className="text-xs text-white/50">Tier 2 override</div>
            <div className="mt-1 text-xl font-bold">{formatCents(result.earnings.tier2Cents)}</div>
          </div>
          <div className="rounded-lg border border-white/10 p-4">
            <div className="text-xs text-white/50">Total earned</div>
            <div className="mt-1 text-xl font-bold text-gold">{formatCents(result.earnings.totalCents)}</div>
          </div>
        </div>

        <h2 className="mt-10 text-lg font-semibold text-white/80">Your referrals</h2>
        <div className="mt-4 overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-white/60">
              <tr>
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Job value</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {result.referrals.map((r) => (
                <tr key={r.id} className="border-t border-white/10">
                  <td className="px-4 py-3">{r.lead_name}</td>
                  <td className="px-4 py-3">{r.vendors?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-white/10 px-2 py-1 text-xs uppercase">{r.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    {r.job_value_cents ? formatCents(r.job_value_cents, r.vendors?.currency) : '—'}
                  </td>
                  <td className="px-4 py-3 text-white/60">{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {result.referrals.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-white/50">
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

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <h1 className="text-2xl font-bold">Connector dashboard</h1>
      <p className="mt-2 text-white/70">
        No password needed — look yourself up with the WhatsApp number and referral code you joined with.
      </p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="block text-sm text-white/70">WhatsApp number</label>
          <input
            required
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            placeholder="27..."
            className="mt-1 w-full rounded-md border border-white/20 bg-white/5 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-white/70">Referral code</label>
          <input
            required
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
            className="mt-1 w-full rounded-md border border-white/20 bg-white/5 px-3 py-2"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-cobalt px-6 py-3 font-semibold text-white disabled:opacity-50"
        >
          {loading ? 'Looking up...' : 'View my dashboard'}
        </button>
      </form>
    </main>
  )
}
