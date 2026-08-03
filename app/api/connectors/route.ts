import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { appendLedgerEntry } from '@/lib/ledger/hashChain'
import { notify } from '@/lib/whatsapp/client'
import { sendEmail } from '@/lib/email/client'
import { normalizeWhatsAppNumber } from '@/lib/whatsapp/normalize'

function generateReferralCode(name: string) {
  const base = name.trim().split(/\s+/)[0].slice(0, 6).toUpperCase()
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${base}${suffix}`
}

export async function POST(req: Request) {
  const body = await req.json()
  const { name, whatsappNumber: rawWhatsappNumber, email, uplineReferralCode, agreementAccepted } = body

  if (!name || !rawWhatsappNumber) {
    return NextResponse.json({ error: 'name and whatsappNumber are required' }, { status: 400 })
  }

  if (!agreementAccepted) {
    return NextResponse.json({ error: 'You must accept the partner agreement to join' }, { status: 400 })
  }

  const whatsappNumber = normalizeWhatsAppNumber(rawWhatsappNumber)

  // TCN grows by invitation only — a valid upline referral code is required.
  // (Root/system connectors, e.g. the UNASSIGNED_CONNECTOR_CODE bucket or a
  // brand-new region's first connector, are seeded directly via script/DB,
  // not through this public endpoint — so this doesn't block operational
  // seeding, only closes the cold/public self-signup path.)
  if (!uplineReferralCode) {
    return NextResponse.json(
      { error: 'An upline referral code is required to join — TCN grows by invitation only.' },
      { status: 400 }
    )
  }

  const { data: upline } = await supabaseAdmin
    .from('connectors')
    .select('id')
    .eq('referral_code', uplineReferralCode.trim().toUpperCase())
    .maybeSingle()

  if (!upline) {
    return NextResponse.json(
      { error: "We couldn't find a connector with that referral code. Double-check it with whoever invited you." },
      { status: 400 }
    )
  }

  const uplineConnectorId = upline.id

  const referralCode = generateReferralCode(name)

  const { data: connector, error } = await supabaseAdmin
    .from('connectors')
    .insert({
      name,
      whatsapp_number: whatsappNumber,
      email: email || null,
      referral_code: referralCode,
      upline_connector_id: uplineConnectorId,
      agreement_signed_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505' && error.message.includes('whatsapp_number')) {
      return NextResponse.json(
        {
          error:
            "You're already registered as a connector with this WhatsApp number. Log in at /connector/dashboard with your existing referral code instead of signing up again.",
        },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: 'Something went wrong while signing you up. Please try again.' }, { status: 400 })
  }

  await appendLedgerEntry('connector_joined', {
    connectorId: connector.id,
    name: connector.name,
    referralCode: connector.referral_code,
    uplineConnectorId,
  })

  await appendLedgerEntry('agreement_signed', {
    connectorId: connector.id,
    name: connector.name,
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://connection-network.vercel.app'

  await notify(
    connector.whatsapp_number,
    `Welcome to The Connection Network, ${connector.name}! Your referral code is ${connector.referral_code}. ` +
      `Save this — you'll need it to log in to your dashboard: ${appUrl}/connector/dashboard`
  )

  await sendEmail({
    to: connector.email,
    subject: `You're in — your referral code is ${connector.referral_code}`,
    html: `<p>Hi ${connector.name},</p>
<p>Welcome to The Connection Network! You're now a connector.</p>
<p><strong>Your referral code: ${connector.referral_code}</strong></p>
<p>Keep this email — you need your referral code to log in to your dashboard.</p>
<p>Your dashboard: <a href="${appUrl}/connector/dashboard">${appUrl}/connector/dashboard</a></p>
<p>Browse vendors you can refer clients to: <a href="${appUrl}/vendors">${appUrl}/vendors</a></p>
<p>— The Connection Network</p>`,
  })

  return NextResponse.json({ referralCode: connector.referral_code, connectorId: connector.id })
}
