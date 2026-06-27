import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { appendLedgerEntry } from '@/lib/ledger/hashChain'
import { sendWhatsAppText } from '@/lib/whatsapp/client'

// Meta's webhook handshake: https://developers.facebook.com/docs/graph-api/webhooks/getting-started
export async function GET(req: Request) {
  const url = new URL(req.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN && challenge) {
    return new Response(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

const KEYWORD_REPLIES: Record<string, string> = {
  CONNECT: "Hey! You're in. The Connection Network is a referral network — vendors list rewards, connectors make introductions and get paid when they convert. Reply JOIN and we'll get you a referral code, or visit the website to sign up directly.",
  JOIN: "Head to the website and tap 'Become a connector' to get your referral code instantly — takes under a minute, no password needed.",
  READY: "Great — once you've got your referral code, submit any lead straight from a vendor's page on the website and we'll track it for you.",
  ACTIVE: "You're marked as active. Keep an eye out for opportunities and submit referrals as soon as you spot one.",
  STAY: 'Good to have you. We will keep you posted on opportunities.',
  OUT: 'No hard feelings — you have been noted as opted out. Send CONNECT again anytime if you change your mind.',
}

interface WhatsAppWebhookPayload {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{ from: string; text?: { body: string } }>
      }
    }>
  }>
}

export async function POST(req: Request) {
  const payload: WhatsAppWebhookPayload = await req.json()

  const messages = payload.entry?.flatMap((entry) =>
    entry.changes?.flatMap((change) => change.value?.messages ?? []) ?? []
  ) ?? []

  for (const message of messages) {
    const from = message.from
    const text = message.text?.body?.trim() ?? ''
    const keyword = text.toUpperCase().split(/\s+/)[0]

    const { data: connector } = await supabaseAdmin
      .from('connectors')
      .select('id, name')
      .eq('whatsapp_number', from)
      .maybeSingle()

    const { data: vendor } = connector
      ? { data: null }
      : await supabaseAdmin.from('vendors').select('id, name').eq('whatsapp_number', from).maybeSingle()

    await appendLedgerEntry('whatsapp_message_received', {
      from,
      text,
      connectorId: connector?.id ?? null,
      vendorId: vendor?.id ?? null,
    })

    const reply = KEYWORD_REPLIES[keyword]
    if (reply) {
      await sendWhatsAppText({ to: from, body: reply })
    }
  }

  return NextResponse.json({ ok: true })
}
