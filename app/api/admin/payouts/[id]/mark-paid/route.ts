import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { appendLedgerEntry } from '@/lib/ledger/hashChain'
import { ADMIN_SESSION_COOKIE, verifyAdminToken } from '@/lib/admin/auth'

// Admin-only: records that a calculated commission was actually disbursed
// (by whatever channel the vendor pays out through today -- EFT, cash,
// etc. -- there's no payment rail in this app). A payout row has always
// meant "commission calculated"; paid_at is the first way to distinguish
// that from "commission actually paid." Ledger-logged because "this
// connector was paid" is exactly the kind of event this platform exists to
// make provable, the same as every other trust-relevant event.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const cookieStore = await cookies()
  const adminCookie = cookieStore.get(ADMIN_SESSION_COOKIE)?.value
  const isAdmin = await verifyAdminToken(adminCookie)

  if (!isAdmin) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
  }

  const { data: payout, error } = await supabaseAdmin
    .from('payouts')
    .update({ paid_at: new Date().toISOString() })
    .eq('id', id)
    .is('paid_at', null)
    .select('id, connector_id, referral_id, tier, amount_cents')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (!payout) {
    // Either not found, or already marked paid -- not an error either way.
    return NextResponse.json({ id, alreadyPaid: true })
  }

  await appendLedgerEntry('payout_marked_paid', {
    payoutId: payout.id,
    connectorId: payout.connector_id,
    referralId: payout.referral_id,
    tier: payout.tier,
    amountCents: payout.amount_cents,
  })

  return NextResponse.json({ id: payout.id, paid: true })
}
