import { supabaseAdmin } from '@/lib/supabase'

const UNASSIGNED_CONNECTOR = {
  name: 'Direct / Unassigned Intake',
  whatsapp_number: 'system-direct-unassigned',
  referral_code: 'DIRECT-UNASSIGNED',
}

const UNASSIGNED_VENDOR = {
  slug: 'unassigned',
  name: 'Unassigned — Needs Manual Vendor Match',
  tier1_pct: 0,
  tier1_flat_cents: 0,
  tier2_override_pct: 0,
  eco_pledge_pct: 0,
  active: true,
}

async function seed() {
  const { data: connector, error: connectorError } = await supabaseAdmin
    .from('connectors')
    .upsert(UNASSIGNED_CONNECTOR, { onConflict: 'referral_code' })
    .select()
    .single()

  if (connectorError) {
    console.error('Seed failed (connector):', connectorError.message)
    process.exit(1)
  }

  const { data: vendor, error: vendorError } = await supabaseAdmin
    .from('vendors')
    .upsert(UNASSIGNED_VENDOR, { onConflict: 'slug' })
    .select()
    .single()

  if (vendorError) {
    console.error('Seed failed (vendor):', vendorError.message)
    process.exit(1)
  }

  console.log('Seeded unassigned connector:', connector)
  console.log('Seeded unassigned vendor:', vendor)
}

seed()
