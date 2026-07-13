'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function VendorResetPasswordPage() {
  const router = useRouter()
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/vendor/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsappNumber, otp, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      router.push('/vendor-login?reset=1')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-6">
      <h1 className="text-2xl font-bold">Reset password</h1>
      <p className="mt-2 text-sm text-white/60">
        Enter the 6-digit code we sent to your email and WhatsApp, then choose a new password.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <input
          required
          placeholder="WhatsApp number (27...)"
          value={whatsappNumber}
          onChange={(e) => setWhatsappNumber(e.target.value)}
          className="w-full rounded-md border border-white/20 bg-white/5 px-3 py-2 text-white"
        />
        <input
          required
          placeholder="6-digit reset code"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="w-full rounded-md border border-white/20 bg-white/5 px-3 py-2 font-mono tracking-widest text-white"
        />
        <input
          required
          type="password"
          placeholder="New password (min 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-white/20 bg-white/5 px-3 py-2 text-white"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-cobalt px-4 py-2 font-semibold text-white disabled:opacity-50"
        >
          {loading ? 'Resetting...' : 'Set new password'}
        </button>
        <p className="text-center text-sm text-white/50">
          <Link href="/vendor-forgot-password" className="text-cobalt underline">
            Request a new code
          </Link>
        </p>
      </form>
    </main>
  )
}
