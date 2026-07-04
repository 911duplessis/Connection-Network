'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CATEGORIES } from '@/lib/routing/categories'

const initial = {
  businessName: '',
  contactPerson: '',
  whatsappNumber: '',
  website: '',
  category: CATEGORIES[0] as string,
  location: '',
  tier1Pct: '5',
  tier1FlatRand: '500',
  tier2OverridePct: '10',
  ecoPledgePct: '0',
  lookingFor: '',
  password: '',
}

function VendorSignupForm() {
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get('invite')

  const [form, setForm] = useState(initial)
  const [submitted, setSubmitted] = useState(false)
  const [slug, setSlug] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function set<K extends keyof typeof initial>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, inviteToken: inviteToken || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      setSlug(data.slug)
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <main className="mx-auto max-w-lg px-6 py-16 text-center">
        <h1 className="text-2xl font-bold">Vendor sign-up received.</h1>
        <p className="mt-4 text-white/70">
          We&apos;ll review and activate your listing shortly. Once active, it goes public on the{' '}
          <Link href="/vendors" className="text-cobalt underline">
            vendor directory
          </Link>
          .
        </p>
        {slug && (
          <Link
            href={`/vendors/${slug}`}
            className="mt-6 inline-block w-full rounded-md bg-cobalt px-6 py-3 font-semibold text-white"
          >
            Preview your page
          </Link>
        )}
        <p className="mt-6 text-sm text-white/70">
          You can{' '}
          <Link href="/vendor-login" className="text-cobalt underline">
            sign in to your vendor dashboard
          </Link>{' '}
          any time with the WhatsApp number and password you just set, to see referrals and update status.
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <h1 className="text-2xl font-bold">Vendor sign-up</h1>
      <p className="mt-2 text-white/70">
        Zero cost to join. You set your own referral terms — pay only when a referral converts.
        Terms are published publicly so connectors know exactly what they&apos;ll earn.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="block text-sm text-white/70">Business name *</label>
          <input
            required
            value={form.businessName}
            onChange={(e) => set('businessName', e.target.value)}
            className="mt-1 w-full rounded-md border border-white/20 bg-white/5 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-white/70">Contact person *</label>
          <input
            required
            value={form.contactPerson}
            onChange={(e) => set('contactPerson', e.target.value)}
            className="mt-1 w-full rounded-md border border-white/20 bg-white/5 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-white/70">WhatsApp number *</label>
          <input
            required
            placeholder="27..."
            value={form.whatsappNumber}
            onChange={(e) => set('whatsappNumber', e.target.value)}
            className="mt-1 w-full rounded-md border border-white/20 bg-white/5 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-white/70">Website</label>
          <input
            value={form.website}
            onChange={(e) => set('website', e.target.value)}
            className="mt-1 w-full rounded-md border border-white/20 bg-white/5 px-3 py-2"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-white/70">Category</label>
            <select
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              className="mt-1 w-full rounded-md border border-white/20 bg-white/5 px-3 py-2"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-white/70">Location</label>
            <input
              placeholder="e.g. Randburg"
              value={form.location}
              onChange={(e) => set('location', e.target.value)}
              className="mt-1 w-full rounded-md border border-white/20 bg-white/5 px-3 py-2"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-white/70">Referral reward (%)</label>
            <input
              value={form.tier1Pct}
              onChange={(e) => set('tier1Pct', e.target.value)}
              className="mt-1 w-full rounded-md border border-white/20 bg-white/5 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm text-white/70">Closing bonus (R)</label>
            <input
              value={form.tier1FlatRand}
              onChange={(e) => set('tier1FlatRand', e.target.value)}
              className="mt-1 w-full rounded-md border border-white/20 bg-white/5 px-3 py-2"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-white/70">Upline override (%)</label>
            <input
              value={form.tier2OverridePct}
              onChange={(e) => set('tier2OverridePct', e.target.value)}
              className="mt-1 w-full rounded-md border border-white/20 bg-white/5 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm text-white/70">Eco pledge (%)</label>
            <input
              value={form.ecoPledgePct}
              onChange={(e) => set('ecoPledgePct', e.target.value)}
              className="mt-1 w-full rounded-md border border-white/20 bg-white/5 px-3 py-2"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm text-white/70">What kind of leads are you looking for?</label>
          <textarea
            value={form.lookingFor}
            onChange={(e) => set('lookingFor', e.target.value)}
            className="mt-1 w-full rounded-md border border-white/20 bg-white/5 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-white/70">Set a dashboard password *</label>
          <input
            required
            type="password"
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
            className="mt-1 w-full rounded-md border border-white/20 bg-white/5 px-3 py-2"
          />
          <p className="mt-1 text-xs text-white/40">
            Used with your WhatsApp number to log in to your vendor dashboard later.
          </p>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-cobalt px-6 py-3 font-semibold text-white disabled:opacity-50"
        >
          {loading ? 'Submitting...' : 'Sign up as a vendor'}
        </button>
      </form>
    </main>
  )
}

export default function VendorSignupPage() {
  return (
    <Suspense fallback={null}>
      <VendorSignupForm />
    </Suspense>
  )
}
