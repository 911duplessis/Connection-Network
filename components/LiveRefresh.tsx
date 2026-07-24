'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/browserClient'

// Silent live-refresh for the vendor dashboard (a server component) -- on
// any broadcast to this vendor's private channel, re-run the server fetch
// via router.refresh(). Any failure here (rate limit, network) is swallowed:
// the dashboard already rendered correctly server-side and works fine
// without live updates, so this must never surface an error to the vendor.
export default function LiveRefresh() {
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    const client = createBrowserSupabaseClient()
    let channel: ReturnType<typeof client.channel> | null = null

    async function connect() {
      try {
        const res = await fetch('/api/vendor/bridge-session', { method: 'POST' })
        if (!res.ok) return
        const { accessToken, channelTopic } = await res.json()
        if (cancelled) return

        await client.realtime.setAuth(accessToken)
        channel = client.channel(channelTopic, { config: { private: true } })
        channel
          .on('broadcast', { event: 'update' }, () => router.refresh())
          .subscribe()
      } catch (err) {
        console.warn('[live-refresh] bridge connect failed', err)
      }
    }

    connect()

    return () => {
      cancelled = true
      if (channel) client.removeChannel(channel)
    }
  }, [router])

  return null
}
