import { supabaseAdmin } from '@/lib/supabase'
import { dashboardTopic } from '@/lib/auth/bridge'

type BroadcastTarget = { role: 'vendor' | 'connector'; id: string }

/**
 * Pushes a "something changed, refetch" signal to a dashboard's private
 * Realtime channel. Payload is deliberately minimal -- clients treat receipt
 * as a bare refetch trigger, not a data stream. Never throws, matching the
 * notify()/notifyEvent() convention in lib/whatsapp/client.ts: a broadcast
 * failure must never break the referral/payout flow that triggered it.
 *
 * Uses httpSend() (REST, no subscribe needed) since this is a fire-and-forget
 * one-shot send from the server -- the channel must be removed afterwards or
 * it leaks on the shared supabaseAdmin client across requests.
 */
export async function broadcastDashboardEvent(
  target: BroadcastTarget,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  const channel = supabaseAdmin.channel(dashboardTopic(target.role, target.id), {
    config: { private: true },
  })

  try {
    const result = await channel.httpSend(event, payload)
    if (!result.success) {
      console.error('[realtime] broadcastDashboardEvent send failed', result.status, result.error)
    }
  } catch (err) {
    console.error('[realtime] broadcastDashboardEvent error', err)
  } finally {
    await supabaseAdmin.removeChannel(channel)
  }
}
