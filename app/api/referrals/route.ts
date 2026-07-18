import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { appendLedgerEntry } from '@/lib/ledger/hashChain'
import { notify } from '@/lib/whatsapp/client'

export async function POST(req: Request) {
  const body = await req.json()
  const { connectorReferralCode, vendorSlug, leadName, leadContact, note } = body

  if (!connectorReferralCode || !vendorSlug || !leadName || !leadContact) {
    return NextResponse.json(
      { error: 'connectorReferralCode, vendorSlug, leadName, and leadContact are required' },
      { status: 400 }
    )
  }

  // Connectors only ever see their referral code, never their raw id (see
  // /join, the connector dashboard, and WhatsApp/email notifications) — so
  // this is the only identifier a real connector can type into this form.
  const { data: connector } = await supabaseAdmin
    .from('connectors')
    .select('id')
    .eq('referral_code', connectorReferralCode.trim().toUpperCase())
    .maybeSingle()

  if (!connector) {
    return NextResponse.json(
      { error: "We couldn't find a connector with that referral code. Double-check it and try again." },
      { status: 400 }
    )
  }

  const { data: vendor, error: vendorError } = await supabaseAdmin
    .from('vendors')
    .select('id, name, whatsapp_number')
    .eq('slug', vendorSlug)
    .single()

  if (vendorError || !vendor) {
    return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
  }

  const { data: referral, error } = await supabaseAdmin
    .from('referrals')
    .insert({
      connector_id: connector.id,
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
    connectorId: connector.id,
    vendorSlug,
    leadName,
  })

  await notify(
    vendor.whatsapp_number,
    `New referral via The Connection Network: ${leadName} (${leadContact})${note ? ` — "${note}"` : ''}. Log in to your admin dashboard to follow up.`
  )

  return NextResponse.json({ referralId: referral.id })
}
