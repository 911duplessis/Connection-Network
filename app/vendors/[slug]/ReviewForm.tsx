'use client'

import { useState } from 'react'

export default function ReviewForm({ vendorSlug }: { vendorSlug: string }) {
  const [reviewerName, setReviewerName] = useState('')
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorSlug, reviewerName, rating, comment: comment || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return <p className="mt-4 text-green-300">Thanks — your review is recorded on the public ledger.</p>
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 rounded-lg border border-white/10 bg-white/5 p-4">
      <p className="text-sm font-semibold text-white/80">Leave a review</p>
      <input
        required
        placeholder="Your name"
        value={reviewerName}
        onChange={(e) => setReviewerName(e.target.value)}
        className="w-full rounded-md border border-white/20 bg-white/5 px-3 py-2"
      />
      <div>
        <label className="block text-xs text-white/50">Rating</label>
        <div className="mt-1 flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={`${n} star${n > 1 ? 's' : ''}`}
              aria-pressed={n <= rating}
              className={`h-9 w-9 rounded-md border text-sm font-semibold ${
                n <= rating ? 'border-gold bg-gold/20 text-gold' : 'border-white/20 text-white/40'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <textarea
        placeholder="Comment (optional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="w-full rounded-md border border-white/20 bg-white/5 px-3 py-2"
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-cobalt px-6 py-3 font-semibold text-white disabled:opacity-50"
      >
        {loading ? 'Submitting...' : 'Submit review'}
      </button>
    </form>
  )
}
