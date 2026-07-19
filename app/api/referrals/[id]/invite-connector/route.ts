import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { appendLedgerEntry } from '@/lib/ledger/hashChain'
import { notify } from '@/lib/whatsapp/client'
import { ADMIN_SESSION_COOKIE, verifyAdminToken } from '@/lib/admin/auth'
import { VENDOR_SESSION_COOKIE, verifyVendorSession } from '@/lib/vendor/auth'
import { UNASSIGNED_CONNECTOR_CODE } from '@/lib/routing/constants'

// Lets a vendor (or admin) invite the person behind a WhatsApp-sourced
// request (source: 'whatsapp_request', no real connector attached) to
// become a connector themselves — the "if not a connector, become one" half
// of the referral workflow that applies to the lead, not the vendor. The
// other half (a vendor becoming a connector) needs no new endpoint: it
// reuses the existing invitation-gated POST /api/connectors via a prefilled
// /join link (see app/join/page.tsx query params).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: referral } = await supabaseAdmin
    .from('referrals')
    .select('id, lead_contact, source, connector_invite_sent_at, vendor_id, vendors(slug, name, password_hash)')
    .eq('id', id)
    .single()

  if (!referral) {
    return NextResponse.json({ error: 'Referral not found' }, { status: 404 })
  }

  const cookieStore = await cookies()
  const adminCookie = cookieStore.get(ADMIN_SESSION_COOKIE)?.value
  const isAdmin = await verifyAdminToken(adminCookie)

  let isVendor = false
  if (!isAdmin) {
    const vendorCookie = cookieStore.get(VENDOR_SESSION_COOKIE)?.value
    const vendorRecord = referral.vendors as unknown as { password_hash: string | null } | null
    const verifiedVendorId = await verifyVendorSession(vendorCookie, vendorRecord?.password_hash ?? null)
    isVendor = verifiedVendorId === referral.vendor_id
  }

  if (!isAdmin && !isVendor) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
  }

  if (referral.source !== 'whatsapp_request') {
    return NextResponse.json(
      { error: 'This referral already has a connector attached.' },
      { status: 400 }
    )
  }

  if (referral.connector_invite_sent_at) {
    return NextResponse.json({ referralId: referral.id, alreadyInvited: true })
  }

  const vendor = referral.vendors as unknown as { slug: string; name: string } | null
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://connection-network.vercel.app'

  await notify(
    referral.lead_contact,
    `Hi! Thanks for reaching out via The Connection Network. Want to earn rewards for referring others too? ` +
      `Join as a connector — no cost, no obligation: ${appUrl}/join?upline=${UNASSIGNED_CONNECTOR_CODE}`
  )

  await supabaseAdmin
    .from('referrals')
    .update({ connector_invite_sent_at: new Date().toISOString() })
    .eq('id', referral.id)

  await appendLedgerEntry('connector_invited', {
    referralId: referral.id,
    vendorSlug: vendor?.slug ?? null,
    invitedBy: isAdmin ? 'admin' : 'vendor',
  })

  return NextResponse.json({ referralId: referral.id, invited: true })
}
