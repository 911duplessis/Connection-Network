'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Invitation {
  id: string
  business_name: string
  contact_whatsapp: string | null
  category: string | null
  status: string
  sent_at: string | null
  signed_at: string | null
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-white/10 text-white/60',
  sent: 'bg-cobalt/20 text-cobalt',
  opened: 'bg-amber-500/20 text-amber-300',
  signed: 'bg-green-500/20 text-green-300',
}

export default function InvitationRow({ invitation }: { invitation: Invitation }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/invitations/${invitation.id}/send`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <tr className="border-t border-white/10">
      <td className="px-4 py-3">
        <div className="font-medium">{invitation.business_name}</div>
        {invitation.category && <div className="text-xs text-white/50">{invitation.category}</div>}
      </td>
      <td className="px-4 py-3 text-white/60">{invitation.contact_whatsapp ?? '—'}</td>
      <td className="px-4 py-3">
        <span
          className={`rounded-full px-2 py-1 text-xs uppercase ${STATUS_STYLES[invitation.status] ?? 'bg-white/10 text-white/60'}`}
        >
          {invitation.status}
        </span>
      </td>
      <td className="px-4 py-3">
        {invitation.status === 'pending' && invitation.contact_whatsapp && (
          <button
            onClick={send}
            disabled={loading}
            className="rounded-md border border-white/20 px-3 py-1 text-xs disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send invite'}
          </button>
        )}
        {invitation.status !== 'pending' && (
          <span className="text-xs text-white/40">
            {invitation.sent_at ? `Sent ${new Date(invitation.sent_at).toLocaleDateString()}` : '—'}
          </span>
        )}
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </td>
    </tr>
  )
}
