import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { appendLedgerEntry } from '@/lib/ledger/hashChain'
import { calculateCommission } from '@/lib/commission/calc'
import { notify } from '@/lib/whatsapp/client'

function formatAmount(cents: number, currency: string): string {
  return `${(cents / 100).toFixed(2)} ${currency}`
}

const VALID_STATUSES = ['submitted', 'contacted', 'quoted', 'won', 'lost']

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { status, jobValueCents } = body

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  if (status === 'won' && !jobValueCents) {
    return NextResponse.json({ error: 'jobValueCents is required when status is won' }, { status: 400 })
  }

  const { data: referral, error: referralError } = await supabaseAdmin
    .from('referrals')
    .update({ status, job_value_cents: status === 'won' ? jobValueCents : undefined })
    .eq('id', id)
    .select('*, vendors(*), connectors(*)')
    .single()

  if (referralError || !referral) {
    return NextResponse.json({ error: referralError?.message || 'Referral not found' }, { status: 400 })
  }

  if (status !== 'won') {
    return NextResponse.json({ referralId: referral.id, status })
  }

  const vendor = referral.vendors
  const connector = referral.connectors

  const { data: upline } = connector.upline_connector_id
    ? await supabaseAdmin
        .from('connectors')
        .select('id, whatsapp_number')
        .eq('id', connector.upline_connector_id)
        .single()
    : { data: null }

  const breakdown = calculateCommission(
    jobValueCents,
    {
      tier1Pct: vendor.tier1_pct,
      tier1FlatCents: vendor.tier1_flat_cents,
      tier2OverridePct: vendor.tier2_override_pct,
    },
    !!upline
  )

  await appendLedgerEntry('referral_won', {
    referralId: referral.id,
    vendorSlug: vendor.slug,
    connectorId: connector.id,
    jobValueCents,
  })

  const tier1Entry = await appendLedgerEntry('commission_tier1_paid', {
    referralId: referral.id,
    connectorId: connector.id,
    amountCents: breakdown.tier1AmountCents,
  })

  await supabaseAdmin.from('payouts').insert({
    connector_id: connector.id,
    referral_id: referral.id,
    tier: 1,
    amount_cents: breakdown.tier1AmountCents,
    ledger_entry_seq: tier1Entry.seq,
  })

  await notify(
    connector.whatsapp_number,
    `Referral won! ${vendor.name} closed your lead for ${formatAmount(jobValueCents, vendor.currency)}. Your commission: ${formatAmount(breakdown.tier1AmountCents, vendor.currency)}.`
  )

  if (breakdown.hasTier2 && upline) {
    const tier2Entry = await appendLedgerEntry('commission_tier2_paid', {
      referralId: referral.id,
      connectorId: upline.id,
      amountCents: breakdown.tier2AmountCents,
    })

    await supabaseAdmin.from('payouts').insert({
      connector_id: upline.id,
      referral_id: referral.id,
      tier: 2,
      amount_cents: breakdown.tier2AmountCents,
      ledger_entry_seq: tier2Entry.seq,
    })

    await notify(
      upline.whatsapp_number,
      `Override commission earned: a connector in your downline closed a referral via ${vendor.name}. Your Tier 2 override: ${formatAmount(breakdown.tier2AmountCents, vendor.currency)}.`
    )
  }

  if (vendor.eco_pledge_pct > 0) {
    await appendLedgerEntry('eco_pledge_honoured', {
      referralId: referral.id,
      vendorSlug: vendor.slug,
      ecoPledgePct: vendor.eco_pledge_pct,
      jobValueCents,
    })
  }

  return NextResponse.json({ referralId: referral.id, status, breakdown })
}
