'use client'

import { useEffect, useState } from 'react'
import { getConnectorCredentials, saveConnectorCredentials } from '@/lib/connectors/localCredentials'

interface VendorOption {
  slug: string
  name: string
  whatsappNumber: string | null
}

export default function ReferralForm({
  vendorSlug,
  whatsappNumber,
  vendors,
}: {
  vendorSlug: string
  whatsappNumber: string
  // Every other active vendor, so a connector can redirect this referral
  // elsewhere instead of the one whose page they happened to be on.
  vendors: VendorOption[]
}) {
  const [selectedVendorSlug, setSelectedVendorSlug] = useState(vendorSlug)
  const [connectorReferralCode, setConnectorReferralCode] = useState('')
  const [leadName, setLeadName] = useState('')
  const [leadContact, setLeadContact] = useState('')
  const [note, setNote] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const selectedVendor = vendors.find((v) => v.slug === selectedVendorSlug)
  const targetWhatsappNumber = selectedVendor?.whatsappNumber ?? whatsappNumber

  useEffect(() => {
    const saved = getConnectorCredentials()
    if (saved) setConnectorReferralCode(saved.referralCode)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectorReferralCode,
          vendorSlug: selectedVendorSlug,
          leadName,
          leadContact,
          note: note || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      setSubmitted(true)
      const saved = getConnectorCredentials()
      saveConnectorCredentials({
        whatsappNumber: saved?.whatsappNumber ?? '',
        referralCode: connectorReferralCode,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const whatsappMessage = [
    `Referral via The Connection Network (code: ${connectorReferralCode || '???'})`,
    leadName && `Lead: ${leadName}`,
    leadContact && `Contact: ${leadContact}`,
    note && `Note: ${note}`,
  ]
    .filter(Boolean)
    .join('\n')

  if (submitted) {
    return <p className="mt-4 text-green-300">Referral submitted and recorded on the public ledger.</p>
  }

  return (
    <div className="mt-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        {vendors.length > 1 && (
          <div>
            <label className="block text-xs text-white/50">Refer to</label>
            <select
              value={selectedVendorSlug}
              onChange={(e) => setSelectedVendorSlug(e.target.value)}
              className="mt-1 w-full rounded-md border border-white/20 bg-white/5 px-3 py-2"
            >
              {vendors.map((v) => (
                <option key={v.slug} value={v.slug}>
                  {v.name}
                  {v.slug === vendorSlug ? ' (this page)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}
        <input
          required
          placeholder="Your referral code"
          value={connectorReferralCode}
          onChange={(e) => setConnectorReferralCode(e.target.value.toUpperCase())}
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
      {targetWhatsappNumber && (
        <a
          href={`https://wa.me/${targetWhatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-sm text-white/60 underline"
        >
          Or send this referral directly via WhatsApp
        </a>
      )}
    </div>
  )
}
