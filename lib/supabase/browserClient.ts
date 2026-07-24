import { createClient } from '@supabase/supabase-js'

// Client-side only. Must not import lib/supabase.ts -- that module reads
// SUPABASE_SERVICE_ROLE_KEY at module scope, which is not a NEXT_PUBLIC_*
// var; pulling it into a client bundle would silently inline `undefined`
// for that var at build time rather than error.
export function createBrowserSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
