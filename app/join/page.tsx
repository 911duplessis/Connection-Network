'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function JoinPage() {
  const [name, setName] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [uplineReferralCode, setUplineReferralCode] = useState('')
  const [agreementAccepted, setAgreementAccepted] = useState(false)
  const [result, setResult] = useState<{ referralCode: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/connectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          whatsappNumber,
          uplineReferralCode: uplineReferralCode || undefined,
          agreementAccepted,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      setResult({ referralCode: data.referralCode })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <main className="mx-auto max-w-lg px-6 py-16 text-center">
        <h1 className="text-2xl font-bold">You're in.</h1>
        <p className="mt-4 text-white/70">Your referral code is:</p>
        <p className="mt-2 text-3xl font-bold text-gold">{result.referralCode}</p>
        <p className="mt-6 text-sm text-white/60">
          Share this code with people you recruit as connectors. When they join with it, you become
          their upline and automatically earn a Tier 2 override on every commission they earn — on
          top of your own Tier 1 referrals.
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <h1 className="text-2xl font-bold">Become a connector</h1>
      <p className="mt-2 text-white/70">
        Join via WhatsApp identity — no email, no password, no monthly fee.
      </p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="block text-sm text-white/70">Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border border-white/20 bg-white/5 px-3 py-2"
          />
        </div>
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
          <label className="block text-sm text-white/70">Upline referral code (optional)</label>
          <input
            value={uplineReferralCode}
            onChange={(e) => setUplineReferralCode(e.target.value)}
            className="mt-1 w-full rounded-md border border-white/20 bg-white/5 px-3 py-2"
          />
        </div>

        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <h2 className="text-sm font-semibold text-white/80">Partner agreement</h2>
          <ul className="mt-3 space-y-2 text-xs text-white/60">
            <li>— Your reward terms are set by each vendor and shown on their listing before you refer anyone.</li>
            <li>— Rewards are calculated on the final confirmed job value, including any add-ons agreed at quote stage.</li>
            <li>— Payment is made once the vendor confirms the job as won — no reward on unconfirmed or cancelled jobs.</li>
            <li>— There are no fees, no joining costs, and no obligation to sell — connectors only introduce.</li>
            <li>— If you recruit other connectors with your referral code, you automatically earn a Tier 2 override on their commissions.</li>
            <li>— Every referral, commission, and payout is recorded on The Connection Network's public, tamper-evident ledger.</li>
          </ul>
          <label className="mt-4 flex items-start gap-3 text-xs text-white/70">
            <input
              type="checkbox"
              required
              checked={agreementAccepted}
              onChange={(e) => setAgreementAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 flex-shrink-0"
            />
            I have read and accept The Connection Network{' '}
            <Link href="/partner-agreement" target="_blank" className="text-cobalt underline">
              partner agreement
            </Link>
            . My acceptance will be permanently recorded on the public ledger.
          </label>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading || !agreementAccepted}
          className="w-full rounded-md bg-cobalt px-6 py-3 font-semibold text-white disabled:opacity-50"
        >
          {loading ? 'Joining...' : 'Sign agreement & join the network'}
        </button>
      </form>
    </main>
  )
}
