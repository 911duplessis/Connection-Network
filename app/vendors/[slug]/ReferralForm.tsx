'use client'

import { useState } from 'react'

export default function ReferralForm({
  vendorSlug,
  whatsappNumber,
}: {
  vendorSlug: string
  whatsappNumber: string
}) {
  const [connectorId, setConnectorId] = useState('')
  const [leadName, setLeadName] = useState('')
  const [leadContact, setLeadContact] = useState('')
  const [note, setNote] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectorId, vendorSlug, leadName, leadContact, note: note || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return <p className="mt-4 text-green-300">Referral submitted and recorded on the public ledger.</p>
  }

  return (
    <div className="mt-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          required
          placeholder="Your connector ID"
          value={connectorId}
          onChange={(e) => setConnectorId(e.target.value)}
          className="w-full rounded-md border border-white/20 bg-white/5 px-3 py-2"
        />
        <input
          required
          placeholder="Lead's name"
          value={leadName}
          onChange={(e) => setLeadName(e.target.value)}
          className="w-full rounded-md border border-white/20 bg-white/5 px-3 py-2"
        />
        <input
          required
          placeholder="Lead's contact (phone or email)"
          value={leadContact}
          onChange={(e) => setLeadContact(e.target.value)}
          className="w-full rounded-md border border-white/20 bg-white/5 px-3 py-2"
        />
        <textarea
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full rounded-md border border-white/20 bg-white/5 px-3 py-2"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-cobalt px-6 py-3 font-semibold text-white disabled:opacity-50"
        >
          {loading ? 'Submitting...' : 'Submit referral'}
        </button>
      </form>
      <a
        href={`https://wa.me/${whatsappNumber}`}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-block text-sm text-white/60 underline"
      >
        Or send this referral directly via WhatsApp
      </a>
    </div>
  )
}
