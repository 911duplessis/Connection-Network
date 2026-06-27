'use client'

import { useEffect, useState } from 'react'

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Public ledger</h1>
        <button
          onClick={handleVerify}
          disabled={verifying}
          className="rounded-md border border-white/20 px-4 py-2 text-sm disabled:opacity-50"
        >
          {verifying ? 'Verifying...' : 'Verify chain integrity'}
        </button>
      </div>

      {verification && (
        <div
          className={`mt-4 rounded-md p-3 text-sm ${
            verification.valid ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
          }`}
        >
          {verification.valid
            ? `Chain verified intact across ${verification.totalEntries} entries.`
            : `Chain broken at entry #${verification.brokenAtSeq}.`}
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
