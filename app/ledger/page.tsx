'use client'

import { useEffect, useState } from 'react'
import InfoTip from '@/components/InfoTip'

interface LedgerEntry {
  seq: number
  entry_type: string
  payload: Record<string, unknown>
  prev_hash: string
  hash: string
  created_at: string
}

const LABELS: Record<string, string> = {
  connector_joined: 'Connector joined',
  referral_submitted: 'Referral submitted',
  referral_won: 'Referral won',
  commission_tier1_paid: 'Tier 1 commission paid',
  commission_tier2_paid: 'Tier 2 override paid',
  eco_pledge_honoured: 'Eco pledge honoured',
  review_submitted: 'Review submitted',
  vendor_joined: 'Vendor joined',
  agreement_signed: 'Partner agreement signed',
  whatsapp_message_received: 'WhatsApp message received',
}

export default function LedgerPage() {
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [verification, setVerification] = useState<{ valid: boolean; brokenAtSeq: number | null; totalEntries: number } | null>(null)
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    fetch('/api/ledger')
      .then((res) => res.json())
      .then((data) => setEntries(data.entries || []))
  }, [])

  async function handleVerify() {
    setVerifying(true)
    try {
      const res = await fetch('/api/ledger/verify')
      const data = await res.json()
      setVerification(data)
    } finally {
      setVerifying(false)
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-widest text-gold">🔗 Trust Record</p>
      <h1 className="mt-3 flex items-center gap-2 text-3xl font-bold">
        Trust Record
        <InfoTip text="TCN records important events so connections and rewards remain transparent. Technically, this is a hash-chained public ledger — every entry links to the one before it." />
      </h1>
      <p className="mt-4 text-white/65">
        Every join, referral, payout, eco pledge, and review on The Connection Network is
        appended here — permanently. Each entry is cryptographically linked (SHA-256) to the one
        before it. Alter or delete any record and the chain breaks in a way that anyone can detect,
        with no admin access required.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          onClick={handleVerify}
          disabled={verifying}
          className="rounded-lg bg-gold/10 px-5 py-2.5 text-sm font-semibold text-gold ring-1 ring-gold/30 hover:bg-gold/15 disabled:opacity-50"
        >
          {verifying ? 'Verifying...' : '→ Verify chain integrity yourself'}
        </button>
        <p className="text-xs text-white/30">No login needed · runs on the database in seconds</p>
      </div>

      {verification && (
        <div
          className={`mt-4 rounded-md p-3 text-sm ${
            verification.valid ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
          }`}
        >
          {verification.valid
            ? `✓ Chain intact — all ${verification.totalEntries} entries verified. No record has been altered or deleted.`
            : `✗ Chain broken at entry #${verification.brokenAtSeq} — a record has been tampered with.`}
        </div>
      )}

      <div className="mt-8 space-y-3">
        {entries.map((e) => (
          <div key={e.seq} className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold">#{e.seq} — {LABELS[e.entry_type] || e.entry_type}</span>
              <span className="text-xs text-white/50">{new Date(e.created_at).toLocaleString()}</span>
            </div>
            <pre className="mt-2 overflow-x-auto text-xs text-white/60">{JSON.stringify(e.payload, null, 2)}</pre>
            <p className="mt-2 break-all text-xs text-white/40">hash: {e.hash}</p>
            <p className="break-all text-xs text-white/40">prev: {e.prev_hash}</p>
          </div>
        ))}
      </div>
    </main>
  )
}
