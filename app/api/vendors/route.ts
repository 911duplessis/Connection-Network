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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://connection-network.vercel.app'

  await notify(
    vendor.whatsapp_number,
    `Hi ${vendor.contact_person}, your vendor listing for ${vendor.name} has been submitted to The Connection Network. ` +
      `We'll review and activate it shortly. Preview your page here: ${appUrl}/vendors/${vendor.slug}`
  )

  await notify(
    process.env.ADMIN_WHATSAPP_NUMBER,
    `New vendor sign-up: ${vendor.name} (${vendor.contact_person}, ${vendor.whatsapp_number}). ` +
      `Activate their listing in the admin dashboard: ${appUrl}/admin`
  )

  return NextResponse.json({ slug: vendor.slug })
}
