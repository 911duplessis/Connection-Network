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
  vendors: { name: string; slug: string; currency: string } | null
  connectors: { name: string; whatsapp_number: string } | null
}

export default function ReferralRow({ referral }: { referral: Referral }) {
  const router = useRouter()
  const [status, setStatus] = useState(referral.status)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <tr className="border-t border-white/10">
      <td className="px-4 py-3">
        <div className="font-medium">{referral.lead_name}</div>
        <div className="text-xs text-white/50">{referral.lead_contact}</div>
      </td>
      <td className="px-4 py-3">{referral.vendors?.name ?? '—'}</td>
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
        <select
          value=""
          disabled={loading || status === 'won' || status === 'lost'}
          onChange={(e) => {
            if (e.target.value) updateStatus(e.target.value)
          }}
          className="rounded-md border border-white/20 bg-white/5 px-2 py-1 text-xs disabled:opacity-30"
        >
          <option value="">Move to...</option>
          {STATUSES.filter((s) => s !== status).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {error && <div className="mt-1 text-xs text-red-400">{error}</div>}
      </td>
    </tr>
  )
}
