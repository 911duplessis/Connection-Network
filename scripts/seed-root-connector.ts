import { supabaseAdmin } from '@/lib/supabase'

// TCN grows by invitation only — POST /api/connectors always requires a
// valid upline referral code (see app/api/connectors/route.ts), so a brand
// new deployment has no code anyone can invite from. This seeds exactly one
// connector with no upline to break that chicken-and-egg problem: run it
// once per deployment, then hand ROOT_CONNECTOR_CODE to whoever should be
// the network's first real recruiter.
//
// Override the placeholders below via env vars before running in production
// — the WhatsApp number must be a real, reachable number since it's how
// this connector logs in to /connector/dashboard.
const ROOT_CONNECTOR = {
  name: process.env.ROOT_CONNECTOR_NAME ?? 'TCN Root',
  whatsapp_number: process.env.ROOT_CONNECTOR_WHATSAPP ?? 'REPLACE_WITH_REAL_WHATSAPP_NUMBER',
  email: process.env.ROOT_CONNECTOR_EMAIL || null,
  referral_code: (process.env.ROOT_CONNECTOR_CODE ?? 'TCN-ROOT').toUpperCase(),
}

async function seed() {
  if (ROOT_CONNECTOR.whatsapp_number === 'REPLACE_WITH_REAL_WHATSAPP_NUMBER') {
    console.error(
      'Set ROOT_CONNECTOR_WHATSAPP (and optionally ROOT_CONNECTOR_NAME / ROOT_CONNECTOR_EMAIL / ROOT_CONNECTOR_CODE) before running this seed.'
    )
    process.exit(1)
  }

  const { data, error } = await supabaseAdmin
    .from('connectors')
    .upsert(
      { ...ROOT_CONNECTOR, agreement_signed_at: new Date().toISOString() },
      { onConflict: 'whatsapp_number' }
    )
    .select()
    .single()

  if (error) {
    console.error('Seed failed:', error.message)
    process.exit(1)
  }

  console.log('Seeded root connector:', data)
  console.log(`Give out this upline referral code to the network's first real recruit: ${data.referral_code}`)
}

seed()
