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
    .select('status, vendor_id, vendors(password_hash)')
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

  const vendor = referral.vendors
  const connector = referral.connectors

  if (status !== 'won') {
    // Every status transition is logged and reported to the connector, not
    // just 'won' — a one-sided ledger (vendor acts, connector never hears
    // about it unless they get paid) is exactly what this entry type closes.
    await appendLedgerEntry('referral_status_changed', {
      referralId: referral.id,
      vendorSlug: vendor.slug,
      connectorId: connector.id,
      fromStatus: existing.status,
      toStatus: status,
    })

    const STATUS_MESSAGES: Record<string, string> = {
      contacted: `${vendor.name} has accepted your referral for ${referral.lead_name} and is following up.`,
      quoted: `${vendor.name} has sent a quote for your referral (${referral.lead_name}). We'll keep you posted.`,
      lost: `${vendor.name} wasn't able to convert your referral for ${referral.lead_name} this time. Thanks for the introduction — keep them coming!`,
    }

    await notifyEvent(connector.whatsapp_number, {
      fallbackText: STATUS_MESSAGES[status] ?? `Your referral for ${referral.lead_name} is now marked "${status}".`,
    })

    return NextResponse.json({ referralId: referral.id, status })
  }

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

  // Everything from here that touches ledger_entries or payouts happens
  // inside one Postgres function call (process_won_commissions,
  // migration_0011) instead of a chain of independent round trips — either
  // the full commission trail lands atomically or none of it does. A
  // failure here means the referral is already 'won' (that update already
  // committed above) with no commission recorded yet — the one remaining
  // seam, surfaced loudly instead of silently, since it's the single most
  // trust-critical write in the app.
  try {
    await supabaseAdmin.rpc('process_won_commissions', {
      p_referral_id: referral.id,
      p_vendor_slug: vendor.slug,
      p_connector_id: connector.id,
      p_job_value_cents: jobValueCents,
      p_tier1_amount_cents: breakdown.tier1AmountCents,
      p_upline_connector_id: upline?.id ?? null,
      p_tier2_amount_cents: breakdown.hasTier2 ? breakdown.tier2AmountCents : 0,
      p_eco_pledge_pct: vendor.eco_pledge_pct,
    }).throwOnError()
  } catch (err) {
    console.error('[referrals/status] won but commission recording failed — referral_id:', referral.id, err)
    return NextResponse.json(
      { error: 'Referral marked won, but commission recording failed. This has been logged — please check the ledger before notifying anyone.' },
      { status: 500 }
    )
  }

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

  return NextResponse.json({ referralId: referral.id, status, breakdown })
}
