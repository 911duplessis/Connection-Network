'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function VendorForgotPasswordPage() {
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/vendor/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsappNumber }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-6 text-center">
        <h1 className="text-2xl font-bold">Check your email &amp; WhatsApp</h1>
        <p className="mt-4 text-white/70">
          If that WhatsApp number is registered, we&apos;ve sent a 6-digit reset code to the email
          address and WhatsApp number on file. The code expires in 15 minutes.
        </p>
        <Link
          href="/vendor-reset-password"
          className="mt-6 inline-block w-full rounded-md bg-cobalt px-6 py-3 font-semibold text-white"
        >
          Enter reset code
        </Link>
        <p className="mt-4 text-sm text-white/50">
          No email on file?{' '}
          <Link href="/help" className="text-cobalt underline">
            Contact support
          </Link>
          .
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-6">
      <h1 className="text-2xl font-bold">Forgot password</h1>
      <p className="mt-2 text-sm text-white/60">
        Enter the WhatsApp number you signed up with and we&apos;ll send a reset code to your email
        and WhatsApp.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <input
          required
          placeholder="WhatsApp number (27...)"
          value={whatsappNumber}
          onChange={(e) => setWhatsappNumber(e.target.value)}
          className="w-full rounded-md border border-white/20 bg-white/5 px-3 py-2 text-white"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-cobalt px-4 py-2 font-semibold text-white disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send reset code'}
        </button>
        <p className="text-center text-sm text-white/50">
          <Link href="/vendor-login" className="text-cobalt underline">
            Back to login
          </Link>
        </p>
      </form>
    </main>
  )
}
