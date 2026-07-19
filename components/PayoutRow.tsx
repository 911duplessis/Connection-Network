'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Payout {
  id: string
  tier: number
  amount_cents: number
  paid_at: string | null
  connectors: { name: string } | null
  referrals: { lead_name: string; vendors: { currency: string; slug: string } | null } | null
}

export default function PayoutRow({ payout }: { payout: Payout }) {
  const router = useRouter()
  const [paidAt, setPaidAt] = useState(payout.paid_at)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function markPaid() {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/admin/payouts/${payout.id}/mark-paid`, { method: 'POST' })
    setLoading(false)

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      setError(body?.error || 'Failed to mark paid')
      return
    }

    setPaidAt(new Date().toISOString())
    router.refresh()
  }

  const currency = payout.referrals?.vendors?.currency ?? ''

  return (
    <tr className="border-t border-white/10">
      <td className="px-4 py-3">{payout.connectors?.name ?? '—'}</td>
      <td className="px-4 py-3">{payout.referrals?.lead_name ?? '—'}</td>
      <td className="px-4 py-3">Tier {payout.tier}</td>
      <td className="px-4 py-3">{(payout.amount_cents / 100).toFixed(2)} {currency}</td>
      <td className="px-4 py-3">
        {paidAt ? (
          <span className="rounded-full bg-green-500/20 px-2 py-1 text-xs text-green-300">
            Paid {new Date(paidAt).toLocaleDateString()}
          </span>
        ) : (
          <button
            onClick={markPaid}
            disabled={loading}
            className="rounded-md bg-cobalt px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
          >
            {loading ? 'Marking...' : 'Mark paid'}
          </button>
        )}
        {error && <div className="mt-1 text-xs text-red-400">{error}</div>}
      </td>
    </tr>
  )
}
