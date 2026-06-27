import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { appendLedgerEntry } from '@/lib/ledger/hashChain'
import { notify } from '@/lib/whatsapp/client'
import { normalizeWhatsAppNumber } from '@/lib/whatsapp/normalize'

function generateReferralCode(name: string) {
  const base = name.trim().split(/\s+/)[0].slice(0, 6).toUpperCase()
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${base}${suffix}`
}

export async function POST(req: Request) {
  const body = await req.json()
  const { name, whatsappNumber: rawWhatsappNumber, uplineReferralCode, agreementAccepted } = body

  if (!name || !rawWhatsappNumber) {
    return NextResponse.json({ error: 'name and whatsappNumber are required' }, { status: 400 })
  }

  if (!agreementAccepted) {
    return NextResponse.json({ error: 'You must accept the partner agreement to join' }, { status: 400 })
  }

  const whatsappNumber = normalizeWhatsAppNumber(rawWhatsappNumber)

  let uplineConnectorId: string | null = null
  if (uplineReferralCode) {
    const { data: upline } = await supabaseAdmin
      .from('connectors')
      .select('id')
      .eq('referral_code', uplineReferralCode)
      .single()
    uplineConnectorId = upline?.id ?? null
  }

  const referralCode = generateReferralCode(name)

  const { data: connector, error } = await supabaseAdmin
    .from('connectors')
    .insert({
      name,
      whatsapp_number: whatsappNumber,
      referral_code: referralCode,
      upline_connector_id: uplineConnectorId,
      agreement_signed_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
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

  await notify(
    connector.whatsapp_number,
    `Welcome to The Connection Network, ${connector.name}! Your referral code is ${connector.referral_code}. Share it, or submit referrals directly via the vendor pages.`
  )

  return NextResponse.json({ referralCode: connector.referral_code, connectorId: connector.id })
}
