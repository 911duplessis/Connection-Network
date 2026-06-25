import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { appendLedgerEntry } from '@/lib/ledger/hashChain'

export async function POST(req: Request) {
  const body = await req.json()
  const { connectorId, vendorSlug, leadName, leadContact, note } = body

  if (!connectorId || !vendorSlug || !leadName || !leadContact) {
    return NextResponse.json(
      { error: 'connectorId, vendorSlug, leadName, and leadContact are required' },
      { status: 400 }
    )
  }

  const { data: vendor, error: vendorError } = await supabaseAdmin
    .from('vendors')
    .select('id')
    .eq('slug', vendorSlug)
    .single()

  if (vendorError || !vendor) {
    return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
  }

  const { data: referral, error } = await supabaseAdmin
    .from('referrals')
    .insert({
      connector_id: connectorId,
      vendor_id: vendor.id,
      lead_name: leadName,
      lead_contact: leadContact,
      note,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  await appendLedgerEntry('referral_submitted', {
    referralId: referral.id,
    connectorId,
    vendorSlug,
    leadName,
  })

  return NextResponse.json({ referralId: referral.id })
}
