'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CATEGORIES } from '@/lib/routing/categories'

const PHASES = [
  { value: '', label: 'No phase' },
  { value: 'phase_1_standard', label: 'Phase 1 — Standard' },
  { value: 'phase_2_premium', label: 'Phase 2 — Premium' },
  { value: 'phase_3_water_restricted', label: 'Phase 3 — Water-restricted' },
]

export default function InvitationForm() {
  const router = useRouter()
  const [businessName, setBusinessName] = useState('')
  const [contactWhatsapp, setContactWhatsapp] = useState('')
  const [category, setCategory] = useState<string>(CATEGORIES[0])
  const [marketPhase, setMarketPhase] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName,
          contactWhatsapp: contactWhatsapp || undefined,
          category,
          marketPhase: marketPhase || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      setBusinessName('')
      setContactWhatsapp('')
      setMarketPhase('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-white/10 bg-white/5 p-4 sm:grid-cols-5"
    >
      <input
        required
        placeholder="Business name"
        value={businessName}
        onChange={(e) => setBusinessName(e.target.value)}
        className="rounded-md border border-white/20 bg-white/5 px-3 py-2 text-sm sm:col-span-2"
      />
      <input
        placeholder="WhatsApp number (27...)"
        value={contactWhatsapp}
        onChange={(e) => setContactWhatsapp(e.target.value)}
        className="rounded-md border border-white/20 bg-white/5 px-3 py-2 text-sm"
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="rounded-md border border-white/20 bg-white/5 px-3 py-2 text-sm"
      >
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <select
        value={marketPhase}
        onChange={(e) => setMarketPhase(e.target.value)}
        className="rounded-md border border-white/20 bg-white/5 px-3 py-2 text-sm"
      >
        {PHASES.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-cobalt px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-5"
      >
        {loading ? 'Adding...' : 'Add to outreach list'}
      </button>
      {error && <p className="text-sm text-red-400 sm:col-span-5">{error}</p>}
    </form>
  )
}
