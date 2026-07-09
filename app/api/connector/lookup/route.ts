import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { normalizeWhatsAppNumber } from '@/lib/whatsapp/normalize'

export async function POST(req: Request) {
  const { whatsappNumber: rawWhatsappNumber, referralCode } = await req.json()

  if (!rawWhatsappNumber || !referralCode) {
    return NextResponse.json({ error: 'whatsappNumber and referralCode are required' }, { status: 400 })
  }

  const { data: connector } = await supabaseAdmin
    .from('connectors')
    .select('id, name, whatsapp_number, referral_code, agreement_signed_at')
    .eq('whatsapp_number', normalizeWhatsAppNumber(rawWhatsappNumber))
    .eq('referral_code', referralCode.trim().toUpperCase())
    .single()

  if (!connector) {
    return NextResponse.json({ error: 'No connector found with that WhatsApp number and referral code' }, { status: 404 })
  }

  const { data: referrals } = await supabaseAdmin
    .from('referrals')
    .select('id, lead_name, status, job_value_cents, created_at, vendors(name, currency)')
    .eq('connector_id', connector.id)
    .order('created_at', { ascending: false })

  const { data: payouts } = await supabaseAdmin
    .from('payouts')
    .select('tier, amount_cents')
    .eq('connector_id', connector.id)

  const tier1Cents = payouts?.filter((p) => p.tier === 1).reduce((sum, p) => sum + p.amount_cents, 0) ?? 0
  const tier2Cents = payouts?.filter((p) => p.tier === 2).reduce((sum, p) => sum + p.amount_cents, 0) ?? 0

  return NextResponse.json({
    connector: {
      name: connector.name,
      referralCode: connector.referral_code,
      agreementSigned: !!connector.agreement_signed_at,
    },
    referrals: referrals ?? [],
    earnings: {
      tier1Cents,
      tier2Cents,
      totalCents: tier1Cents + tier2Cents,
    },
  })
}
