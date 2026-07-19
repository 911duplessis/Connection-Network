import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { normalizeWhatsAppNumber } from '@/lib/whatsapp/normalize'
import { createBridgeSession } from '@/lib/auth/bridge'

// Connectors have no session/cookie today (see app/api/connector/lookup) --
// minting a live-updates bridge session must require the same credentials
// as any other connector data access, not weaker.
export async function POST(req: Request) {
  const { whatsappNumber: rawWhatsappNumber, referralCode } = await req.json()

  if (!rawWhatsappNumber || !referralCode) {
    return NextResponse.json({ error: 'whatsappNumber and referralCode are required' }, { status: 400 })
  }

  const { data: connector } = await supabaseAdmin
    .from('connectors')
    .select('id')
    .eq('whatsapp_number', normalizeWhatsAppNumber(rawWhatsappNumber))
    .eq('referral_code', referralCode.trim().toUpperCase())
    .single()

  if (!connector) {
    return NextResponse.json({ error: 'No connector found with that WhatsApp number and referral code' }, { status: 404 })
  }

  try {
    const session = await createBridgeSession('connector', connector.id)
    return NextResponse.json(session)
  } catch (err) {
    console.error('[bridge-session] connector bridge failed', err)
    return NextResponse.json({ error: 'Live updates unavailable' }, { status: 503 })
  }
}
