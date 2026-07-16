import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { appendLedgerEntry } from '@/lib/ledger/hashChain'
import { notify } from '@/lib/whatsapp/client'
import { UNASSIGNED_CONNECTOR_CODE, UNASSIGNED_VENDOR_SLUG } from '@/lib/routing/constants'

// Public, unauthenticated lead intake. No connector login required -- for
// leads sourced outside the referral network (e.g. a Facebook post) that
// need somewhere to land instead of being lost. Always resolves to the
// DIRECT-UNASSIGNED connector and `unassigned` vendor bucket for manual
// admin triage; run scripts/seed-unassigned.ts once to create them.
export async function POST(req: Request) {
  const body = await req.json()
  const { leadName, leadContact, note, source } = body

  if (!leadName || !leadContact) {
    return NextResponse.json(
      { error: 'leadName and leadContact are required' },
      { status: 400 }
    )
  }

  const { data: connector, error: connectorError } = await supabaseAdmin
    .from('connectors')
    .select('id')
    .eq('referral_code', UNASSIGNED_CONNECTOR_CODE)
    .single()

  if (connectorError || !connector) {
    return NextResponse.json(
      { error: 'Lead intake is not set up yet — run scripts/seed-unassigned.ts' },
      { status: 500 }
    )
  }

  const { data: vendor, error: vendorError } = await supabaseAdmin
    .from('vendors')
    .select('id, whatsapp_number')
    .eq('slug', UNASSIGNED_VENDOR_SLUG)
    .single()

  if (vendorError || !vendor) {
    return NextResponse.json(
      { error: 'Lead intake is not set up yet — run scripts/seed-unassigned.ts' },
      { status: 500 }
    )
  }

  const { data: referral, error } = await supabaseAdmin
    .from('referrals')
    .insert({
      connector_id: connector.id,
      vendor_id: vendor.id,
      lead_name: leadName,
      lead_contact: leadContact,
      note: source ? `[source: ${source}] ${note ?? ''}`.trim() : note,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  try {
    await appendLedgerEntry('referral_submitted', {
      referralId: referral.id,
      connectorId: connector.id,
      vendorSlug: UNASSIGNED_VENDOR_SLUG,
      leadName,
      source: source ?? 'public_lead_form',
    })
  } catch (err) {
    console.error('[leads] ledger append failed', err)
  }

  await notify(
    vendor.whatsapp_number,
    `New unassigned public lead: ${leadName} (${leadContact})${note ? ` — "${note}"` : ''}. Needs manual vendor assignment.`
  )

  return NextResponse.json({ referralId: referral.id, status: 'received' })
}
