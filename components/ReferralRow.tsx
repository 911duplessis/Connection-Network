'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const STATUSES = ['submitted', 'contacted', 'quoted', 'won', 'lost'] as const

interface Referral {
  id: string
  lead_name: string
  lead_contact: string
  status: string
  job_value_cents: number | null
  created_at: string
  category: string | null
  location: string | null
  source: string
  vendor_id: string
  connector_invite_sent_at: string | null
  vendors: { name: string; slug: string; currency: string } | null
  connectors: { name: string; whatsapp_number: string } | null
}

interface VendorOption {
  id: string
  name: string
}

export default function ReferralRow({
  referral,
  vendors,
}: {
  referral: Referral
  // Provided only in the admin dashboard, where reassigning a referral to a
  // different vendor is allowed. Omitted on the vendor dashboard.
  vendors?: VendorOption[]
}) {
  const router = useRouter()
  const [status, setStatus] = useState(referral.status)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteSent, setInviteSent] = useState(!!referral.connector_invite_sent_at)
  const [inviting, setInviting] = useState(false)

  async function updateStatus(newStatus: string) {
    setError(null)

    let jobValueCents: number | undefined
    if (newStatus === 'won') {
      const input = window.prompt('Job value (in Rand, e.g. 4500):')
      if (input === null) return
      const rand = parseFloat(input)
      if (Number.isNaN(rand) || rand <= 0) {
        setError('Enter a valid job value')
        return
      }
      jobValueCents = Math.round(rand * 100)
    }

    setLoading(true)
    const res = await fetch(`/api/referrals/${referral.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, jobValueCents }),
    })
    setLoading(false)

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      setError(body?.error || 'Update failed')
      return
    }

    setStatus(newStatus)
    router.refresh()
  }

  async function reassign(vendorId: string) {
    if (!vendorId || vendorId === referral.vendor_id) return
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/admin/referrals/${referral.id}/reassign`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendorId }),
    })
    setLoading(false)

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      setError(body?.error || 'Reassign failed')
      return
    }

    router.refresh()
  }

  async function inviteConnector() {
    setInviting(true)
    setError(null)
    const res = await fetch(`/api/referrals/${referral.id}/invite-connector`, { method: 'POST' })
    setInviting(false)

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      setError(body?.error || 'Invite failed')
      return
    }

    setInviteSent(true)
  }

  return (
    <tr className="border-t border-white/10">
      <td className="px-4 py-3">
        <div className="font-medium">{referral.lead_name}</div>
        <div className="text-xs text-white/50">{referral.lead_contact}</div>
        {(referral.category || referral.location) && (
          <div className="mt-1 text-xs text-white/40">
            {[referral.category, referral.location].filter(Boolean).join(' · ')}
          </div>
        )}
        {referral.source === 'whatsapp_request' && (
          <div className="mt-1">
            <span className="inline-block rounded-full bg-cobalt/20 px-2 py-0.5 text-[10px] uppercase text-cobalt">
              WhatsApp request
            </span>
            {inviteSent ? (
              <div className="mt-1 text-[10px] text-white/40">Connector invite sent</div>
            ) : (
              <button
                onClick={inviteConnector}
                disabled={inviting}
                className="mt-1 block text-[10px] text-gold underline disabled:opacity-50"
              >
                {inviting ? 'Sending...' : 'Invite to become a connector'}
              </button>
            )}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <div>{referral.vendors?.name ?? '—'}</div>
        {vendors && vendors.length > 0 && (
          <select
            value=""
            disabled={loading}
            onChange={(e) => {
              if (e.target.value) reassign(e.target.value)
            }}
            className="mt-1 rounded-md border border-white/20 bg-white/5 px-2 py-1 text-xs disabled:opacity-30"
          >
            <option value="">Reassign...</option>
            {vendors
              .filter((v) => v.id !== referral.vendor_id)
              .map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
          </select>
        )}
      </td>
      <td className="px-4 py-3">
        <div>{referral.connectors?.name ?? '—'}</div>
        <div className="text-xs text-white/50">{referral.connectors?.whatsapp_number}</div>
      </td>
      <td className="px-4 py-3">
        <span className="rounded-full bg-white/10 px-2 py-1 text-xs uppercase">{status}</span>
      </td>
      <td className="px-4 py-3">
        {referral.job_value_cents
          ? `${(referral.job_value_cents / 100).toFixed(2)} ${referral.vendors?.currency ?? ''}`
          : '—'}
      </td>
      <td className="px-4 py-3 text-white/60">
        {new Date(referral.created_at).toLocaleDateString()}
      </td>
      <td className="px-4 py-3">
        {status === 'submitted' ? (
          <div className="flex gap-2">
            <button
              onClick={() => updateStatus('contacted')}
              disabled={loading}
              className="rounded-md bg-green-600/80 px-2 py-1 text-xs font-medium text-white hover:bg-green-600 disabled:opacity-50"
            >
              Accept
            </button>
            <button
              onClick={() => updateStatus('lost')}
              disabled={loading}
              className="rounded-md bg-white/10 px-2 py-1 text-xs text-white/70 hover:bg-white/20 disabled:opacity-50"
            >
              Decline
            </button>
          </div>
        ) : (
          <select
            value=""
            disabled={loading || status === 'won' || status === 'lost'}
            onChange={(e) => {
              if (e.target.value) updateStatus(e.target.value)
            }}
            className="rounded-md border border-white/20 bg-white/5 px-2 py-1 text-xs disabled:opacity-30"
          >
            <option value="">Move to...</option>
            {STATUSES.filter((s) => s !== status && s !== 'submitted').map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}
        {error && <div className="mt-1 text-xs text-red-400">{error}</div>}
      </td>
    </tr>
  )
}
