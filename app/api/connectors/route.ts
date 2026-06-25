import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { appendLedgerEntry } from '@/lib/ledger/hashChain'

function generateReferralCode(name: string) {
  const base = name.trim().split(/\s+/)[0].slice(0, 6).toUpperCase()
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${base}${suffix}`
}

export async function POST(req: Request) {
  const body = await req.json()
  const { name, whatsappNumber, uplineReferralCode } = body

  if (!name || !whatsappNumber) {
    return NextResponse.json({ error: 'name and whatsappNumber are required' }, { status: 400 })
  }

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

  return NextResponse.json({ referralCode: connector.referral_code, connectorId: connector.id })
}
