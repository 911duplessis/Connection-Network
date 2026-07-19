import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { appendLedgerEntry } from '@/lib/ledger/hashChain'
import { calculateCommission } from '@/lib/commission/calc'
import { notifyEvent } from '@/lib/whatsapp/client'
import { ADMIN_SESSION_COOKIE, verifyAdminToken } from '@/lib/admin/auth'
import { VENDOR_SESSION_COOKIE, verifyVendorSession } from '@/lib/vendor/auth'
import { maybePromoteConnectorGrade, overridePctForGrade } from '@/lib/connectors/grade'
import { broadcastDashboardEvent } from '@/lib/realtime/broadcast'

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

  const { data: existing } = await supabaseAdmin
    .from('referrals')
    .select('vendor_id, vendors(password_hash)')
    .eq('id', id)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Referral not found' }, { status: 404 })
  }

  const cookieStore = await cookies()
  const adminCookie = cookieStore.get(ADMIN_SESSION_COOKIE)?.value
  const isAdmin = await verifyAdminToken(adminCookie)

  let isVendor = false
  if (!isAdmin) {
    const vendorCookie = cookieStore.get(VENDOR_SESSION_COOKIE)?.value
    const vendorRecord = existing.vendors as unknown as { password_hash: string | null } | null
    const verifiedVendorId = await verifyVendorSession(vendorCookie, vendorRecord?.password_hash ?? null)
    isVendor = verifiedVendorId === existing.vendor_id
  }

  if (!isAdmin && !isVendor) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
  }

  // Guard the 'won' transition against double-fires (double-click, network
  // retry, duplicate API call): only actually update the row if it isn't
  // already 'won'. Postgres row locking makes this safe under real
  // concurrency too, not just sequential double-clicks — a second PATCH
  // blocks on the row lock, then re-evaluates .neq('status','won') against
  // the now-committed row and matches nothing. Every side effect below
  // (ledger entries, payouts, billed WhatsApp sends) becomes unreachable on
  // a repeat call instead of re-firing.
  const isWonTransition = status === 'won'

  let updateQuery = supabaseAdmin
    .from('referrals')
    .update({ status, job_value_cents: isWonTransition ? jobValueCents : undefined })
    .eq('id', id)

  if (isWonTransition) {
    updateQuery = updateQuery.neq('status', 'won')
  }

  const { data: referral, error: referralError } = await updateQuery
    .select('*, vendors(*), connectors(*)')
    .maybeSingle()

  if (referralError) {
    return NextResponse.json({ error: referralError.message }, { status: 400 })
  }

  if (!referral) {
    if (isWonTransition) {
      // Referral was already 'won' — not an error, just a no-op repeat call.
      return NextResponse.json({ referralId: id, status: 'won', alreadyProcessed: true })
    }
    return NextResponse.json({ error: 'Referral not found' }, { status: 400 })
  }

  await broadcastDashboardEvent({ role: 'vendor', id: referral.vendor_id }, 'update', {
    reason: 'status_changed',
    referralId: referral.id,
    status,
  })

  if (status !== 'won') {
    return NextResponse.json({ referralId: referral.id, status })
  }

  const vendor = referral.vendors
  const connector = referral.connectors

  const { data: upline } = connector.upline_connector_id
    ? await supabaseAdmin
        .from('connectors')
        .select('id, whatsapp_number, grade')
        .eq('id', connector.upline_connector_id)
        .single()
    : { data: null }

  const breakdown = calculateCommission(
    jobValueCents,
    {
      tier1Pct: vendor.tier1_pct,
      tier1FlatCents: vendor.tier1_flat_cents,
      // An Active Partner+ upline earns the promoted override on their own
      // downline's tier-1 commissions, replacing the vendor's default.
      tier2OverridePct: upline
        ? overridePctForGrade(upline.grade, vendor.tier2_override_pct)
        : vendor.tier2_override_pct,
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

  // Business-initiated, usually outside the 24h window → prefer an approved
  // template, fall back to text (see lib/whatsapp/client notifyEvent).
  await notifyEvent(connector.whatsapp_number, {
    template: process.env.WHATSAPP_TEMPLATE_REFERRAL_WON || null,
    bodyParams: [
      vendor.name,
      formatAmount(jobValueCents, vendor.currency),
      formatAmount(breakdown.tier1AmountCents, vendor.currency),
    ],
    fallbackText: `Referral won! ${vendor.name} closed your lead for ${formatAmount(jobValueCents, vendor.currency)}. Your commission: ${formatAmount(breakdown.tier1AmountCents, vendor.currency)}.`,
  })

  await broadcastDashboardEvent({ role: 'connector', id: connector.id }, 'update', {
    reason: 'referral_won',
    referralId: referral.id,
  })

  await maybePromoteConnectorGrade(connector.id, connector.whatsapp_number)

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

    await notifyEvent(upline.whatsapp_number, {
      template: process.env.WHATSAPP_TEMPLATE_OVERRIDE_EARNED || null,
      bodyParams: [vendor.name, formatAmount(breakdown.tier2AmountCents, vendor.currency)],
      fallbackText: `Override commission earned: a connector in your downline closed a referral via ${vendor.name}. Your Tier 2 override: ${formatAmount(breakdown.tier2AmountCents, vendor.currency)}.`,
    })

    await broadcastDashboardEvent({ role: 'connector', id: upline.id }, 'update', {
      reason: 'override_earned',
      referralId: referral.id,
    })
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
