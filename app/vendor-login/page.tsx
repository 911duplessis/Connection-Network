'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function VendorLoginPage() {
  const router = useRouter()
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await fetch('/api/vendor/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ whatsappNumber, password }),
    })

    setLoading(false)

    if (!res.ok) {
      setError('Incorrect WhatsApp number or password')
      return
    }

    router.push('/vendor/dashboard')
    router.refresh()
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-6">
      <h1 className="text-2xl font-bold">Vendor login</h1>
      <p className="mt-2 text-sm text-white/60">
        Not signed up yet?{' '}
        <Link href="/vendors/signup" className="text-cobalt underline">
          Sign up your business
        </Link>
        .
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <input
          required
          value={whatsappNumber}
          onChange={(e) => setWhatsappNumber(e.target.value)}
          placeholder="WhatsApp number"
          className="w-full rounded-md border border-white/20 bg-white/5 px-3 py-2 text-white"
        />
        <input
          required
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-md border border-white/20 bg-white/5 px-3 py-2 text-white"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-cobalt px-4 py-2 font-semibold text-white disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}
