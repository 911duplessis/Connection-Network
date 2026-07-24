import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase'

type BridgeRole = 'vendor' | 'connector'

const BRIDGE_EMAIL_DOMAIN = 'bridge.tcn.internal'

export function bridgeEmailFor(role: BridgeRole, id: string): string {
  return `${role}+${id}@${BRIDGE_EMAIL_DOMAIN}`
}

// Single source of truth for the "role:id:dashboard" topic format -- the
// Realtime Authorization policies in supabase/migration_0008_realtime_dashboard_auth.sql
// hardcode this exact shape via split_part(topic, ':', 1/3), so it must never drift.
export function dashboardTopic(role: BridgeRole, id: string): string {
  return `${role}:${id}:dashboard`
}

interface BridgeSession {
  accessToken: string
  expiresAt: number
  channelTopic: string
}

/**
 * Bridges the app's existing custom-JWT/credential identity into a minimal
 * Supabase Auth session, so the browser can authorize a private Realtime
 * channel via `realtime.setAuth(accessToken)`. Deliberately does not return
 * a refresh_token or call setSession() -- only realtime.setAuth() is needed,
 * which bounds a leaked access_token's blast radius to its ~1h expiry and to
 * exactly this vendor's/connector's own dashboard channel.
 */
export async function createBridgeSession(role: BridgeRole, id: string): Promise<BridgeSession> {
  const email = bridgeEmailFor(role, id)

  // generateLink() is already idempotent find-or-create on Supabase's side
  // (its own docs: "handles the creation of the user for signup, invite and
  // magiclink") -- no separate admin.createUser() call or find-or-create
  // race against auth.users needed.
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })

  if (error || !data.user) {
    throw new Error(`[bridge] generateLink failed: ${error?.message ?? 'no user returned'}`)
  }

  await supabaseAdmin
    .from('user_roles')
    .upsert(
      { user_id: data.user.id, role, [`${role}_id`]: id },
      { onConflict: 'user_id' }
    )

  // A fresh, disposable anon client -- never lib/supabase.ts's shared
  // `supabase` export, which is a module-level singleton (persistSession:
  // true by default) reused across concurrent requests in the same process.
  // Calling verifyOtp() on it would leak this session into unrelated
  // concurrent requests' use of that client.
  const throwawayClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  const { data: otpData, error: otpError } = await throwawayClient.auth.verifyOtp({
    token_hash: data.properties.hashed_token,
    type: 'magiclink',
  })

  if (otpError || !otpData.session) {
    throw new Error(`[bridge] verifyOtp failed: ${otpError?.message ?? 'no session returned'}`)
  }

  return {
    accessToken: otpData.session.access_token,
    expiresAt: otpData.session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
    channelTopic: dashboardTopic(role, id),
  }
}
