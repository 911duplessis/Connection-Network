import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { appendLedgerEntry } from '@/lib/ledger/hashChain'
import { hashPassword } from '@/lib/auth/password'
import { normalizeWhatsAppNumber } from '@/lib/whatsapp/normalize'
import { notify } from '@/lib/whatsapp/client'
import { sendEmail } from '@/lib/email/client'

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export async function POST(req: Request) {
  const body = await req.json()
  const {
    businessName,
    contactPerson,
    whatsappNumber: rawWhatsappNumber,
    email,
    website,
    category,
    location,
    tier1Pct,
    tier1FlatRand,
    tier2OverridePct,
    ecoPledgePct,
    lookingFor,
    password,
    inviteToken,
  } = body

  if (!businessName || !contactPerson || !rawWhatsappNumber || !password) {
    return NextResponse.json(
      { error: 'businessName, contactPerson, whatsappNumber, and password are required' },
      { status: 400 }
    )
  }

  const whatsappNumber = normalizeWhatsAppNumber(rawWhatsappNumber)

  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }

  const baseSlug = slugify(businessName)
  const { data: slugTaken } = await supabaseAdmin.from('vendors').select('id').eq('slug', baseSlug).maybeSingle()
  const slug = slugTaken ? `${baseSlug}-${Math.random().toString(36).slice(2, 6)}` : baseSlug

  const { data: vendor, error } = await supabaseAdmin
    .from('vendors')
    .insert({
      slug,
      name: businessName,
      contact_person: contactPerson,
      whatsapp_number: whatsappNumber,
      email: email || null,
      website: website || null,
      category: category || null,
      location: location || null,
      tier1_pct: tier1Pct ? Number(tier1Pct) : 5,
      tier1_flat_cents: tier1FlatRand ? Math.round(Number(tier1FlatRand) * 100) : 0,
      tier2_override_pct: tier2OverridePct ? Number(tier2OverridePct) : 10,
      eco_pledge_pct: ecoPledgePct ? Number(ecoPledgePct) : 0,
      looking_for: lookingFor || null,
      password_hash: await hashPassword(password),
      active: false,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  await appendLedgerEntry('vendor_joined', {
    vendorId: vendor.id,
    vendorSlug: vendor.slug,
    name: vendor.name,
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://connection-network.vercel.app'

  // Confirm receipt to the vendor immediately. Previously this only ever
  // happened on the invite-token path below, and even then it notified the
  // person who sent the invite, not the vendor themselves -- a vendor who
  // signs up organically heard nothing back at all.
  await notify(
    vendor.whatsapp_number,
    `You're in, ${contactPerson}! Your ${vendor.name} listing on The Connection Network is being reviewed by our team and will go live shortly. ` +
      `Preview it here: ${appUrl}/vendors/${vendor.slug}`
  )
  await sendEmail({
    to: vendor.email,
    subject: `You're in — ${vendor.name} on The Connection Network`,
    html: `<p>Hi ${contactPerson},</p>
<p>Thanks for signing up <strong>${vendor.name}</strong> on The Connection Network. Your listing is being reviewed and will go live shortly.</p>
<p>Preview your listing now: <a href="${appUrl}/vendors/${vendor.slug}">${appUrl}/vendors/${vendor.slug}</a></p>
<p>— The Connection Network</p>`,
  })

  // Tell the admin a new vendor needs approval. Previously nothing did this --
  // a vendor could sit invisible on the public directory indefinitely unless
  // someone thought to check /admin manually, which is exactly what happened.
  await notify(
    process.env.ADMIN_WHATSAPP_NUMBER,
    `New vendor signup: ${vendor.name} (${category || 'no category'}) needs approval. Review at ${appUrl}/admin`
  )
  await sendEmail({
    to: process.env.ADMIN_EMAIL,
    subject: `New vendor pending approval — ${vendor.name}`,
    html: `<p><strong>${vendor.name}</strong> just signed up and is waiting for approval.</p>
<p>Review and activate: <a href="${appUrl}/admin">${appUrl}/admin</a></p>`,
  })

  // Vendor arrived via a personalized outreach invite — close the loop on
  // the invitations tracker and let whoever's WhatsApp received the
  // original invite know it worked.
  if (inviteToken) {
    const { data: invitation } = await supabaseAdmin
      .from('invitations')
      .select('id, contact_whatsapp')
      .eq('invite_token', inviteToken)
      .maybeSingle()

    if (invitation) {
      await supabaseAdmin
        .from('invitations')
        .update({ status: 'signed', signed_at: new Date().toISOString() })
        .eq('id', invitation.id)

      await notify(
        invitation.contact_whatsapp,
        `You're live on The Connection Network, ${vendor.name}! Connectors can now find you and start referring. Every commission is tracked on our public ledger, so it's fully transparent.`
      )
    }
  }

  return NextResponse.json({ slug: vendor.slug })
}
