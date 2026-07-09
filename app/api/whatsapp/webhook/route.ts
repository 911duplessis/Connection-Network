import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { appendLedgerEntry } from '@/lib/ledger/hashChain'
import { sendWhatsAppText } from '@/lib/whatsapp/client'
import { normalizeWhatsAppNumber } from '@/lib/whatsapp/normalize'
import { verifyWebhookSignature } from '@/lib/whatsapp/webhook'

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
  // Read as raw text first — the signature commits to the exact bytes Meta
  // sent, so JSON.parse()-ing before verifying would discard that.
  const rawBody = await req.text()
  const signatureHeader = req.headers.get('x-hub-signature-256')
  const verified = await verifyWebhookSignature(rawBody, signatureHeader, process.env.WHATSAPP_APP_SECRET)

  if (!verified) {
    // Fail closed: unlike notify()'s "skip if unconfigured" outbound pattern,
    // this is a public ingestion endpoint — an unverifiable request must be
    // rejected, not silently accepted, or anyone could write fake events
    // into the public, tamper-evident ledger.
    console.error('[whatsapp] webhook signature verification failed')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const payload: WhatsAppWebhookPayload = JSON.parse(rawBody)

  const messages = payload.entry?.flatMap((entry) =>
    entry.changes?.flatMap((change) => change.value?.messages ?? []) ?? []
  ) ?? []

  for (const message of messages) {
    const from = normalizeWhatsAppNumber(message.from)
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

    // The ledger is public — every other entry type avoids phone numbers and
    // free-text content, so this one shouldn't be the exception. Record only
    // who/what matched and which keyword (if any), never the raw number or
    // message body.
    await appendLedgerEntry('whatsapp_message_received', {
      connectorId: connector?.id ?? null,
      vendorId: vendor?.id ?? null,
      matchedKeyword: KEYWORD_REPLIES[keyword] ? keyword : null,
    })

    const reply = KEYWORD_REPLIES[keyword]
    if (reply) {
      await sendWhatsAppText({ to: from, body: reply })
    }
  }

  return NextResponse.json({ ok: true })
}
