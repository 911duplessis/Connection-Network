import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { appendLedgerEntry } from '@/lib/ledger/hashChain'
import { sendWhatsAppText, notify } from '@/lib/whatsapp/client'
import { normalizeWhatsAppNumber } from '@/lib/whatsapp/normalize'
import { verifyWebhookSignature } from '@/lib/whatsapp/webhook'
import { detectCategory, detectLocation } from '@/lib/routing/detect'
import { findMatchingVendor } from '@/lib/routing/match'
import { UNASSIGNED_CONNECTOR_CODE } from '@/lib/routing/constants'

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
  CONNECT:
    "Hey! You're in. The Connection Network is a referral network — vendors list rewards, connectors make introductions and get paid when they convert. Reply JOIN and we'll get you a referral code, or visit the website to sign up directly.",
  JOIN: "Head to the website and tap 'Become a connector' to get your referral code instantly — takes under a minute, no password needed.",
  READY:
    "Great — once you've got your referral code, submit any lead straight from a vendor's page on the website and we'll track it for you. One quick thing: reply A if you mostly refer people you know, B if you run a business that could supply leads, or C if you're just exploring for now.",
  ACTIVE: 'You are marked as active. Keep an eye out for opportunities and submit referrals as soon as you spot one.',
  STAY: 'Good to have you. We will keep you posted on opportunities.',
  OUT: 'No hard feelings — you have been noted as opted out. Send CONNECT again anytime if you change your mind.',
}

// Broad self-declared intent, asked once via the READY reply above. Distinct
// from the finer-grained professional-type commission table (Architect,
// Estate agent, etc.) in docs/tcn-program-strategy.md — that's set on the
// vendor side, this is just "what kind of connector are you".
const CONNECTOR_TYPE_REPLIES: Record<string, { type: 'referrer' | 'supplier' | 'explorer'; reply: string }> = {
  A: {
    type: 'referrer',
    reply:
      "Got it — you're a Referrer. Submit any lead straight from a vendor's page on the website and we'll track it under your code.",
  },
  B: {
    type: 'supplier',
    reply: "Got it — you're a Supplier. We'll flag you when a vendor's looking for exactly what you offer.",
  },
  C: {
    type: 'explorer',
    reply:
      "No pressure — you're exploring for now. We'll keep you posted, and you can start referring any time by submitting a lead from a vendor's page.",
  },
}

interface WhatsAppWebhookPayload {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{ id?: string; from: string; text?: { body: string } }>
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
    // Idempotency: Meta re-delivers a webhook if we don't 200 fast enough, so
    // processing the same message twice would create duplicate referrals and
    // duplicate ledger entries. Claim each message id exactly once. If the
    // dedup table is missing (migration not applied), inserting fails with a
    // non-duplicate error and we fall through — process as before.
    if (message.id) {
      const { error: claimError } = await supabaseAdmin
        .from('processed_whatsapp_messages')
        .insert({ message_id: message.id })
      if (claimError?.code === '23505') continue // already processed
    }

    const from = normalizeWhatsAppNumber(message.from)
    const text = message.text?.body?.trim() ?? ''
    const [keyword, secondWord] = text.toUpperCase().split(/\s+/)

    const { data: connector } = await supabaseAdmin
      .from('connectors')
      .select('id, name')
      .eq('whatsapp_number', from)
      .maybeSingle()

    const { data: vendor } = connector
      ? { data: null }
      : await supabaseAdmin.from('vendors').select('id, name').eq('whatsapp_number', from).maybeSingle()

    let reply: string | null = null
    let matchedKeyword: string | null = null

    const typeChoice = CONNECTOR_TYPE_REPLIES[keyword]
    if (typeChoice) {
      if (connector) {
        await supabaseAdmin.from('connectors').update({ connector_type: typeChoice.type }).eq('id', connector.id)
        reply = typeChoice.reply
      } else {
        reply = "Reply JOIN first to get your referral code, then we'll ask this again."
      }
      matchedKeyword = keyword
    } else if (keyword === 'JOIN' && secondWord) {
      // Someone tapped a connector's personal wa.me link, prefilled with
      // "JOIN <their referral code>" — personalize the reply rather than
      // falling through to the generic JOIN copy.
      const { data: referrer } = await supabaseAdmin
        .from('connectors')
        .select('name')
        .eq('referral_code', secondWord)
        .maybeSingle()
      reply = referrer
        ? `Hi! ${referrer.name} thinks you'd be a great fit for The Connection Network — refer people you know, get paid when they close. Head to the website and tap 'Become a connector', then enter ${secondWord} as your upline referral code to link up with them.`
        : KEYWORD_REPLIES.JOIN
      matchedKeyword = 'JOIN'
    } else if (KEYWORD_REPLIES[keyword]) {
      reply = KEYWORD_REPLIES[keyword]
      matchedKeyword = keyword
    } else if (!connector && !vendor && text.length > 0) {
      // Not a recognized keyword and not from an existing connector/vendor —
      // treat this as a raw "I need X" request. MVP routing engine:
      // deterministic category(+location) match via lib/routing/, falling
      // back to the unassigned bucket for manual triage if nothing matches.
      const category = detectCategory(text)
      const location = detectLocation(text)
      const match = await findMatchingVendor({ category, location })

      const { data: unassignedConnector } = await supabaseAdmin
        .from('connectors')
        .select('id')
        .eq('referral_code', UNASSIGNED_CONNECTOR_CODE)
        .maybeSingle()

      if (unassignedConnector) {
        const { data: newReferral } = await supabaseAdmin
          .from('referrals')
          .insert({
            connector_id: unassignedConnector.id,
            vendor_id: match.vendorId,
            lead_name: 'WhatsApp request',
            lead_contact: from,
            note: text,
            category,
            location,
            source: 'whatsapp_request',
          })
          .select('id, vendor_id, vendors(name, whatsapp_number)')
          .single()

        if (newReferral) {
          try {
            await appendLedgerEntry('referral_submitted', {
              referralId: newReferral.id,
              connectorId: unassignedConnector.id,
              vendorId: newReferral.vendor_id,
              source: 'whatsapp_request',
            })
          } catch (err) {
            console.error('[whatsapp] ledger append failed for request capture', err)
          }

          const matchedVendor = newReferral.vendors as unknown as {
            name: string
            whatsapp_number: string | null
          } | null

          if (match.matchedOn !== 'unassigned' && matchedVendor) {
            await notify(
              matchedVendor.whatsapp_number,
              `New request via WhatsApp: "${text}" — from ${from}. Routed to you automatically, reply to follow up.`
            )
          }

          reply =
            match.matchedOn === 'unassigned'
              ? "Got it — we're finding the right match for you and will be in touch shortly."
              : "Got it — we're connecting you with the right team for this. They'll be in touch shortly."
        }
      }
    }

    // The ledger is public — every other entry type avoids phone numbers and
    // free-text content, so this one shouldn't be the exception. Record only
    // who/what matched and which keyword (if any), never the raw number or
    // message body.
    await appendLedgerEntry('whatsapp_message_received', {
      connectorId: connector?.id ?? null,
      vendorId: vendor?.id ?? null,
      matchedKeyword,
    })

    if (reply) {
      await sendWhatsAppText({ to: from, body: reply })
    }
  }

  return NextResponse.json({ ok: true })
}
