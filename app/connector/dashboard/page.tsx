'use client'

import { useEffect, useRef, useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/browserClient'
import {
  clearConnectorCredentials,
  getConnectorCredentials,
  saveConnectorCredentials,
} from '@/lib/connectors/localCredentials'

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
  const [recoverNumber, setRecoverNumber] = useState('')
  const [recoverSent, setRecoverSent] = useState(false)
  const [recoverLoading, setRecoverLoading] = useState(false)
  const [showRecover, setShowRecover] = useState(false)

  async function handleRecover(e: React.FormEvent) {
    e.preventDefault()
    setRecoverLoading(true)
    try {
      await fetch('/api/connector/recover-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsappNumber: recoverNumber }),
      })
      setRecoverSent(true)
    } finally {
      setRecoverLoading(false)
    }
  }

  const credentialsRef = useRef({ whatsappNumber, referralCode })
  credentialsRef.current = { whatsappNumber, referralCode }

  async function fetchDashboard(whatsapp: string, code: string) {
    const res = await fetch('/api/connector/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ whatsappNumber: whatsapp, referralCode: code }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Lookup failed')
    setResult(data)
    saveConnectorCredentials({ whatsappNumber: whatsapp, referralCode: code })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await fetchDashboard(whatsappNumber, referralCode)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed')
    } finally {
      setLoading(false)
    }
  }

  // Remembered from a previous visit -- prefill and auto-load so a returning
  // connector doesn't have to retype their number/code at all.
  useEffect(() => {
    const saved = getConnectorCredentials()
    if (!saved) return
    setWhatsappNumber(saved.whatsappNumber)
    setReferralCode(saved.referralCode)
    setLoading(true)
    fetchDashboard(saved.whatsappNumber, saved.referralCode)
      .catch((err) => setError(err instanceof Error ? err.message : 'Lookup failed'))
      .finally(() => setLoading(false))
  }, [])

  // Live-refresh: once looked up, silently bridge into a Realtime session and
  // re-run the same lookup whenever this connector's dashboard channel gets a
  // broadcast. Failures here (rate limit, network) are swallowed -- the
  // dashboard already works fine via the manual lookup above without this.
  useEffect(() => {
    if (!result) return
    let cancelled = false
    const client = createBrowserSupabaseClient()
    let channel: ReturnType<typeof client.channel> | null = null

    async function connect() {
      try {
        const { whatsappNumber: whatsapp, referralCode: code } = credentialsRef.current
        const res = await fetch('/api/connector/bridge-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ whatsappNumber: whatsapp, referralCode: code }),
        })
        if (!res.ok) return
        const { accessToken, channelTopic } = await res.json()
        if (cancelled) return

        await client.realtime.setAuth(accessToken)
        channel = client.channel(channelTopic, { config: { private: true } })
        channel
          .on('broadcast', { event: 'update' }, () => {
            const { whatsappNumber: w, referralCode: c } = credentialsRef.current
            fetchDashboard(w, c).catch(() => {
              // Silent -- a failed background refresh just leaves the last
              // known-good result on screen.
            })
          })
          .subscribe()
      } catch (err) {
        console.warn('[connector-dashboard] live-refresh connect failed', err)
      }
    }

    connect()

    return () => {
      cancelled = true
      if (channel) client.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!result])

  if (result) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{result.connector.name}</h1>
          <button
            onClick={() => {
              clearConnectorCredentials()
              setWhatsappNumber('')
              setReferralCode('')
              setResult(null)
            }}
            className="text-sm text-white/50 hover:text-white"
          >
            Look up another connector
          </button>
        </div>
        <p className="mt-1 text-sm text-white/50">Referral code: {result.connector.referralCode}</p>
        {!result.connector.agreementSigned && (
          <p className="mt-2 text-sm text-gold">
            You haven&apos;t signed the partner agreement yet — do that from your /join confirmation.
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

      <div className="mt-8 border-t border-white/10 pt-6">
        <button
          onClick={() => setShowRecover(!showRecover)}
          className="text-sm text-cobalt underline"
        >
          Forgot your referral code?
        </button>
        {showRecover && (
          recoverSent ? (
            <p className="mt-3 text-sm text-white/60">
              If that number is registered, we&apos;ve sent your code to your WhatsApp and email. Check both.
            </p>
          ) : (
            <form onSubmit={handleRecover} className="mt-3 flex gap-2">
              <input
                required
                placeholder="Your WhatsApp number (27...)"
                value={recoverNumber}
                onChange={(e) => setRecoverNumber(e.target.value)}
                className="flex-1 rounded-md border border-white/20 bg-white/5 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={recoverLoading}
                className="rounded-md bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 disabled:opacity-50"
              >
                {recoverLoading ? '...' : 'Send'}
              </button>
            </form>
          )
        )}
      </div>
    </main>
  )
}
