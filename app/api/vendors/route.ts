import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { appendLedgerEntry } from '@/lib/ledger/hashChain'
import { hashPassword } from '@/lib/admin/auth'
import { normalizeWhatsAppNumber } from '@/lib/whatsapp/normalize'
import { notify } from '@/lib/whatsapp/client'

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
    website,
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
      website: website || null,
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
